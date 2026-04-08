// v5.0 — Phase 39 / PROP-03..08: Proposal feature types.
// See .planning/phases/39-proposal-approval-workflow/39-CONTEXT.md.

export type ProposalStatus = 'proposed' | 'approved' | 'rejected' | 'withdrawn' | 'superseded';

export type EditGateDecision =
  | 'direct'
  | 'proposal'
  | 'historic-warn-direct'
  | 'historic-warn-proposal'
  | 'blocked';

export interface CreateProposalInput {
  orgId: string;
  personId: string;
  projectId: string;
  month: string; // 'YYYY-MM'
  proposedHours: number;
  note?: string | null;
  requestedBy: string; // Clerk userId
  actorPersonaId: string; // for change_log
  parentProposalId?: string | null;
}

export interface ListProposalsFilter {
  orgId: string;
  status?: ProposalStatus | ProposalStatus[];
  /** Line-mgr queue: person's LIVE department (PROP-07). */
  departmentId?: string;
  /** PM "My Wishes": proposals created by this Clerk userId. */
  proposerId?: string;
  personId?: string;
  projectId?: string;
}

export interface ProposalDTO {
  id: string;
  personId: string;
  projectId: string;
  month: string; // 'YYYY-MM'
  proposedHours: number;
  note: string | null;
  status: ProposalStatus;
  rejectionReason: string | null;
  requestedBy: string;
  decidedBy: string | null;
  decidedAt: string | null;
  parentProposalId: string | null;
  /** Snapshot at submit time — audit only, NOT used for routing. */
  targetDepartmentId: string;
  /** LIVE people.department_id at query time (PROP-07 routing). */
  liveDepartmentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawProposalInput {
  orgId: string;
  proposalId: string;
  requestedBy: string; // must match row.requested_by
  actorPersonaId: string;
}
