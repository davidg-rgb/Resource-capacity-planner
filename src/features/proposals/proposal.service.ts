// v5.0 — Phase 39 / Plan 39-02: createProposal / listProposals / withdrawProposal.
//
// ADR-003: every mutation writes a change_log row inside the same tx.
// PROP-07: listProposals JOINs live people.department_id for routing; the
// allocation_proposals.target_department_id column is a snapshot for audit
// only and is NOT used to filter the line-manager queue.
//
// Approve / reject / resubmit arrive in Plans 39-03 and 39-04.

import { and, desc, eq, inArray, ne } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';

import { _applyAllocationUpsertsInTx } from '@/features/allocations/allocation.service';
import { recordChange } from '@/features/change-log/change-log.service';
import {
  ForbiddenError,
  NotFoundError,
  ProposalNotActiveError,
  ValidationError,
} from '@/lib/errors';
import { normalizeMonth } from '@/lib/date-utils';

import {
  createProposalInputSchema,
  listProposalsFilterSchema,
  withdrawProposalInputSchema,
} from './proposal.schema';
import type {
  CreateProposalInput,
  ListProposalsFilter,
  ProposalDTO,
  WithdrawProposalInput,
} from './proposal.types';

type ProposalRow = typeof schema.allocationProposals.$inferSelect;

function toProposalDTO(row: ProposalRow, liveDepartmentId: string): ProposalDTO {
  return {
    id: row.id,
    personId: row.personId,
    projectId: row.projectId,
    month: normalizeMonth(row.month),
    proposedHours: Number(row.proposedHours),
    note: row.note,
    status: row.status,
    rejectionReason: row.rejectionReason,
    requestedBy: row.requestedBy,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    parentProposalId: row.parentProposalId,
    targetDepartmentId: row.targetDepartmentId,
    liveDepartmentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * PROP-03 / PROP-08: submit a new proposal.
 * target_department_id is snapshotted from the LIVE people.department_id
 * at submit time (D-08); change_log row written in the same tx.
 */
export async function createProposal(raw: CreateProposalInput): Promise<ProposalDTO> {
  const input = createProposalInputSchema.parse(raw);
  const monthDate = `${input.month}-01`;

  return db.transaction(async (tx) => {
    const [person] = await tx
      .select({
        id: schema.people.id,
        departmentId: schema.people.departmentId,
      })
      .from(schema.people)
      .where(
        and(eq(schema.people.organizationId, input.orgId), eq(schema.people.id, input.personId)),
      )
      .limit(1);
    if (!person) throw new NotFoundError('Person', input.personId);

    const [row] = await tx
      .insert(schema.allocationProposals)
      .values({
        organizationId: input.orgId,
        personId: input.personId,
        projectId: input.projectId,
        month: monthDate,
        proposedHours: input.proposedHours.toFixed(2),
        note: input.note ?? null,
        status: 'proposed',
        requestedBy: input.requestedBy,
        targetDepartmentId: person.departmentId, // snapshot at submit time
        parentProposalId: input.parentProposalId ?? null,
      })
      .returning();

    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorPersonaId,
        entity: 'proposal',
        entityId: row.id,
        action: 'PROPOSAL_SUBMITTED',
        previousValue: null,
        newValue: {
          personId: row.personId,
          projectId: row.projectId,
          month: input.month,
          proposedHours: Number(row.proposedHours),
          note: row.note,
          parentProposalId: row.parentProposalId,
        },
        context: {
          targetDepartmentId: row.targetDepartmentId,
          ...(row.parentProposalId ? { resubmittedFrom: row.parentProposalId } : {}),
        },
      },
      tx as unknown as Parameters<typeof recordChange>[1],
    );

    return toProposalDTO(row, person.departmentId);
  });
}

/**
 * PROP-07: JOIN live people.department_id for routing. The snapshot
 * column target_department_id is NOT used as a filter here.
 */
