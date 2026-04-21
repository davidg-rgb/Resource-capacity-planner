'use client';

// v6.0 — Phase 52 Plan 03 (PM-02 / D-02): PM persona's pending + rejected
// wish counts for the top-bar chip. Consumes the existing /api/v5/proposals
// list endpoint filtered by proposerId + status=proposed,rejected and
// counts client-side (Pitfall #10 — acceptable for v6.0 volumes).
//
// Usage: `const { data } = usePmWishCounts(clerkUserId, uiV6PerJourney && persona.kind === 'pm');`

import { useQuery } from '@tanstack/react-query';

export interface PmWishCounts {
  pending: number;
  rejected: number;
}

interface ProposalsListResponse {
  proposals: Array<{ status: string }>;
}

export function usePmWishCounts(clerkUserId: string, enabled: boolean) {
  return useQuery<ProposalsListResponse, Error, PmWishCounts>({
    queryKey: ['pm-wish-counts', clerkUserId],
    queryFn: async () => {
      const url = `/api/v5/proposals?proposerId=${encodeURIComponent(clerkUserId)}&status=proposed,rejected`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`pm-wish-counts ${res.status}`);
      return (await res.json()) as ProposalsListResponse;
    },
    select: (data) => ({
      pending: data.proposals.filter((p) => p.status === 'proposed').length,
      rejected: data.proposals.filter((p) => p.status === 'rejected').length,
    }),
    refetchInterval: 60_000,
    enabled,
  });
}
