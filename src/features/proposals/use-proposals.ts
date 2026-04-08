'use client';

// v5.0 — Phase 39 / Plan 39-06: react-query hooks for proposals feature (PROP-03).
// POST /api/v5/proposals (create) + GET /api/v5/proposals (list, filtered).
// The API routes land in Plan 39-05 (parallel wave); this hook targets the
// contract defined in 39-CONTEXT.md and is mockable via fetch stubbing.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProposalDTO, ProposalStatus } from './proposal.types';

export interface CreateProposalHookInput {
  personId: string;
  projectId: string;
  month: string; // 'YYYY-MM'
  proposedHours: number;
  note?: string | null;
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProposalHookInput): Promise<ProposalDTO> => {
      const res = await fetch('/api/v5/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'request_failed' }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
      qc.invalidateQueries({ queryKey: ['proposals', 'person', vars.personId] });
    },
  });
}

export interface ListProposalsHookFilter {
  status?: ProposalStatus | ProposalStatus[];
  departmentId?: string;
  proposerId?: string;
  personId?: string;
  projectId?: string;
}

export function useListProposals(filter: ListProposalsHookFilter) {
  return useQuery({
    queryKey: ['proposals', filter],
    queryFn: async (): Promise<{ proposals: ProposalDTO[] }> => {
      const qs = new URLSearchParams();
      if (filter.status) {
        qs.set('status', Array.isArray(filter.status) ? filter.status.join(',') : filter.status);
      }
      if (filter.departmentId) qs.set('departmentId', filter.departmentId);
      if (filter.proposerId) qs.set('proposerId', filter.proposerId);
      if (filter.personId) qs.set('personId', filter.personId);
      if (filter.projectId) qs.set('projectId', filter.projectId);

      const res = await fetch(`/api/v5/proposals?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