export async function listProposals(rawFilter: ListProposalsFilter): Promise<ProposalDTO[]> {
  const filter = listProposalsFilterSchema.parse(rawFilter);
  const conditions = [eq(schema.allocationProposals.organizationId, filter.orgId)];

  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    conditions.push(inArray(schema.allocationProposals.status, statuses));
  }
  if (filter.proposerId) {
    conditions.push(eq(schema.allocationProposals.requestedBy, filter.proposerId));
  }
  if (filter.personId) {
    conditions.push(eq(schema.allocationProposals.personId, filter.personId));
  }
  if (filter.projectId) {
    conditions.push(eq(schema.allocationProposals.projectId, filter.projectId));
  }
  // CRITICAL (PROP-07): filter on LIVE people.department_id, not the snapshot.
  if (filter.departmentId) {
    conditions.push(eq(schema.people.departmentId, filter.departmentId));
  }

  const rows = await db
    .select({
      p: schema.allocationProposals,
      liveDeptId: schema.people.departmentId,
    })
    .from(schema.allocationProposals)
    .innerJoin(schema.people, eq(schema.allocationProposals.personId, schema.people.id))
    .where(and(...conditions))
    .orderBy(desc(schema.allocationProposals.createdAt));

  return rows.map((r) => toProposalDTO(r.p, r.liveDeptId));
}

/**
 * Flip a 'proposed' row to 'withdrawn' iff the caller is the original
 * requester. Emits PROPOSAL_WITHDRAWN change_log inside the same tx.
 */
export async function withdrawProposal(raw: WithdrawProposalInput): Promise<ProposalDTO> {
  const input = withdrawProposalInputSchema.parse(raw);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(schema.allocationProposals)
      .where(
        and(
          eq(schema.allocationProposals.organizationId, input.orgId),
          eq(schema.allocationProposals.id, input.proposalId),
        ),
      )
      .limit(1);
    if (!existing) throw new NotFoundError('Proposal', input.proposalId);
    if (existing.requestedBy !== input.requestedBy) {
      throw new ForbiddenError('Only the proposer can withdraw this proposal');
    }
    if (existing.status !== 'proposed') {
      throw new ValidationError('Only proposed proposals can be withdrawn', 'INVALID_STATE');
    }

    const [row] = await tx
      .update(schema.allocationProposals)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(eq(schema.allocationProposals.id, input.proposalId))
      .returning();

    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorPersonaId,
        entity: 'proposal',
        entityId: row.id,
        action: 'PROPOSAL_WITHDRAWN',
        previousValue: { status: 'proposed' },
        newValue: { status: 'withdrawn' },
        context: { reason: 'user_withdrawn' },
      },
      tx as unknown as Parameters<typeof recordChange>[1],
    );

    // liveDepartmentId not critical on withdraw path — pass snapshot.
    return toProposalDTO(row, row.targetDepartmentId);
  });
}

/**
 * PROP-06: clone a rejected proposal into a new 'proposed' row with
 * parent_proposal_id set. Original rejected row is immutable history.
 * target_department_id is re-snapshotted from LIVE people.department_id
 * at resubmit time (PROP-07). Emits PROPOSAL_SUBMITTED in the same tx.
 */
export interface ResubmitProposalInput {
  orgId: string;
  rejectedProposalId: string;
  proposedHours?: number;
  note?: string | null;
  month?: string; // 'YYYY-MM' — default: parent's month
  requestedBy: string;
  actorPersonaId: string;
}

export async function resubmitProposal(input: ResubmitProposalInput): Promise<ProposalDTO> {
  return db.transaction(async (tx) => {
    const [parent] = await tx
      .select()
      .from(schema.allocationProposals)
      .where(
        and(
          eq(schema.allocationProposals.organizationId, input.orgId),
          eq(schema.allocationProposals.id, input.rejectedProposalId),
        ),
      )
      .limit(1);
    if (!parent) throw new NotFoundError('Proposal', input.rejectedProposalId);
    if (parent.status !== 'rejected') {
      throw new ValidationError('Only rejected proposals can be resubmitted', 'INVALID_STATE');
    }
    if (parent.requestedBy !== input.requestedBy) {
      throw new ForbiddenError('Only the original proposer can resubmit');
    }

    // Live read target person's department (PROP-07)
    const [person] = await tx
      .select({ id: schema.people.id, departmentId: schema.people.departmentId })
      .from(schema.people)
      .where(
        and(eq(schema.people.organizationId, input.orgId), eq(schema.people.id, parent.personId)),
      )
      .limit(1);
    if (!person) throw new NotFoundError('Person', parent.personId);

    const monthNormalized = input.month ?? normalizeMonth(parent.month);
    const monthDate = `${monthNormalized}-01`;
    const hours = input.proposedHours ?? Number(parent.proposedHours);
    const note = input.note !== undefined ? input.note : parent.note;

    const [row] = await tx
      .insert(schema.allocationProposals)
      .values({
        organizationId: input.orgId,
        personId: parent.personId,
        projectId: parent.projectId,
        month: monthDate,
        proposedHours: hours.toFixed(2),
        note: note,
        status: 'proposed',
        requestedBy: input.requestedBy,
        targetDepartmentId: person.departmentId,
        parentProposalId: parent.id,
      })
      .returning();

    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorPersonaId,
        entity: 'proposal',
        entityId: row.id,
        action: 'PROPOSAL_SUBMITTED',
        previousValue: null,
        newValue: {
          personId: row.personId,
          projectId: row.projectId,
          month: monthNormalized,
          proposedHours: hours,
          note: row.note,
          parentProposalId: parent.id,
        },
        context: {
          targetDepartmentId: row.targetDepartmentId,
          resubmittedFrom: parent.id,
        },
      },
      tx as unknown as Parameters<typeof recordChange>[1],
    );

    return toProposalDTO(row, person.departmentId);
  });
}

