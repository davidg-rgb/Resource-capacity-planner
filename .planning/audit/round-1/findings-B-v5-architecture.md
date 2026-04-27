# Round 1 Audit — Agent B (v5.0-ARCHITECTURE.md)

**Scanned at:** 2026-04-27
**Target doc:** `.planning/v5.0-ARCHITECTURE.md` (2,408 lines)

## Findings

### F-B-01 — `HistoricConfirmRequiredError` returns HTTP 409, doc says 400
- **Severity:** P1 (doc-drift)
- **Location:** `src/lib/errors.ts:107-114`; `tests/invariants/error-wire-format.test.ts:67-71` (status 409); doc §8.1 line 1363, §11.1 lines 1717-1722
- **Suggested action:** Decide canonical (semantically 409 is defensible). Update the loser. If 409 is correct, also remove HISTORIC_CONFIRM_REQUIRED from §11.1 ValidationError(400) block

### F-B-02 — `patchAllocation` throws `HistoricEditNotConfirmedError` (code `HISTORIC_EDIT_NOT_CONFIRMED`), not the documented `HISTORIC_CONFIRM_REQUIRED` ⚠️ P0 WIRE BREAK
- **Severity:** P0 (breaks documented contract — wire code mismatch)
- **Location:** `src/features/allocations/allocation.errors.ts:10-26`; thrown by `src/features/allocations/allocation.service.ts:270`. `patchAllocation` is the only PATCH path for `/api/v5/planning/allocations/:id`.
- **Doc reference:** §6.3 line 662, §8.1 line 1363, §11.1, §15.4 TC-PS-005, §15.18 TC-PS-011, §15.10 TC-API-004
- **Drift:** Two parallel error classes exist:
  - `HistoricConfirmRequiredError` (lib/errors.ts:107) — code `HISTORIC_CONFIRM_REQUIRED`, NEVER thrown in production
  - `HistoricEditNotConfirmedError` (allocation.errors.ts:12) — code `HISTORIC_EDIT_NOT_CONFIRMED`, the one production-thrown
- **Result:** API consumers receive `code: "HISTORIC_EDIT_NOT_CONFIRMED"`; clients pattern-matching on `"HISTORIC_CONFIRM_REQUIRED"` will not match.
- **Suggested action:** code-fix — retire `HistoricEditNotConfirmedError`, have `patchAllocation` throw `HistoricConfirmRequiredError`

### F-B-03 — `bulkCopyForward` does not exist (drag-to-copy contract is unimplemented)
- **Severity:** P1
- **Location:** No source file defines `bulkCopyForward`. Bulk-copy API route absent.
- **Doc reference:** §6.3 lines 710-726; §8.1 line 1366 (`POST /api/v5/planning/allocations/bulk-copy`); F-016; ALLOCATION_BULK_COPIED enum value at `src/db/schema.ts:79`; TC-PS-009/010/012/013/014/016
- **Drift:** §14 Stage 6 places this in Phase 6.1 polish, but architecture doc text is not labeled deferred. The change_log enum value `ALLOCATION_BULK_COPIED` exists for a writer that doesn't.
- **Suggested action:** re-validate-needed — either ship the function or explicitly mark §6.3 lines 710-726 deferred

### F-B-04 — `/api/v5/actuals` and `/api/v5/actuals/daily` routes do not exist
- **Severity:** P1
- **Location:** No `src/app/api/v5/actuals/` directory
- **Doc reference:** §8.1 lines 1418-1428; §15.10 TC-API-020/021
- **Drift:** Architecture lists these as required v5.0 endpoints; tests are stubs. Read helpers exist in `src/features/actuals/actuals.read.ts`.
- **Suggested action:** re-validate-needed — ship the route or document the gap

### F-B-05 — `actual.service` collapses three documented functions into one `upsertActuals({ grain })`
- **Severity:** P2 (doc-drift; behavior preserved)
- **Location:** `src/features/actuals/actuals.service.ts:61-152`
- **Doc reference:** §6.4 lines 732-760 documents three discrete exports
- **Suggested action:** doc-fix

### F-B-06 — Architecture's `planning.service.ts` is sharded into three feature dirs
- **Severity:** P2 (module location drift)
- **Drift:** Architecture §6.3 specifies a single `features/planning/planning.service.ts`. Reality: only `planning.read.ts`. `editAllocation` is `patchAllocation` in `features/allocations/`. Proposal lifecycle in `features/proposals/`. `submitProposal` is renamed to `createProposal`.
- **Suggested action:** doc-fix

### F-B-07 — `change_log` `ACTUAL_UPSERTED` action — UX label coverage unverified
- **Severity:** P3 (doc-traceability)
- **Suggested action:** Confirm change-log feed UI renders ACTUAL_UPSERTED rows with a Swedish label

### F-B-08 — `eslint-rules/require-change-log` regex differs from `scripts/generate-mutations-manifest.ts`
- **Severity:** P2 (escape-hatch coverage)
- **Location:** `eslint-rules/require-change-log.js:11-12` regex; codegen at `scripts/generate-mutations-manifest.ts:17-18` is a SUPERSET adding `resubmit`, `patch`, `batch[A-Z]`
- **Drift:** `resubmitProposal`, `patchAllocation`, `batchUpsertAllocations` are tracked by codegen but NOT enforced by eslint. They DO call `recordChange` today, so latent.
- **Suggested action:** code-fix — sync the two regexes via a shared module

