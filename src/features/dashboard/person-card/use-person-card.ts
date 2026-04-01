'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { PersonSummaryResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching person 360 summary data.
 * Enabled only when personId is non-null (panel is open).
 * Cached for 2 minutes to avoid redundant fetches when toggling the card.
 */
export function usePersonSummary(personId: string | null): UseQueryResult<PersonSummaryResponse> {
  return useQuery<PersonSummaryResponse>({
    queryKey: ['person-summary', personId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/person-summary?personId=${personId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch person summary: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!personId,
    staleTime: 2 * 60_000,
  });
}
