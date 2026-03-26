import { z } from 'zod/v4';

/**
 * Validation schema for creating a new program.
 */
export const programCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(500).optional(),
});

/** Validation schema for updating an existing program (all fields optional) */
export const programUpdateSchema = programCreateSchema.partial();

export type ProgramCreate = z.infer<typeof programCreateSchema>;
export type ProgramUpdate = z.infer<typeof programUpdateSchema>;
