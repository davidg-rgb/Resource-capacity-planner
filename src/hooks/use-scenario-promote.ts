'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PromoteResult } from '@/features/scenarios/scenario.types';

// ---------------------------------------------------------------------------
// Promote-to-actual hook — invalidates BOTH scenario and actual caches
// (promotion is the ONE place where scenario writes affect actual data)
// ---------------------------------------------------------------------------

export function usePromoteAllocations(scenarioId: string) {
  const queryClient = useQueryClient();

  return useMutation<PromoteResult, Error, { allocationIds: string[]; confirmation: boolean }>({
    mutationFn: async (data) => {
      const res = await fetch(`/api/scenarios/${scenarioId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to promote allocations');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate scenario data
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId] });
      // Invalidate actual data caches (promotion modifies real allocations)
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['department-utilization'] });
      queryClient.invalidateQueries({ queryKey: ['team-heatmap'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alert-count'] });
    },
  });
}
