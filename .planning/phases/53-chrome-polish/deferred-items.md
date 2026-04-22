# Phase 53 — Deferred Items (discovered during execution)

## 53-01 typecheck — pre-existing module errors (not caused by this plan)

| File | Error | Disposition |
|------|-------|-------------|
| `e2e/helpers/a11y.ts` | `Cannot find module '@axe-core/playwright'` (TS2307) | Out of scope — missing dependency, pre-dates Phase 53 |
| `src/components/dialogs/overcommit-dialog.tsx` | `Cannot find module 'focus-trap-react'` (TS2307) | Out of scope — missing dependency, pre-dates Phase 53 |
| `src/components/drawer/Drawer.tsx` | `Cannot find module 'focus-trap-react'` (TS2307) | Out of scope — missing dependency, pre-dates Phase 53 |
| `src/components/drawer/PlanVsActualDrawer.tsx` | `Cannot find module 'focus-trap-react'` (TS2307) | Out of scope — missing dependency, pre-dates Phase 53 |

Root cause: worktree has no `node_modules` (agent ran against main repo's installed packages via `node_modules/.bin/tsc`). The missing packages (`@axe-core/playwright`, `focus-trap-react`) are either not installed in the main repo at the version expected, or the main repo's install drifted. These errors exist on `7e0baec` (the worktree base) prior to this plan's changes — verified by isolating edits to flag files and re-running typecheck, and the same four errors remain. Rule SCOPE BOUNDARY: not touched by 53-01.

## 53-02 pre-existing test-suite failures (not caused by this plan)

Verified on clean base by `git stash && pnpm test --run <files>`: **21 tests across 3 files fail before any 53-02 changes**. Kept in deferred bucket — SCOPE BOUNDARY.

| File | Failures | Symptom |
|------|----------|---------|
| `src/components/layout/__tests__/breadcrumbs.test.tsx` | 5 | Snapshot + link rendering assertions (uiV6Landing ON/OFF); root cause likely stale snapshot drift vs. flag-gated markup |
| `src/components/layout/__tests__/side-nav.test.tsx` | 3 | `uiV6Landing ON (persona-keyed)` section — admin/pm/lm assertions fail; root cause likely persona.context wiring drift vs. snapshot |
| `src/components/persona/__tests__/persona-switcher.test.tsx` | 13 | `getByRole('combobox')` + optgroup render failures in both legacy + grouped modes |

**Why deferred:** none of these files are touched by Plan 53-02; they do not reference `top-nav.tsx`, `notification-bell.tsx`, `use-rd-overcommit-count.ts`, `capacity.service.ts`, or the capacity overcommit route. The 21 failures exist on commit `1615d5f` (53-01 SUMMARY) before Plan 53-02 began. Plan 53-02 adds only passing tests: 5 (count endpoint) + 8 (bell) + 7 (top-nav matrix) = **20 new tests, all green**.

## 53-02 production build — env-var dependency (not caused by this plan)

`pnpm build` fails in the worktree with "Invalid environment variables" (missing `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `PLATFORM_ADMIN_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`). This is an environmental requirement — the repo's `src/lib/env.ts` fails fast on missing Clerk env vars. The worktree has no `.env.local` file and build-time env validation cannot be satisfied here.

- `pnpm typecheck` passes cleanly (the compile-time contract — all Plan 53-02 TypeScript is sound).
- Parent repo (where Clerk env vars are set) is where `pnpm build` must run post-wave for final green.
- SCOPE BOUNDARY: not a code defect, not caused by Plan 53-02.
