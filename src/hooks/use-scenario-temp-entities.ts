'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  ScenarioTempEntity,
  CreateTempEntityRequest,
} from '@/features/scenarios/scenario.types';

// ---------------------------------------------------------------------------
// Temp entity hooks — uses ['scenario', scenarioId, 'temp-entities'] key
// ---------------------------------------------------------------------------

export function useScenarioTempEntities(scenarioId: string | undefined) {
  return useQuery<ScenarioTempEntity[]>({
    queryKey: ['scenario', scenarioId, 'temp-entities'],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenarioId}/temp-entities`);
      if (!res.ok) throw new Error('Failed to fetch temp entities');
      const data = await res.json();
      return data.entities;
    },
    enabled: !!scenarioId,
  });
}

export function useCreateTempEntity(scenarioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTempEntityRequest) => {
      const res = await fetch(`/api/scenarios/${scenarioId}/temp-entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to create temp entity');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'temp-entities'] });
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'allocations'] });
    },
  });
}

export function useDeleteTempEntity(scenarioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityId: string) => {
      const res = await fetch(`/api/scenarios/${scenarioId}/temp-entities?entityId=${entityId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to delete temp entity');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'temp-entities'] });
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'allocations'] });
    },
  });
}
