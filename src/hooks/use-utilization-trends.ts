'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { UtilizationTrendsResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching utilization trends data.
 * Returns 6-month entity utilization history with direction signals.
 * Uses a fixed 6-month window (no from/to params needed).
 */
export function useUtilizationTrends(
  groupBy: 'department' | 'person',
  limit?: number,
): UseQueryResult<UtilizationTrendsResponse> {
  return useQuery<UtilizationTrendsResponse>({
    queryKey: ['utilization-trends', groupBy, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ groupBy });
      if (limit !== undefined) params.set('limit', String(limit));
      const response = await fetch(`/api/analytics/utilization-trends?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch utilization trends: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
