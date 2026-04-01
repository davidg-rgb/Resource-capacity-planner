'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { DisciplineDemandResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching discipline demand data.
 * Returns per-discipline supply vs demand per month with sustained deficit detection.
 */
export function useDisciplineDemand(
  monthFrom: string,
  monthTo: string,
  filters?: { departmentId?: string },
): UseQueryResult<DisciplineDemandResponse> {
  return useQuery<DisciplineDemandResponse>({
    queryKey: ['discipline-demand', monthFrom, monthTo, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ from: monthFrom, to: monthTo });
      if (filters?.departmentId) params.set('departmentId', filters.departmentId);
      const response = await fetch(`/api/analytics/discipline-demand?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch discipline demand: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