// ---------------------------------------------------------------------------
// Plan 39-03: approveProposal / rejectProposal
// ---------------------------------------------------------------------------

export interface ApproveProposalInput {
  orgId: string;
  proposalId: string;
  callerUserId: string;
  callerClaimedDepartmentId: string;
  actorPersonaId: string;
}

export interface RejectProposalInput {
  orgId: string;
  proposalId: string;
  callerUserId: string;
  callerClaimedDepartmentId: string;
  reason: string;
  actorPersonaId: string;
}

/**
 * PROP-05 / PROP-07: approve a proposed allocation proposal.
 * Conditional UPDATE winner + supersede siblings + write-through + dual change_log.
 */
export async function approveProposal(input: ApproveProposalInput): Promise<ProposalDTO> {
  return db.transaction(async (tx) => {
    const [winner] = await tx
      .update(schema.allocationProposals)
      .set({
        status: 'approved',
        decidedBy: input.callerUserId,
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.allocationProposals.organizationId, input.orgId),
          eq(schema.allocationProposals.id, input.proposalId),
          eq(schema.allocationProposals.status, 'proposed'),
        ),
      )
      .returning();
    if (!winner) {
      throw new ProposalNotActiveError(
        'Proposal is not in proposed state (concurrent approval or already decided)',
      );
    }

    const [livePerson] = await tx
      .select({ id: schema.people.id, departmentId: schema.people.departmentId })
      .from(schema.people)
      .where(
        and(eq(schema.people.organizationId, input.orgId), eq(schema.people.id, winner.personId)),
      )
      .limit(1);
    if (!livePerson) throw new NotFoundError('Person', winner.personId);
    if (livePerson.departmentId !== input.callerClaimedDepartmentId) {
      throw new ForbiddenError(
        'Caller department does not match proposal target department (live person routing)',
      );
    }

    const superseded = await tx
      .update(schema.allocationProposals)
      .set({ status: 'superseded', updatedAt: new Date() })
      .where(
        and(
          eq(schema.allocationProposals.organizationId, input.orgId),
          eq(schema.allocationProposals.personId, winner.personId),
          eq(schema.allocationProposals.projectId, winner.projectId),
          eq(schema.allocationProposals.month, winner.month),
          eq(schema.allocationProposals.status, 'proposed'),
          ne(schema.allocationProposals.id, winner.id),
        ),
      )
      .returning({ id: schema.allocationProposals.id });

    for (const s of superseded) {
      await recordChange(
        {
          orgId: input.orgId,
          actorPersonaId: input.actorPersonaId,
          entity: 'proposal',
          entityId: s.id,
          action: 'PROPOSAL_WITHDRAWN',
          previousValue: { status: 'proposed' },
          newValue: { status: 'superseded' },
          context: { reason: 'superseded_by', winnerId: winner.id },
        },
        tx as unknown as Parameters<typeof recordChange>[1],
      );
    }

    const monthNormalized = normalizeMonth(winner.month);
    const [priorAlloc] = await tx
      .select({ id: schema.allocations.id, hours: schema.allocations.hours })
      .from(schema.allocations)
      .where(
        and(
          eq(schema.allocations.organizationId, input.orgId),
          eq(schema.allocations.personId, winner.personId),
          eq(schema.allocations.projectId, winner.projectId),
          eq(schema.allocations.month, winner.month),
        ),
      )
      .limit(1);

    const proposedHoursInt = Math.round(Number(winner.proposedHours));
    await _applyAllocationUpsertsInTx(tx, input.orgId, [
      {
        personId: winner.personId,
        projectId: winner.projectId,
        month: monthNormalized,
        hours: proposedHoursInt,
      },
    ]);

    const [newAlloc] = await tx
      .select({ id: schema.allocations.id, hours: schema.allocations.hours })
      .from(schema.allocations)
      .where(
        and(
          eq(schema.allocations.organizationId, input.orgId),
          eq(schema.allocations.personId, winner.personId),
          eq(schema.allocations.projectId, winner.projectId),
          eq(schema.allocations.month, winner.month),
        ),
      )
      .limit(1);

    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorPersonaId,
        entity: 'proposal',
        entityId: winner.id,
        action: 'PROPOSAL_APPROVED',
        previousValue: { status: 'proposed' },
        newValue: {
          status: 'approved',
          decidedBy: winner.decidedBy,
          decidedAt: winner.decidedAt ? winner.decidedAt.toISOString() : null,
        },
        context: {
          proposalId: winner.id,
          liveDepartmentId: livePerson.departmentId,
          supersededSiblings: superseded.map((s) => s.id),
        },
      },
      tx as unknown as Parameters<typeof recordChange>[1],
    );

    if (newAlloc) {
      await recordChange(
        {
          orgId: input.orgId,
          actorPersonaId: input.actorPersonaId,
          entity: 'allocation',
          entityId: newAlloc.id,
          action: 'ALLOCATION_EDITED',
          previousValue: priorAlloc ? { hours: Number(priorAlloc.hours) } : null,
          newValue: { hours: Number(newAlloc.hours) },
          context: {
            via: 'proposal',
            proposalId: winner.id,
            personId: winner.personId,
            projectId: winner.projectId,
            month: monthNormalized,
          },
        },
        tx as unknown as Parameters<typeof recordChange>[1],
      );
    }

    return toProposalDTO(winner, livePerson.departmentId);
  });
}

