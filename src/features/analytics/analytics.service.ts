import { sql } from 'drizzle-orm';

import { db } from '@/db';
import { generateMonthRange } from '@/lib/date-utils';
import { ValidationError } from '@/lib/errors';

import type {
  CapacityAlert,
  DashboardKPIs,
  DepartmentGroup,
  DepartmentUtilization,
  DisciplineBreakdown,
  HeatMapPerson,
  HeatMapResponse,
  ProjectStaffingPerson,
  ProjectStaffingResponse,
} from './analytics.types';

const MAX_MONTH_RANGE = 36;
const MONTH_RE = /^\d{4}-\d{2}$/;

/** Validate and constrain month range params. Throws ValidationError if invalid or too wide. */
export function validateMonthRange(
  from: string | null,
  to: string | null,
): { from: string; to: string } {
  if (!from || !to || !MONTH_RE.test(from) || !MONTH_RE.test(to)) {
    throw new ValidationError('Invalid parameters. Required: from (YYYY-MM), to (YYYY-MM)');
  }
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  const range = (y2 - y1) * 12 + (m2 - m1) + 1;
  if (range < 1 || range > MAX_MONTH_RANGE) {
    throw new ValidationError(`Month range must be 1-${MAX_MONTH_RANGE} months (got ${range})`);
  }
  return { from, to };
}

/**
 * Compute the number of months between two YYYY-MM strings (inclusive).
 */
