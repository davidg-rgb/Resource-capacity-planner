// v5.0 — Phase 39: Zod input schemas for the proposals feature.
import { z } from 'zod';

export const createProposalInputSchema = z.object({
  orgId: z.string().uuid(),
  personId: z.string().uuid(),
  projectId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM'),
  proposedHours: z.number().min(0).max(999.99),
  note: z.string().max(1000).nullable().optional(),
  requestedBy: z.string().min(1),
  actorPersonaId: z.string().min(1),
  parentProposalId: z.string().uuid().nullable().optional(),
});

const proposalStatusValues = [
  'proposed',
  'approved',
  'rejected',
  'withdrawn',
  'superseded',
] as const;

export const listProposalsFilterSchema = z.object({
  orgId: z.string().uuid(),
  status: z.union([z.enum(proposalStatusValues), z.array(z.enum(proposalStatusValues))]).optional(),
  departmentId: z.string().uuid().optional(),
  proposerId: z.string().min(1).optional(),
  personId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const withdrawProposalInputSchema = z.object({
  orgId: z.string().uuid(),
  proposalId: z.string().uuid(),
  requestedBy: z.string().min(1),
  actorPersonaId: z.string().min(1),
});
