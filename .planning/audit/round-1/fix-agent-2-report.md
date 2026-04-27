# Fix Agent 2 Report — Remaining P0 fixes

## Commits made

All five P0 findings are fixed and merged into `main`. Due to lint-staged's
stash-recovery interacting badly with parallel agents committing simultaneously,
two of my commits got their staged files folded into adjacent agents' commits
(noted below). The code is correct and present on `main` either way.

| Finding | Final commit hash | Notes |
|---|---|---|
| CONS-P0-01 | (folded into `3ac3b66` by stash race) | `src/app/page.tsx` flag-aware + `src/app/__tests__/root-page.test.tsx` (4 tests) |
| CONS-P0-06 | `a13a0a0` | clean atomic commit |
| CONS-P0-07 | (folded into `dddb5eb` by stash race) | `src/app/api/dashboard/layout/route.ts` + `src/app/api/dashboard/layout/__tests__/route.test.ts` (10 tests) |
| CONS-P0-08 | `cf6b579` | clean atomic commit |
| CONS-P0-09 | `b012af7` | clean atomic commit |

### CONS-P0-01 — Root `/page.tsx` ignores `uiV6Landing` flag

- `src/app/page.tsx` rewritten as a server component that calls `getTenantId()` + `getOrgFlags()`. When `flags.uiV6Landing === true`, redirects to `/home` (where the existing `PersonaRedirect` client component handles persona-aware redirect). When the flag is off (or auth/org lookup throws), falls through to the legacy `getRoleLandingPage(orgRole)` behavior.
- Added `src/app/__tests__/root-page.test.tsx` with 4 cases:
  1. Flag ON + signed-in → redirect('/home')
  2. Flag OFF + admin → redirect('/dashboard')
  3. Flag OFF + planner → redirect('/dashboard/team')
  4. `getTenantId` throws (signed-out) → falls through to orgRole routing
- `PersonaRedirect` at `src/app/(app)/home/page.tsx` was already correctly implemented and reused as-is — no changes needed there.

### CONS-P0-06 — `getOvercommitBreakdown.pctOfOvercommit` math/contract mismatch

- Renamed field `OvercommitProject.pctOfOvercommit` → `pctOfTotalPlanned` in:
  - `src/features/capacity/capacity.types.ts` (interface + JSDoc)
  - `src/features/capacity/capacity.read.ts` (write site)
  - `src/components/dialogs/overcommit-dialog.tsx` (read site)
  - `src/components/dialogs/__tests__/overcommit-dialog.test.tsx` (fixture)
  - `src/app/api/v5/capacity/__tests__/breakdown.contract.test.ts` (assertion + type alias at line 188-190)
- i18n keys (`overcommitDialog.projectRowLabel` in `messages/sv.json` + `messages/en.json`) were already a generic `"{name} — {hours}h ({pct}%)"` template. No "of overcommit" copy existed, so no i18n change was needed.

### CONS-P0-07 — `/api/dashboard/layout` auth + validation gaps

Three sub-fixes in `src/app/api/dashboard/layout/route.ts`:

1. Both GET and PUT now use `requireRole('viewer')` (was `getTenantId()` + bare `auth()` with no role check).
2. Added `dashboardIdSchema = z.enum(['manager', 'project-leader'])`. PUT body schema and GET searchParams parser both validate against it. Typos like `managr` now return 400.
3. PUT `onConflictDoUpdate.set` now bumps `version: sql\`${dashboardLayouts.version} + 1\`` instead of hardcoded `1`.

Added `src/app/api/dashboard/layout/__tests__/route.test.ts` (PGlite + NextRequest harness) with 10 test cases covering 401/403/400/200 paths and the 1→2→3 version-bump invariant.

### CONS-P0-08 — `getOvercommitBreakdown` queries don't scope `people`/`projects` by `organization_id`

Added defense-in-depth tenant scoping to both queries in `src/features/capacity/capacity.read.ts`:

- `projectRows` (line 316): added `eq(schema.people.organizationId, args.orgId)` and `eq(schema.projects.organizationId, args.orgId)` to the `where(and(...))`.
- `personRows` (line 378): added `eq(schema.people.organizationId, args.orgId)`.

Added a tenant-isolation contract test inside `src/app/api/v5/capacity/__tests__/breakdown.contract.test.ts` that synthesizes a 2-org dataset and asserts org-A query results never bleed org-B projects or people.

### CONS-P0-09 — `patchAllocation` throws wrong error class

