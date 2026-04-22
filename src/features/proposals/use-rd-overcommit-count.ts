'use client';

// v6.0 — Phase 53 / Plan 53-02 (POLISH-01 / D-01): TanStack hook wrapping
// GET /api/v5/capacity/overcommit/count (shipped in Task 1).
//
// Mirrors `useLmQueueCount` / `usePmWishCounts` shape: polls every 60s while
// mounted; the `enabled` guard caller-gates the fetch (persona + flag).
//
// Guard usage (Pitfall #6 — no hook-in-label-builder):
//   const rdEnabled = uiV6Polish && persona.kind === 'rd';
//   const { data: count } = useRdOvercommitCount(rdEnabled);
//
// No departmentId param (unlike useLmQueueCount): the R&D persona is
// tenant-scoped only; the orgId is derived server-side from the Clerk
// session via `requireRole('planner')` in the route handler.

import { useQuery } from '@tanstack/react-query';

export interface RdOvercommitCountResponse {
  count: number;
}

export function useRdOvercommitCount(enabled: boolean) {
  return useQuery({
    queryKey: ['rd-overcommit-count'],
    queryFn: async () => {
      const res = await fetch('/api/v5/capacity/overcommit/count', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`rd-overcommit-count ${res.status}`);
      return (await res.json()) as RdOvercommitCountResponse;
    },
    select: (data) => data.count,
    refetchInterval: 60_000,
    enabled,
  });
}
