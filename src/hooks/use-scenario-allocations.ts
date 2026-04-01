'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ScenarioAllocationUpsert } from '@/features/scenarios/scenario.types';

// ---------------------------------------------------------------------------
// Scenario allocation hooks — uses ['scenario', scenarioId, ...] query keys
// NEVER shares keys with actual-data hooks
// ---------------------------------------------------------------------------

/** Row shape returned by GET /api/scenarios/:id/allocations (with JOINed fields) */
export interface ScenarioAllocationRow {
  id: string;
  scenarioId: string;
  personId: string | null;
  tempEntityId: string | null;
  projectId: string | null;
  tempProjectName: string | null;
  month: string;
  hours: number;
  isModified: boolean;
  isNew: boolean;
  isRemoved: boolean;
  promotedAt: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  projectName: string | null;
  departmentName: string | null;
  targetHours: number | null;
  archivedAt: string | null;
}

/** Fetch allocations for a specific scenario */
export function useScenarioAllocations(scenarioId: string | undefined) {
  return useQuery<ScenarioAllocationRow[]>({
    queryKey: ['scenario', scenarioId, 'allocations'],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenarioId}/allocations`);
      if (!res.ok) throw new Error('Failed to fetch scenario allocations');
      const data = await res.json();
      return data.allocations;
    },
    enabled: !!scenarioId,
  });
}

/** Upsert allocations within a scenario */
export function useUpsertScenarioAllocations(scenarioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allocations: ScenarioAllocationUpsert[]) => {
      const res = await fetch(`/api/scenarios/${scenarioId}/allocations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to upsert scenario allocations');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate ONLY scenario-specific keys — never actual data keys
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'allocations'] });
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'impact'] });
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'comparison'] });
    },
  });
}
