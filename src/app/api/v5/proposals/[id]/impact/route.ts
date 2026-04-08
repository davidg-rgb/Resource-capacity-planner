// v5.0 — Phase 39 / Plan 39-05: GET /api/v5/proposals/[id]/impact
// Queue preview numbers for REQUIREMENTS line 45:
//   "Sara's June utilization 40% → 90%"
// Returns raw numbers — the UI assembles the sentence client-side in Plan 39-08.
//
// Read-only: one read on allocation_proposals, one aggregate on allocations for
// (person, month) across ALL projects, one row lookup on people for name.
// No write, no change_log.

import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';
import { NotFoundError } from '@/lib/errors';
import { normalizeMonth } from '@/lib/date-utils';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await requireRole('planner');
    const { id } = await params;

    const [proposal] = await db
      .select()
      .from(schema.allocationProposals)
      .where(
        and(
          eq(schema.allocationProposals.organizationId, orgId),
          eq(schema.allocationProposals.id, id),
        ),
      )
      .limit(1);
    if (!proposal) throw new NotFoundError('Proposal', id);

    const [person] = await db
      .select({
        firstName: schema.people.firstName,
        lastName: schema.people.lastName,
      })
      .from(schema.people)
      .where(and(eq(schema.people.organizationId, orgId), eq(schema.people.id, proposal.personId)))
      .limit(1);
    if (!person) throw new NotFoundError('Person', proposal.personId);

    // Sum of ALL allocation rows for (person, month) across every project.
    const [sumAll] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.allocations.hours}), 0)::int`,
      })
      .from(schema.allocations)
      .where(
        and(
          eq(schema.allocations.organizationId, orgId),
          eq(schema.allocations.personId, proposal.personId),
          eq(schema.allocations.month, proposal.month),
        ),
      );

    // Existing allocation row for this specific (person, project, month), if any.
    const [existing] = await db
      .select({ hours: schema.allocations.hours })
      .from(schema.allocations)
      .where(
        and(
          eq(schema.allocations.organizationId, orgId),
          eq(schema.allocations.personId, proposal.personId),
          eq(schema.allocations.projectId, proposal.projectId),
          eq(schema.allocations.month, proposal.month),
        ),
      )
      .limit(1);

    const personMonthPlannedBefore = Number(sumAll?.total ?? 0);
    const existingForTriple = existing ? Number(existing.hours) : 0;
    const proposedHours = Number(proposal.proposedHours);
    const personMonthPlannedAfter = personMonthPlannedBefore - existingForTriple + proposedHours;

    return NextResponse.json(
      {
        personMonthPlannedBefore,
        personMonthPlannedAfter,
        proposedHours,
        personName: `${person.firstName} ${person.lastName}`,
        month: normalizeMonth(proposal.month),
      },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
