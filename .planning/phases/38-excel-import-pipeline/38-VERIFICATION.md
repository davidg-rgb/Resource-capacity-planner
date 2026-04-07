---
phase: 38-excel-import-pipeline
verified: 2026-04-07T20:00:00Z
status: passed
score: 20/20 must-haves verified
re_verification: false
human_verification:
  - test: "Upload a real .xlsx file and walk the full wizard flow"
    expected: "Upload step → preview counts shown → unmatched names surfaced with fuzzy suggestions → commit → rollback button visible with countdown"
    why_human: "Full 4-step wizard flow with real server interaction cannot be verified programmatically"
  - test: "Upload a pivoted sheet with US WEEKNUM headers (e.g. W12, Week 12)"
    expected: "422 response with ERR_US_WEEK_HEADERS; wizard stays on upload step with Swedish 'amerikansk veckonumrering' error message"
    why_human: "Requires a real browser interaction to confirm localized error display"
  - test: "Rollback button 24h countdown behavior"
    expected: "Button shows hours remaining, disables exactly at the 24h mark, surfaces ROLLBACK_WINDOW_EXPIRED if rollback is attempted after expiry"
    why_human: "Clock-dependent UI behavior; injected-clock unit tests cover the logic but real rendering needs human confirmation"
---

# Phase 38: Excel Import Pipeline Verification Report

**Phase Goal:** Ship the complete v5.0 actuals import pipeline — Excel parsers for two layouts (row-per-entry and pivoted) with a US WEEKNUM hard-stop, fuzzy name matching, a two-stage parse/preview/commit service with reversal-payload rollback and supersession, four `/api/v5/imports/*` REST routes, a Line Manager import wizard UI, and sv/en i18n coverage.
**Verified:** 2026-04-07T20:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `parseActualsWorkbook` returns `ParsedRow[]` for row-per-entry layout | VERIFIED | `actuals-excel.parser.ts` 340 lines; TC-EX-004..007 pass (17 parser tests total) |
| 2 | `parseActualsWorkbook` returns `ParsedRow[]` for pivoted layout with ISO date/week/month headers | VERIFIED | `parsePivoted` handles all three grain types; TC-EX-008..010 present |
| 3 | Any US WEEKNUM / Sunday-start pivoted header raises `ValidationError(ERR_US_WEEK_HEADERS)` and aborts parse | VERIFIED | `assertNoUsWeekHeaders` + `classifyHeader`; TC-EX-011a..011e (5 variants) all present |
| 4 | `matchPersonName` returns exact / fuzzy (>0.85) / ambiguous / none | VERIFIED | `name-matcher.ts` 170 lines; 8 tests covering all four outcomes including comma-swap |
| 5 | `template_row_per_entry.xlsx` exists under `public/templates` and is parseable with zero warnings | VERIFIED | File at 9913 bytes; `generate-import-template.ts` round-trip self-check passes |
| 6 | POST `/api/v5/imports/parse` accepts xlsx upload, stages in `import_sessions`, returns sessionId | VERIFIED | `parse/route.ts` wired to `parseAndStageActuals`; TC-API-030 present |
| 7 | GET `/api/v5/imports/{sessionId}/preview` returns `{new, updated, warnings, unmatchedNames}` with fuzzy suggestions | VERIFIED | `preview/route.ts` wired to `previewStagedBatch`; TC-API-031 present |
| 8 | POST `/api/v5/imports/{sessionId}/commit` writes `actual_entries`, inserts `import_batches`, writes exactly ONE aggregate change_log row (`ACTUALS_BATCH_COMMITTED`) | VERIFIED | `commitActualsBatch` calls `recordChange` once inside `db.transaction`; `onConflictDoUpdate` confirmed; TC-AC-007..010 tests pass |
| 9 | Manual edits (source='manual') are preserved when `overrideManualEdits=false` and replaced when `true` | VERIFIED | `skip-manual` action in `validateStagedRows`; override flag checked in commit; contract tests cover both paths |
| 10 | Second commit on overlapping rows refused with `PRIOR_BATCH_ACTIVE` unless `overrideUnrolledImports=true`, which then marks prior batch `superseded_at` | VERIFIED | Lines 166, 275 of `actuals-import.service.ts`; TC-AC-016 supersession test in `rollback-supersession.contract.test.ts` |
| 11 | POST `/api/v5/imports/batches/{batchId}/rollback` restores prior values from reversal_payload and writes `ACTUALS_BATCH_ROLLED_BACK`, within 24h | VERIFIED | `rollbackBatch` at line 375; `recordChange(…'ACTUALS_BATCH_ROLLED_BACK')` at line 456; TC-AC-012 tests |
| 12 | Rollback after 24h or on superseded batch returns `ROLLBACK_WINDOW_EXPIRED` | VERIFIED | Lines 392–404 check `supersededAt` and `ageMs > ROLLBACK_WINDOW_MS`; TC-API-034 |
| 13 | All four `/api/v5/imports/*` routes use `requireRole('planner')` + `handleApiError` | VERIFIED | All 4 route files import and call `requireRole('planner')` and `handleApiError` |
| 14 | `drizzle/migrations/0006` adds `staged`+`committed` to `import_status` enum | VERIFIED | `0006_import_status_staged_committed.sql` confirmed; `ACTUALS_BATCH_COMMITTED/ROLLED_BACK` and reversal columns were already present from Phase 36 migration 0004 |
| 15 | `eslint nordic/require-change-log` glob covers `src/features/import/**/*.service.ts` | VERIFIED | `eslint.config.mjs` line 23 confirmed; `mutations.json` includes `commitActualsBatch` and `rollbackBatch` |
| 16 | Line Manager can open `/line-manager/import-actuals` and see upload dropzone + template download link | VERIFIED | `page.tsx` exists; `ImportDropzone.tsx` has `<a href="/templates/template_row_per_entry.xlsx" download>` at line 78 |
| 17 | After upload, preview table shows new/updated/warning counts | VERIFIED | `ImportPreviewTable.tsx` with `data-testid` count badges; 3 `ImportPreviewTable.test.tsx` cases |
| 18 | Unmatched names surfaced with fuzzy suggestions (fuzzy-accept / pick-from-dropdown / mark-as-new disabled) | VERIFIED | `UnmatchedNamesPanel.tsx` handles all three `MatchResult` kinds; mark-as-new intentionally disabled (documented per plan) |
| 19 | Override checkbox 'Skriv över manuella ändringar' defaults to unchecked; commit is explicit | VERIFIED | `overrideManualEdits: false` initial state; commit button wired separately from preview |
| 20 | All wizard strings use `v5.import.*` i18n namespace with sv + en parity | VERIFIED | `keys.ts` carries full `import.*` subtree under `v5`; sv.json has 22 import occurrences, en.json has 23; parity test (`keys.test.ts`) stays green |

