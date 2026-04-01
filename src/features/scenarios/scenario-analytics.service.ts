import { sql } from 'drizzle-orm';

import { db } from '@/db';
import { validateMonthRange } from '@/features/analytics/analytics.service';

import type {
  DashboardKPIs,
  HeatMapResponse,
  DepartmentGroup,
} from '@/features/analytics/analytics.types';
import type {
  ScenarioImpact,
  ScenarioComparisonResponse,
  ScenarioComparisonRow,
} from './scenario.types';

// ---------------------------------------------------------------------------
// Scenario-specific analytics — mirrors analytics.service.ts but reads from
// scenario_allocations. DOES NOT modify analytics.service.ts.
// ---------------------------------------------------------------------------

/**
 * Dashboard KPIs computed from scenario allocations.
 * Same shape as getDashboardKPIs but reads from scenario_allocations.
 */
export async function getScenarioDashboardKPIs(
  orgId: string,
  scenarioId: string,
  monthFrom: string,
  monthTo: string,
): Promise<DashboardKPIs> {
  const { from, to } = validateMonthRange(monthFrom, monthTo);
  const fromDate = `${from}-01`;
  const toDate = `${to}-01`;

  const result = await db.execute<{
    total_people: number;
    utilization_percent: number;
    overloaded_count: number;
    underutilized_count: number;
  }>(sql`
    WITH scenario_people AS (
      SELECT DISTINCT sa.person_id
      FROM scenario_allocations sa
      WHERE sa.scenario_id = ${scenarioId}
        AND sa.organization_id = ${orgId}
        AND sa.person_id IS NOT NULL
        AND sa.is_removed = false
        AND sa.month >= ${fromDate}::date
        AND sa.month <= ${toDate}::date
    ),
    person_totals AS (
      SELECT
        sa.person_id,
        SUM(sa.hours) as total_hours,
        p.target_hours_per_month
      FROM scenario_allocations sa
      JOIN people p ON p.id = sa.person_id
      WHERE sa.scenario_id = ${scenarioId}
        AND sa.organization_id = ${orgId}
        AND sa.person_id IS NOT NULL
        AND sa.is_removed = false
        AND sa.month >= ${fromDate}::date
        AND sa.month <= ${toDate}::date
      GROUP BY sa.person_id, p.target_hours_per_month
    ),
    month_count AS (
      SELECT (
        (EXTRACT(YEAR FROM ${toDate}::date) - EXTRACT(YEAR FROM ${fromDate}::date)) * 12 +
        EXTRACT(MONTH FROM ${toDate}::date) - EXTRACT(MONTH FROM ${fromDate}::date) + 1
      ) as months
    )
    SELECT
      (SELECT count(*) FROM scenario_people)::int as total_people,
      COALESCE(
        ROUND(
          AVG(
            CASE WHEN pt.target_hours_per_month > 0
            THEN (pt.total_hours::numeric / (pt.target_hours_per_month * (SELECT months FROM month_count))) * 100
            ELSE 0 END
          )
        , 1), 0
      ) as utilization_percent,
      COUNT(*) FILTER (
        WHERE pt.total_hours > pt.target_hours_per_month * (SELECT months FROM month_count)
      )::int as overloaded_count,
      COUNT(*) FILTER (
        WHERE pt.total_hours < pt.target_hours_per_month * (SELECT months FROM month_count) * 0.5
      )::int as underutilized_count
    FROM person_totals pt
  `);

  const row = result.rows[0];

  return {
    totalPeople: Number(row?.total_people ?? 0),
    utilizationPercent: Number(row?.utilization_percent ?? 0),
    overloadedCount: Number(row?.overloaded_count ?? 0),
    underutilizedCount: Number(row?.underutilized_count ?? 0),
  };
}

/**
 * Team heat map from scenario allocations.
 * Same shape as getTeamHeatMap but reads from scenario_allocations.
 */
