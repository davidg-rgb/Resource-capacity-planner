# Fix Agent 3 Report — P1 code-fixes + cheap P2

## Commits made (Agent 3 only)

P1 code-fixes:
- `3ac3b66` CONS-P1-02 cap allocation hours at 744 (was 999) + unit test
- `20f17fd` CONS-P1-04 add setLandingFlag/setLeanTrimFlag helpers + invariants
- `fc22bea` CONS-P1-05 add Journey 2D upload-actuals + 5A add-person specs
- `dddb5eb` CONS-P1-07 notification-bell mock asserts enabled-gate per persona
- `ce5d5d8` CONS-P1-08 ResourceConflictsPanel guards localStorage from SSR
- `c5b52ad` CONS-P1-09 OvercommitDialog encodes monthKey in deep-link
- `78a941a` CONS-P1-10 LmTimelineCell read-only when no allocation in month
- `8bb9afb` CONS-P1-11 share mutation-prefix regex between rule + codegen
- `57542de` RV-02 tighten people + projects CUD to admin role
- `05b1c6d` RV-02 follow-up — apply admin role on route handlers (split out due to lint-staged sweep dropping the route changes)

P1 doc-fixes (consolidated):
- `f10e9a4` CONS-P1-03 + RV-03/04/05 sync v5/v6 plan to shipped state

Cheap P2 fixes:
- `5d37f30` D-CR-11 share safeT/safeTCount in @/lib/i18n-utils + NotificationBell fallback
- `47d1155` D-CR-12 polish-discipline-rename migration uses EXISTS not regex
- `e0b1457` D-CR-13 narrow getDefaultLayout dashboardId to discriminated union (minimal version — see "Partial fixes")
- `550b503` D-CR-15 discipline-breakdown chartType via Zod (replaces double-cast)
- `ad3684e` D-CR-16 next.config redirects permanent: false for /team*, /projects*
- `4006061` F-B-12 collectBlockers uses DB clock via getServerNowMonthKey
- `85ab09c` F-B-14 canonicalize on ERR_US_WEEK_HEADERS, drop US_WEEK_DETECTED
- `d34afa4` C-P2-1 top-nav links go directly to canonical destinations

CONS-P1-06 (PersonaGate v5.persona namespace) — applied via Edit, but the
changes were swept into Agent 1/2's commit chain (visible in
9527f02 / 057eca2). Verified via git diff: persona-route-guard.ts now reads
`useTranslations('v5.persona')`, `wrongPersonaHint` keys exist in
en.json + sv.json + keys.ts under `v5.persona.wrongPersonaHint.*`, both
route-guard tests updated.

## Tests passing

- `src/features/allocations/__tests__/allocation-schema.test.ts` — 5/5
  (new test file)
- `src/components/persona/__tests__/notification-bell.test.tsx` — 13/13
  (4 new CONS-P1-07 tests)
- `src/features/personas/__tests__/persona-route-guard.test.tsx` — 4/4
- `src/features/personas/__tests__/line-manager-route-guard.negative.test.tsx`
  — 1/1
- `src/app/api/people/__tests__/rbac.contract.test.ts` — 2/2 (new)
- `src/app/api/projects/__tests__/rbac.contract.test.ts` — 2/2 (new)
- `src/features/dashboard/__tests__/default-layouts.test.ts` — 42/42
- `pnpm check:mutations-manifest` — manifest unchanged after CONS-P1-11
  refactor (14 entries, byte-identical)
- `pnpm tsc --noEmit` — clean except for pre-existing missing dev deps
  (focus-trap-react, @axe-core/playwright; not introduced by this work)

## Issues encountered / partial fixes

### CONS-P1-01 — Inconsistent error response shape (DEFERRED)
The fix requires editing `src/lib/errors.ts` to migrate `AppError.toJSON()`
to flat shape. That file is on the do-not-touch list (Agent 2's
territory). Per task description's "If too risky, document and defer"
guidance, deferred entirely. The 11 inline returns across 6 files
(`src/app/api/...`) are still using the documented flat shape; the
mismatch is purely on the AppError side and Agent 2 owns the canonical
class.

