'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { AllocationUpsert } from '@/features/allocations/allocation.types';

const DEBOUNCE_MS = 300;

/**
 * Auto-save hook for AG Grid cell edits.
 * Debounces cell changes and batch-saves via POST /api/allocations/batch.
 * Deduplicates by projectId:month key so rapid edits to the same cell
 * only send the latest value.
 */
export function useGridAutosave(personId: string) {
  const queryClient = useQueryClient();
  const pendingRef = useRef<Map<string, AllocationUpsert>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async () => {
    const batch = Array.from(pendingRef.current.values());
    pendingRef.current.clear();
    if (batch.length === 0) return;

    try {
      const res = await fetch('/api/allocations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: batch }),
      });
      if (!res.ok) throw new Error('Save failed');
      // On success, invalidate to get fresh server state
      queryClient.invalidateQueries({ queryKey: ['allocations', personId] });
    } catch {
      // On error, invalidate to rollback optimistic updates
      queryClient.invalidateQueries({ queryKey: ['allocations', personId] });
    }
  }, [personId, queryClient]);

  const handleCellChange = useCallback(
    (change: { projectId: string; month: string; hours: number }) => {
      const key = `${change.projectId}:${change.month}`;
      pendingRef.current.set(key, { personId, ...change });

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [personId, flush],
  );

  return { handleCellChange, flush };
}
