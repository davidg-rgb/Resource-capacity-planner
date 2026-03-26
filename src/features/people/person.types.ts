import type { CapacityStatus } from '@/lib/capacity';
import type * as schema from '@/db/schema';

/** A person row as returned from the database */
export type PersonRow = typeof schema.people.$inferSelect;

/** Fields required to create a new person */
export type PersonCreate = {
  firstName: string;
  lastName: string;
  disciplineId: string;
  departmentId: string;
  targetHoursPerMonth?: number;
};

/** Fields that can be updated on a person */
export type PersonUpdate = Partial<PersonCreate>;

/** Filter options for listing people */
export type PersonFilter = {
  departmentId?: string;
  disciplineId?: string;
  search?: string;
  includeArchived?: boolean;
  withStatus?: boolean;
};

/** Person with computed allocation status for sidebar display */
export type PersonWithStatus = PersonRow & {
  departmentName: string;
  disciplineAbbreviation: string;
  status: CapacityStatus;
  currentMonthSum: number;
};
