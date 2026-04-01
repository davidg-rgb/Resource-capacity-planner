'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ConflictsResponse } from '@/features/analytics/analytics.types';

/**
 * TanStack Query hook for fetching resource conflicts (over-allocated people).
 * Returns people allocated >100% with per-project breakdown and resolution suggestions.
 */
export function useConflicts(month?: string, months?: number): UseQueryResult<ConflictsResponse> {
  return useQuery<ConflictsResponse>({
    queryKey: ['conflicts', month, months],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      if (months !== undefined) params.set('months', String(months));
      const response = await fetch(`/api/analytics/conflicts?${params}`);
      if (!response.ok) throw new Error(`Failed to fetch conflicts: ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });
}
