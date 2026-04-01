'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { PersonDetailResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching person 360 detail data.
 * Returns current month breakdown, 6-month trend, and 3-month forward availability.
 * Uses enabled guard since personId may be undefined when no person is selected.
 */
export function usePersonSummary(
  personId: string | undefined,
): UseQueryResult<PersonDetailResponse> {
  return useQuery<PersonDetailResponse>({
    queryKey: ['person-summary', personId],
    queryFn: async () => {
      const response = await fetch(
        `/api/analytics/person-summary?personId=${personId}&detail=true`,
      );
      if (!response.ok) throw new Error(`Failed to fetch person summary: ${response.status}`);
      return response.json();
    },
    enabled: !!personId,
    staleTime: 60_000,
  });
}