### D-CR-13 — getDefaultLayout (PARTIAL FIX)
Task asked to (a) narrow `dashboardId` to `'manager' | 'project-leader'`
and (b) return `null` for unknown keys instead of falling back to
`manager:desktop`. Did (a) cleanly. Skipped (b) because the consumer
side — `src/app/api/dashboard/layout/route.ts` (Agent 2's territory) —
would not type-check against `WidgetPlacement[] | null` and I can't
modify that file. Documented in the function's JSDoc that the full
null-return rewrite is deferred until that consumer is in scope.

### CONS-P1-11 — exposed pre-existing lint failure
After tightening the mutation-prefix regex via the shared module,
`batchUpsertAllocations` in `src/features/allocations/allocation.service.ts`
started failing the `nordic/require-change-log` rule. The function
delegates row-mutation work to `_applyAllocationUpsertsInTx` (which
DOES call `recordChange`), but the rule does not trace through helper
calls. Fixed by adding an `@no-change-log` JSDoc tag with reason. This
is a minimal touch on Agent 2's allocation.service.ts territory but
unavoidable side effect of CONS-P1-11.

### Lint-staged "stash" wrinkle
Multiple commits encountered a lint-staged side effect: husky's
pre-commit hook stashes unstaged work, runs lint --fix on staged files,
then unstashes. When other agents had unstaged WIP in adjacent files,
the stash + restore could occasionally drop my route.ts edits. I
worked around this by:
 - Making smaller, narrower stages (e.g. RV-02 split into two commits:
   tests first, then route handlers)
 - Re-applying lost edits and re-committing as follow-ups
No fixes were lost — just spread across more commits than ideal (~24
total instead of the targeted ~20).

## Doc-fixes applied

- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §4 — added
  CONS-P1-03 callout that the shipped TS uses camelCase
  (`uiV6Landing`, `uiV6LeanTrim`, `uiV6PerJourney`, `uiV6Polish`); the
  dotted form was a plan-time artifact only.
- `.planning/v5.0-ARCHITECTURE.md` §6.3 line 710 — appended `(DEFERRED
  to Phase 6.1 polish)` to `bulkCopyForward`.
- `.planning/v5.0-ARCHITECTURE.md` §8.1 line 1366 — appended
  `(DEFERRED to Phase 6.1 polish)` to the `POST
  /api/v5/planning/allocations/bulk-copy` route.
- `.planning/v5.0-ARCHITECTURE.md` §8.1 lines 1418-1428 — replaced the
  /api/v5/actuals + /actuals/daily routes block with an explicit "NOT
  SHIPPED — consumed via server actions" note pointing at
  `planning.read.ts` / `actuals.read.ts`.
- `.planning/v5.0-ARCHITECTURE.md` §8.1 line 1494 — dropped the `?` from
  `departmentId?` (capacity GET); annotated as required.
- `.planning/v5.0-ARCHITECTURE.md` §15 TC-PS-009/010/012/013/014/016 —
  appended `(DEFERRED)`.
- `.planning/v5.0-ARCHITECTURE.md` §15 TC-API-020/021 — appended
  `(DEFERRED — consumed via server actions)`.

## Files modified by this agent

Code:
- `src/features/allocations/allocation.schema.ts`
- `src/features/import/import.service.ts`
- `src/features/allocations/__tests__/allocation-schema.test.ts` (new)
- `e2e/helpers/flag-toggle.ts`
- `e2e/_invariants/flag-off-parity.spec.ts`
- `e2e/line-manager/2d-upload-actuals.spec.ts` (new)
- `e2e/admin/5a-add-person.spec.ts` (new)
- `src/features/personas/persona-route-guard.ts`
- `src/features/personas/__tests__/persona-route-guard.test.tsx`
- `src/features/personas/__tests__/line-manager-route-guard.negative.test.tsx`
- `src/messages/en.json`, `src/messages/sv.json`, `src/messages/keys.ts`
- `src/components/persona/__tests__/notification-bell.test.tsx`
- `src/components/alerts/resource-conflicts-panel.tsx`
- `src/components/dialogs/overcommit-dialog.tsx`
- `src/components/timeline/lm-timeline-cell.tsx`
- `eslint-rules/_mutation-prefix-regex.js` (new)
- `eslint-rules/require-change-log.js`
- `scripts/generate-mutations-manifest.ts`
- `src/features/allocations/allocation.service.ts` (only the
  `@no-change-log` annotation on `batchUpsertAllocations` — required
  side effect of CONS-P1-11)
- `src/app/api/people/route.ts`, `src/app/api/people/[id]/route.ts`
- `src/app/api/projects/route.ts`, `src/app/api/projects/[id]/route.ts`
- `src/app/api/people/__tests__/rbac.contract.test.ts` (new)
- `src/app/api/projects/__tests__/rbac.contract.test.ts` (new)
- `src/lib/i18n-utils.ts` (new)
- `src/components/persona/notification-bell.tsx`
- `src/db/migrations/20260422_polish_discipline_rename.sql`
- `src/features/dashboard/default-layouts.ts`
- `src/features/dashboard/__tests__/default-layouts.test.ts`
- `src/features/dashboard/widgets/discipline-breakdown-widget.tsx`
- `next.config.ts`
- `src/features/admin/register.service.ts`
- `src/features/import/ui/use-import-wizard.ts`
- `src/features/import/ui/ImportWizard.tsx`
- `src/features/import/__tests__/tc-imp-contract.test.ts`
- `src/components/layout/top-nav.tsx`

Docs:
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md`
- `.planning/v5.0-ARCHITECTURE.md`
