import { sql } from 'drizzle-orm';

import { db } from '@/db';
import { generateMonthRange } from '@/lib/date-utils';
import { ValidationError } from '@/lib/errors';

import type {
  AvailabilitySearchResponse,
  AvailabilityTimelineResponse,
  BenchReportResponse,
  CapacityAlert,
  CapacityDistributionResponse,
  CapacityForecastResponse,
  CapacityStatusLabel,
  ConflictsResponse,
  DashboardKPIs,
  DepartmentGroup,
  DepartmentUtilization,
  DisciplineDemandResponse,
  DisciplineBreakdown,
  HeatMapPerson,
  HeatMapResponse,
  PeriodComparisonResponse,
  PersonDetailResponse,
  PersonSummaryResponse,
  ProgramRollupResponse,
  ProjectStaffingPerson,
  ProjectStaffingResponse,
  UtilizationTrendsResponse,
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
        COALESCE(SUM(ap.target_hours), 0)::int AS total
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

// --- v4.0 Group B: Person-Level Utilization endpoints (Phase 24) ---

/**
 * Availability Timeline (V2): per-person per-month allocation with project breakdown.
 *
 * Returns people grouped by department. Each person-month includes total allocated,
 * available hours, utilization percent, and per-project breakdown with color coding.
 */
export async function getAvailabilityTimeline(
  orgId: string,
  monthFrom: string,
  monthTo: string,
  filters?: { departmentId?: string; disciplineId?: string; availableOnly?: boolean },
): Promise<AvailabilityTimelineResponse> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

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
    project_id: string | null;
    project_name: string | null;
    hours: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
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
    )
    SELECT
      ap.person_id,
      ap.first_name,
      ap.last_name,
      ap.target_hours,
      ap.department_id,
      ap.department_name,
      ap.discipline_abbreviation,
      ms.month,
      a.project_id,
      pr.name AS project_name,
      COALESCE(a.hours, 0)::int AS hours
    FROM active_people ap
    CROSS JOIN month_series ms
    LEFT JOIN allocations a
      ON a.person_id = ap.person_id
      AND to_char(a.month, 'YYYY-MM') = ms.month
      AND a.organization_id = ${orgId}::uuid
    LEFT JOIN projects pr ON pr.id = a.project_id
    ORDER BY ap.department_name, ap.last_name, ap.first_name, ms.month
  `);

  // Build consistent project-to-color mapping
  const projectColorMap = new Map<string, string>();
  let colorIndex = 0;

  // Group by department -> person -> month -> projects
  const deptMap = new Map<
    string,
    {
      departmentId: string;
      departmentName: string;
      people: Map<
        string,
        {
          personId: string;
          firstName: string;
          lastName: string;
          disciplineAbbreviation: string;
          targetHoursPerMonth: number;
          months: Map<
            string,
            {
              projects: { projectId: string; projectName: string; hours: number; color: string }[];
            }
          >;
        }
      >;
    }
  >();

  for (const row of rows.rows) {
    // Ensure department exists
    let dept = deptMap.get(row.department_id);
    if (!dept) {
      dept = {
        departmentId: row.department_id,
        departmentName: row.department_name,
        people: new Map(),
      };
      deptMap.set(row.department_id, dept);
    }

    // Ensure person exists
    let person = dept.people.get(row.person_id);
    if (!person) {
      person = {
        personId: row.person_id,
        firstName: row.first_name,
        lastName: row.last_name,
        disciplineAbbreviation: row.discipline_abbreviation ?? '',
        targetHoursPerMonth: row.target_hours,
        months: new Map(),
      };
      dept.people.set(row.person_id, person);
    }

    // Ensure month exists
    let monthData = person.months.get(row.month);
    if (!monthData) {
      monthData = { projects: [] };
      person.months.set(row.month, monthData);
    }

    // Add project if present and has hours
    if (row.project_id && row.hours > 0) {
      // Assign consistent color
      if (!projectColorMap.has(row.project_id)) {
        projectColorMap.set(row.project_id, CHART_PALETTE[colorIndex % CHART_PALETTE.length]);
        colorIndex++;
      }
      monthData.projects.push({
        projectId: row.project_id,
        projectName: row.project_name ?? 'Unknown',
        hours: row.hours,
        color: projectColorMap.get(row.project_id)!,
      });
    }
  }

  // Transform to response format
  const count = monthCount(monthFrom, monthTo);
  const monthsList = generateMonthRange(monthFrom, count);

  let totalAvailableHours = 0;
  const peopleWithAvailabilitySet = new Set<string>();

  const departments: AvailabilityTimelineResponse['departments'] = [];

  for (const dept of deptMap.values()) {
    const people: AvailabilityTimelineResponse['departments'][0]['people'] = [];

    for (const person of dept.people.values()) {
      let hasAnyAvailability = false;
      const monthsRecord: Record<
        string,
        {
          totalAllocated: number;
          available: number;
          utilizationPercent: number;
          projects: { projectId: string; projectName: string; hours: number; color: string }[];
        }
      > = {};

      for (const m of monthsList) {
        const monthData = person.months.get(m);
        const projects = monthData?.projects ?? [];
        const totalAllocated = projects.reduce((sum, p) => sum + p.hours, 0);
        const available = Math.max(0, person.targetHoursPerMonth - totalAllocated);
        const utilizationPercent =
          person.targetHoursPerMonth > 0
            ? Math.round((totalAllocated / person.targetHoursPerMonth) * 1000) / 10
            : 0;

        monthsRecord[m] = { totalAllocated, available, utilizationPercent, projects };
        totalAvailableHours += available;
        if (available > 0) hasAnyAvailability = true;
      }

      // Apply availableOnly filter
      if (filters?.availableOnly && !hasAnyAvailability) continue;

      if (hasAnyAvailability) peopleWithAvailabilitySet.add(person.personId);

      people.push({
        personId: person.personId,
        firstName: person.firstName,
        lastName: person.lastName,
        disciplineAbbreviation: person.disciplineAbbreviation,
        targetHoursPerMonth: person.targetHoursPerMonth,
        months: monthsRecord,
      });
    }

    if (people.length > 0) {
      departments.push({
        departmentId: dept.departmentId,
        departmentName: dept.departmentName,
        people,
      });
    }
  }

  return {
    departments,
    months: monthsList,
    summary: {
      totalAvailableHours,
      peopleWithAvailability: peopleWithAvailabilitySet.size,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Availability Search (V3): ranked list of available people with filtering and sorting.
 *
 * Returns people sorted by available hours (desc), utilization (asc), or name (asc).
 * Supports filtering by discipline, department, and minimum available hours.
 */
export async function getAvailabilitySearch(
  orgId: string,
  monthFrom: string,
  monthTo: string,
  filters?: {
    disciplineId?: string;
    departmentId?: string;
    minHours?: number;
    sort?: 'available' | 'utilization' | 'name';
  },
): Promise<AvailabilitySearchResponse> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

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
    discipline_abbreviation: string | null;
    discipline_name: string | null;
    department_name: string;
    month: string;
    total_hours: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    ),
    active_people AS (
      SELECT
        p.id AS person_id,
        p.first_name,
        p.last_name,
        p.target_hours_per_month AS target_hours,
        disc.abbreviation AS discipline_abbreviation,
        disc.name AS discipline_name,
        d.name AS department_name
      FROM people p
      INNER JOIN departments d ON d.id = p.department_id
      LEFT JOIN disciplines disc ON disc.id = p.discipline_id
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
        ${deptFilter}
        ${discFilter}
    )
    SELECT
      ap.person_id,
      ap.first_name,
      ap.last_name,
      ap.target_hours,
      ap.discipline_abbreviation,
      ap.discipline_name,
      ap.department_name,
      ms.month,
      COALESCE(SUM(a.hours), 0)::int AS total_hours
    FROM active_people ap
    CROSS JOIN month_series ms
    LEFT JOIN allocations a
      ON a.person_id = ap.person_id
      AND to_char(a.month, 'YYYY-MM') = ms.month
      AND a.organization_id = ${orgId}::uuid
    GROUP BY
      ap.person_id, ap.first_name, ap.last_name, ap.target_hours,
      ap.discipline_abbreviation, ap.discipline_name, ap.department_name, ms.month
    ORDER BY ap.department_name, ap.last_name, ap.first_name, ms.month
  `);

  // Group by person -> months
  const personMap = new Map<
    string,
    {
      personId: string;
      firstName: string;
      lastName: string;
      disciplineAbbreviation: string;
      disciplineName: string;
      departmentName: string;
      targetHoursPerMonth: number;
      months: Record<string, { allocated: number; available: number; utilizationPercent: number }>;
      totalAvailable: number;
      totalUtilization: number;
      monthCount: number;
    }
  >();

  for (const row of rows.rows) {
    let person = personMap.get(row.person_id);
    if (!person) {
      person = {
        personId: row.person_id,
        firstName: row.first_name,
        lastName: row.last_name,
        disciplineAbbreviation: row.discipline_abbreviation ?? '',
        disciplineName: row.discipline_name ?? '',
        departmentName: row.department_name,
        targetHoursPerMonth: row.target_hours,
        months: {},
        totalAvailable: 0,
        totalUtilization: 0,
        monthCount: 0,
      };
      personMap.set(row.person_id, person);
    }

    const allocated = Number(row.total_hours);
    const available = Math.max(0, person.targetHoursPerMonth - allocated);
    const utilizationPercent =
      person.targetHoursPerMonth > 0
        ? Math.round((allocated / person.targetHoursPerMonth) * 1000) / 10
        : 0;

    person.months[row.month] = { allocated, available, utilizationPercent };
    person.totalAvailable += available;
    person.totalUtilization += utilizationPercent;
    person.monthCount++;
  }

  // Build results array with optional minHours filter
  let results = Array.from(personMap.values()).map((p) => ({
    personId: p.personId,
    firstName: p.firstName,
    lastName: p.lastName,
    disciplineAbbreviation: p.disciplineAbbreviation,
    disciplineName: p.disciplineName,
    departmentName: p.departmentName,
    targetHoursPerMonth: p.targetHoursPerMonth,
    months: p.months,
    totalAvailable: p.totalAvailable,
    avgUtilization:
      p.monthCount > 0 ? Math.round((p.totalUtilization / p.monthCount) * 10) / 10 : 0,
  }));

  // Apply minHours filter
  if (filters?.minHours !== undefined) {
    results = results.filter((r) => r.totalAvailable >= filters.minHours!);
  }

  // Sort results
  const sort = filters?.sort ?? 'available';
  if (sort === 'available') {
    results.sort((a, b) => b.totalAvailable - a.totalAvailable);
  } else if (sort === 'utilization') {
    results.sort((a, b) => a.avgUtilization - b.avgUtilization);
  } else {
    results.sort(
      (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
    );
  }

  return {
    results,
    total: results.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Bench Report (V8): people below utilization threshold with FTE equivalents.
 *
 * Uses a single query with two period CTEs (current and previous) to compute
 * bench capacity and trend comparison. Benched = utilization < threshold%.
 */
export async function getBenchReport(
  orgId: string,
  monthFrom: string,
  monthTo: string,
  threshold = 80,
): Promise<BenchReportResponse> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;
  const count = monthCount(monthFrom, monthTo);

  // Compute previous period: same length, ending just before fromDate
  const [y1, m1] = monthFrom.split('-').map(Number);
  const prevEnd = new Date(y1, m1 - 2, 1); // month before fromDate (0-indexed)
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth() - count + 1, 1);
  const prevFromDate = `${prevStart.getFullYear()}-${String(prevStart.getMonth() + 1).padStart(2, '0')}-01`;
  const prevToDate = `${prevEnd.getFullYear()}-${String(prevEnd.getMonth() + 1).padStart(2, '0')}-01`;

  const thresholdDecimal = threshold / 100;

  const rows = await db.execute<{
    person_id: string;
    first_name: string;
    last_name: string;
    target_hours: number;
    department_id: string;
    department_name: string;
    discipline_id: string | null;
    discipline_name: string | null;
    discipline_abbreviation: string | null;
    total_allocated: number;
    total_target: number;
    prev_allocated: number;
    prev_target: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    ),
    prev_month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${prevFromDate}::date, ${prevToDate}::date, '1 month'::interval) AS d
    ),
    active_people AS (
      SELECT
        p.id AS person_id,
        p.first_name,
        p.last_name,
        p.target_hours_per_month AS target_hours,
        p.department_id,
        d.name AS department_name,
        p.discipline_id,
        disc.name AS discipline_name,
        disc.abbreviation AS discipline_abbreviation
      FROM people p
      INNER JOIN departments d ON d.id = p.department_id
      LEFT JOIN disciplines disc ON disc.id = p.discipline_id
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
    ),
    current_util AS (
      SELECT
        ap.person_id,
        COALESCE(SUM(a.hours), 0)::int AS total_allocated,
        (COUNT(DISTINCT ms.month) * ap.target_hours)::int AS total_target
      FROM active_people ap
      CROSS JOIN month_series ms
      LEFT JOIN allocations a
        ON a.person_id = ap.person_id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.person_id, ap.target_hours
    ),
    prev_util AS (
      SELECT
        ap.person_id,
        COALESCE(SUM(a.hours), 0)::int AS prev_allocated,
        (COUNT(DISTINCT pms.month) * ap.target_hours)::int AS prev_target
      FROM active_people ap
      CROSS JOIN prev_month_series pms
      LEFT JOIN allocations a
        ON a.person_id = ap.person_id
        AND to_char(a.month, 'YYYY-MM') = pms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.person_id, ap.target_hours
    )
    SELECT
      ap.person_id,
      ap.first_name,
      ap.last_name,
      ap.target_hours,
      ap.department_id,
      ap.department_name,
      ap.discipline_id,
      ap.discipline_name,
      ap.discipline_abbreviation,
      cu.total_allocated,
      cu.total_target,
      COALESCE(pu.prev_allocated, 0) AS prev_allocated,
      COALESCE(pu.prev_target, 0) AS prev_target
    FROM active_people ap
    INNER JOIN current_util cu ON cu.person_id = ap.person_id
    LEFT JOIN prev_util pu ON pu.person_id = ap.person_id
    ORDER BY ap.last_name, ap.first_name
  `);

  // Filter to benched people (utilization < threshold)
  const benched = rows.rows.filter((row) => {
    const target = Number(row.total_target);
    if (target === 0) return true; // No target = benched
    return Number(row.total_allocated) / target < thresholdDecimal;
  });

  // Compute totals
  let totalBenchHours = 0;
  let totalTargetSum = 0;
  let previousBenchHours = 0;

  const deptAgg = new Map<
    string,
    { id: string; name: string; hours: number; fte: number; count: number }
  >();
  const discAgg = new Map<
    string,
    { id: string; name: string; hours: number; fte: number; count: number }
  >();

  const topList: BenchReportResponse['topAvailable'] = [];

  for (const row of benched) {
    const target = Number(row.total_target);
    const allocated = Number(row.total_allocated);
    const benchHours = Math.max(0, target - allocated);
    totalBenchHours += benchHours;
    totalTargetSum += target;

    // Previous period bench hours
    const prevTarget = Number(row.prev_target);
    const prevAllocated = Number(row.prev_allocated);
    if (prevTarget > 0 && prevAllocated / prevTarget < thresholdDecimal) {
      previousBenchHours += Math.max(0, prevTarget - prevAllocated);
    }

    // Department aggregation
    const deptKey = row.department_id;
    const dept = deptAgg.get(deptKey) ?? {
      id: deptKey,
      name: row.department_name,
      hours: 0,
      fte: 0,
      count: 0,
    };
    dept.hours += benchHours;
    dept.count++;
    deptAgg.set(deptKey, dept);

    // Discipline aggregation
    if (row.discipline_id) {
      const discKey = row.discipline_id;
      const disc = discAgg.get(discKey) ?? {
        id: discKey,
        name: row.discipline_name ?? '',
        hours: 0,
        fte: 0,
        count: 0,
      };
      disc.hours += benchHours;
      disc.count++;
      discAgg.set(discKey, disc);
    }

    // Build top available entry
    const utilizationPercent = target > 0 ? Math.round((allocated / target) * 1000) / 10 : 0;
    const freePerMonth = count > 0 ? Math.round(benchHours / count) : 0;
    topList.push({
      personId: row.person_id,
      firstName: row.first_name,
      lastName: row.last_name,
      disciplineAbbreviation: row.discipline_abbreviation ?? '',
      departmentName: row.department_name,
      utilizationPercent,
      freeHoursPerMonth: freePerMonth,
    });
  }

  // Compute FTE: totalBenchHours / (monthCount * avg target per month)
  const avgTargetPerMonth = benched.length > 0 ? totalTargetSum / (benched.length * count) : 160;
  const fteEquivalent =
    avgTargetPerMonth > 0
      ? Math.round((totalBenchHours / (count * avgTargetPerMonth)) * 10) / 10
      : 0;

  // Department FTE
  const byDepartment = Array.from(deptAgg.values()).map((d) => ({
    departmentId: d.id,
    departmentName: d.name,
    benchHours: d.hours,
    fteEquivalent:
      avgTargetPerMonth > 0 ? Math.round((d.hours / (count * avgTargetPerMonth)) * 10) / 10 : 0,
    peopleCount: d.count,
  }));

  // Discipline FTE
  const byDiscipline = Array.from(discAgg.values()).map((d) => ({
    disciplineId: d.id,
    disciplineName: d.name,
    benchHours: d.hours,
    fteEquivalent:
      avgTargetPerMonth > 0 ? Math.round((d.hours / (count * avgTargetPerMonth)) * 10) / 10 : 0,
    peopleCount: d.count,
  }));

  // Top 10 sorted by freeHoursPerMonth DESC
  topList.sort((a, b) => b.freeHoursPerMonth - a.freeHoursPerMonth);
  const topAvailable = topList.slice(0, 10);

  // Trend vs previous
  const changePercent =
    previousBenchHours > 0
      ? Math.round(((totalBenchHours - previousBenchHours) / previousBenchHours) * 1000) / 10
      : 0;
  const direction: 'up' | 'down' | 'stable' =
    changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';

  // Insight
  let insight: string | undefined;
  if (changePercent > 10 && byDepartment.length > 0) {
    const topDept = byDepartment.sort((a, b) => b.benchHours - a.benchHours)[0];
    insight = `Bench capacity increased by ${Math.round(changePercent)}% — consider redistributing ${topDept.departmentName} resources`;
  }

  return {
    summary: {
      totalBenchHours,
      fteEquivalent,
      peopleCount: benched.length,
      trendVsPrevious: {
        previousBenchHours,
        changePercent,
        direction,
      },
    },
    byDepartment,
    byDiscipline,
    topAvailable,
    insight,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Conflicts (V9): over-allocated people with per-project breakdown.
 *
 * Finds people allocated > 100% of their target hours per month.
 * Includes resolution suggestions (reduce largest allocation by the overBy amount).
 */
export async function getConflicts(
  orgId: string,
  month?: string,
  months = 1,
): Promise<ConflictsResponse> {
  // Default to current month
  const startMonth = month ?? new Date().toISOString().slice(0, 7);
  // Compute end month
  const [startY, startM] = startMonth.split('-').map(Number);
  const endDate = new Date(startY, startM - 1 + months - 1, 1);
  const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

  const fromDate = `${startMonth}-01`;
  const toDate = `${endMonth}-01`;

  const rows = await db.execute<{
    person_id: string;
    first_name: string;
    last_name: string;
    target_hours: number;
    department_name: string;
    discipline_abbreviation: string | null;
    month: string;
    project_id: string | null;
    project_name: string | null;
    project_hours: number;
    month_total: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    ),
    active_people AS (
      SELECT
        p.id AS person_id,
        p.first_name,
        p.last_name,
        p.target_hours_per_month AS target_hours,
        d.name AS department_name,
        disc.abbreviation AS discipline_abbreviation
      FROM people p
      INNER JOIN departments d ON d.id = p.department_id
      LEFT JOIN disciplines disc ON disc.id = p.discipline_id
      WHERE p.organization_id = ${orgId}::uuid
        AND p.archived_at IS NULL
    )
    SELECT
      ap.person_id,
      ap.first_name,
      ap.last_name,
      ap.target_hours,
      ap.department_name,
      ap.discipline_abbreviation,
      ms.month,
      a.project_id,
      pr.name AS project_name,
      COALESCE(a.hours, 0)::int AS project_hours,
      SUM(COALESCE(a.hours, 0))::int OVER (PARTITION BY ap.person_id, ms.month) AS month_total
    FROM active_people ap
    CROSS JOIN month_series ms
    LEFT JOIN allocations a
      ON a.person_id = ap.person_id
      AND to_char(a.month, 'YYYY-MM') = ms.month
      AND a.organization_id = ${orgId}::uuid
    LEFT JOIN projects pr ON pr.id = a.project_id
    ORDER BY ap.last_name, ap.first_name, ms.month
  `);

  // Filter to conflicted people (month_total > target) and group
  const conflictMap = new Map<
    string,
    {
      personId: string;
      firstName: string;
      lastName: string;
      disciplineAbbreviation: string;
      departmentName: string;
      targetHoursPerMonth: number;
      months: Record<
        string,
        {
          totalAllocated: number;
          overBy: number;
          projects: { projectId: string; projectName: string; hours: number }[];
          suggestedResolution?: {
            projectId: string;
            projectName: string;
            reduceBy: number;
            newHours: number;
          };
        }
      >;
    }
  >();

  for (const row of rows.rows) {
    const monthTotal = Number(row.month_total);
    const target = Number(row.target_hours);
    if (target <= 0 || monthTotal <= target) continue; // Not over-allocated

    const key = row.person_id;
    let person = conflictMap.get(key);
    if (!person) {
      person = {
        personId: row.person_id,
        firstName: row.first_name,
        lastName: row.last_name,
        disciplineAbbreviation: row.discipline_abbreviation ?? '',
        departmentName: row.department_name,
        targetHoursPerMonth: target,
        months: {},
      };
      conflictMap.set(key, person);
    }

    if (!person.months[row.month]) {
      person.months[row.month] = {
        totalAllocated: monthTotal,
        overBy: monthTotal - target,
        projects: [],
      };
    }

    // Add project if present and has hours
    if (row.project_id && row.project_hours > 0) {
      const monthData = person.months[row.month];
      // Avoid duplicates (window function can produce multiple rows per project)
      if (!monthData.projects.some((p) => p.projectId === row.project_id)) {
        monthData.projects.push({
          projectId: row.project_id,
          projectName: row.project_name ?? 'Unknown',
          hours: row.project_hours,
        });
      }
    }
  }

  // Add suggested resolutions
  for (const person of conflictMap.values()) {
    for (const monthData of Object.values(person.months)) {
      if (monthData.projects.length > 0) {
        // Sort by hours DESC, suggest reducing the largest
        const sorted = [...monthData.projects].sort((a, b) => b.hours - a.hours);
        const largest = sorted[0];
        const newHours = largest.hours - monthData.overBy;
        if (newHours >= 0) {
          monthData.suggestedResolution = {
            projectId: largest.projectId,
            projectName: largest.projectName,
            reduceBy: monthData.overBy,
            newHours,
          };
        }
      }
    }
  }

  const conflicts = Array.from(conflictMap.values());

  return {
    conflicts,
    summary: {
      totalConflicts: conflicts.length,
      resolvedThisMonth: 0, // No resolution tracking yet
    },
    generatedAt: new Date().toISOString(),
  };
}

