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

// Plan 39-07 (PROP-04): Line Manager approval queue mutations + impact query.

export interface ApproveProposalHookInput {
  proposalId: string;
  departmentId: string;
}

export function useApproveProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ApproveProposalHookInput) => {
      const res = await fetch(`/api/v5/proposals/${input.proposalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: input.departmentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'approve_failed' }));
        throw new Error(err.code ?? err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export interface RejectProposalHookInput {
  proposalId: string;
  departmentId: string;
  reason: string;
}

export function useRejectProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RejectProposalHookInput) => {
      const res = await fetch(`/api/v5/proposals/${input.proposalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: input.departmentId, reason: input.reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'reject_failed' }));
        throw new Error(err.code ?? err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export interface ProposalImpactDTO {
  personMonthPlannedBefore: number;
  personMonthPlannedAfter: number;
  /** v5.0 Phase 41 / Plan 41-01 — utilization percentages computed via capacity.read.
   *  Rounded to nearest int. Source for the "40% → 90%" approval queue preview
   *  string (REQUIREMENTS L45). */
  currentUtilizationPct: number;
  projectedUtilizationPct: number;
  proposedHours: number;
  personName: string;
  month: string;
}

// Plan 39-08 (PROP-06): resubmit from rejected + withdraw hooks for PM "My Wishes".

export interface ResubmitProposalHookInput {
  rejectedProposalId: string;
  proposedHours?: number;
  note?: string | null;
  month?: string;
}

export function useResubmitProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ResubmitProposalHookInput): Promise<ProposalDTO> => {
      const { rejectedProposalId, ...body } = input;
      const res = await fetch(`/api/v5/proposals/${rejectedProposalId}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'resubmit_failed' }));
        throw new Error(err.code ?? err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useWithdrawProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { proposalId: string }) => {
      const res = await fetch(`/api/v5/proposals/${input.proposalId}/withdraw`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'withdraw_failed' }));
        throw new Error(err.code ?? err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
    },
  });
}

export function useProposalImpact(proposalId: string | null) {
  return useQuery({
    queryKey: ['proposals', 'impact', proposalId],
    enabled: !!proposalId,
    queryFn: async (): Promise<ProposalImpactDTO> => {
      const res = await fetch(`/api/v5/proposals/${proposalId}/impact`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
