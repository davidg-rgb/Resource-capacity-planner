import type * as schema from '@/db/schema';

/** A project row as returned from the database */
export type ProjectRow = typeof schema.projects.$inferSelect;

/** Fields required to create a new project */
export type ProjectCreate = {
  name: string;
  programId?: string | null;
  status?: 'active' | 'planned';
};

/** Fields that can be updated on a project */
export type ProjectUpdate = Partial<ProjectCreate>;

/** Filter options for listing projects */
export type ProjectFilter = {
  programId?: string;
  status?: 'active' | 'planned' | 'archived';
  search?: string;
  includeArchived?: boolean;
};
