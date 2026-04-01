'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { PeriodComparisonResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching period comparison data.
 * Returns two-period delta analysis with department breakdown and notable changes.
 * Uses enabled guard since all 4 date params are required.
 */
export function usePeriodComparison(
  fromA: string,
  toA: string,
  fromB: string,
  toB: string,
): UseQueryResult<PeriodComparisonResponse> {
  return useQuery<PeriodComparisonResponse>({
    queryKey: ['period-comparison', fromA, toA, fromB, toB],
    queryFn: async () => {
      const params = new URLSearchParams({ fromA, toA, fromB, toB });
      const response = await fetch(`/api/analytics/period-comparison?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch period comparison: ${response.status}`);
      return response.json();
    },
    enabled: !!(fromA && toA && fromB && toB),
    staleTime: 60_000,
  });
}
