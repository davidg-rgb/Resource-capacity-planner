# Fix Agent 1 Report — Round 2 code-fixes

**Codebase HEAD before:** `d3c3212`
**Codebase HEAD after:** `7840d6c`
**Pnpm tsc --noEmit:** clean after every commit.

## Commits made (atomic, in order)

- `b4640bc` `fix(audit-r2): R2-P0-01 reconcile API error shape on 7 routes`
- `b023122` `fix(audit-r2): R2-P1-01 disable /rd overcommit button when perJourney flag off`
- `18d5e40` `fix(audit-r2): R2-P1-02 brand consistency + i18n hardcoded strings`
- `ba03022` `fix(audit-r2): R2-P1-03 remove dead sidenav footer affordances` *(see "Issues" — accidentally co-bundled an unrelated `.planning/v5.0-ARCHITECTURE.md` change from Fix Agent 2)*
- `ab190b2` `fix(audit-r2): R2-P1-04 remove non-functional top-nav search input`
- `e6ee74b` `fix(audit-r2): R2-P1-09 move members route from top-nav to admin sidebar (K12)`
- `cf68ddd` `feat(audit-r2): R2-P1-10 add CHECK constraint for allocations.hours (defense-in-depth)`
- `0611c25` `fix(audit-r2): D-CR-107 add viewer role check to /api/people GET`
- `91c6891` `refactor(audit-r2): D-CR-109 narrow OvercommitDialog scope union`
- `1b55a36` `fix(audit-r2): D-CR-110 breadcrumb LABEL_MAP for persona acronyms`
- `bdb7d3d` `fix(audit-r2): D-CR-111 mobile menu Escape key closes drawer`
- `a6fa8c7` `test(audit-r2): wrap discipline-donut tests in NextIntlClientProvider` *(follow-up to R2-P1-02)*
- `7840d6c` `test(audit-r2): R2-P1-09 follow-up — drop /admin/members from Test 6 expected hrefs`

### R2-P0-02 (Phase 1) — no commit

`pnpm install` was a no-op for `package.json` / lockfile (lockfile already up-to-date). Local `node_modules/focus-trap-react` and `node_modules/@axe-core/playwright` were missing; `pnpm install` resolved them in 3.7s. `.next/` directory removed. `pnpm tsc --noEmit` clean. Per the playbook, no commit needed for an environmental sync.

## Tests passing

- `tests/invariants/error-wire-format.test.ts` — **19/19** (10 new TC-INV-ERRWIRE-R2-* cases asserting nested wire shape across all 7 migrated routes).
- `src/components/dialogs/__tests__/overcommit-dialog.test.tsx` — **5/5**.
- `src/components/layout/__tests__/breadcrumbs.test.tsx` — **9/9** (snapshots regenerated, persona acronyms now show as `PM` / `LM` / `R&D` / `Line Manager`).
- `src/components/layout/__tests__/side-nav.test.tsx` — **5/5**.
- `src/components/charts/__tests__/discipline-donut.test.tsx` — **3/3** (after wrapping in NextIntlClientProvider for the new `useTranslations` call).
- `src/features/dashboard/widgets/__tests__/discipline-breakdown-widget.test.tsx` — **6/6**.

`pnpm tsc --noEmit` clean after every commit.

## Issues encountered / partial fixes

### 1. Cross-agent file collision in `ba03022` (R2-P1-03 commit)

While Agent 1 was working, Fix Agent 2 had unstaged changes to `.planning/v5.0-ARCHITECTURE.md`. Husky/lint-staged's stash-restore cycle around `git commit` captured that file alongside my `src/components/layout/side-nav.tsx` change in the R2-P1-03 commit (commit shows 2 files changed, +84/-30 — the +75 in v5.0-ARCHITECTURE.md is Agent 2's intended F-B-103 work, not mine).

**Impact:** zero functional regression — the absorbed content is Agent 2's intentional doc-modernization edit. But the commit message attributes Agent 2's work to a code-fix commit, which is mis-scoped.

