import { z } from 'zod/v4';

/**
 * Validation schema for creating a new project.
 * Manually defined (drizzle-zod may not fully support Zod 4).
 */
export const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  programId: z.string().uuid('Invalid program ID').nullish(),
  status: z.enum(['active', 'planned']).default('active'),
});

/** Validation schema for updating an existing project (all fields optional) */
export const projectUpdateSchema = projectCreateSchema.partial();

export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
