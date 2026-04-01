'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ScenarioAllocationUpsert } from '@/features/scenarios/scenario.types';

const DEBOUNCE_MS = 300;

/**
 * Autosave hook for scenario grid — mirrors use-grid-autosave.ts but:
 * 1. Writes to PUT /api/scenarios/:id/allocations (NOT POST /api/allocations/batch)
 * 2. Invalidates ONLY scenario query keys (NEVER actual data keys)
 * 3. Completely separate from the actual grid autosave
 */
export function useScenarioGridAutosave(scenarioId: string) {
  const queryClient = useQueryClient();
  const pendingRef = useRef<Map<string, ScenarioAllocationUpsert>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async () => {
    const batch = Array.from(pendingRef.current.values());
    pendingRef.current.clear();
    if (batch.length === 0) return;

    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/allocations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: batch }),
      });
      if (!res.ok) throw new Error('Scenario save failed');

      // Invalidate ONLY scenario keys — never actual data
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'allocations'] });
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'impact'] });
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'comparison'] });
    } catch {
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId, 'allocations'] });
    }
  }, [scenarioId, queryClient]);

  const handleCellChange = useCallback(
    (change: {
      personId?: string;
      tempEntityId?: string;
      projectId?: string;
      tempProjectName?: string;
      month: string;
      hours: number;
    }) => {
      const key = `${change.personId ?? change.tempEntityId}:${change.projectId ?? change.tempProjectName}:${change.month}`;
      pendingRef.current.set(key, change);

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush],
  );

  return { handleCellChange, flush };
}