**For Round 3 / orchestrator:** this is a coordination gap rather than a defect. Options:
- Squash/amend `ba03022` to remove the v5.0-ARCHITECTURE.md hunk (Agent 2 then re-applies under their own attribution).
- Leave as-is and document that R2 Fix Agent 1 picked up an Agent-2-authored chunk.
- After this incident I switched to `git restore --staged .planning/v5.0-ARCHITECTURE.md` before each subsequent commit, and no further cross-contamination occurred.

### 2. Pre-existing test failures NOT regressed by Round 2

Discovered during the broader sweep, all pre-date Round 2 (verified by checking out HEAD~before-fixes):

- `src/components/layout/__tests__/top-nav.visibleFor.test.tsx` — Tests 1, 3, 4, 5, 7 still expect `/projects` href but Round 1 (C-P2-1) moved it to `/admin/projects`. Test 6 was failing for the same reason; my K12 fix (R2-P1-09) introduced an additional reason (drops `/admin/members`). I updated only Test 6's expected array (commit `7840d6c`) so the K12 contribution is reflected — Tests 1, 3, 4, 5, 7 remain failing on the pre-existing Round 1 issue.
- `src/features/dashboard/__tests__/lean-trim-integration.test.ts` — `LEAN-01..03 308 permanent redirects` test fails. Round 1 D-CR-16 changed `next.config.ts` redirects from `permanent: true` to `false`, but the test still asserts 308. Pre-existing.
- `tests/invariants/change-log.coverage.test.ts` — `register.service.ts :: archiveRegisterRow recordChange NOT called` failure due to a `getServerNowMonthKey` DB stub returning the wrong shape. Unrelated to my fixes.

These are **not blockers for Round 2** but should be tracked for Round 3.

### 3. Chose `AuthError` over `UnauthorizedError`

The instruction referred to `UnauthorizedError`, but `src/lib/errors.ts` defines `AuthError` for the 401 case (no `UnauthorizedError` class exists). I used `AuthError` to match the existing taxonomy.

### 4. Team-heatmap kept 404 status via `NotFoundError('feature', 'pdfExport')`

The original handler returned a 404 to obscure feature existence when `pdfExport` flag is off. There's no built-in 404 AppError that takes an arbitrary message, so I instantiated `NotFoundError('feature', 'pdfExport')` which yields code `ERR_NOT_FOUND` + status 404 — preserving the original obscuring intent while flowing through `handleApiError`.

### 5. Phase 6 D-CR-110 breadcrumbs label semantics

The mapped acronyms (`PM` / `LM` / `R&D` / `Line Manager`) don't get the `capitalize` CSS class anymore — applying `capitalize` would lowercase the second character (e.g., `R&d`). Unknown segments still get `capitalize` + dash-rewrite. Snapshot files regenerated; 9/9 breadcrumbs tests green.

## TODOs for Round 3

1. **Resolve cross-agent file collision** (`ba03022` absorbed Agent 2's `.planning/v5.0-ARCHITECTURE.md` edit). Either amend or document as a coordination gap.
2. **Fix pre-existing top-nav.visibleFor test debt**: Tests 1, 3, 4, 5, 7 still expect `/projects`. Since Round 1's C-P2-1 moved that to `/admin/projects`, the test fixture needs to update. (Out of Round 2 scope per the constraint about Round 1 fixes.)
3. **Fix `lean-trim-integration.test.ts` 308-redirect assertion** to match Round 1 D-CR-16 change (`permanent: false`).
4. **Fix `change-log.coverage.test.ts` register stub** so `archiveRegisterRow` no longer throws on `getServerNowMonthKey`.
5. **Operator action** required: apply `src/db/migrations/20260427_audit_allocation_hours_check.sql` per the runbook at `.planning/runbooks/r2-allocation-hours-check.md`. The migration is idempotent and not wired into drizzle-kit's journal (matches the precedent of POLISH-* migrations).
6. **Brand consistency check**: PROJECT.md still references both "Nordic Capacity" (subtitle) and "Resource Planner" (the canonical brand) interchangeably. The audit-r2 fix standardized UI on "Resource Planner"; future copy/docs should align.
7. **i18n coverage gap** (deferred — not in scope): there are still hardcoded Swedish strings outside the four files I touched. A repo-wide grep for `\bIngen data\b` and similar idioms would surface more candidates.
