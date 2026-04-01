'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  Scenario,
  ScenarioListItem,
  CreateScenarioRequest,
  UpdateScenarioRequest,
} from '@/features/scenarios/scenario.types';

// ---------------------------------------------------------------------------
// Scenario CRUD hooks — uses ['scenario', ...] query key prefix
// NEVER shares keys with actual-data hooks
// ---------------------------------------------------------------------------

/** List all scenarios for the current org */
export function useScenarios() {
  return useQuery<ScenarioListItem[]>({
    queryKey: ['scenario', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/scenarios');
      if (!res.ok) throw new Error('Failed to fetch scenarios');
      const data = await res.json();
      return data.scenarios;
    },
  });
}

/** Get a single scenario by ID */
export function useScenario(scenarioId: string | undefined) {
  return useQuery<Scenario>({
    queryKey: ['scenario', scenarioId],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenarioId}`);
      if (!res.ok) throw new Error('Failed to fetch scenario');
      const data = await res.json();
      return data.scenario;
    },
    enabled: !!scenarioId,
  });
}

/** Create a new scenario */
export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScenarioRequest) => {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to create scenario');
      }
      const result = await res.json();
      return result.scenario as Scenario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario', 'list'] });
    },
  });
}

/** Update a scenario */
export function useUpdateScenario(scenarioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateScenarioRequest) => {
      const res = await fetch(`/api/scenarios/${scenarioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to update scenario');
      }
      const result = await res.json();
      return result.scenario as Scenario;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId] });
      queryClient.invalidateQueries({ queryKey: ['scenario', 'list'] });
    },
  });
}

/** Delete a scenario */
export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scenarioId: string) => {
      const res = await fetch(`/api/scenarios/${scenarioId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to delete scenario');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario', 'list'] });
    },
  });
}