/**
 * PROP-05: reject a proposed proposal. Requires non-empty reason <= 1000 chars.
 */
export async function rejectProposal(input: RejectProposalInput): Promise<ProposalDTO> {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new ValidationError('Rejection reason is required', 'REASON_REQUIRED');
  }
  if (input.reason.length > 1000) {
    throw new ValidationError('Rejection reason must be <= 1000 chars', 'REASON_TOO_LONG');
  }

  return db.transaction(async (tx) => {
    const [winner] = await tx
      .update(schema.allocationProposals)
      .set({
        status: 'rejected',
        decidedBy: input.callerUserId,
        decidedAt: new Date(),
        rejectionReason: input.reason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.allocationProposals.organizationId, input.orgId),
          eq(schema.allocationProposals.id, input.proposalId),
          eq(schema.allocationProposals.status, 'proposed'),
        ),
      )
      .returning();
    if (!winner) {
      throw new ProposalNotActiveError('Proposal is not in proposed state');
    }

    const [livePerson] = await tx
      .select({ departmentId: schema.people.departmentId })
      .from(schema.people)
      .where(
        and(eq(schema.people.organizationId, input.orgId), eq(schema.people.id, winner.personId)),
      )
      .limit(1);
    if (!livePerson) throw new NotFoundError('Person', winner.personId);
    if (livePerson.departmentId !== input.callerClaimedDepartmentId) {
      throw new ForbiddenError(
        'Caller department does not match proposal target department (live person routing)',
      );
    }

    await recordChange(
      {
        orgId: input.orgId,
        actorPersonaId: input.actorPersonaId,
        entity: 'proposal',
        entityId: winner.id,
        action: 'PROPOSAL_REJECTED',
        previousValue: { status: 'proposed' },
        newValue: { status: 'rejected', rejectionReason: input.reason },
        context: { proposalId: winner.id, liveDepartmentId: livePerson.departmentId },
      },
      tx as unknown as Parameters<typeof recordChange>[1],
    );

    return toProposalDTO(winner, livePerson.departmentId);
  });
}