// --- v4.0 Group C+D: Trends, Entity, and Comparison endpoints (Phase 24) ---

/**
 * Compute a YYYY-MM string offset by N months from a given YYYY-MM string.
 */
function offsetMonth(yyyyMm: string, offset: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Utilization Trends (V4): 6-month entity utilization history with direction signals.
 *
 * Fixed 6-month window ending at current month. Groups by department or person.
 * Returns per-entity monthly utilization %, change direction, and overload flag.
 */
export async function getUtilizationTrends(
  orgId: string,
  groupBy: 'department' | 'person',
  limit = 10,
): Promise<UtilizationTrendsResponse> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const sixMonthsAgo = offsetMonth(currentMonth, -5); // 6 months inclusive
  const fromDate = `${sixMonthsAgo}-01`;
  const toDate = `${currentMonth}-01`;

  if (groupBy === 'department') {
    const rows = await db.execute<{
      department_id: string;
      department_name: string;
      month: string;
      headcount: number;
      utilization_percent: number;
    }>(sql`
      WITH month_series AS (
        SELECT to_char(d, 'YYYY-MM') AS month
        FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
      ),
      active_people AS (
        SELECT p.id, p.department_id, d.name AS department_name, p.target_hours_per_month AS target_hours
        FROM people p
        INNER JOIN departments d ON d.id = p.department_id
        WHERE p.organization_id = ${orgId}::uuid AND p.archived_at IS NULL
      )
      SELECT
        ap.department_id,
        ap.department_name,
        ms.month,
        COUNT(DISTINCT ap.id)::int AS headcount,
        CASE
          WHEN SUM(ap.target_hours) = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(a.hours), 0)::numeric / SUM(ap.target_hours)::numeric * 100, 1)
        END AS utilization_percent
      FROM active_people ap
      CROSS JOIN month_series ms
      LEFT JOIN allocations a
        ON a.person_id = ap.id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.department_id, ap.department_name, ms.month
      ORDER BY ap.department_name, ms.month
    `);

    // Group by department
    const deptMap = new Map<
      string,
      { id: string; name: string; headcount: number; months: Record<string, number> }
    >();
    for (const row of rows.rows) {
      let dept = deptMap.get(row.department_id);
      if (!dept) {
        dept = { id: row.department_id, name: row.department_name, headcount: 0, months: {} };
        deptMap.set(row.department_id, dept);
      }
      dept.months[row.month] = Number(row.utilization_percent);
      dept.headcount = Math.max(dept.headcount, row.headcount);
    }

    const entities = Array.from(deptMap.values()).map((dept) => {
      const currentUtil = dept.months[currentMonth] ?? 0;
      const oldUtil = dept.months[sixMonthsAgo] ?? 0;
      const change = Math.round((currentUtil - oldUtil) * 10) / 10;
      return {
        id: dept.id,
        name: dept.name,
        type: 'department' as const,
        headcount: dept.headcount,
        months: dept.months,
        currentUtilization: currentUtil,
        changePercent: change,
        direction:
          change > 2 ? ('up' as const) : change < -2 ? ('down' as const) : ('stable' as const),
        isOverloaded: currentUtil > 100,
      };
    });

    return { entities, generatedAt: new Date().toISOString() };
  }

  // groupBy === 'person'
  const rows = await db.execute<{
    person_id: string;
    person_name: string;
    month: string;
    utilization_percent: number;
    avg_util: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    ),
    active_people AS (
      SELECT p.id, (p.first_name || ' ' || p.last_name) AS person_name, p.target_hours_per_month AS target_hours
      FROM people p
      WHERE p.organization_id = ${orgId}::uuid AND p.archived_at IS NULL
    ),
    person_month AS (
      SELECT
        ap.id AS person_id,
        ap.person_name,
        ms.month,
        CASE
          WHEN ap.target_hours = 0 THEN 0
          ELSE ROUND(COALESCE(SUM(a.hours), 0)::numeric / ap.target_hours::numeric * 100, 1)
        END AS utilization_percent
      FROM active_people ap
      CROSS JOIN month_series ms
      LEFT JOIN allocations a
        ON a.person_id = ap.id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.id, ap.person_name, ap.target_hours, ms.month
    ),
    ranked AS (
      SELECT *,
        AVG(utilization_percent) OVER (PARTITION BY person_id) AS avg_util
      FROM person_month
    )
    SELECT person_id, person_name, month, utilization_percent::float, avg_util::float
    FROM ranked
    WHERE person_id IN (
      SELECT DISTINCT person_id FROM ranked ORDER BY avg_util DESC LIMIT ${limit}
    )
    ORDER BY avg_util DESC, person_name, month
  `);

  const personMap = new Map<string, { id: string; name: string; months: Record<string, number> }>();
  for (const row of rows.rows) {
    let person = personMap.get(row.person_id);
    if (!person) {
      person = { id: row.person_id, name: row.person_name, months: {} };
      personMap.set(row.person_id, person);
    }
    person.months[row.month] = Number(row.utilization_percent);
  }

  const entities = Array.from(personMap.values()).map((p) => {
    const currentUtil = p.months[currentMonth] ?? 0;
    const oldUtil = p.months[sixMonthsAgo] ?? 0;
    const change = Math.round((currentUtil - oldUtil) * 10) / 10;
    return {
      id: p.id,
      name: p.name,
      type: 'person' as const,
      months: p.months,
      currentUtilization: currentUtil,
      changePercent: change,
      direction:
        change > 2 ? ('up' as const) : change < -2 ? ('down' as const) : ('stable' as const),
      isOverloaded: currentUtil > 100,
    };
  });

  return { entities, generatedAt: new Date().toISOString() };
}

/**
 * Person Detail (V7): full 360-degree data for a single person.
 *
 * Returns current month breakdown with per-project hours, 6-month utilization trend,
 * and 3-month forward availability forecast.
 *
 * @param orgId - Organization UUID
 * @param personId - Person UUID
 */
export async function getPersonDetail(
  orgId: string,
  personId: string,
): Promise<PersonDetailResponse> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const sixMonthsAgo = offsetMonth(currentMonth, -5);
  const fromDate = `${sixMonthsAgo}-01`;
  const toDate = `${currentMonth}-01`;

  // Query 1: Person info
  const personResult = await db.execute<{
    first_name: string;
    last_name: string;
    target_hours: number;
    discipline_abbreviation: string;
    discipline_name: string;
    department_id: string;
    department_name: string;
  }>(sql`
    SELECT
      p.first_name,
      p.last_name,
      p.target_hours_per_month AS target_hours,
      COALESCE(disc.abbreviation, '') AS discipline_abbreviation,
      COALESCE(disc.name, '') AS discipline_name,
      d.id AS department_id,
      d.name AS department_name
    FROM people p
    INNER JOIN departments d ON d.id = p.department_id
    LEFT JOIN disciplines disc ON disc.id = p.discipline_id
    WHERE p.id = ${personId}::uuid
      AND p.organization_id = ${orgId}::uuid
      AND p.archived_at IS NULL
    LIMIT 1
  `);

  const person = personResult.rows[0];
  if (!person) {
    throw new ValidationError('Person not found or archived');
  }

  const target = person.target_hours;

  // Query 2: Per-month allocations with project breakdown for last 6 months
  const allocRows = await db.execute<{
    month: string;
    project_id: string | null;
    project_name: string | null;
    hours: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    )
    SELECT
      ms.month,
      a.project_id,
      pr.name AS project_name,
      COALESCE(a.hours, 0)::int AS hours
    FROM month_series ms
    LEFT JOIN allocations a
      ON a.person_id = ${personId}::uuid
      AND to_char(a.month, 'YYYY-MM') = ms.month
      AND a.organization_id = ${orgId}::uuid
    LEFT JOIN projects pr ON pr.id = a.project_id
    ORDER BY ms.month, hours DESC
  `);

  // Query 3: Upcoming availability (next 3 months)
  const nextMonths = [
    offsetMonth(currentMonth, 1),
    offsetMonth(currentMonth, 2),
    offsetMonth(currentMonth, 3),
  ];
  const futureFrom = `${nextMonths[0]}-01`;
  const futureTo = `${nextMonths[2]}-01`;

  const futureRows = await db.execute<{
    month: string;
    total_allocated: number;
  }>(sql`
    WITH month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${futureFrom}::date, ${futureTo}::date, '1 month'::interval) AS d
    )
    SELECT
      ms.month,
      COALESCE(SUM(a.hours), 0)::int AS total_allocated
    FROM month_series ms
    LEFT JOIN allocations a
      ON a.person_id = ${personId}::uuid
      AND to_char(a.month, 'YYYY-MM') = ms.month
      AND a.organization_id = ${orgId}::uuid
    GROUP BY ms.month
    ORDER BY ms.month
  `);

  // Build trend: per-month utilization
  const trendMonths: Record<string, number> = {};
  const monthProjectMap = new Map<
    string,
    { projectId: string; projectName: string; hours: number }[]
  >();

  for (const row of allocRows.rows) {
    const m = row.month;
    if (!monthProjectMap.has(m)) monthProjectMap.set(m, []);
    if (row.project_id && row.hours > 0) {
      monthProjectMap.get(m)!.push({
        projectId: row.project_id,
        projectName: row.project_name ?? 'Unknown',
        hours: row.hours,
      });
    }
  }

  // Compute per-month utilization
  for (const [m, projects] of monthProjectMap) {
    const totalHours = projects.reduce((sum, p) => sum + p.hours, 0);
    trendMonths[m] = target > 0 ? Math.round((totalHours / target) * 1000) / 10 : 0;
  }

  // Ensure all months in range are present
  const allMonths = generateMonthRange(sixMonthsAgo, 6);
  for (const m of allMonths) {
    if (!(m in trendMonths)) trendMonths[m] = 0;
  }

  // Current month data
  const currentProjects = monthProjectMap.get(currentMonth) ?? [];
  const totalAllocated = currentProjects.reduce((sum, p) => sum + p.hours, 0);
  const utilizationPercent = target > 0 ? Math.round((totalAllocated / target) * 1000) / 10 : 0;
  const available = Math.max(0, target - totalAllocated);

  let status: 'healthy' | 'warning' | 'overloaded' | 'empty';
  if (totalAllocated === 0) status = 'empty';
  else if (utilizationPercent > 100) status = 'overloaded';
  else if (utilizationPercent > 85) status = 'warning';
  else status = 'healthy';

  // Trend direction
  const currentUtil = trendMonths[currentMonth] ?? 0;
  const oldUtil = trendMonths[sixMonthsAgo] ?? 0;
  const changePercent = Math.round((currentUtil - oldUtil) * 10) / 10;

  // Upcoming availability
  const upcomingAvailability = futureRows.rows.map((row) => ({
    month: row.month,
    available: Math.max(0, target - Number(row.total_allocated)),
  }));

  // Fill in months not in query result
  for (const m of nextMonths) {
    if (!upcomingAvailability.some((ua) => ua.month === m)) {
      upcomingAvailability.push({ month: m, available: target });
    }
  }
  upcomingAvailability.sort((a, b) => a.month.localeCompare(b.month));

  return {
    personId,
    firstName: person.first_name,
    lastName: person.last_name,
    disciplineAbbreviation: person.discipline_abbreviation,
    disciplineName: person.discipline_name,
    departmentId: person.department_id,
    departmentName: person.department_name,
    targetHoursPerMonth: target,
    currentMonth: {
      month: currentMonth,
      totalAllocated,
      utilizationPercent,
      status,
      projects: currentProjects.map((p, i) => ({
        projectId: p.projectId,
        projectName: p.projectName,
        hours: p.hours,
        percentOfTarget: target > 0 ? Math.round((p.hours / target) * 1000) / 10 : 0,
        color: CHART_PALETTE[i % CHART_PALETTE.length],
      })),
      available,
    },
    trend: {
      months: trendMonths,
      changePercent,
      direction: changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable',
    },
    upcomingAvailability,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Program Rollup (V10): program-level aggregated capacity view.
 *
 * Computes staffing completeness, discipline coverage, monthly load,
 * and per-project summary for a specific program or all programs.
 */
export async function getProgramRollup(
  orgId: string,
  monthFrom: string,
  monthTo: string,
  programId?: string,
): Promise<ProgramRollupResponse> {
  const fromDate = `${monthFrom}-01`;
  const toDate = `${monthTo}-01`;

  // Program info (if specific program)
  let program: ProgramRollupResponse['program'] = null;
  if (programId) {
    const pgResult = await db.execute<{
      id: string;
      name: string;
      project_count: number;
    }>(sql`
      SELECT pg.id, pg.name, COUNT(DISTINCT pr.id)::int AS project_count
      FROM programs pg
      LEFT JOIN projects pr ON pr.program_id = pg.id
        AND pr.organization_id = ${orgId}::uuid
        AND pr.archived_at IS NULL
      WHERE pg.id = ${programId}::uuid
        AND pg.organization_id = ${orgId}::uuid
      GROUP BY pg.id, pg.name
    `);

    if (pgResult.rows[0]) {
      program = {
        programId: pgResult.rows[0].id,
        programName: pgResult.rows[0].name,
        projectCount: pgResult.rows[0].project_count,
        totalPeople: 0, // Computed below
        peakMonthlyHours: 0, // Computed below
      };
    }
  }

  // Project filter for program scope
  const programFilter = programId ? sql` AND pr.program_id = ${programId}::uuid` : sql``;

  // Monthly load + per-project data
  const rows = await db.execute<{
    project_id: string;
    project_name: string;
    project_status: string;
    month: string;
    people_count: number;
    total_hours: number;
  }>(sql`
    WITH program_projects AS (
      SELECT pr.id, pr.name, pr.status
      FROM projects pr
      WHERE pr.organization_id = ${orgId}::uuid
        AND pr.archived_at IS NULL
        ${programFilter}
    ),
    month_series AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDate}::date, ${toDate}::date, '1 month'::interval) AS d
    )
    SELECT
      pp.id AS project_id,
      pp.name AS project_name,
      pp.status AS project_status,
      ms.month,
      COUNT(DISTINCT a.person_id)::int AS people_count,
      COALESCE(SUM(a.hours), 0)::int AS total_hours
    FROM program_projects pp
    CROSS JOIN month_series ms
    LEFT JOIN allocations a
      ON a.project_id = pp.id
      AND to_char(a.month, 'YYYY-MM') = ms.month
      AND a.organization_id = ${orgId}::uuid
    GROUP BY pp.id, pp.name, pp.status, ms.month
    ORDER BY pp.name, ms.month
  `);

  // Build monthly load and per-project summary
  const monthlyLoad: Record<string, number> = {};
  const projectMap = new Map<
    string,
    { name: string; status: string; totalPeople: number; totalHours: number; monthCount: number }
  >();
  for (const row of rows.rows) {
    const hours = Number(row.total_hours);
    monthlyLoad[row.month] = (monthlyLoad[row.month] ?? 0) + hours;

    let proj = projectMap.get(row.project_id);
    if (!proj) {
      proj = {
        name: row.project_name,
        status: row.project_status,
        totalPeople: 0,
        totalHours: 0,
        monthCount: 0,
      };
      projectMap.set(row.project_id, proj);
    }
    proj.totalPeople += row.people_count;
    proj.totalHours += hours;
    proj.monthCount++;
  }

  // Get distinct people allocated to program projects
  const peopleResult = await db.execute<{ person_id: string }>(sql`
    SELECT DISTINCT a.person_id
    FROM allocations a
    INNER JOIN projects pr ON pr.id = a.project_id
    WHERE a.organization_id = ${orgId}::uuid
      AND pr.organization_id = ${orgId}::uuid
      AND pr.archived_at IS NULL
      ${programFilter}
      AND to_char(a.month, 'YYYY-MM') >= ${monthFrom}
      AND to_char(a.month, 'YYYY-MM') <= ${monthTo}
  `);
  const totalPeople = peopleResult.rows.length;
  const peakMonthlyHours =
    Object.values(monthlyLoad).length > 0 ? Math.max(...Object.values(monthlyLoad)) : 0;

  if (program) {
    program.totalPeople = totalPeople;
    program.peakMonthlyHours = peakMonthlyHours;
  }

  // Discipline coverage
  const discRows = await db.execute<{
    discipline_id: string;
    discipline_name: string;
    abbreviation: string;
    people_count: number;
    total_allocated: number;
    avg_target: number;
  }>(sql`
    WITH program_people AS (
      SELECT DISTINCT a.person_id
      FROM allocations a
      INNER JOIN projects pr ON pr.id = a.project_id
      WHERE a.organization_id = ${orgId}::uuid
        AND pr.organization_id = ${orgId}::uuid
        AND pr.archived_at IS NULL
        ${programFilter}
        AND to_char(a.month, 'YYYY-MM') >= ${monthFrom}
        AND to_char(a.month, 'YYYY-MM') <= ${monthTo}
    ),
    org_disciplines AS (
      SELECT DISTINCT disc.id, disc.name, disc.abbreviation
      FROM disciplines disc
      INNER JOIN people p ON p.discipline_id = disc.id
      WHERE p.organization_id = ${orgId}::uuid AND p.archived_at IS NULL
    )
    SELECT
      od.id AS discipline_id,
      od.name AS discipline_name,
      od.abbreviation,
      COUNT(DISTINCT pp.person_id)::int AS people_count,
      COALESCE(SUM(a.hours), 0)::int AS total_allocated,
      COALESCE(AVG(p.target_hours_per_month), 160)::int AS avg_target
    FROM org_disciplines od
    LEFT JOIN people p ON p.discipline_id = od.id
      AND p.organization_id = ${orgId}::uuid
      AND p.archived_at IS NULL
    LEFT JOIN program_people pp ON pp.person_id = p.id
    LEFT JOIN allocations a ON a.person_id = p.id
      AND a.organization_id = ${orgId}::uuid
      AND to_char(a.month, 'YYYY-MM') >= ${monthFrom}
      AND to_char(a.month, 'YYYY-MM') <= ${monthTo}
    GROUP BY od.id, od.name, od.abbreviation
    ORDER BY od.name
  `);

  const mCount = monthCount(monthFrom, monthTo);
  const disciplineCoverage = discRows.rows.map((row) => {
    const avgTarget = Number(row.avg_target) || 160;
    const expectedHoursPerPeriod = avgTarget * mCount;
    const coveragePercent =
      expectedHoursPerPeriod > 0
        ? Math.min(
            100,
            Math.round((Number(row.total_allocated) / expectedHoursPerPeriod) * 1000) / 10,
          )
        : 0;
    const gapFte = coveragePercent < 80 ? Math.round((1 - coveragePercent / 100) * 10) / 10 : 0;

    return {
      disciplineId: row.discipline_id,
      disciplineName: row.discipline_name,
      abbreviation: row.abbreviation,
      coveragePercent,
      peopleCount: row.people_count,
      gapFte,
    };
  });

  const coveredCount = disciplineCoverage.filter((d) => d.coveragePercent >= 80).length;
  const staffingCompleteness =
    disciplineCoverage.length > 0
      ? Math.round((coveredCount / disciplineCoverage.length) * 1000) / 10
      : 100;

  const projects = Array.from(projectMap.entries()).map(([projectId, p]) => ({
    projectId,
    projectName: p.name,
    peopleCount: p.monthCount > 0 ? Math.round(p.totalPeople / p.monthCount) : 0,
    monthlyHours: p.monthCount > 0 ? Math.round(p.totalHours / p.monthCount) : 0,
    status: p.status as 'active' | 'planned' | 'archived',
  }));

  // Gap alert
  const criticalGaps = disciplineCoverage.filter((d) => d.coveragePercent < 50);
  const gapAlert =
    criticalGaps.length > 0
      ? `Critical gap in ${criticalGaps[0].disciplineName} — ${criticalGaps[0].gapFte} FTE needed`
      : undefined;

  return {
    program,
    staffingCompleteness,
    disciplineCoverage,
    monthlyLoad,
    projects,
    gapAlert,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate a human-readable period label from YYYY-MM date range.
 * e.g., "2026-01" to "2026-03" -> "Jan-Mar 2026"
 */
function periodLabel(from: string, to: string): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  if (y1 === y2 && m2 - m1 === 2) {
    const q = Math.floor((m1 - 1) / 3) + 1;
    if ((m1 - 1) % 3 === 0) return `Q${q} ${y1}`;
  }
  if (y1 === y2) return `${months[m1 - 1]}-${months[m2 - 1]} ${y1}`;
  return `${months[m1 - 1]} ${y1}-${months[m2 - 1]} ${y2}`;
}

/**
 * Period Comparison (V11): two-period delta analysis with department breakdown.
 *
 * Computes 5 comparison metrics, per-department utilization deltas,
 * and auto-generated notable changes for significant shifts.
 */
export async function getPeriodComparison(
  orgId: string,
  fromA: string,
  toA: string,
  fromB: string,
  toB: string,
): Promise<PeriodComparisonResponse> {
  const fromDateA = `${fromA}-01`;
  const toDateA = `${toA}-01`;
  const fromDateB = `${fromB}-01`;
  const toDateB = `${toB}-01`;

  // Single query with conditional aggregation for both periods
  const rows = await db.execute<{
    department_id: string;
    department_name: string;
    target_a: number;
    allocated_a: number;
    people_a: number;
    target_b: number;
    allocated_b: number;
    people_b: number;
  }>(sql`
    WITH active_people AS (
      SELECT p.id, p.department_id, d.name AS department_name, p.target_hours_per_month AS target_hours
      FROM people p
      INNER JOIN departments d ON d.id = p.department_id
      WHERE p.organization_id = ${orgId}::uuid AND p.archived_at IS NULL
    ),
    month_series_a AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDateA}::date, ${toDateA}::date, '1 month'::interval) AS d
    ),
    month_series_b AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDateB}::date, ${toDateB}::date, '1 month'::interval) AS d
    ),
    period_a AS (
      SELECT
        ap.department_id,
        ap.department_name,
        SUM(ap.target_hours)::numeric AS total_target,
        COALESCE(SUM(a.hours), 0)::numeric AS total_allocated,
        COUNT(DISTINCT ap.id)::int AS people_count
      FROM active_people ap
      CROSS JOIN month_series_a ms
      LEFT JOIN allocations a
        ON a.person_id = ap.id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.department_id, ap.department_name
    ),
    period_b AS (
      SELECT
        ap.department_id,
        ap.department_name,
        SUM(ap.target_hours)::numeric AS total_target,
        COALESCE(SUM(a.hours), 0)::numeric AS total_allocated,
        COUNT(DISTINCT ap.id)::int AS people_count
      FROM active_people ap
      CROSS JOIN month_series_b ms
      LEFT JOIN allocations a
        ON a.person_id = ap.id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.department_id, ap.department_name
    )
    SELECT
      COALESCE(pa.department_id, pb.department_id) AS department_id,
      COALESCE(pa.department_name, pb.department_name) AS department_name,
      COALESCE(pa.total_target, 0)::float AS target_a,
      COALESCE(pa.total_allocated, 0)::float AS allocated_a,
      COALESCE(pa.people_count, 0) AS people_a,
      COALESCE(pb.total_target, 0)::float AS target_b,
      COALESCE(pb.total_allocated, 0)::float AS allocated_b,
      COALESCE(pb.people_count, 0) AS people_b
    FROM period_a pa
    FULL OUTER JOIN period_b pb ON pa.department_id = pb.department_id
    ORDER BY COALESCE(pa.department_name, pb.department_name)
  `);

  // Aggregate totals
  let totalTargetA = 0,
    totalAllocatedA = 0,
    totalPeopleA = 0;
  let totalTargetB = 0,
    totalAllocatedB = 0,
    totalPeopleB = 0;

  const departments: PeriodComparisonResponse['departments'] = [];

  for (const row of rows.rows) {
    const tA = Number(row.target_a);
    const aA = Number(row.allocated_a);
    const tB = Number(row.target_b);
    const aB = Number(row.allocated_b);

    totalTargetA += tA;
    totalAllocatedA += aA;
    totalPeopleA = Math.max(totalPeopleA, Number(row.people_a));
    totalTargetB += tB;
    totalAllocatedB += aB;
    totalPeopleB = Math.max(totalPeopleB, Number(row.people_b));

    const utilA = tA > 0 ? Math.round((aA / tA) * 1000) / 10 : 0;
    const utilB = tB > 0 ? Math.round((aB / tB) * 1000) / 10 : 0;
    const delta = Math.round((utilB - utilA) * 10) / 10;

    let note: string | undefined;
    if (utilA <= 100 && utilB > 100) note = 'Crossed 100% threshold';
    else if (utilA > 100 && utilB <= 100) note = 'Dropped below 100% threshold';

    departments.push({
      departmentId: row.department_id,
      departmentName: row.department_name,
      utilizationA: utilA,
      utilizationB: utilB,
      delta,
      note,
    });
  }

  // Count overloaded people per period (need separate query for per-person data)
  const overloadRows = await db.execute<{
    overloaded_a: number;
    overloaded_b: number;
    bench_hours_a: number;
    bench_hours_b: number;
    headcount_a: number;
    headcount_b: number;
  }>(sql`
    WITH active_people AS (
      SELECT p.id, p.target_hours_per_month AS target_hours
      FROM people p
      WHERE p.organization_id = ${orgId}::uuid AND p.archived_at IS NULL
    ),
    month_series_a AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDateA}::date, ${toDateA}::date, '1 month'::interval) AS d
    ),
    month_series_b AS (
      SELECT to_char(d, 'YYYY-MM') AS month
      FROM generate_series(${fromDateB}::date, ${toDateB}::date, '1 month'::interval) AS d
    ),
    person_a AS (
      SELECT
        ap.id,
        SUM(ap.target_hours)::numeric AS total_target,
        COALESCE(SUM(a.hours), 0)::numeric AS total_allocated
      FROM active_people ap
      CROSS JOIN month_series_a ms
      LEFT JOIN allocations a
        ON a.person_id = ap.id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.id
    ),
    person_b AS (
      SELECT
        ap.id,
        SUM(ap.target_hours)::numeric AS total_target,
        COALESCE(SUM(a.hours), 0)::numeric AS total_allocated
      FROM active_people ap
      CROSS JOIN month_series_b ms
      LEFT JOIN allocations a
        ON a.person_id = ap.id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.id
    )
    SELECT
      (SELECT COUNT(*)::int FROM person_a WHERE total_target > 0 AND total_allocated / total_target > 1.0) AS overloaded_a,
      (SELECT COUNT(*)::int FROM person_b WHERE total_target > 0 AND total_allocated / total_target > 1.0) AS overloaded_b,
      (SELECT COALESCE(SUM(GREATEST(total_target - total_allocated, 0)), 0)::int FROM person_a WHERE total_target > 0 AND total_allocated / total_target < 0.8) AS bench_hours_a,
      (SELECT COALESCE(SUM(GREATEST(total_target - total_allocated, 0)), 0)::int FROM person_b WHERE total_target > 0 AND total_allocated / total_target < 0.8) AS bench_hours_b,
      (SELECT COUNT(DISTINCT id)::int FROM person_a) AS headcount_a,
      (SELECT COUNT(DISTINCT id)::int FROM person_b) AS headcount_b
  `);

  const overload = overloadRows.rows[0];

  // Compute metrics
  const utilA = totalTargetA > 0 ? Math.round((totalAllocatedA / totalTargetA) * 1000) / 10 : 0;
  const utilB = totalTargetB > 0 ? Math.round((totalAllocatedB / totalTargetB) * 1000) / 10 : 0;

  function computeSignal(
    name: string,
    valA: number,
    valB: number,
  ): 'improving' | 'worsening' | 'neutral' {
    const delta = valB - valA;
    const pct = valA !== 0 ? Math.abs(delta / valA) * 100 : Math.abs(delta);
    if (pct < 2) return 'neutral';
    if (name === 'Average Utilization') {
      // Closer to 85% is improving
      const distA = Math.abs(valA - 85);
      const distB = Math.abs(valB - 85);
      return distB < distA ? 'improving' : 'worsening';
    }
    if (name === 'Overloaded People' || name === 'Bench Hours') {
      return delta < 0 ? 'improving' : 'worsening';
    }
    return 'neutral';
  }

  function metricRow(name: string, valA: number, valB: number) {
    const delta = Math.round((valB - valA) * 10) / 10;
    const deltaPercent = valA !== 0 ? Math.round((delta / valA) * 1000) / 10 : 0;
    return {
      name,
      valueA: valA,
      valueB: valB,
      delta,
      deltaPercent,
      signal: computeSignal(name, valA, valB),
    };
  }

  const metrics = [
    metricRow('Average Utilization', utilA, utilB),
    metricRow('Headcount', overload?.headcount_a ?? 0, overload?.headcount_b ?? 0),
    metricRow('Total Allocated Hours', Math.round(totalAllocatedA), Math.round(totalAllocatedB)),
    metricRow('Overloaded People', overload?.overloaded_a ?? 0, overload?.overloaded_b ?? 0),
    metricRow('Bench Hours', overload?.bench_hours_a ?? 0, overload?.bench_hours_b ?? 0),
  ];

  // Notable changes: departments with > 10% delta
  const notableChanges: string[] = [];
  for (const dept of departments) {
    if (Math.abs(dept.delta) > 10) {
      const dir = dept.delta > 0 ? 'increased' : 'decreased';
      notableChanges.push(
        `${dept.departmentName} utilization ${dir} by ${Math.abs(dept.delta).toFixed(1)}%`,
      );
    }
  }
  for (const m of metrics) {
    if (Math.abs(m.deltaPercent) > 10 && m.name !== 'Average Utilization') {
      const dir = m.delta > 0 ? 'increased' : 'decreased';
      notableChanges.push(`${m.name} ${dir} by ${Math.abs(m.deltaPercent).toFixed(1)}%`);
    }
  }

  return {
    periodA: { from: fromA, to: toA, label: periodLabel(fromA, toA) },
    periodB: { from: fromB, to: toB, label: periodLabel(fromB, toB) },
    metrics,
    departments,
    notableChanges,
    generatedAt: new Date().toISOString(),
  };
}
