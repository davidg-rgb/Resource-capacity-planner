'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ProgramRollupResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching program rollup data.
 * Returns program-level aggregated capacity with discipline coverage.
 * If programId is omitted, returns data for all programs combined.
 */
export function useProgramRollup(
  monthFrom: string,
  monthTo: string,
  programId?: string,
): UseQueryResult<ProgramRollupResponse> {
  return useQuery<ProgramRollupResponse>({
    queryKey: ['program-rollup', monthFrom, monthTo, programId],
    queryFn: async () => {
      const params = new URLSearchParams({ from: monthFrom, to: monthTo });
      if (programId) params.set('programId', programId);
      const response = await fetch(`/api/analytics/program-rollup?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch program rollup: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
