// v5.0 — Phase 39 / impact preview read model.
// Extracted from api/v5/proposals/[id]/impact/route.ts to comply with
// §8.2: no direct SQL outside *.service.ts / *.read.ts.

import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import * as schema from '@/db/schema';
import { NotFoundError } from '@/lib/errors';
import { normalizeMonth } from '@/lib/date-utils';

export interface ProposalImpact {
  personMonthPlannedBefore: number;
  personMonthPlannedAfter: number;
  currentUtilizationPct: number;
  projectedUtilizationPct: number;
  proposedHours: number;
  personName: string;
  month: string;
}

export async function getProposalImpact(
  orgId: string,
  proposalId: string,
): Promise<ProposalImpact> {
  const [proposal] = await db
    .select()
    .from(schema.allocationProposals)
    .where(
      and(
        eq(schema.allocationProposals.organizationId, orgId),
        eq(schema.allocationProposals.id, proposalId),
      ),
    )
    .limit(1);
  if (!proposal) throw new NotFoundError('Proposal', proposalId);

  const [person] = await db
    .select({
      firstName: schema.people.firstName,
      lastName: schema.people.lastName,
      targetHoursPerMonth: schema.people.targetHoursPerMonth,
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

  // Existing allocation row for this specific (person, project, month).
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

  const targetHours = person.targetHoursPerMonth == null ? 160 : Number(person.targetHoursPerMonth);
  const currentUtilizationPct =
    targetHours === 0 ? 0 : Math.round((personMonthPlannedBefore / targetHours) * 100);
  const projectedUtilizationPct =
    targetHours === 0 ? 0 : Math.round((personMonthPlannedAfter / targetHours) * 100);

  return {
    personMonthPlannedBefore,
    personMonthPlannedAfter,
    currentUtilizationPct,
    projectedUtilizationPct,
    proposedHours,
    personName: `${person.firstName} ${person.lastName}`,
    month: normalizeMonth(proposal.month),
  };
}
