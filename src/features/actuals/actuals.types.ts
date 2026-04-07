// v5.0 — Phase 37: actuals service input/output types.
// Discriminated union on `grain`. UI accepts day/week/month grains; the
// service expands week/month into day rows via lib/time helpers.

export type UpsertActualsBase = {
  orgId: string;
  personId: string;
  projectId: string;
  source: 'manual' | 'import';
  importBatchId?: string | null;
  actorPersonaId: string;
};

export type UpsertActualsDayInput = UpsertActualsBase & {
  grain: 'day';
  date: string; // 'YYYY-MM-DD'
  hours: number;
};

export type UpsertActualsWeekInput = UpsertActualsBase & {
  grain: 'week';
  isoYear: number;
  isoWeek: number;
  totalHours: number;
};

export type UpsertActualsMonthInput = UpsertActualsBase & {
  grain: 'month';
  monthKey: string; // 'YYYY-MM'
  totalHours: number;
};

export type UpsertActualsInput =
  | UpsertActualsDayInput
  | UpsertActualsWeekInput
  | UpsertActualsMonthInput;

export type UpsertActualsResult = {
  rowsWritten: number;
  dates: string[];
};
