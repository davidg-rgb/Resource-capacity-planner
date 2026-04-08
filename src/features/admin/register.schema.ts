// v5.0 — Phase 43 / Plan 43-01: tiny zod schema for departments.
// The v4 department.types.ts only has a hand-rolled TS type; admin register
// CRUD needs runtime validation, so define it here without touching v4.

import { z } from 'zod/v4';

export const departmentCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export const departmentUpdateSchema = departmentCreateSchema.partial();

export type DepartmentCreate = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdate = z.infer<typeof departmentUpdateSchema>;
