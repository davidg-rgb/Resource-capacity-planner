'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { CapacityForecastResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching capacity forecast data.
 * Returns supply vs demand per month with gap classification.
 */
export function useCapacityForecast(
  monthFrom: string,
  monthTo: string,
  filters?: { projectId?: string; departmentId?: string },
): UseQueryResult<CapacityForecastResponse> {
  return useQuery<CapacityForecastResponse>({
    queryKey: ['capacity-forecast', monthFrom, monthTo, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ from: monthFrom, to: monthTo });
      if (filters?.projectId) params.set('projectId', filters.projectId);
      if (filters?.departmentId) params.set('departmentId', filters.departmentId);
      const response = await fetch(`/api/analytics/capacity-forecast?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch capacity forecast: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