export async function getScenarioTeamHeatMap(
  orgId: string,
  scenarioId: string,
  monthFrom: string,
  monthTo: string,
): Promise<HeatMapResponse> {
  const { from, to } = validateMonthRange(monthFrom, monthTo);
  const fromDate = `${from}-01`;
  const toDate = `${to}-01`;

  const rows = await db.execute<{
    person_id: string;
    first_name: string;
    last_name: string;
    target_hours_per_month: number;
    department_id: string;
    department_name: string;
    discipline_abbreviation: string;
    month: string;
    total_hours: number;
  }>(sql`
    WITH months AS (
      SELECT generate_series(
        ${fromDate}::date,
        ${toDate}::date,
        '1 month'::interval
      )::date AS month
    ),
    active_people AS (
      SELECT p.id, p.first_name, p.last_name, p.target_hours_per_month,
             p.department_id, d.name AS department_name,
             disc.abbreviation AS discipline_abbreviation
      FROM people p
      JOIN departments d ON d.id = p.department_id
      JOIN disciplines disc ON disc.id = p.discipline_id
      WHERE p.organization_id = ${orgId}
        AND p.archived_at IS NULL
    ),
    grid AS (
      SELECT ap.id AS person_id, ap.first_name, ap.last_name,
             ap.target_hours_per_month, ap.department_id, ap.department_name,
             ap.discipline_abbreviation,
             m.month
      FROM active_people ap
      CROSS JOIN months m
    ),
    scenario_hours AS (
      SELECT sa.person_id, sa.month, SUM(sa.hours) AS total_hours
      FROM scenario_allocations sa
      WHERE sa.scenario_id = ${scenarioId}
        AND sa.organization_id = ${orgId}
        AND sa.is_removed = false
        AND sa.month >= ${fromDate}::date
        AND sa.month <= ${toDate}::date
      GROUP BY sa.person_id, sa.month
    )
    SELECT
      g.person_id, g.first_name, g.last_name, g.target_hours_per_month,
      g.department_id, g.department_name, g.discipline_abbreviation,
      to_char(g.month, 'YYYY-MM') AS month,
      COALESCE(sh.total_hours, 0)::int AS total_hours
    FROM grid g
    LEFT JOIN scenario_hours sh ON sh.person_id = g.person_id AND sh.month = g.month
    ORDER BY g.department_name, g.last_name, g.first_name, g.month
  `);

  // Build response in same shape as HeatMapResponse
  const deptMap = new Map<string, DepartmentGroup>();
  const monthSet = new Set<string>();

  for (const row of rows.rows) {
    const deptId = row.department_id as string;
    const month = row.month as string;
    monthSet.add(month);

    if (!deptMap.has(deptId)) {
      deptMap.set(deptId, {
        departmentId: deptId,
        departmentName: row.department_name as string,
        people: [],
      });
    }

    const dept = deptMap.get(deptId)!;
    const personId = row.person_id as string;
    let person = dept.people.find((p) => p.personId === personId);

    if (!person) {
      person = {
        personId,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        targetHours: Number(row.target_hours_per_month),
        disciplineAbbreviation: row.discipline_abbreviation as string,
        months: {},
      };
      dept.people.push(person);
    }

    person.months[month] = Number(row.total_hours);
  }

  const months = Array.from(monthSet).sort();

  return {
    departments: Array.from(deptMap.values()),
    months,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Impact preview: compare scenario KPIs against actual KPIs.
 */
export async function getScenarioImpact(
  orgId: string,
  scenarioId: string,
  monthFrom: string,
  monthTo: string,
): Promise<ScenarioImpact> {
  // Get actual KPIs using raw query (separate from analytics.service to avoid import)
  const { from, to } = validateMonthRange(monthFrom, monthTo);
  const fromDate = `${from}-01`;
  const toDate = `${to}-01`;

  const actualResult = await db.execute<{
    utilization: number;
    overloaded: number;
    bench_hours: number;
  }>(sql`
    WITH person_totals AS (
      SELECT
        a.person_id,
        SUM(a.hours) as total_hours,
        p.target_hours_per_month
      FROM allocations a
      JOIN people p ON p.id = a.person_id
      WHERE a.organization_id = ${orgId}
        AND p.archived_at IS NULL
        AND a.month >= ${fromDate}::date
        AND a.month <= ${toDate}::date
      GROUP BY a.person_id, p.target_hours_per_month
    ),
    month_count AS (
      SELECT (
        (EXTRACT(YEAR FROM ${toDate}::date) - EXTRACT(YEAR FROM ${fromDate}::date)) * 12 +
        EXTRACT(MONTH FROM ${toDate}::date) - EXTRACT(MONTH FROM ${fromDate}::date) + 1
      ) as months
    )
    SELECT
      COALESCE(ROUND(AVG(
        CASE WHEN pt.target_hours_per_month > 0
        THEN (pt.total_hours::numeric / (pt.target_hours_per_month * (SELECT months FROM month_count))) * 100
        ELSE 0 END
      ), 1), 0) as utilization,
      COUNT(*) FILTER (
        WHERE pt.total_hours > pt.target_hours_per_month * (SELECT months FROM month_count)
      )::int as overloaded,
      COALESCE(SUM(
        GREATEST(0, pt.target_hours_per_month * (SELECT months FROM month_count) - pt.total_hours)
      ), 0)::int as bench_hours
    FROM person_totals pt
  `);

  const actualRow = actualResult.rows[0];

  const scenarioKPIs = await getScenarioDashboardKPIs(orgId, scenarioId, from, to);

  // Count new conflicts in scenario
  const conflictResult = await db.execute<{ new_conflicts: number }>(sql`
    WITH scenario_person_totals AS (
      SELECT sa.person_id, sa.month, SUM(sa.hours) as total_hours
      FROM scenario_allocations sa
      WHERE sa.scenario_id = ${scenarioId}
        AND sa.organization_id = ${orgId}
        AND sa.is_removed = false
        AND sa.person_id IS NOT NULL
        AND sa.month >= ${fromDate}::date
        AND sa.month <= ${toDate}::date
      GROUP BY sa.person_id, sa.month
    ),
    actual_person_totals AS (
      SELECT a.person_id, a.month, SUM(a.hours) as total_hours
      FROM allocations a
      WHERE a.organization_id = ${orgId}
        AND a.month >= ${fromDate}::date
        AND a.month <= ${toDate}::date
      GROUP BY a.person_id, a.month
    ),
    new_conflicts AS (
      SELECT DISTINCT spt.person_id
      FROM scenario_person_totals spt
      JOIN people p ON p.id = spt.person_id
      LEFT JOIN actual_person_totals apt ON apt.person_id = spt.person_id AND apt.month = spt.month
      WHERE spt.total_hours > p.target_hours_per_month
        AND (apt.total_hours IS NULL OR apt.total_hours <= p.target_hours_per_month)
    )
    SELECT count(*)::int as new_conflicts FROM new_conflicts
  `);

  const conflictRow = conflictResult.rows[0];

  return {
    actualUtilization: Number(actualRow?.utilization ?? 0),
    scenarioUtilization: scenarioKPIs.utilizationPercent,
    actualOverloaded: Number(actualRow?.overloaded ?? 0),
    scenarioOverloaded: scenarioKPIs.overloadedCount,
    actualBenchHours: Number(actualRow?.bench_hours ?? 0),
    scenarioBenchHours: 0, // Computed separately if needed
    newConflicts: Number(conflictRow?.new_conflicts ?? 0),
  };
}

/**
 * Side-by-side comparison data for the comparison view.
 */
export async function getScenarioComparison(
  orgId: string,
  scenarioId: string,
  monthFrom: string,
  monthTo: string,
): Promise<ScenarioComparisonResponse> {
  const { from, to } = validateMonthRange(monthFrom, monthTo);
  const fromDate = `${from}-01`;
  const toDate = `${to}-01`;

  const rows = await db.execute<{
    person_id: string | null;
    temp_entity_id: string | null;
    person_name: string;
    department_name: string;
    actual_hours: number;
    target_hours: number;
    scenario_hours: number;
    is_new: boolean;
    is_removed: boolean;
  }>(sql`
    WITH actual_totals AS (
      SELECT
        a.person_id,
        SUM(a.hours) as total_hours
      FROM allocations a
      WHERE a.organization_id = ${orgId}
        AND a.month >= ${fromDate}::date
        AND a.month <= ${toDate}::date
      GROUP BY a.person_id
    ),
    scenario_totals AS (
      SELECT
        sa.person_id,
        sa.temp_entity_id,
        SUM(sa.hours) as total_hours,
        bool_or(sa.is_new) as has_new,
        bool_or(sa.is_removed) as has_removed
      FROM scenario_allocations sa
      WHERE sa.scenario_id = ${scenarioId}
        AND sa.organization_id = ${orgId}
        AND sa.month >= ${fromDate}::date
        AND sa.month <= ${toDate}::date
      GROUP BY sa.person_id, sa.temp_entity_id
    ),
    all_people AS (
      SELECT DISTINCT
        COALESCE(st.person_id, at2.person_id) as person_id,
        st.temp_entity_id
      FROM scenario_totals st
      FULL OUTER JOIN actual_totals at2 ON at2.person_id = st.person_id
    )
    SELECT
      ap.person_id,
      ap.temp_entity_id,
      COALESCE(p.first_name || ' ' || p.last_name, te.name, 'Unknown') as person_name,
      COALESCE(d.name, '') as department_name,
      COALESCE(at3.total_hours, 0)::int as actual_hours,
      COALESCE(p.target_hours_per_month, te.target_hours_per_month, 160) as target_hours,
      COALESCE(st2.total_hours, 0)::int as scenario_hours,
      COALESCE(st2.has_new, false) as is_new,
      COALESCE(st2.has_removed, false) as is_removed
    FROM all_people ap
    LEFT JOIN people p ON p.id = ap.person_id
    LEFT JOIN scenario_temp_entities te ON te.id = ap.temp_entity_id
    LEFT JOIN departments d ON d.id = COALESCE(p.department_id, te.department_id)
    LEFT JOIN actual_totals at3 ON at3.person_id = ap.person_id
    LEFT JOIN scenario_totals st2 ON st2.person_id IS NOT DISTINCT FROM ap.person_id
      AND st2.temp_entity_id IS NOT DISTINCT FROM ap.temp_entity_id
    ORDER BY department_name, person_name
  `);

  const comparisonRows: ScenarioComparisonRow[] = rows.rows.map((row) => {
    const actualHours = Number(row.actual_hours);
    const scenarioHours = Number(row.scenario_hours);
    const targetHours = Number(row.target_hours);
    const monthCount = (() => {
      const [y1, m1] = from.split('-').map(Number);
      const [y2, m2] = to.split('-').map(Number);
      return (y2! - y1!) * 12 + (m2! - m1!) + 1;
    })();
    const totalTarget = targetHours * monthCount;

    return {
      personId: row.person_id as string | null,
      tempEntityId: row.temp_entity_id as string | null,
      personName: row.person_name as string,
      departmentName: row.department_name as string,
      actualHours,
      actualUtilization: totalTarget > 0 ? Math.round((actualHours / totalTarget) * 100) : 0,
      scenarioHours,
      scenarioUtilization: totalTarget > 0 ? Math.round((scenarioHours / totalTarget) * 100) : 0,
      deltaHours: scenarioHours - actualHours,
      isNew: Boolean(row.is_new),
      isRemoved: Boolean(row.is_removed),
      isOverloaded: scenarioHours > totalTarget,
      targetHours,
    };
  });

  const actualTotal = comparisonRows.reduce((sum, r) => sum + r.actualHours, 0);
  const scenarioTotal = comparisonRows.reduce((sum, r) => sum + r.scenarioHours, 0);
  const totalTarget = comparisonRows.reduce((sum, r) => sum + r.targetHours, 0);
  const monthCount = (() => {
    const [y1, m1] = from.split('-').map(Number);
    const [y2, m2] = to.split('-').map(Number);
    return (y2! - y1!) * 12 + (m2! - m1!) + 1;
  })();
  const totalTargetRange = totalTarget * monthCount;

  return {
    rows: comparisonRows,
    summary: {
      actualTotalHours: actualTotal,
      scenarioTotalHours: scenarioTotal,
      actualUtilization:
        totalTargetRange > 0 ? Math.round((actualTotal / totalTargetRange) * 100) : 0,
      scenarioUtilization:
        totalTargetRange > 0 ? Math.round((scenarioTotal / totalTargetRange) * 100) : 0,
      deltaHours: scenarioTotal - actualTotal,
      newConflicts: comparisonRows
        .filter((r) => r.isOverloaded && r.actualUtilization <= 100)
        .map((r) => r.personName),
    },
  };
}