- `src/features/allocations/allocation.service.ts:270` now throws `HistoricConfirmRequiredError` from `@/lib/errors` (code `HISTORIC_CONFIRM_REQUIRED`, status 409 — concurrent-state conflict, not malformed input).
- `src/features/allocations/allocation.errors.ts` reduced to a thin re-export under the legacy alias (`HistoricConfirmRequiredError as HistoricEditNotConfirmedError`). New code should import directly from `@/lib/errors`.
- `src/features/allocations/__tests__/patch-allocation.contract.test.ts` updated to assert `HistoricConfirmRequiredError`.
- `src/app/api/v5/planning/allocations/[id]/route.ts` doc-comment updated to reflect the canonical wire code (`HISTORIC_CONFIRM_REQUIRED`).
- `tests/invariants/error-wire-format.test.ts` already locks the canonical 409 + code; no test change needed there.

## Tests passing

All 5 affected test files run green (39 tests total):

```
src/app/__tests__/root-page.test.tsx                                4 passed
tests/invariants/error-wire-format.test.ts                          9 passed
src/app/api/dashboard/layout/__tests__/route.test.ts               10 passed
src/app/api/v5/capacity/__tests__/breakdown.contract.test.ts       11 passed
src/features/allocations/__tests__/patch-allocation.contract.test.ts  5 passed
```

`pnpm tsc --noEmit` is clean except for pre-existing errors not introduced by my work:
- `focus-trap-react` missing dep (3 files)
- `@axe-core/playwright` missing dep (1 file)
- 3 `.next/types/validator.ts` stale-cache errors

## Issues encountered

### lint-staged stash race with parallel agents (2 occurrences)

Two of my commits failed during lint-staged's stash-restore step with `fatal: cannot lock ref 'HEAD': is at <X> but expected <Y>`. The lint-staged hook had already amended the staged files but couldn't update HEAD because a parallel Fix Agent had advanced HEAD between the stash and the commit. Net effect: my CONS-P0-01 staged files (page.tsx, root-page.test.tsx) and my CONS-P0-07 staged files (route.ts, route.test.ts) were absorbed into adjacent agents' commit objects (`3ac3b66` and `dddb5eb` respectively).

The code on `main` is correct in both cases — just attributed under another agent's commit message. Fully recoverable: the lock contention happened *after* my files were written and lint-fixed, so the changes persisted. Verified by:

```
$ git log --all --oneline -- src/app/__tests__/root-page.test.tsx
3ac3b66 fix(audit-r1): CONS-P1-02 cap allocation hours at 744 (was 999)  # contains my file
$ git log --all --oneline -- src/app/api/dashboard/layout/__tests__/route.test.ts
dddb5eb fix(audit-r1): CONS-P1-07 notification-bell mock asserts enabled-gate per persona  # contains my file
```

### Pre-existing eslint failure surfaced by CONS-P1-11

When I tried to commit CONS-P0-09, the `nordic/require-change-log` ESLint rule failed on `batchUpsertAllocations`. Investigation showed Fix Agent 3 had just shipped CONS-P1-11 (`8bb9afb`), which tightened the mutation-prefix regex to recognise `batch[A-Z]`. That re-classified `batchUpsertAllocations` as a mutating export, but it doesn't call `recordChange()` directly (it delegates to `_applyAllocationUpsertsInTx`, and the actual change_log writes happen in the route handler). Fix Agent 3 then added the `@no-change-log` escape-hatch comment to fix it. By the time I retried, Fix Agent 3's escape-hatch was in `main` and my retry succeeded.

### CRLF warnings

Constant `LF will be replaced by CRLF the next time Git touches it` warnings throughout. Cosmetic only — git's autocrlf-on-Windows behavior. Did not affect commits or tests.

## TODOs left for Round 2

1. **`v5.0-ARCHITECTURE.md` §11.1** lists `HISTORIC_CONFIRM_REQUIRED` under `ValidationError(400)`. The actual class is `HistoricConfirmRequiredError(409)` (defensible — concurrent-state conflict, not malformed input). The doc's status code is wrong. CONS-P1-12 already tracks the decision; this is now confirmed canonical at 409.
2. **`v5.0-ARCHITECTURE.md` doc bucket** — at least 11 P1 doc-drift findings (F-A-001..F-A-014 + F-B-05..F-B-10) are best handled as a single coordinated rewrite per CONSOLIDATED-FINDINGS.md §"P1 doc-fix bucket". Out of scope for this fix sweep.
3. **`HistoricEditNotConfirmedError` legacy re-export** — kept in `allocation.errors.ts` to avoid breaking stragglers. After the next round of grep-and-replace, that re-export can be deleted entirely (call sites are limited; today the only consumer of the legacy name is the planning docs at `.planning/phases/40-persona-views-part-1-pm/`).
4. **Phase 50-01 SUMMARY drift** — the summary at `.planning/phases/50-persona-aware-landing-navigation/50-01-SUMMARY.md` claims Plan 01 Task 2 implemented `src/app/page.tsx` flag-aware redirect. The audit (CONS-P0-01) caught that the live file did NOT do that — the flag check was missing entirely. Either Phase 50 Plan 01 Task 2 was reverted before commit, or the SUMMARY was written before the actual edit. This is now correct on `main` post-fix; worth a Phase 50 retrospective note.
