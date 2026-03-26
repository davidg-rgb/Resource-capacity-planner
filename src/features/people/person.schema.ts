import { z } from 'zod/v4';

/**
 * Validation schema for creating a new person.
 * Manually defined (drizzle-zod may not fully support Zod 4).
 */
export const personCreateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  disciplineId: z.string().uuid('Invalid discipline ID'),
  departmentId: z.string().uuid('Invalid department ID'),
  targetHoursPerMonth: z.number().int().min(1).max(744).default(160),
});

/** Validation schema for updating an existing person (all fields optional) */
export const personUpdateSchema = personCreateSchema.partial();

export type PersonCreate = z.infer<typeof personCreateSchema>;
export type PersonUpdate = z.infer<typeof personUpdateSchema>;
