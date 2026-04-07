// v5.0 — Phase 37: zod validation for upsertActuals input.
// Mirrors the discriminated union in actuals.types.ts.

import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const SOURCE = z.enum(['manual', 'import']);
const HOURS_BOUND = 24 * 31; // sanity bound; per-grain refinement lands in Phase 44

const baseFields = {
  orgId: z.string().uuid(),
  personId: z.string().uuid(),
  projectId: z.string().uuid(),
  source: SOURCE,
  importBatchId: z.string().uuid().nullable().optional(),
  actorPersonaId: z.string().min(1),
};

export const upsertActualsDaySchema = z.object({
  ...baseFields,
  grain: z.literal('day'),
  date: z.string().regex(DATE_RE, 'date must be YYYY-MM-DD'),
  hours: z.number().nonnegative().max(HOURS_BOUND),
});

export const upsertActualsWeekSchema = z.object({
  ...baseFields,
  grain: z.literal('week'),
  isoYear: z.number().int().min(2026).max(2030),
  isoWeek: z.number().int().min(1).max(53),
  totalHours: z.number().nonnegative().max(HOURS_BOUND),
});

export const upsertActualsMonthSchema = z.object({
  ...baseFields,
  grain: z.literal('month'),
  monthKey: z.string().regex(MONTH_KEY_RE, 'monthKey must be YYYY-MM'),
  totalHours: z.number().nonnegative().max(HOURS_BOUND),
});

export const upsertActualsInputSchema = z.discriminatedUnion('grain', [
  upsertActualsDaySchema,
  upsertActualsWeekSchema,
  upsertActualsMonthSchema,
]);