function monthCount(from: string, to: string): number {
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

/**
 * Fetch team heat map data: per-person-per-month utilization grouped by department.
 *
 * Uses a single CTE-based SQL query with generate_series to produce a gapless
 * month grid. CROSS JOINs active (non-archived) people with the month series,
 * then LEFT JOINs allocations to sum hours per person per month.
 *
 * @param orgId - Organization UUID
 * @param monthFrom - Start month in YYYY-MM format
 * @param monthTo - End month in YYYY-MM format
 * @param filters - Optional department/discipline filters
 */
export async function getTeamHeatMap(
  orgId: string,
  monthFrom: string,
  monthTo: string,
  filters?: { departmentId?: string; disciplineId?: string },
): Promise<HeatMapResponse> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  // Build optional WHERE clauses for filters
  const deptFilter = filters?.departmentId
    ? sql` AND p.department_id = ${filters.departmentId}::uuid`
    : sql``;
  const discFilter = filters?.disciplineId
    ? sql` AND p.discipline_id = ${filters.disciplineId}::uuid`
    : sql``;

  const rows = await db.execute<{
    person_id: string;
    first_name: string;
    last_name: string;
    target_hours: number;
    department_id: string;
    department_name: string;
    discipline_abbreviation: string | null;
    month: string;
    total_hours: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(
        ${fromDate}::date,
        ${toDate}::date,
        '1 month'::interval
      ) AS d
    ),
    active_people AS (
      SELECT
        p.id AS person_id,
        p.first_name,
        p.last_name,
        p.target_hours_per_month AS target_hours,
        p.department_id,
        d.name AS department_name,
        disc.abbreviation AS discipline_abbreviation
      FROM people p
      INNER JOIN departments d ON d.id = p.department_id
      LEFT JOIN disciplines disc ON disc.id = p.discipline_id
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
        ${deptFilter}
        ${discFilter}
    ),
    grid AS (
      SELECT
        ap.person_id,
        ap.first_name,
        ap.last_name,
        ap.target_hours,
        ap.department_id,
        ap.department_name,
        ap.discipline_abbreviation,
        ms.month
      FROM active_people ap
      CROSS JOIN month_series ms
    )
    SELECT
      g.person_id,
      g.first_name,
      g.last_name,
      g.target_hours,
      g.department_id,
      g.department_name,
      g.discipline_abbreviation,
      g.month,
      COALESCE(SUM(a.hours), 0)::int AS total_hours
    FROM grid g
    LEFT JOIN allocations a
      ON a.person_id = g.person_id
      AND to_char(a.month, 'YYYY-MM') = g.month
      AND a.organization_id = ${orgId}::uuid
    GROUP BY
      g.person_id, g.first_name, g.last_name, g.target_hours,
      g.department_id, g.department_name, g.discipline_abbreviation, g.month
    ORDER BY g.department_name, g.last_name, g.first_name, g.month
  `);

  // Group flat rows into DepartmentGroup[] -> HeatMapPerson[] -> months
  const deptMap = new Map<string, DepartmentGroup>();

  for (const row of rows.rows) {
    let dept = deptMap.get(row.department_id);
    if (!dept) {
      dept = {
        departmentId: row.department_id,
        departmentName: row.department_name,
        people: [],
      };
      deptMap.set(row.department_id, dept);
    }

    // Find or create person within this department
    let person = dept.people.find((p) => p.personId === row.person_id);
    if (!person) {
      person = {
        personId: row.person_id,
        firstName: row.first_name,
        lastName: row.last_name,
        targetHours: row.target_hours,
        disciplineAbbreviation: row.discipline_abbreviation ?? undefined,
        months: {},
      } satisfies HeatMapPerson;
      dept.people.push(person);
    }

    person.months[row.month] = row.total_hours;
  }

  // Generate ordered month array
  const count = monthCount(monthFrom, monthTo);
  const months = generateMonthRange(monthFrom, count);

  return {
    departments: Array.from(deptMap.values()),
    months,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Compute dashboard KPIs: headcount, overall utilization %, overloaded and underutilized counts.
 *
 * Uses a CTE to calculate per-person utilization across the given month range,
 * then aggregates into a single summary row.
 */
export async function getDashboardKPIs(
  orgId: string,
  monthFrom: string,
  monthTo: string,
): Promise<DashboardKPIs> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  const result = await db.execute<{
    total_people: number;
    utilization_percent: number;
    overloaded_count: number;
    underutilized_count: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(
        ${fromDate}::date,
        ${toDate}::date,
        '1 month'::interval
      ) AS d
    ),
    active_people AS (
      SELECT
        p.id AS person_id,
        p.target_hours_per_month AS target_hours
      FROM people p
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
    ),
    person_utilization AS (
      SELECT
        ap.person_id,
        SUM(ap.target_hours)::numeric AS total_target,
        COALESCE(SUM(a.hours), 0) AS total_allocated
      FROM active_people ap
      CROSS JOIN month_series ms
      LEFT JOIN allocations a
        ON a.person_id = ap.person_id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.person_id
    )
    SELECT
      COUNT(*)::int AS total_people,
      CASE
        WHEN SUM(total_target) = 0 THEN 0
        ELSE ROUND(SUM(total_allocated)::numeric / SUM(total_target)::numeric * 100, 1)
      END AS utilization_percent,
      COUNT(*) FILTER (
        WHERE total_target > 0 AND total_allocated::numeric / total_target::numeric > 1.0
      )::int AS overloaded_count,
      COUNT(*) FILTER (
        WHERE total_target > 0 AND total_allocated::numeric / total_target::numeric < 0.5
      )::int AS underutilized_count
    FROM person_utilization
  `);

  const row = result.rows[0];
  return {
    totalPeople: row?.total_people ?? 0,
    utilizationPercent: Number(row?.utilization_percent ?? 0),
    overloadedCount: row?.overloaded_count ?? 0,
    underutilizedCount: row?.underutilized_count ?? 0,
  };
}

/**
 * Compute per-department utilization percentages for the given month range.
 *
 * Groups people by department, sums their allocated vs target hours,
 * and returns utilization % per department ordered alphabetically.
 */
