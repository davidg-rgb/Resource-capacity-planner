'use client';

import { useQuery } from '@tanstack/react-query';

import type { HeatMapFilters, HeatMapResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching team heat map data.
 * Builds query params from filters and caches with 60s staleTime
 * to avoid excessive re-fetches for analytics data.
 */
export function useTeamHeatMap(filters: HeatMapFilters) {
  return useQuery<HeatMapResponse>({
    queryKey: ['team-heatmap', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: filters.monthFrom,
        to: filters.monthTo,
      });

      if (filters.departmentId) {
        params.set('dept', filters.departmentId);
      }
      if (filters.disciplineId) {
        params.set('disc', filters.disciplineId);
      }

      const response = await fetch(`/api/analytics/team-heatmap?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch heat map data: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 60_000,
  });
}
