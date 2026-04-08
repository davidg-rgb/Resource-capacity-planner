// v5.0 — Phase 40 / Plan 40-01: allocation-specific error types.
//
// HistoricEditNotConfirmedError is thrown by patchAllocation when the caller
// tries to edit an allocation whose monthKey is strictly less than the server
// now month key WITHOUT passing `confirmHistoric: true`. HTTP 409 per D-15 /
// ARCHITECTURE §616-627 (soft-warn historic edit contract).

import { AppError } from '@/lib/errors';

export const ERR_HISTORIC_EDIT_NOT_CONFIRMED = 'HISTORIC_EDIT_NOT_CONFIRMED';

export class HistoricEditNotConfirmedError extends AppError {
  readonly targetMonthKey: string;
  readonly nowMonthKey: string;

  constructor(targetMonthKey: string, nowMonthKey: string) {
    super(
      `Historic edit of ${targetMonthKey} requires confirmHistoric:true (server now=${nowMonthKey})`,
      ERR_HISTORIC_EDIT_NOT_CONFIRMED,
      409,
      { targetMonthKey, nowMonthKey },
    );
    this.targetMonthKey = targetMonthKey;
    this.nowMonthKey = nowMonthKey;
  }
}