export async function getDepartmentUtilization(
  orgId: string,
  monthFrom: string,
  monthTo: string,
): Promise<DepartmentUtilization[]> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  const result = await db.execute<{
    department_id: string;
    department_name: string;
    utilization_percent: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(
        ${fromDate}::date,
        ${toDate}::date,
        '1 month'::interval
      ) AS d
    ),
    active_people AS (
      SELECT
        p.id AS person_id,
        p.target_hours_per_month AS target_hours,
        p.department_id,
        d.name AS department_name
      FROM people p
      INNER JOIN departments d ON d.id = p.department_id
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
    ),
    dept_utilization AS (
      SELECT
        ap.department_id,
        ap.department_name,
        SUM(ap.target_hours)::numeric AS total_target,
        COALESCE(SUM(a.hours), 0) AS total_allocated
      FROM active_people ap
      CROSS JOIN month_series ms
      LEFT JOIN allocations a
        ON a.person_id = ap.person_id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.department_id, ap.department_name
    )
    SELECT
      department_id,
      department_name,
      CASE
        WHEN total_target = 0 THEN 0
        ELSE ROUND(total_allocated::numeric / total_target::numeric * 100, 1)
      END AS utilization_percent
    FROM dept_utilization
    ORDER BY department_name ASC
  `);

  return result.rows.map((row) => ({
    departmentId: row.department_id,
    departmentName: row.department_name,
    utilizationPercent: Number(row.utilization_percent),
  }));
}

/**
 * Compute hours breakdown by discipline for the given month range.
 *
 * Sums all allocation hours grouped by the person's discipline.
 * People without a discipline are excluded (INNER JOIN).
 * Results ordered by total hours descending (most-used discipline first).
 */
export async function getDisciplineBreakdown(
  orgId: string,
  monthFrom: string,
  monthTo: string,
): Promise<DisciplineBreakdown[]> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  const result = await db.execute<{
    discipline_id: string;
    discipline_name: string;
    total_hours: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(
        ${fromDate}::date,
        ${toDate}::date,
        '1 month'::interval
      ) AS d
    ),
    active_people AS (
      SELECT
        p.id AS person_id,
        p.discipline_id,
        disc.name AS discipline_name
      FROM people p
      INNER JOIN disciplines disc ON disc.id = p.discipline_id
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
    )
    SELECT
      ap.discipline_id,
      ap.discipline_name,
      COALESCE(SUM(a.hours), 0)::int AS total_hours
    FROM active_people ap
    CROSS JOIN month_series ms
    LEFT JOIN allocations a
      ON a.person_id = ap.person_id
      AND to_char(a.month, 'YYYY-MM') = ms.month
      AND a.organization_id = ${orgId}::uuid
    GROUP BY ap.discipline_id, ap.discipline_name
    ORDER BY total_hours DESC
  `);

  return result.rows.map((row) => ({
    disciplineId: row.discipline_id,
    disciplineName: row.discipline_name,
    totalHours: row.total_hours,
  }));
}

/**
 * Compute capacity alerts: people who are overloaded (>100%) or underutilized (<50%).
 *
 * Returns individual person rows with utilization ratio and severity classification.
 * Uses the same CTE pattern as getDashboardKPIs but returns per-person detail.
 */
export async function getCapacityAlerts(
  orgId: string,
  monthFrom: string,
  monthTo: string,
): Promise<CapacityAlert[]> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  const result = await db.execute<{
    person_id: string;
    first_name: string;
    last_name: string;
    department_name: string;
    total_target: number;
    total_allocated: number;
    utilization_ratio: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(
        ${fromDate}::date,
        ${toDate}::date,
        '1 month'::interval
      ) AS d
    ),
    active_people AS (
      SELECT
        p.id AS person_id,
        p.first_name,
        p.last_name,
        p.target_hours_per_month AS target_hours,
        d.name AS department_name
      FROM people p
      INNER JOIN departments d ON d.id = p.department_id
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
    ),
    person_utilization AS (
      SELECT
        ap.person_id,
        ap.first_name,
        ap.last_name,
        ap.department_name,
        SUM(ap.target_hours)::numeric AS total_target,
        COALESCE(SUM(a.hours), 0) AS total_allocated,
        CASE
          WHEN SUM(ap.target_hours) > 0
          THEN ROUND(COALESCE(SUM(a.hours), 0)::numeric / SUM(ap.target_hours)::numeric, 4)
          ELSE 0
        END AS utilization_ratio
      FROM active_people ap
      CROSS JOIN month_series ms
      LEFT JOIN allocations a
        ON a.person_id = ap.person_id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.person_id, ap.first_name, ap.last_name, ap.department_name
    )
    SELECT
      person_id,
      first_name,
      last_name,
      department_name,
      total_target::int,
      total_allocated::int,
      utilization_ratio::float
    FROM person_utilization
    WHERE utilization_ratio > 1.0 OR utilization_ratio < 0.5
    ORDER BY utilization_ratio DESC
  `);

  return result.rows.map((row) => ({
    personId: row.person_id,
    firstName: row.first_name,
    lastName: row.last_name,
    departmentName: row.department_name,
    totalTarget: row.total_target,
    totalAllocated: row.total_allocated,
    utilizationRatio: Number(row.utilization_ratio),
    severity: Number(row.utilization_ratio) > 1.0 ? 'overloaded' : 'underutilized',
  }));
}

/**
 * Count the number of active capacity alerts (overloaded + underutilized people).
 * Lightweight version of getCapacityAlerts that only returns the count.
 */
export async function getAlertCount(
  orgId: string,
  monthFrom: string,
  monthTo: string,
): Promise<number> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  const result = await db.execute<{ count: number }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(
        ${fromDate}::date,
        ${toDate}::date,
        '1 month'::interval
      ) AS d
    ),
    active_people AS (
      SELECT
        p.id AS person_id,
        p.target_hours_per_month AS target_hours
      FROM people p
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
    ),
    person_utilization AS (
      SELECT
        ap.person_id,
        CASE
          WHEN SUM(ap.target_hours) > 0
          THEN COALESCE(SUM(a.hours), 0)::numeric / SUM(ap.target_hours)::numeric
          ELSE 0
        END AS utilization_ratio
      FROM active_people ap
      CROSS JOIN month_series ms
      LEFT JOIN allocations a
        ON a.person_id = ap.person_id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.person_id
    )
    SELECT COUNT(*)::int AS count
    FROM person_utilization
    WHERE utilization_ratio > 1.0 OR utilization_ratio < 0.5
  `);

  return result.rows[0]?.count ?? 0;
}

