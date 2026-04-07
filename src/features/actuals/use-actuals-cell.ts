'use client';

/**
 * v5.0 — Phase 37-02: useActualsCell hook.
 *
 * Fetches the {planned, actual, delta} triple for a single
 * (person, project, monthKey) tuple via the getCellData server action.
 *
 * Wires the v4.0 allocations slice (planned) and the 37-01 actuals read
 * model (actual) into the shape PlanVsActualCell consumes.
 *
 * Behaviour contract:
 *   - planned is always a number (0 if no allocation row)
 *   - actual is null when there are zero actual_entries rows for the tuple
 *   - delta is null when actual is null, else (actual - planned)
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

async function defaultFetcher(
  orgId: string,
  personId: string,
  projectId: string,
  monthKey: string,
): Promise<{ planned: number; actual: number | null }> {
  // Lazy import keeps the server-action module (and its DB import) out of
  // client-side bundles AND out of jsdom test workers that don't have a real
  // DATABASE_URL. Next's compiler will still resolve the 'use server' module
  // at build time when this hook is referenced from a client component.
  const mod = await import('./actuals.cell.actions');
  return mod.getCellData(orgId, personId, projectId, monthKey);
}

export type UseActualsCellArgs = {
  orgId: string;
  personId: string;
  projectId: string;
  monthKey: string;
  /** Allow callers (tests, alt transports) to inject a fetcher. */
  fetcher?: (
    orgId: string,
    personId: string,
    projectId: string,
    monthKey: string,
  ) => Promise<{ planned: number; actual: number | null }>;
  enabled?: boolean;
};

export type ActualsCellData = {
  planned: number;
  actual: number | null;
  delta: number | null;
  isLoading: boolean;
  error: Error | null;
};

export function useActualsCell({
  orgId,
  personId,
  projectId,
  monthKey,
  fetcher,
  enabled = true,
}: UseActualsCellArgs): ActualsCellData {
  const fetchFn = fetcher ?? defaultFetcher;

  const query = useQuery({
    queryKey: ['actuals-cell', orgId, personId, projectId, monthKey],
    queryFn: () => fetchFn(orgId, personId, projectId, monthKey),
    enabled: enabled && !!orgId && !!personId && !!projectId && !!monthKey,
  });

  return useMemo(() => {
    const planned = query.data?.planned ?? 0;
    const actual = query.data?.actual ?? null;
    const delta = actual === null ? null : Number((actual - planned).toFixed(2));
    return {
      planned,
      actual,
      delta,
      isLoading: query.isLoading,
      error: (query.error as Error | null) ?? null,
    };
  }, [query.data, query.isLoading, query.error]);
}
