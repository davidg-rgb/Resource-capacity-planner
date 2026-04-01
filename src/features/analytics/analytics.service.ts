import { sql } from 'drizzle-orm';

import { db } from '@/db';
import { generateMonthRange } from '@/lib/date-utils';
import { ValidationError } from '@/lib/errors';

import type {
  CapacityAlert,
  CapacityDistributionResponse,
  CapacityForecastResponse,
  CapacityStatusLabel,
  DashboardKPIs,
  DepartmentGroup,
  DepartmentUtilization,
  DisciplineDemandResponse,
  DisciplineBreakdown,
  HeatMapPerson,
  HeatMapResponse,
  PersonSummaryResponse,
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

/**
 * Fetch person 360 summary: basic info, current utilization, active allocations.
 *
 * Single-query approach: fetches person + department + discipline in one query,
 * then a second query for active allocations with project names.
 * Utilization is computed from current month allocations vs target hours.
 *
 * @param orgId - Organization UUID (tenant scope)
 * @param personId - Person UUID
 */
export async function getPersonSummary(
  orgId: string,
  personId: string,
): Promise<PersonSummaryResponse | null> {
  // Query 1: Person basic info with department and discipline
  const personResult = await db.execute<{
    id: string;
    first_name: string;
    last_name: string;
    target_hours: number;
    department_id: string;
    department_name: string;
    discipline_id: string;
    discipline_name: string;
  }>(sql`
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.target_hours_per_month AS target_hours,
      d.id AS department_id,
      d.name AS department_name,
      disc.id AS discipline_id,
      disc.name AS discipline_name
    FROM people p
    INNER JOIN departments d ON d.id = p.department_id
    INNER JOIN disciplines disc ON disc.id = p.discipline_id
    WHERE p.id = ${personId}::uuid
      AND p.organization_id = ${orgId}::uuid
      AND p.archived_at IS NULL
    LIMIT 1
  `);

  const person = personResult.rows[0];
  if (!person) return null;

  // Query 2: Active allocations (current and future months) with project names
  const now = new Date();
  const currentMonthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const allocResult = await db.execute<{
    project_id: string;
    project_name: string;
    total_hours: number;
    min_month: string;
    max_month: string;
  }>(sql`
    SELECT
      a.project_id,
      pr.name AS project_name,
      SUM(a.hours)::int AS total_hours,
      MIN(to_char(a.month, 'YYYY-MM-DD')) AS min_month,
      MAX(to_char(a.month, 'YYYY-MM-DD')) AS max_month
    FROM allocations a
    INNER JOIN projects pr ON pr.id = a.project_id
    WHERE a.person_id = ${personId}::uuid
      AND a.organization_id = ${orgId}::uuid
      AND a.month >= ${currentMonthDate}::date
    GROUP BY a.project_id, pr.name
    ORDER BY total_hours DESC
  `);

  // Query 3: Current month total hours for utilization calculation
  const utilResult = await db.execute<{ current_hours: number }>(sql`
    SELECT COALESCE(SUM(hours), 0)::int AS current_hours
    FROM allocations
    WHERE person_id = ${personId}::uuid
      AND organization_id = ${orgId}::uuid
      AND month = ${currentMonthDate}::date
  `);

  const currentHours = utilResult.rows[0]?.current_hours ?? 0;
  const targetHours = person.target_hours;
  const utilizationPercent =
    targetHours > 0 ? Math.round((currentHours / targetHours) * 100 * 10) / 10 : 0;

  // Determine capacity status
  let capacityStatus: CapacityStatusLabel = 'available';
  if (utilizationPercent > 100) {
    capacityStatus = 'overloaded';
  } else if (utilizationPercent >= 80) {
    capacityStatus = 'fully-allocated';
  }

  // Map allocations to response format
  const activeAllocations = allocResult.rows.map((row) => ({
    projectId: row.project_id,
    projectName: row.project_name,
    role: null, // No role column on allocations table
    percentage: targetHours > 0 ? Math.round((row.total_hours / targetHours) * 100 * 10) / 10 : 0,
    startDate: row.min_month,
    endDate: row.max_month,
  }));

  const totalFteEquivalent =
    targetHours > 0 ? Math.round((currentHours / targetHours) * 100) / 100 : 0;

  return {
    id: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    email: null, // People table does not have an email column
    department: { id: person.department_id, name: person.department_name },
    disciplines: [{ id: person.discipline_id, name: person.discipline_name }],
    utilizationPercent,
    capacityStatus,
    activeAllocations,
    totalFteEquivalent,
  };
}

// --- v4.0 Group A: Supply vs Demand endpoints (Phase 24) ---

const CHART_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

/**
 * Capacity Forecast (V1): supply vs demand per month with gap classification.
 *
 * Supply = sum of target_hours_per_month for all active people (per month).
 * Demand = sum of allocation hours (per month).
 * Gap = supply - demand (negative means deficit).
 */
export async function getCapacityForecast(
  orgId: string,
  monthFrom: string,
  monthTo: string,
  filters?: { projectId?: string; departmentId?: string },
): Promise<CapacityForecastResponse> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  const deptFilter = filters?.departmentId
    ? sql` AND p.department_id = ${filters.departmentId}::uuid`
    : sql``;

  const projectFilter = filters?.projectId
    ? sql` AND a.project_id = ${filters.projectId}::uuid`
    : sql``;

  const rows = await db.execute<{
    month: string;
    supply: number;
    demand: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    ),
    active_people AS (
      SELECT p.id, p.target_hours_per_month AS target_hours
      FROM people p
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
        ${deptFilter}
    ),
    supply AS (
      SELECT ms.month, SUM(ap.target_hours)::int AS total
      FROM active_people ap
      CROSS JOIN month_series ms
      GROUP BY ms.month
    ),
    demand AS (
      SELECT to_char(a.month, 'YYYY-MM') AS month, SUM(a.hours)::int AS total
      FROM allocations a
      INNER JOIN active_people ap ON ap.id = a.person_id
      WHERE a.organization_id = ${orgId}::uuid
        AND to_char(a.month, 'YYYY-MM') >= ${monthFrom}
        AND to_char(a.month, 'YYYY-MM') <= ${monthTo}
        ${projectFilter}
      GROUP BY to_char(a.month, 'YYYY-MM')
    )
    SELECT
      ms.month,
      COALESCE(s.total, 0) AS supply,
      COALESCE(d.total, 0) AS demand
    FROM month_series ms
    LEFT JOIN supply s ON s.month = ms.month
    LEFT JOIN demand d ON d.month = ms.month
    ORDER BY ms.month
  `);

  const months: string[] = [];
  const supply: Record<string, number> = {};
  const demand: Record<string, number> = {};
  const gap: Record<string, number> = {};
  let surplusMonths = 0;
  let balancedMonths = 0;
  let deficitMonths = 0;

  for (const row of rows.rows) {
    const m = row.month;
    const s = Number(row.supply);
    const d = Number(row.demand);
    const g = s - d;

    months.push(m);
    supply[m] = s;
    demand[m] = d;
    gap[m] = g;

    // Classify: surplus if gap > 5% of supply, deficit if gap < -5% of supply
    if (s === 0) {
      balancedMonths++;
    } else if (g > s * 0.05) {
      surplusMonths++;
    } else if (g < -(s * 0.05)) {
      deficitMonths++;
    } else {
      balancedMonths++;
    }
  }

  return {
    months,
    supply,
    demand,
    gap,
    summary: { surplusMonths, balancedMonths, deficitMonths },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Capacity Distribution (V5): stacked hours breakdown by grouping dimension.
 *
 * Groups allocation hours by project, department, or discipline per month.
 * Returns top N groups with an "other" bucket for the remainder.
 * Also returns supply per month for overlay reference.
 */
export async function getCapacityDistribution(
  orgId: string,
  monthFrom: string,
  monthTo: string,
  groupBy: 'project' | 'department' | 'discipline',
  limit = 8,
): Promise<CapacityDistributionResponse> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  // Build dynamic grouping dimension
  let groupJoin: ReturnType<typeof sql>;
  let groupId: ReturnType<typeof sql>;
  let groupName: ReturnType<typeof sql>;

  if (groupBy === 'project') {
    groupJoin = sql`INNER JOIN projects pr ON pr.id = a.project_id AND pr.organization_id = ${orgId}::uuid`;
    groupId = sql`pr.id`;
    groupName = sql`pr.name`;
  } else if (groupBy === 'department') {
    groupJoin = sql`INNER JOIN departments dept ON dept.id = ap.department_id`;
    groupId = sql`dept.id`;
    groupName = sql`dept.name`;
  } else {
    groupJoin = sql`INNER JOIN disciplines disc ON disc.id = ap.discipline_id`;
    groupId = sql`disc.id`;
    groupName = sql`disc.name`;
  }

  const rows = await db.execute<{
    group_id: string;
    group_name: string;
    month: string;
    hours: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    ),
    active_people AS (
      SELECT p.id, p.department_id, p.discipline_id, p.target_hours_per_month AS target_hours
      FROM people p
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
    )
    SELECT
      ${groupId} AS group_id,
      ${groupName} AS group_name,
      to_char(a.month, 'YYYY-MM') AS month,
      SUM(a.hours)::int AS hours
    FROM allocations a
    INNER JOIN active_people ap ON ap.id = a.person_id
    ${groupJoin}
    WHERE a.organization_id = ${orgId}::uuid
      AND to_char(a.month, 'YYYY-MM') >= ${monthFrom}
      AND to_char(a.month, 'YYYY-MM') <= ${monthTo}
    GROUP BY ${groupId}, ${groupName}, to_char(a.month, 'YYYY-MM')
    ORDER BY ${groupId}, to_char(a.month, 'YYYY-MM')
  `);

  // Supply query (same pattern as capacity-forecast)
  const supplyRows = await db.execute<{
    month: string;
    total: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    ),
    active_people AS (
      SELECT p.target_hours_per_month AS target_hours
      FROM people p
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
    )
    SELECT ms.month, SUM(ap.target_hours)::int AS total
    FROM active_people ap
    CROSS JOIN month_series ms
    GROUP BY ms.month
    ORDER BY ms.month
  `);

  // Build month list and supply record
  const count = monthCount(monthFrom, monthTo);
  const monthsList = generateMonthRange(monthFrom, count);
  const supplyRecord: Record<string, number> = {};
  for (const row of supplyRows.rows) {
    supplyRecord[row.month] = Number(row.total);
  }

  // Aggregate per group
  const groupMap = new Map<
    string,
    { id: string; name: string; months: Record<string, number>; totalHours: number }
  >();

  let grandTotal = 0;

  for (const row of rows.rows) {
    const hours = Number(row.hours);
    let group = groupMap.get(row.group_id);
    if (!group) {
      group = { id: row.group_id, name: row.group_name, months: {}, totalHours: 0 };
      groupMap.set(row.group_id, group);
    }
    group.months[row.month] = (group.months[row.month] ?? 0) + hours;
    group.totalHours += hours;
    grandTotal += hours;
  }

  // Sort by totalHours DESC, take top N
  const sorted = Array.from(groupMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  const topGroups = sorted.slice(0, limit);
  const remainingGroups = sorted.slice(limit);

  // Build response groups with colors and percentages
  const groups = topGroups.map((g, i) => ({
    id: g.id,
    name: g.name,
    color: CHART_PALETTE[i % CHART_PALETTE.length],
    months: g.months,
    totalHours: g.totalHours,
    percentOfTotal: grandTotal > 0 ? Math.round((g.totalHours / grandTotal) * 1000) / 10 : 0,
  }));

  // Build "other" bucket if needed
  let other: CapacityDistributionResponse['other'];
  if (remainingGroups.length > 0) {
    const otherMonths: Record<string, number> = {};
    let otherTotal = 0;
    for (const g of remainingGroups) {
      for (const [m, h] of Object.entries(g.months)) {
        otherMonths[m] = (otherMonths[m] ?? 0) + h;
      }
      otherTotal += g.totalHours;
    }
    other = {
      months: otherMonths,
      totalHours: otherTotal,
      percentOfTotal: grandTotal > 0 ? Math.round((otherTotal / grandTotal) * 1000) / 10 : 0,
    };
  }

  // Generate insight if largest group dominates
  let insight: string | undefined;
  if (topGroups.length > 0 && grandTotal > 0) {
    const pct = Math.round((topGroups[0].totalHours / grandTotal) * 100);
    if (pct > 50) {
      insight = `${topGroups[0].name} accounts for ${pct}% of allocated hours`;
    }
  }

  return {
    groups,
    other,
    supply: supplyRecord,
    months: monthsList,
    insight,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Discipline Demand (V12): per-discipline supply vs demand per month.
 *
 * For each discipline, computes monthly supply (people count * target_hours)
 * and demand (sum of allocation hours for people with that discipline).
 * Detects sustained deficits (3+ consecutive deficit months).
 */
export async function getDisciplineDemand(
  orgId: string,
  monthFrom: string,
  monthTo: string,
  filters?: { departmentId?: string },
): Promise<DisciplineDemandResponse> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  const deptFilter = filters?.departmentId
    ? sql` AND p.department_id = ${filters.departmentId}::uuid`
    : sql``;

  const rows = await db.execute<{
    discipline_id: string;
    discipline_name: string;
    abbreviation: string;
    month: string;
    supply: number;
    demand: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    ),
    active_people AS (
      SELECT p.id, p.discipline_id, p.target_hours_per_month AS target_hours
      FROM people p
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
        AND p.discipline_id IS NOT NULL
        ${deptFilter}
    ),
    org_disciplines AS (
      SELECT DISTINCT disc.id AS discipline_id, disc.name AS discipline_name, disc.abbreviation
      FROM disciplines disc
      INNER JOIN active_people ap ON ap.discipline_id = disc.id
    ),
    grid AS (
      SELECT od.discipline_id, od.discipline_name, od.abbreviation, ms.month
      FROM org_disciplines od
      CROSS JOIN month_series ms
    ),
    supply AS (
      SELECT
        g.discipline_id,
        g.month,
        COUNT(ap.id)::int * COALESCE(MAX(ap.target_hours), 0) AS total
      FROM grid g
      LEFT JOIN active_people ap ON ap.discipline_id = g.discipline_id
      GROUP BY g.discipline_id, g.month
    ),
    demand AS (
      SELECT
        ap.discipline_id,
        to_char(a.month, 'YYYY-MM') AS month,
        SUM(a.hours)::int AS total
      FROM allocations a
      INNER JOIN active_people ap ON ap.id = a.person_id
      WHERE a.organization_id = ${orgId}::uuid
        AND to_char(a.month, 'YYYY-MM') >= ${monthFrom}
        AND to_char(a.month, 'YYYY-MM') <= ${monthTo}
      GROUP BY ap.discipline_id, to_char(a.month, 'YYYY-MM')
    )
    SELECT
      g.discipline_id,
      g.discipline_name,
      g.abbreviation,
      g.month,
      COALESCE(s.total, 0) AS supply,
      COALESCE(d.total, 0) AS demand
    FROM grid g
    LEFT JOIN supply s ON s.discipline_id = g.discipline_id AND s.month = g.month
    LEFT JOIN demand d ON d.discipline_id = g.discipline_id AND d.month = g.month
    ORDER BY g.discipline_name, g.month
  `);

  // Group rows by discipline
  const disciplineMap = new Map<
    string,
    {
      disciplineId: string;
      disciplineName: string;
      abbreviation: string;
      months: Record<
        string,
        {
          demand: number;
          supply: number;
          gap: number;
          status: 'surplus' | 'balanced' | 'tight' | 'deficit';
        }
      >;
    }
  >();

  let avgTargetHours = 0;
  let targetCount = 0;

  for (const row of rows.rows) {
    const s = Number(row.supply);
    const d = Number(row.demand);
    const g = s - d;

    // Classify status based on gap relative to supply
    let status: 'surplus' | 'balanced' | 'tight' | 'deficit';
    if (s === 0) {
      status = d > 0 ? 'deficit' : 'balanced';
    } else {
      const ratio = g / s;
      if (ratio > 0.1) status = 'surplus';
      else if (ratio >= -0.1) status = 'balanced';
      else if (ratio >= -0.25) status = 'tight';
      else status = 'deficit';
    }

    let disc = disciplineMap.get(row.discipline_id);
    if (!disc) {
      disc = {
        disciplineId: row.discipline_id,
        disciplineName: row.discipline_name,
        abbreviation: row.abbreviation,
        months: {},
      };
      disciplineMap.set(row.discipline_id, disc);
    }
    disc.months[row.month] = { demand: d, supply: s, gap: g, status };

    if (s > 0) {
      avgTargetHours += s;
      targetCount++;
    }
  }

  // Compute per-discipline peak deficit and sustained deficit
  const avgTarget = targetCount > 0 ? avgTargetHours / targetCount : 160;

  const disciplines = Array.from(disciplineMap.values()).map((disc) => {
    let peakDeficit = 0;
    let peakDeficitMonth = '';

    // Sustained deficit detection: 3+ consecutive deficit months
    const sortedMonths = Object.keys(disc.months).sort();
    let consecutiveDeficit = 0;
    let sustained = false;

    for (const m of sortedMonths) {
      const g = disc.months[m].gap;
      if (g < peakDeficit) {
        peakDeficit = g;
        peakDeficitMonth = m;
      }
      if (g < 0) {
        consecutiveDeficit++;
        if (consecutiveDeficit >= 3) sustained = true;
      } else {
        consecutiveDeficit = 0;
      }
    }

    return {
      disciplineId: disc.disciplineId,
      disciplineName: disc.disciplineName,
      abbreviation: disc.abbreviation,
      months: disc.months,
      peakDeficit,
      peakDeficitMonth: peakDeficitMonth || sortedMonths[0] || monthFrom,
      sustainedDeficit: sustained,
    };
  });

  // Summary: combined peak deficit and FTE hiring need
  const combinedPeakDeficit = disciplines.reduce((sum, d) => sum + Math.min(d.peakDeficit, 0), 0);
  const fteHiringNeed =
    avgTarget > 0 ? Math.round((Math.abs(combinedPeakDeficit) / avgTarget) * 10) / 10 : 0;

  return {
    disciplines,
    summary: {
      combinedPeakDeficit: Math.abs(combinedPeakDeficit),
      fteHiringNeed,
    },
    generatedAt: new Date().toISOString(),
  };
}
