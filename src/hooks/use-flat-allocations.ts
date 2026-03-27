'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import type { FlatTableResponse } from '@/features/allocations/allocation.types';

/** Fetch paginated flat allocations with filters */
export function useFlatAllocations(filters: Record<string, string | undefined>) {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, string>;

  return useQuery<FlatTableResponse>({
    queryKey: ['allocations-flat', cleanFilters],
    queryFn: async () => {
      const params = new URLSearchParams(cleanFilters);
      const res = await fetch(`/api/allocations/flat?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to fetch allocations');
      }
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}
