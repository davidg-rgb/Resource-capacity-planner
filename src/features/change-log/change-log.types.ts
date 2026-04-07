// v5.0 — FOUND-V5-04: change_log type surface
// Single source of truth: Drizzle pgEnum.enumValues + table.$inferSelect.
import { changeLog, changeLogActionEnum, changeLogEntityEnum } from '@/db/schema';

export type ChangeLogEntity = (typeof changeLogEntityEnum.enumValues)[number];
export type ChangeLogAction = (typeof changeLogActionEnum.enumValues)[number];
export type ChangeLogEntry = typeof changeLog.$inferSelect;

export type RecordChangeInput = {
  orgId: string;
  actorPersonaId: string;
  entity: ChangeLogEntity;
  entityId: string;
  action: ChangeLogAction;
  previousValue: unknown | null;
  newValue: unknown | null;
  context: Record<string, unknown> | null;
};
