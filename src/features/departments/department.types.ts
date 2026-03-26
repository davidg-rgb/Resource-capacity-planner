import type * as schema from '@/db/schema';

/** A department row as returned from the database */
export type DepartmentRow = typeof schema.departments.$inferSelect;

/** Fields required to create a new department */
export type DepartmentCreate = {
  name: string;
};

/** Fields that can be updated on a department */
export type DepartmentUpdate = Partial<DepartmentCreate>;