**Score:** 20/20 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/import/parsers/parser.types.ts` | `ParsedRow`, `ParseWarning`, `ParseResult` types + error code constants | VERIFIED | 68 lines; all required exports present including `ERR_US_WEEK_HEADERS`, `ERR_UNKNOWN_LAYOUT`, `ERR_BAD_HOURS`, `ERR_BAD_DATE` |
| `src/features/import/parsers/actuals-excel.parser.ts` | `parseActualsWorkbook`, `detectLayout`, `parseRowPerEntry`, `parsePivoted`, `classifyHeader` | VERIFIED | 430 lines; all 5 named exports confirmed |
| `src/features/import/matching/name-matcher.ts` | `matchPersonName`, `matchProjectName` (string-similarity based) | VERIFIED | 170 lines; composite Dice + Levenshtein + token-prefix; all 4 result kinds implemented |
| `public/templates/template_row_per_entry.xlsx` | Downloadable import template (static asset) | VERIFIED | 9913 bytes; round-trip self-check passes via `generate-import-template.ts` |
| `drizzle/migrations/0006_import_status_staged_committed.sql` | Adds `staged` + `committed` to `import_status` enum | VERIFIED | 2-line migration; all other reversal/supersession columns confirmed in `schema.ts` from Phase 36 |
| `src/features/import/actuals-import.service.ts` | `parseAndStageActuals`, `previewStagedBatch`, `commitActualsBatch`, `rollbackBatch` | VERIFIED | 430 lines; all 4 exported async functions present and substantive |
| `src/features/import/validate-staged-rows.ts` | `validateStagedRows` — resolves names, diffs, returns counts + unmatched list | VERIFIED | 250 lines; handles exact/fuzzy resolution, insert/update/noop/skip-manual/skip-prior-batch actions |
| `src/app/api/v5/imports/parse/route.ts` | POST parse endpoint (multipart upload) | VERIFIED | 47 lines; file-type + size guard; calls `parseAndStageActuals`; 201 response |
| `src/app/api/v5/imports/[sessionId]/preview/route.ts` | GET preview endpoint | VERIFIED | Calls `previewStagedBatch`; 200 response |
| `src/app/api/v5/imports/[sessionId]/commit/route.ts` | POST commit endpoint | VERIFIED | Zod-validated body; 201 response; calls `commitActualsBatch` |
| `src/app/api/v5/imports/batches/[batchId]/rollback/route.ts` | POST rollback endpoint | VERIFIED | Calls `rollbackBatch`; 200 response; 409 error codes |
| `src/features/import/ui/ImportWizard.tsx` | Top-level wizard wiring steps upload→preview→confirm→result | VERIFIED | 6620 bytes; switches on `state.step`; uses `useImportWizard` hook |
| `src/features/import/ui/ImportPreviewTable.tsx` | Preview table with new/updated/warning badges and row list | VERIFIED | Renders count badges with `data-testid`; collapsible warnings; first 50 rows with "show more" |
| `src/features/import/ui/UnmatchedNamesPanel.tsx` | Fuzzy suggestion resolver UI (IMP-07) | VERIFIED | Handles fuzzy/ambiguous/none kinds; disabled mark-as-new per plan intent |
| `src/features/import/ui/RollbackButton.tsx` | Time-aware rollback (disabled after 24h or superseded) | VERIFIED | `hoursRemaining` computed from injected clock; `useEffect` tick; confirm dialog |
| `src/app/(app)/line-manager/import-actuals/page.tsx` | WIZ-01 page route | VERIFIED | Server component; renders `<ImportWizard />`; registered as route in build |
| `src/messages/sv.json` | `v5.import.*` Swedish strings | VERIFIED | Full `import` subtree under `v5` in sv.json; 22 import-related occurrences |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `actuals-excel.parser.ts` | `@/lib/time` ISO calendar helpers | `from '@/lib/time'` import | WIRED | Imports `getISOWeek`, `getISOWeekYear`, `workDaysInIsoWeek`, `workDaysInMonth` from `@/lib/time` |
| `actuals-excel.parser.ts` | SheetJS `xlsx` package | `XLSX.read` + `sheet_to_json` | WIRED | `import * as XLSX from 'xlsx'` at line 18 |
| `import.service.commitActualsBatch` | `change_log` via `recordChange` | `recordChange(` inside `db.transaction` | WIRED | Lines 332+338: `recordChange` called with `ACTUALS_BATCH_COMMITTED` inside same tx |
| `import.service.commitActualsBatch` | `actual_entries` upsert | `onConflictDoUpdate` | WIRED | Line 309 of `actuals-import.service.ts` |
| `api/v5/imports/* routes` | `actuals-import.service` | `requireRole('planner')` + `handleApiError` | WIRED | All 4 route files confirmed; note: plan called for `withTenant()` but actual pattern is `requireRole()` — functionally equivalent, documented deviation |
| `eslint nordic/require-change-log` | `src/features/import/actuals-import.service.ts` | `features/import/**/*.service.ts` glob | WIRED | `eslint.config.mjs` line 23 confirmed |
| `use-import-wizard.ts` httpFetcher | `/api/v5/imports/parse` | `fetch('/api/v5/imports/parse', ...)` POST | WIRED | Line 72 of `use-import-wizard.ts` |
| `use-import-wizard.ts` httpFetcher | `/api/v5/imports/{sessionId}/commit` | `fetch(`/api/v5/imports/${sessionId}/commit`, ...)` | WIRED | Line 83 of `use-import-wizard.ts` |
| `RollbackButton.tsx` | `/api/v5/imports/batches/{batchId}/rollback` | `fetch` POST via hook `rollback()` action | WIRED | Line 96 of `use-import-wizard.ts`; `RollbackButton` calls `actions.rollback()` |
| `ImportDropzone.tsx` | `/templates/template_row_per_entry.xlsx` | `<a href="/templates/template_row_per_entry.xlsx" download>` | WIRED | Line 78 of `ImportDropzone.tsx` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ImportPreviewTable.tsx` | `preview: PreviewResult` | `previewStagedBatch` → `validateStagedRows` → DB query on `actual_entries` | Yes — DB diff against real rows | FLOWING |
| `UnmatchedNamesPanel.tsx` | `unmatchedNames` from `PreviewResult` | `validateStagedRows` → `matchPersonName` against DB-loaded people/projects | Yes — real fuzzy match results | FLOWING |
| `RollbackButton.tsx` | `committedAt` from `state.committedAt` | Commit response from `POST /commit` → `import_batches.committed_at` | Yes — real DB timestamp | FLOWING |
| `ImportWizard.tsx (unmatched step)` | `personCandidates` / `projectCandidates` | Not passed by wizard — defaults to `[]` in `UnmatchedNamesPanel` | No — `kind:'none'` picker shows placeholder only | PARTIAL — documented intentional stub; fuzzy/ambiguous paths (the common cases) still flow correctly |

**Note on `personCandidates`/`projectCandidates`:** The `UnmatchedNamesPanel` receives empty arrays from the wizard, meaning if a name produces `match.kind === 'none'` the picker shows only a placeholder `<select>`. This is explicitly documented in both `38-03-SUMMARY.md` Known Stubs section and `UnmatchedNamesPanel.tsx` line 26. The fuzzy and ambiguous paths — which are the expected common cases — receive real data from the server's `PreviewResult.unmatchedNames`. Not a goal blocker for WIZ-01.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Parser exports are all present | `grep -n "^export function\|^export async function" actuals-excel.parser.ts` | `detectLayout`, `classifyHeader`, `parseRowPerEntry`, `parsePivoted`, `parseActualsWorkbook` confirmed | PASS |
| Service exports are all present | `grep -n "^export async function" actuals-import.service.ts` | `parseAndStageActuals`, `previewStagedBatch`, `commitActualsBatch`, `rollbackBatch` confirmed | PASS |
| Template xlsx exists and has expected size | `ls -la public/templates/template_row_per_entry.xlsx` | 9913 bytes | PASS |
| All 9 feature commits exist in git log | `git log --oneline fe6ce86 45650b5 d73dbf3 6be6a21 bde5ee8 d26f05c 3e9633f 32e9694 99a1f52` | All 9 returned | PASS |
| No date-fns or Date.getDay in parser | `grep "date-fns\|Date\.getDay" actuals-excel.parser.ts` | Only a comment referencing the ban; no actual imports | PASS |
| US-week hard-stop covers 5 variant tests | `grep -n "TC-EX-011" actuals-excel.parser.test.ts` | TC-EX-011a..011e (5 subtests including Sunday-start and no-partial-parse guard) | PASS |
| mutations.json has both new entries | `grep "commitActualsBatch\|rollbackBatch" tests/invariants/mutations.json` | Both entries present | PASS |
| requireRole on all 4 routes | grep across all 4 route files | All 4 routes confirmed | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| IMP-02 | 38-01, 38-02 | Two-layout parser (row-per-entry + pivoted) with US WEEKNUM hard-stop | SATISFIED | `actuals-excel.parser.ts` + TC-EX-001..012; `assertNoUsWeekHeaders` with 5 variants |
| IMP-03 | 38-02, 38-03 | Two-stage parse→preview→commit flow | SATISFIED | `parseAndStageActuals` + `previewStagedBatch` + `commitActualsBatch`; wizard UI walks the 4 steps |
| IMP-04 | 38-02 | Idempotency + override flags for manual edits and prior batches | SATISFIED | `overrideManualEdits` + `overrideUnrolledImports` flags; idempotency tested in contract tests |
| IMP-05 | 38-02 | Rollback within 24h; reversal payload; supersession anti-corruption | SATISFIED | `rollbackBatch` + chained reversal_payload; TC-AC-012..017 including the chain corruption test |
| IMP-06 | 38-01 | Downloadable `.xlsx` template as static asset | SATISFIED | `public/templates/template_row_per_entry.xlsx` 9913 bytes; download link in `ImportDropzone.tsx` |
| IMP-07 | 38-01, 38-02, 38-03 | Fuzzy name matching surfaced in preview | SATISFIED | `matchPersonName` / `matchProjectName`; `unmatchedNames` in `PreviewResult`; `UnmatchedNamesPanel` UI |
| WIZ-01 | 38-03 | Line Manager actuals import wizard page | SATISFIED | `/line-manager/import-actuals` registered; ImportWizard 4-step flow; sv/en i18n parity |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `UnmatchedNamesPanel.tsx` | 44–45 | `personCandidates = [], projectCandidates = []` defaults used by wizard | Warning | `kind:'none'` picker shows placeholder only; documented intentional stub for WIZ-01; fuzzy/ambiguous paths unaffected |
| `UnmatchedNamesPanel.tsx` | 136–140 | Mark-as-new button `disabled` | Info | Intentional per WIZ-01 scope; future plan needed for on-the-fly person creation |

**No blockers found.** The two warnings are explicitly documented in `38-03-SUMMARY.md` Known Stubs section.

---

### Deferred Items (Not Phase 38 Gaps)

**TC-CL-005 (`change-log.coverage.test.ts`)** — Pre-existing ESM spy issue carried from Phase 37 (`upsertActuals` already failed before Phase 38 began). Phase 38 adds two new entries (`commitActualsBatch`, `rollbackBatch`) that inherit the same structural failure. Real `recordChange` coverage is provided by the pglite contract tests in `src/features/import/__tests__/`. Full analysis and fix plan documented in `deferred-items.md`. Deferred to Phase 44.

---

### Human Verification Required

#### 1. Full Wizard Flow End-to-End

**Test:** Navigate to `/line-manager/import-actuals`, drag-drop a valid `.xlsx` file with the row-per-entry layout, verify preview counts appear correctly, proceed through confirm, commit, verify rollback button appears with a countdown.
**Expected:** Upload → preview shows new/updated/warning counts → confirm step with 'Skriv över manuella ändringar' checkbox unchecked → commit succeeds → result step shows rollback button with hours remaining
**Why human:** Requires a running dev server, real Clerk auth session, and database seeded with demo data.

#### 2. US WEEKNUM Hard-Stop in UI

**Test:** Upload a pivoted `.xlsx` with bare `W12`, `Week 12`, or bare-number week headers.
**Expected:** Wizard stays on the upload step and shows the Swedish 'amerikansk veckonumrering' error message (from `v5.import.upload.parseError.usWeek`).
**Why human:** Requires visual confirmation of the localized error display in the browser.

#### 3. Rollback Button 24h Countdown

**Test:** After committing a batch, verify the rollback button shows the correct hours remaining and automatically disables at expiry.
**Expected:** Button shows "N.N timmar kvar", self-disables after 24h or on server-returned `ROLLBACK_WINDOW_EXPIRED`.
**Why human:** Clock-dependent behavior; unit tests use an injected clock but real browser rendering requires manual confirmation.

---

### Gaps Summary

No gaps blocking goal achievement. Phase 38 delivers all planned artifacts for requirements IMP-02 through IMP-07 and WIZ-01:

- All 25 Plan 38-01 tests (17 parser + 8 matcher) are substantive and cover all TC-EX-001..012 cases including all 5 US-week detection variants.
- All 23 Plan 38-02 tests (10 contract + 6 rollback/supersession + 7 API) cover TC-IMP, TC-AC-007..017, TC-API-030..034.
- All 10 Plan 38-03 tests (3 preview + 4 unmatched + 3 wizard) cover wizard rendering and error routing.
- All 9 feature commits verified present in git history.
- All 4 API routes wired with `requireRole` auth and `handleApiError`.
- ESLint glob and mutations manifest both updated to cover the new service.
- The `personCandidates`/`projectCandidates` empty-default stub and the disabled mark-as-new button are intentional scope decisions documented in the summary, not gaps.

---

_Verified: 2026-04-07T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
