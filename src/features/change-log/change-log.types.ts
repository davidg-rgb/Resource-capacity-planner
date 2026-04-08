// v5.0 — FOUND-V5-04: change_log type surface
// Single source of truth: Drizzle pgEnum.enumValues + table.$inferSelect.
import { changeLog, changeLogActionEnum, changeLogEntityEnum } from '@/db/schema';

export type ChangeLogEntity = (typeof changeLogEntityEnum.enumValues)[number];
export type ChangeLogAction = (typeof changeLogActionEnum.enumValues)[number];
export type ChangeLogEntry = typeof changeLog.$inferSelect;

// v5.0 — Phase 41 / Plan 41-01: feed read-model types (UX-V5-10).
export interface FeedFilter {
  projectIds?: string[];
  personIds?: string[];
  entity?: ChangeLogEntity[];
  actions?: ChangeLogAction[];
  actorPersonaIds?: string[];
  dateRange?: { from: string; to: string }; // ISO timestamps
}

export interface FeedPagination {
  limit?: number;
  cursor?: string | null;
}

export interface FeedPage {
  entries: ChangeLogEntry[];
  nextCursor: string | null;
}

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
