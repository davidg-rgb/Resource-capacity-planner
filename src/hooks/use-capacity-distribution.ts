'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { CapacityDistributionResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching capacity distribution data.
 * Returns stacked hours breakdown by project, department, or discipline.
 */
export function useCapacityDistribution(
  monthFrom: string,
  monthTo: string,
  groupBy: 'project' | 'department' | 'discipline',
  limit?: number,
): UseQueryResult<CapacityDistributionResponse> {
  return useQuery<CapacityDistributionResponse>({
    queryKey: ['capacity-distribution', monthFrom, monthTo, groupBy, limit],
    queryFn: async () => {
      const params = new URLSearchParams({ from: monthFrom, to: monthTo, groupBy });
      if (limit !== undefined) params.set('limit', String(limit));
      const response = await fetch(`/api/analytics/capacity-distribution?${params}`);
      if (!response.ok)
        throw new Error(`Failed to fetch capacity distribution: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
