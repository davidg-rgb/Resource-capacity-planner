---
phase: 49-unbreak-broken-persona-surfaces
plan: 02
subsystem: pm-home
tags: [guard-reorder, persona, empty-state, UNBREAK-03]
dependency_graph:
  requires: []
  provides: [pm-home-guard-fix]
  affects: [pm-persona-flow]
tech_stack:
  added: []
  patterns: [guard-order-for-disabled-queries]
key_files:
  created: []
  modified:
    - src/app/(app)/pm/page.tsx
    - src/app/(app)/pm/__tests__/pm-home.test.tsx
decisions:
  - "Collapsed no-PM-selected and zero-projects into same empty-state branch using existing tScreens('empty') key"
  - "No new i18n keys added -- reuses v5.screens.pmHome.empty"
metrics:
  duration_seconds: 303
  completed: "2026-04-20T09:09:58Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 2
---

# Phase 49 Plan 02: PM Home Guard Reorder Summary

Reordered PmHomeInner guards so `!personaId` short-circuits to empty-state before `isLoading` evaluates, preventing admin impersonators from seeing a perpetual spinner.

## Task Completion

| Task | Name | Commits | Files |
|------|------|---------|-------|
| 1 | Reorder PmHomeInner guards (TDD) | aa96401, a4ef929 | `src/app/(app)/pm/page.tsx`, `src/app/(app)/pm/__tests__/pm-home.test.tsx` |

## What Changed

### Guard Reorder (`page.tsx`)

The original guard block combined `!isLoaded || isLoading` into one check, which trapped the page on the loading spinner when `personaId` was null (admin persona, no PM selected). TanStack Query v5 with `enabled: false` sets `isLoading = false` (since v5 defines `isLoading = isPending && isFetching`), so the bug was latent with v5.95.2 but the guard order was still fragile and semantically wrong.

New guard order:
1. `!isLoaded` -- Clerk auth not ready yet
2. `!personaId || (data && data.projects.length === 0)` -- No PM selected OR empty projects, both render the same empty-state copy
3. `isLoading` -- Query actively fetching
4. `error` -- Query failed
5. `!data` -- Defensive null guard (unreachable)

### Tests (`pm-home.test.tsx`)

Refactored mock setup from static top-level `vi.mock` to controllable `vi.fn()` wrappers for `useAuth` and `usePersona`. Added 5 new test cases covering all guard branches:

1. Admin persona (no PM) renders empty state, NOT loading
2. PM selected + query loading renders loading state
3. PM selected + empty projects renders empty state
4. PM selected + projects renders project list
5. PM selected + query error renders error state

Existing 2 TC-UI-001 tests preserved as regression coverage.

## Verification

- `pnpm test src/app/(app)/pm/__tests__/pm-home.test.tsx` -- 7/7 passed
- `pnpm typecheck` -- passed (0 errors)
- Acceptance criteria grep checks all passed:
  - `!personaId` checked before `isLoading`
  - Old combined guard `!isLoaded || isLoading` removed
  - `tScreens('empty')` present, no `tScreens('select')` added

## Deviations from Plan

### Observation (not a deviation)

**TanStack Query v5.95.2 behavior:** The research noted that `isLoading` stays `true` for disabled queries, but v5 changed semantics (`isLoading = isPending && isFetching`). With the installed v5.95.2, disabled queries have `isLoading: false`, so the original bug was not actively manifesting at runtime. The guard reorder is still the correct fix -- it makes the intent explicit and prevents regression if query behavior changes.

## Known Stubs

None.

## Self-Check: PASSED
