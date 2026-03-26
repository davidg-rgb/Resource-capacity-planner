'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type {
  AllocationUpsert,
  BatchUpsertResult,
  ConflictInfo,
  FlatAllocation,
} from '@/features/allocations/allocation.types';

const DEBOUNCE_MS = 300;

/**
 * Auto-save hook for AG Grid cell edits with optimistic concurrency conflict detection.
 * Debounces cell changes and batch-saves via POST /api/allocations/batch.
 * Deduplicates by projectId:month key so rapid edits to the same cell
 * only send the latest value.
 *
 * Tracks updatedAt per cell to detect concurrent modifications.
 * When conflicts are detected, prompts user to overwrite or refresh.
 */
export function useGridAutosave(personId: string) {
  const queryClient = useQueryClient();
  const pendingRef = useRef<Map<string, AllocationUpsert>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const updatedAtMapRef = useRef<Map<string, string>>(new Map());

  /**
   * Set the last-known updatedAt for a specific cell.
   * Used to seed from fetched allocations or update after saves.
   */
  const setUpdatedAt = useCallback((key: string, value: string) => {
    updatedAtMapRef.current.set(key, value);
  }, []);

  /**
   * Initialize the updatedAt map from a list of fetched allocations.
   * Call this after the initial query or after a refetch.
   */
  const initUpdatedAtFromAllocations = useCallback((allocations: FlatAllocation[]) => {
    updatedAtMapRef.current.clear();
    for (const alloc of allocations) {
      if (alloc.updatedAt) {
        const key = `${alloc.projectId}:${alloc.month}`;
        updatedAtMapRef.current.set(key, alloc.updatedAt);
      }
    }
  }, []);

  const flush = useCallback(async () => {
    const batch = Array.from(pendingRef.current.values());
    pendingRef.current.clear();
    if (batch.length === 0) return;

    // Attach expectedUpdatedAt from our tracking map for conflict detection
    const batchWithTimestamps: AllocationUpsert[] = batch.map((alloc) => {
      const key = `${alloc.projectId}:${alloc.month}`;
      const expectedUpdatedAt = updatedAtMapRef.current.get(key);
      return expectedUpdatedAt ? { ...alloc, expectedUpdatedAt } : alloc;
    });

    try {
      const res = await fetch('/api/allocations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: batchWithTimestamps }),
      });
      if (!res.ok) throw new Error('Save failed');

      const result: BatchUpsertResult = await res.json();

      // Update our updatedAt map with fresh timestamps from successful saves
      // (Pitfall 4 prevention: update map after OWN saves to avoid false positives)
      for (const [key, timestamp] of Object.entries(result.updatedTimestamps)) {
        updatedAtMapRef.current.set(key, timestamp);
      }

      // Handle conflicts if any
      if (result.conflicts.length > 0) {
        handleConflicts(result.conflicts, batchWithTimestamps);
      } else {
        // Only invalidate on clean save to avoid unnecessary refetches
        queryClient.invalidateQueries({ queryKey: ['allocations', personId] });
      }
    } catch {
      // On error, invalidate to rollback optimistic updates
      queryClient.invalidateQueries({ queryKey: ['allocations', personId] });
    }
  }, [personId, queryClient]);

  /**
   * Handle detected conflicts by prompting user to overwrite or refresh.
   */
  const handleConflicts = useCallback(
    async (conflicts: ConflictInfo[], originalBatch: AllocationUpsert[]) => {
      const conflictSummary = conflicts
        .map((c) => `${c.month}: server has ${c.serverHours}h`)
        .join(', ');

      console.warn('Allocation conflicts detected:', conflicts);

      const shouldOverwrite = window.confirm(
        `Another user modified these cells:\n${conflictSummary}\n\nClick OK to overwrite with your values, or Cancel to refresh with server data.`,
      );

      if (shouldOverwrite) {
        // Re-send conflicting cells without expectedUpdatedAt to force overwrite
        const conflictKeys = new Set(conflicts.map((c) => `${c.projectId}:${c.month}`));
        const forceUpserts: AllocationUpsert[] = originalBatch
          .filter((a) => conflictKeys.has(`${a.projectId}:${a.month}`))
          .map(({ expectedUpdatedAt: _ignored, ...rest }) => rest);

        try {
          const res = await fetch('/api/allocations/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allocations: forceUpserts }),
          });
          if (res.ok) {
            const result: BatchUpsertResult = await res.json();
            for (const [key, timestamp] of Object.entries(result.updatedTimestamps)) {
              updatedAtMapRef.current.set(key, timestamp);
            }
          }
        } catch {
          // Force overwrite failed — fall through to invalidate
        }
        queryClient.invalidateQueries({ queryKey: ['allocations', personId] });
      } else {
        // User chose to refresh — invalidate to get server data
        queryClient.invalidateQueries({ queryKey: ['allocations', personId] });
      }
    },
    [personId, queryClient],
  );

  const handleCellChange = useCallback(
    (change: { projectId: string; month: string; hours: number }) => {
      const key = `${change.projectId}:${change.month}`;
      pendingRef.current.set(key, { personId, ...change });

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [personId, flush],
  );

  return {
    handleCellChange,
    flush,
    setUpdatedAt,
    initUpdatedAtFromAllocations,
  };
}
