'use client';

// v6.0 — Phase 52 / Plan 52-04 (LM-01 / D-06): shared TanStack hook consuming
// the LM-03 endpoint shipped in Plan 52-02. Polls every 60s while mounted.
//
// The hook is surface-agnostic: both `/line-manager` home (badge) and the
// persona-switcher optgroup suffix call this with the active LM departmentId.
// TanStack Query auto-dedupes fetches at the `['lm-queue-count', deptId]`
// key, so rendering the badge + switcher suffix in the same tree only
// produces one HTTP call per 60s polling window.
//
// Re-fetch on department switch is automatic via TanStack's key-based
// invalidation: the key changes → new subscription → new fetch.
//
// Guards (T-52-01/04 + Pitfall #6 re. hook-in-label-builder):
//   - `enabled` prop gates the fetch; pass `uiV6PerJourney && persona.kind === 'line-manager'`
//   - `departmentId` falsy → enabled forced false; prevents `departmentId=`
//     query string hitting the endpoint and 400-ing on zod uuid rejection

import { useQuery } from '@tanstack/react-query';

export interface LmQueueCountResponse {
  count: number;
  departmentId: string;
}

export function useLmQueueCount(departmentId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['lm-queue-count', departmentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v5/proposals/queue/count?departmentId=${encodeURIComponent(departmentId ?? '')}`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(`lm-queue-count ${res.status}`);
      return (await res.json()) as LmQueueCountResponse;
    },
    select: (data) => data.count,
    refetchInterval: 60_000,
    enabled: !!departmentId && enabled,
  });
}
