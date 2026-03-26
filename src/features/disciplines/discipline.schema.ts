import { z } from 'zod/v4';

/**
 * Validation schema for creating a new discipline.
 */
export const disciplineCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  abbreviation: z.string().min(1, 'Abbreviation is required').max(10),
});

/** Validation schema for updating an existing discipline (all fields optional) */
export const disciplineUpdateSchema = disciplineCreateSchema.partial();

export type DisciplineCreate = z.infer<typeof disciplineCreateSchema>;
export type DisciplineUpdate = z.infer<typeof disciplineUpdateSchema>;
