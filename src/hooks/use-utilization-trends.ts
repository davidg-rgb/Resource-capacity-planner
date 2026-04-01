'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { UtilizationTrendsResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching utilization trends data.
 * Returns entity utilization history with direction signals.
 * Accepts optional from/to date params (YYYY-MM); falls back to a 6-month window on the server.
 */
export function useUtilizationTrends(
  groupBy: 'department' | 'person',
  limit?: number,
  from?: string,
  to?: string,
): UseQueryResult<UtilizationTrendsResponse> {
  return useQuery<UtilizationTrendsResponse>({
    queryKey: ['utilization-trends', groupBy, limit, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ groupBy });
      if (limit !== undefined) params.set('limit', String(limit));
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const response = await fetch(`/api/analytics/utilization-trends?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch utilization trends: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
