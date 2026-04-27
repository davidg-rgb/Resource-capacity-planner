# Round 2 Audit — Agent B (v5.0-ARCHITECTURE.md)

**Scanned at:** 2026-04-27
**Codebase HEAD:** `d3c3212` (post-fix)

## Round 1 verification

| ID | Status | Evidence |
|---|---|---|
| F-B-02 (P0 wire break) | **PASS** ✓ | `src/features/allocations/allocation.service.ts:281` throws `HistoricConfirmRequiredError`. Old class is now thin re-export. Wire code is `HISTORIC_CONFIRM_REQUIRED`. |
| F-B-08 (eslint regex vs codegen) | **PASS** ✓ | Both files import shared `eslint-rules/_mutation-prefix-regex.js`. Manifest contains 14 entries. |
| F-B-12 (collectBlockers DB-clock) | **PASS** ✓ | `src/features/admin/register.service.ts:462` uses `getServerNowMonthKey(tx)`. |
| F-B-14 (US_WEEK_DETECTED → ERR_US_WEEK_HEADERS) | **PARTIAL** | Code-fix landed; doc-fix incomplete (see F-B-101). |
| F-B-03 RV (`bulkCopyForward` deferred) | **PASS** ✓ | §6.3 line 710, §8.1 line 1365 annotated `(DEFERRED to Phase 6.1 polish)`. |
| F-B-04 RV (`/api/v5/actuals` routes) | **PASS** ✓ | §8.1 lines 1418-1422 carry server-action note. |
| F-B-15 RV (capacity `departmentId` required) | **PASS** ✓ | §8.1 line 1495 inline-annotated. |
| F-B-01 (HISTORIC_CONFIRM_REQUIRED 409 vs doc 400) | **STILL-DRIFTED** | Code at 409 per CONS-P1-12; doc still says 400. Re-flagged as F-B-100. |

## New findings

### F-B-100 (P1) — Doc still labels HISTORIC_CONFIRM_REQUIRED as 400 ValidationError
- **Doc:** §11.1 line 1726, §8.1 line 1363, §15.10 TC-API-004 line 2116
- **Code:** `src/lib/errors.ts:107-114` — status 409. Test asserts 409.
- **Action:** doc-fix only. Move from §11.1 ValidationError(400) to ConflictError(409); rewrite §8.1:1363 and TC-API-004 to `409`.

### F-B-101 (P2) — Doc still spells `US_WEEK_DETECTED` instead of `ERR_US_WEEK_HEADERS`
- **Doc:** §11.1 line 1727, §15.9 TC-EX-008 line 2104
- **Action:** doc-fix — rewrite both occurrences. Also: TC-EX-008 says "warning" but parser throws `ValidationError` (second drift on same line).

### F-B-102 (P1) — Capacity GET response shape mismatch
- **Doc:** §8.1 line 1496 — `Response 200: { heatmap: UtilizationCell[] }`
- **Code:** `src/app/api/v5/capacity/route.ts:47` returns `getPersonMonthUtilization` result (`{ cells, people }`)
- **Action:** doc-fix — rewrite to `Response 200: { cells: UtilizationCell[], people: PersonRowLite[] }`

### F-B-103 (P2) — `rangeQuarters` / `rangeYears` signature drift
- **Doc:** §6.1 lines 500-506 — both helpers as `(start: string, end: string): string[]`
- **Code:** `src/lib/time/iso-calendar.ts:274,290` — both take `(monthRange: string[])`
- **Action:** doc-fix

### F-B-104 (P3) — `proposalStatusEnum.superseded` exists; no `PROPOSAL_SUPERSEDED` action enum
- **Code:** `src/db/schema.ts:99` (status), `:76-91` (action enum). `proposal.service.ts:528` logs `PROPOSAL_WITHDRAWN` with `context.reason='superseded_by'`
- **Action:** code-fix preferred (add `PROPOSAL_SUPERSEDED` action) or doc-fix

### F-B-105 (P2) — `ERR_*` prefix convention inconsistent
- **Code:** Prefixed: `ERR_VALIDATION`, `ERR_AUTH`, `ERR_FORBIDDEN`, `ERR_NOT_FOUND`, `ERR_CONFLICT`, `ERR_PAYLOAD_TOO_LARGE`, `ERR_INTERNAL`, `ERR_HOLIDAY_YEAR_OUT_OF_RANGE`, `ERR_US_WEEK_HEADERS`. Bare: `HISTORIC_CONFIRM_REQUIRED`, `BAD_HOURS`, `REASON_REQUIRED`, `BATCH_ALREADY_ROLLED_BACK`, etc.
- **Smoking gun:** `src/lib/errors.ts:73` `export const ERR_PROPOSAL_NOT_ACTIVE = 'PROPOSAL_NOT_ACTIVE';` — constant carries prefix, value strips it
- **Action:** decision required, then doc-or-code-fix. Recommend dropping `ERR_` from wire codes (most are already bare)

