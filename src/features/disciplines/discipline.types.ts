import type * as schema from '@/db/schema';

/** A discipline row as returned from the database */
export type DisciplineRow = typeof schema.disciplines.$inferSelect;

/** Fields required to create a new discipline */
export type DisciplineCreate = {
  name: string;
  abbreviation: string;
};

/** Fields that can be updated on a discipline */
export type DisciplineUpdate = Partial<DisciplineCreate>;
