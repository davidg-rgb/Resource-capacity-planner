import { sql } from 'drizzle-orm';

import { db } from '@/db';
import { generateMonthRange } from '@/lib/date-utils';

import type {
  DashboardKPIs,
  DepartmentGroup,
  DepartmentUtilization,
  DisciplineBreakdown,
  HeatMapPerson,
  HeatMapResponse,
} from './analytics.types';

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
        d.name AS department_name
      FROM people p
      INNER JOIN departments d ON d.id = p.department_id
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
      g.month,
      COALESCE(SUM(a.hours), 0)::int AS total_hours
    FROM grid g
    LEFT JOIN allocations a
      ON a.person_id = g.person_id
      AND to_char(a.month, 'YYYY-MM') = g.month
      AND a.organization_id = ${orgId}::uuid
    GROUP BY
      g.person_id, g.first_name, g.last_name, g.target_hours,
      g.department_id, g.department_name, g.month
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
  const months = monthCount(monthFrom, monthTo);

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
        ap.target_hours * ${months} AS total_target,
        COALESCE(SUM(a.hours), 0) AS total_allocated
      FROM active_people ap
      CROSS JOIN month_series ms
      LEFT JOIN allocations a
        ON a.person_id = ap.person_id
        AND to_char(a.month, 'YYYY-MM') = ms.month
        AND a.organization_id = ${orgId}::uuid
      GROUP BY ap.person_id, ap.target_hours
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
  const months = monthCount(monthFrom, monthTo);

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
        SUM(ap.target_hours) * ${months} AS total_target,
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
