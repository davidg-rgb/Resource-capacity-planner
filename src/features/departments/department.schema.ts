import { z } from 'zod/v4';

/**
 * Validation schema for creating a new department.
 */
export const departmentCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

/** Validation schema for updating an existing department (all fields optional) */
export const departmentUpdateSchema = departmentCreateSchema.partial();

export type DepartmentCreate = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdate = z.infer<typeof departmentUpdateSchema>;