### F-B-09 — Only `departmentId` change re-syncs proposal `target_department_id`
- **Severity:** P3 (out of v5.0 scope)
- **Suggested action:** Add a comment in the service noting "if more denormalizations are added, add their sync here"

### F-B-10 — `nordic/no-date-fns-week-apis` rule name; codebase uses `no-restricted-imports` instead
- **Severity:** P3 (naming, equivalent enforcement)
- **Suggested action:** doc-fix

### F-B-11 — Several TC-IDs are stub-only (doc-grep tests)
- **Severity:** P2 (test-coverage drift)
- **Location:** TC-PS-011..016, TC-AC-011, TC-API-005/020/021 are stubs/grep
- **Suggested action:** Replace doc-greps with real PGlite tests when underlying functions ship

### F-B-12 — `register.service.collectBlockers` uses Node `new Date()` for "is this month historic?"
- **Severity:** P3 (different concern than ADR-009 but inconsistent)
- **Drift:** Midnight CET drift could cause Node and DB to disagree by one month
- **Suggested action:** code-fix — share `getServerNowMonthKey(tx)`

### F-B-13 — `tests/invariants/change-log.coverage.test.ts` runtime suite skips 5 of 14 manifest entries
- **Severity:** P2 (test coverage)
- **Drift:** Doc §15.3 says "for each entry"; test exercises 9 of 14
- **Suggested action:** Expand stub harness to cover all 14, or update §15.3

### F-B-14 — Doc spelling `US_WEEK_DETECTED` differs from canonical wire code `ERR_US_WEEK_HEADERS`
- **Severity:** P2 (intentional change between doc iterations)
- **Drift:** API-V5-01 (Phase 44) chose `ERR_US_WEEK_HEADERS` as canonical. Parser throws with that code. UI accepts BOTH; i18n keys still use `US_WEEK_DETECTED`. Users see right Swedish text; doc and wire are out of sync.
- **Suggested action:** code-fix — drop `US_WEEK_DETECTED` fallback in `use-import-wizard.ts`; doc-fix to canonicalize

### F-B-15 — Capacity GET requires `departmentId`; doc lists it optional
- **Severity:** P2 (doc-drift)
- **Location:** `src/app/api/v5/capacity/route.ts:16-20`
- **Drift:** R&D persona expects un-scoped capacity reads; requiring `departmentId` blocks that
- **Suggested action:** re-validate-needed

### F-B-16 — `FOUND-V5-06` referenced in code but not defined in doc
- **Severity:** P3 (doc traceability)
- **Suggested action:** Add a FOUND-V5-06 requirement or change comment

### F-B-17 — `proposalStatusEnum` includes `superseded`; supersession is logged as `PROPOSAL_WITHDRAWN`
- **Severity:** P3 (doc-drift; behavior is correct)
- **Drift:** State machine has `superseded` status; action enum has no matching `PROPOSAL_SUPERSEDED` event
- **Suggested action:** code-fix or doc-fix — add `PROPOSAL_SUPERSEDED` action enum

### F-B-18 — Allow-list still has 13 deferred TC-NEG IDs; CI runs none of them
- **Severity:** P2 (acknowledged-deferred)
- **Suggested action:** Pin TC-NEG-* labels to existing covering invariants, or schedule the dedicated audit-pass

### F-B-19 — Import-only auxiliary error codes outside the canonical 8
- **Severity:** P3 (doc-drift)
- **Drift:** ERR_SESSION_NOT_STAGED, ERR_SESSION_ALREADY_COMMITTED, ERR_PRIOR_BATCH_ACTIVE returned by `/api/v5/imports/.../commit` but not in canonical taxonomy
- **Suggested action:** code-fix or doc-fix

### F-B-20 — `change_log` entity `'actual_entry'` matches doc
- **Severity:** P3 (informational; no drift)

### F-B-21 — `setPersona` default on first load is `admin`; matches TC-PSN-001
- **Severity:** P3 (informational, confirmed)

### F-B-22 — `iso-calendar.ts` exports a slightly richer surface than §6.1 enumerates
- **Severity:** P3 (doc surface drift)
- **Suggested action:** Add missing helpers as one-line entries to §6.1

## Summary

| Severity | Count |
|---|---|
| P0 | 1 (F-B-02) |
| P1 | 3 (F-B-01, F-B-03, F-B-04) |
| P2 | 9 |
| P3 | 9 |
| **Total** | **22** |

Top issues by impact:
- **F-B-02 (P0)** — Wire code drift: code returns `HISTORIC_EDIT_NOT_CONFIRMED`, doc/clients expect `HISTORIC_CONFIRM_REQUIRED`
- **F-B-01 (P1)** — HTTP status drift on the same error (409 vs documented 400)
- **F-B-03 (P1)** — `bulkCopyForward` + bulk-copy route both missing despite doc spec, change_log enum value, and 6 TC-IDs
- **F-B-04 (P1)** — `/api/v5/actuals` and `/api/v5/actuals/daily` routes missing
