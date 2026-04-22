# Phase 53 — Deferred Items (discovered during execution)

## 53-01 typecheck — pre-existing module errors (not caused by this plan)

| File | Error | Disposition |
|------|-------|-------------|
| `e2e/helpers/a11y.ts` | `Cannot find module '@axe-core/playwright'` (TS2307) | Out of scope — missing dependency, pre-dates Phase 53 |
| `src/components/dialogs/overcommit-dialog.tsx` | `Cannot find module 'focus-trap-react'` (TS2307) | Out of scope — missing dependency, pre-dates Phase 53 |
| `src/components/drawer/Drawer.tsx` | `Cannot find module 'focus-trap-react'` (TS2307) | Out of scope — missing dependency, pre-dates Phase 53 |
| `src/components/drawer/PlanVsActualDrawer.tsx` | `Cannot find module 'focus-trap-react'` (TS2307) | Out of scope — missing dependency, pre-dates Phase 53 |

Root cause: worktree has no `node_modules` (agent ran against main repo's installed packages via `node_modules/.bin/tsc`). The missing packages (`@axe-core/playwright`, `focus-trap-react`) are either not installed in the main repo at the version expected, or the main repo's install drifted. These errors exist on `7e0baec` (the worktree base) prior to this plan's changes — verified by isolating edits to flag files and re-running typecheck, and the same four errors remain. Rule SCOPE BOUNDARY: not touched by 53-01.
