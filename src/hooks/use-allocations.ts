'use client';

import { useQuery } from '@tanstack/react-query';

import type { FlatAllocation } from '@/features/allocations/allocation.types';

/** Fetch allocations for a specific person (flat format with project names) */
export function useAllocations(personId: string | undefined) {
  return useQuery<FlatAllocation[]>({
    queryKey: ['allocations', personId],
    queryFn: async () => {
      const res = await fetch(`/api/allocations?personId=${personId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to fetch allocations');
      }
      const data = await res.json();
      return data.allocations;
    },
    enabled: !!personId,
  });
}

/** Fetch single person details (for targetHoursPerMonth, name display) */
export function usePersonDetail(personId: string | undefined) {
  return useQuery({
    queryKey: ['person', personId],
    queryFn: async () => {
      const res = await fetch(`/api/people/${personId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to fetch person');
      }
      const data = await res.json();
      return data.person as {
        id: string;
        firstName: string;
        lastName: string;
        targetHoursPerMonth: number;
      };
    },
    enabled: !!personId,
  });
}
