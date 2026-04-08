// v5.0 — Phase 39 / Plan 39-02: createProposal / listProposals / withdrawProposal.
//
// ADR-003: every mutation writes a change_log row inside the same tx.
// PROP-07: listProposals JOINs live people.department_id for routing; the
// allocation_proposals.target_department_id column is a snapshot for audit
// only and is NOT used to filter the line-manager queue.
//
// Approve / reject / resubmit arrive in Plans 39-03 and 39-04.

import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { recordChange } from '@/features/change-log/change-log.service';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
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