/**
 * Fetch project staffing data: per-person-per-month hours for a specific project.
 *
 * Uses generate_series for a gapless month grid. Returns all active people
 * who have allocations to this project in the given period.
 */
export async function getProjectStaffing(
  orgId: string,
  projectId: string,
  monthFrom: string,
  monthTo: string,
): Promise<ProjectStaffingResponse> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;
  const count = monthCount(monthFrom, monthTo);
  const months = generateMonthRange(monthFrom, count);

  // Get project name and program
  const projectResult = await db.execute<{
    name: string;
    program_name: string | null;
  }>(sql`
    SELECT pr.name, pg.name AS program_name
    FROM projects pr
    LEFT JOIN programs pg ON pg.id = pr.program_id
    WHERE pr.id = ${projectId}::uuid
      AND pr.organization_id = ${orgId}::uuid
    LIMIT 1
  `);

  const projectName = projectResult.rows[0]?.name ?? 'Unknown Project';
  const programName = projectResult.rows[0]?.program_name ?? null;

  // Get per-person-per-month allocations for this project (with discipline)
  const result = await db.execute<{
    person_id: string;
    first_name: string;
    last_name: string;
    target_hours: number;
    discipline: string;
    month: string;
    hours: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(
        ${fromDate}::date,
        ${toDate}::date,
        '1 month'::interval
      ) AS d
    ),
    project_people AS (
      SELECT DISTINCT
        p.id AS person_id,
        p.first_name,
        p.last_name,
        p.target_hours_per_month AS target_hours,
        d.abbreviation AS discipline
      FROM people p
      INNER JOIN allocations a ON a.person_id = p.id
      INNER JOIN disciplines d ON d.id = p.discipline_id
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
        AND a.project_id = ${projectId}::uuid
        AND a.organization_id = ${orgId}::uuid
        AND to_char(a.month, 'YYYY-MM') >= ${monthFrom}
        AND to_char(a.month, 'YYYY-MM') <= ${monthTo}
    )
    SELECT
      pp.person_id,
      pp.first_name,
      pp.last_name,
      pp.target_hours,
      pp.discipline,
      ms.month,
      COALESCE(a.hours, 0)::int AS hours
    FROM project_people pp
    CROSS JOIN month_series ms
    LEFT JOIN allocations a
      ON a.person_id = pp.person_id
      AND a.project_id = ${projectId}::uuid
      AND to_char(a.month, 'YYYY-MM') = ms.month
      AND a.organization_id = ${orgId}::uuid
    ORDER BY pp.last_name, pp.first_name, ms.month
  `);

  // Group into per-person records
  const personMap = new Map<string, ProjectStaffingPerson>();

  for (const row of result.rows) {
    let person = personMap.get(row.person_id);
    if (!person) {
      person = {
        personId: row.person_id,
        firstName: row.first_name,
        lastName: row.last_name,
        discipline: row.discipline,
        targetHoursPerMonth: row.target_hours,
        months: {},
      };
      personMap.set(row.person_id, person);
    }
    person.months[row.month] = row.hours;
  }

  return {
    projectId,
    projectName,
    programName,
    people: Array.from(personMap.values()),
    months,
    generatedAt: new Date().toISOString(),
  };
}
