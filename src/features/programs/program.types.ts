import type * as schema from '@/db/schema';

/** A program row as returned from the database */
export type ProgramRow = typeof schema.programs.$inferSelect;

/** Fields required to create a new program */
export type ProgramCreate = {
  name: string;
  description?: string | null;
};

/** Fields that can be updated on a program */
export type ProgramUpdate = Partial<ProgramCreate>;
