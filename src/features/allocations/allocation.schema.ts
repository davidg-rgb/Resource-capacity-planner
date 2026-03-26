import { z } from 'zod/v4';

/**
 * Validation schema for a single allocation upsert.
 * Month must be YYYY-MM format. Hours 0 triggers DELETE semantics.
 */
export const allocationUpsertSchema = z.object({
  personId: z.uuid(),
  projectId: z.uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format'),
  hours: z.number().int().min(0).max(999),
});

/**
 * Validation schema for batch upsert request body.
 * Accepts 1-100 allocations per request.
 */
export const batchUpsertSchema = z.object({
  allocations: z.array(allocationUpsertSchema).min(1).max(100),
});

export type AllocationUpsertInput = z.infer<typeof allocationUpsertSchema>;
export type BatchUpsertInput = z.infer<typeof batchUpsertSchema>;
