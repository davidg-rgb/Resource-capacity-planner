'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { AvailabilitySearchResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching availability search results.
 * Returns ranked list of available people with filtering and sorting.
 */
export function useAvailabilitySearch(
  monthFrom: string,
  monthTo: string,
  filters?: {
    disciplineId?: string;
    departmentId?: string;
    minHours?: number;
    sort?: 'available' | 'utilization' | 'name';
  },
): UseQueryResult<AvailabilitySearchResponse> {
  return useQuery<AvailabilitySearchResponse>({
    queryKey: ['availability-search', monthFrom, monthTo, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ from: monthFrom, to: monthTo });
      if (filters?.disciplineId) params.set('disciplineId', filters.disciplineId);
      if (filters?.departmentId) params.set('departmentId', filters.departmentId);
      if (filters?.minHours !== undefined) params.set('minHours', String(filters.minHours));
      if (filters?.sort) params.set('sort', filters.sort);
      const response = await fetch(`/api/analytics/availability?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch availability search: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
