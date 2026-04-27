// v5.0 — Phase 40 / Plan 40-01: allocation-specific error types.
//
// Round 1 audit CONS-P0-09: the original `HistoricEditNotConfirmedError`
// (code HISTORIC_EDIT_NOT_CONFIRMED) collided with the canonical
// `HistoricConfirmRequiredError` (code HISTORIC_CONFIRM_REQUIRED, status 409)
// declared in `@/lib/errors`. Canonicalized on the latter; this file is kept
// only as a thin re-export to avoid breaking any stragglers that import the
// old name. New code should import directly from `@/lib/errors`.

export { HistoricConfirmRequiredError as HistoricEditNotConfirmedError } from '@/lib/errors';
export { HISTORIC_CONFIRM_REQUIRED as ERR_HISTORIC_EDIT_NOT_CONFIRMED } from '@/lib/errors/codes';
