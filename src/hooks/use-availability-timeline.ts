'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { AvailabilityTimelineResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching availability timeline data.
 * Returns per-person per-month allocation with project breakdown grouped by department.
 */
export function useAvailabilityTimeline(
  monthFrom: string,
  monthTo: string,
  filters?: { departmentId?: string; disciplineId?: string; availableOnly?: boolean },
): UseQueryResult<AvailabilityTimelineResponse> {
  return useQuery<AvailabilityTimelineResponse>({
    queryKey: ['availability-timeline', monthFrom, monthTo, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ from: monthFrom, to: monthTo });
      if (filters?.departmentId) params.set('departmentId', filters.departmentId);
      if (filters?.disciplineId) params.set('disciplineId', filters.disciplineId);
      if (filters?.availableOnly) params.set('availableOnly', 'true');
      const response = await fetch(`/api/analytics/availability-timeline?${params}`);
      if (!response.ok)
        throw new Error(`Failed to fetch availability timeline: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