### F-B-106 (P2) — `change-log.coverage.test.ts` runtime suite still exercises 9 of 14 manifest entries
- **Code:** `tests/invariants/change-log.coverage.test.ts:239-242, 267-271`
- **Action:** code-fix — extend stub harness, or add explicit allow-list constant

### F-B-107 (P2) — `ValidationError` taxonomy mismatch
- **Doc:** §11.1 lists `INVALID_DATE` and `HOURS_NEGATIVE`
- **Code:** No `HOURS_NEGATIVE`. `INVALID_DATE` thrown by `iso-calendar.ts:331` but isn't in canonical 8
- **Action:** doc-fix — rewrite §11.1 against actual canonical 8

### F-B-108 (P2) — Auxiliary import error codes still outside canonical taxonomy
- **Code:** `ERR_SESSION_NOT_STAGED`, `ERR_SESSION_ALREADY_COMMITTED`, `ERR_PRIOR_BATCH_ACTIVE`, `PRIOR_BATCH_ACTIVE`, `UNRESOLVED_NAMES`, `ROLLED_BACK`, `ERR_UNKNOWN_LAYOUT`, `UNSUPPORTED_FILE_TYPE`
- **Doc:** §11.1 lists `SESSION_ALREADY_COMMITTED` only
- **Action:** doc-fix — carry-over of F-B-19. UI pattern-matches these so they're real wire

### F-B-109 (P2) — `getCapacityBreakdown` doc omits multi-tenant join scoping
- **Code:** Post CONS-P0-08 fix, joins scope on `organization_id`
- **Action:** doc-fix — add note + reference to TC-INV-002

### F-B-110 (P3) — `actual.service` doc still names three discrete exports
- **Doc:** §6.4 lines 732-760 lists `upsertActualDay`, `distributeWeekly`, `distributeMonthly`, `commitActualsBatch`
- **Code:** `actuals.service.ts:61` only `upsertActuals` with `grain` discriminator
- **Action:** doc-fix — carry-over of F-B-05

### F-B-111 (P3) — Allocation route doc says `400 invalid hours`
- **Doc:** §8.1 line 1363 — free-text "400 invalid hours"
- **Code:** `BadHoursError` (code `BAD_HOURS`, status 400)
- **Action:** doc-fix

### F-B-112 (P3) — `submitProposal` documented; code has `createProposal`
- **Doc:** §8.1 line 1378
- **Code:** `proposal.service.ts` exports `createProposal`
- **Action:** doc-fix — carry-over of F-B-06

### F-B-113 (P2) — `actorPersonaId` parameter convention drifted to four different names
- **Doc:** §11.3 fixes convention to `actorPersonaId: string`
- **Code:** `committedBy`/`rolledBackBy` in actuals-import; `requestedBy` and `actorPersonaId` in proposals; `actorUserId` in register
- **Action:** decision required — pick `actorUserId` (Clerk identity) OR `actorPersonaId` (matches doc)

### F-B-114 (P3) — `ConflictError.codes.DUPLICATE_PROPOSAL` documented; not implemented
- **Doc:** §11.1 line 1734
- **Code:** Zero references. Auto-supersession path supersedes the conflict
- **Action:** doc-fix — drop from §11.1

### F-B-115 (P3) — `iso-calendar.ts` exports `currentMonthKey()` and `formatWeekLabel()` not in §6.1
- **Code:** `iso-calendar.ts:398, 411`
- **Action:** doc-fix — carry-over of F-B-22

## Summary

| Severity | Count |
|---|---|
| P1 | 2 (F-B-100, F-B-102) |
| P2 | 8 (F-B-101, 103, 105, 106, 107, 108, 109, 113) |
| P3 | 6 (F-B-104, 110, 111, 112, 114, 115) |
| **Total new** | **16** |

**Verification roll-up:** 5 PASS, 1 PARTIAL (doc residue), 1 STILL-DRIFTED (doc-fix). All Round 1 code-fixes verified clean. Remaining drift concentrated in §11.1 error taxonomy and §8.1 route response shapes — single coordinated v5.0-ARCHITECTURE.md doc-modernization pass would clear F-B-100, 101, 102, 107, 108, 110, 111, 112, 114, 115.
