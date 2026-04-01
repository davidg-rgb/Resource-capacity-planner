'use client';

import { useQuery } from '@tanstack/react-query';

import type { DashboardKPIs, HeatMapResponse } from '@/features/analytics/analytics.types';
import type {
  ScenarioImpact,
  ScenarioComparisonResponse,
} from '@/features/scenarios/scenario.types';

// ---------------------------------------------------------------------------
// Scenario analytics hooks — uses ['scenario', scenarioId, ...] query keys
// NEVER shares keys with actual-data hooks
// ---------------------------------------------------------------------------

/** Scenario dashboard KPIs */
export function useScenarioDashboardKPIs(
  scenarioId: string | undefined,
  monthFrom: string,
  monthTo: string,
) {
  return useQuery<DashboardKPIs>({
    queryKey: ['scenario', scenarioId, 'analytics', 'dashboard-kpis', monthFrom, monthTo],
    queryFn: async () => {
      const res = await fetch(
        `/api/scenarios/${scenarioId}/analytics/dashboard?from=${monthFrom}&to=${monthTo}`,
      );
      if (!res.ok) throw new Error('Failed to fetch scenario KPIs');
      return res.json();
    },
    enabled: !!scenarioId,
    staleTime: 30_000,
  });
}

/** Scenario team heat map */
export function useScenarioTeamHeatMap(
  scenarioId: string | undefined,
  monthFrom: string,
  monthTo: string,
) {
  return useQuery<HeatMapResponse>({
    queryKey: ['scenario', scenarioId, 'analytics', 'team-heatmap', monthFrom, monthTo],
    queryFn: async () => {
      const res = await fetch(
        `/api/scenarios/${scenarioId}/analytics/team-heatmap?from=${monthFrom}&to=${monthTo}`,
      );
      if (!res.ok) throw new Error('Failed to fetch scenario heat map');
      return res.json();
    },
    enabled: !!scenarioId,
    staleTime: 30_000,
  });
}

/** Scenario impact preview (actual vs scenario delta) */
export function useScenarioImpact(
  scenarioId: string | undefined,
  monthFrom: string,
  monthTo: string,
) {
  return useQuery<ScenarioImpact>({
    queryKey: ['scenario', scenarioId, 'impact', monthFrom, monthTo],
    queryFn: async () => {
      const res = await fetch(
        `/api/scenarios/${scenarioId}/analytics/impact?from=${monthFrom}&to=${monthTo}`,
      );
      if (!res.ok) throw new Error('Failed to fetch scenario impact');
      return res.json();
    },
    enabled: !!scenarioId,
    staleTime: 30_000,
  });
}

/** Scenario comparison (side-by-side actual vs scenario) */
export function useScenarioComparison(
  scenarioId: string | undefined,
  monthFrom: string,
  monthTo: string,
) {
  return useQuery<ScenarioComparisonResponse>({
    queryKey: ['scenario', scenarioId, 'comparison', monthFrom, monthTo],
    queryFn: async () => {
      const res = await fetch(
        `/api/scenarios/${scenarioId}/analytics/comparison?from=${monthFrom}&to=${monthTo}`,
      );
      if (!res.ok) throw new Error('Failed to fetch scenario comparison');
      return res.json();
    },
    enabled: !!scenarioId,
    staleTime: 30_000,
  });
}
