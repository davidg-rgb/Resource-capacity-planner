---
phase: 50-persona-aware-landing-navigation
plan: "01"
subsystem: navigation
tags: [feature-flag, persona, redirect, nav-01]
dependency_graph:
  requires: []
  provides: [uiV6Landing-flag, persona-redirect]
  affects: [root-routing, flag-system]
tech_stack:
  added: []
  patterns: [server-flag-check-then-client-redirect]
key_files:
  created:
    - src/app/(app)/home/page.tsx
    - src/app/(app)/__tests__/persona-redirect.test.tsx
  modified:
    - src/features/flags/flag.types.ts
    - src/features/flags/flag.service.ts
    - src/features/flags/flag.context.tsx
    - src/app/page.tsx
decisions:
  - "Used camelCase 'uiV6Landing' instead of dotted 'uiV6.landing' for TypeScript compatibility with existing flag patterns"
  - "PersonaRedirect lives at /home (not (app)/page.tsx) to avoid Next.js route group conflict with server root page.tsx"
metrics:
  duration: 2m20s
  completed: 2026-04-20
---

# Phase 50 Plan 01: uiV6Landing Flag + Persona-Aware Root Redirect Summary

Feature flag `uiV6Landing` added to the existing flag infrastructure; server root redirects to `/home` when flag is on, where a client-side PersonaRedirect reads persona context and navigates to the persona's landing page.

## What Was Done

### Task 1: Add uiV6Landing feature flag (7edcc2e)

Added `uiV6Landing` (camelCase, matching existing convention) to:
- `FLAG_NAMES` array, `FeatureFlags` interface, and `FLAG_ROUTE_MAP` (empty array -- behavior gate, not route gate) in `flag.types.ts`
- `DEFAULT_FLAGS` in `flag.service.ts` (server-side)
- `DEFAULT_FLAGS` in `flag.context.tsx` (client-side)

Flag defaults to `false`, preserving all existing behavior.

### Task 2: Persona-aware root redirect with tests (2cd74d9)

**Server root (`src/app/page.tsx`):** Added try/catch block that calls `getTenantId()` + `getOrgFlags(orgId)`. When `uiV6Landing` is true, redirects to `/home`. On failure (not authenticated, no org) or flag off, falls through to existing `getRoleLandingPage(orgRole)` behavior.

**PersonaRedirect (`src/app/(app)/home/page.tsx`):** Client component that reads persona from context via `usePersona()` and flags via `useFlags()`. When `uiV6Landing` is on, calls `router.replace(getLandingRoute(persona))`. Safety fallback redirects to `/dashboard` if somehow reached with flag off. Renders null (no visible UI).

**Tests (`src/app/(app)/__tests__/persona-redirect.test.tsx`):** 4 RTL tests covering:
1. PM persona redirects to `/pm` when flag on
2. Line-manager persona redirects to `/line-manager` when flag on
3. Flag off falls back to `/dashboard`
4. Component renders null (no visible UI)

## Routing Flow

| Condition | Path |
|-----------|------|
| Flag ON + signed in | `/` -> server checks flag -> redirect `/home` -> client reads persona -> `router.replace('/pm')` (or other persona landing) |
| Flag OFF + signed in | `/` -> server skips flag -> `redirect('/dashboard')` or `redirect('/dashboard/team')` per orgRole |
| Signed out | `/` -> `getTenantId()` throws -> falls through to orgRole routing |

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 7edcc2e | feat(50-01): add uiV6Landing feature flag to flag system |
| 2 | 2cd74d9 | feat(50-01): implement persona-aware root redirect with tests (NAV-01) |

## Verification

- [x] `grep -c "uiV6Landing" flag.types.ts` = 3
- [x] `grep -c "uiV6Landing" flag.service.ts` = 1
- [x] `grep -c "uiV6Landing" flag.context.tsx` = 1
- [x] PersonaRedirect test: 4/4 passing
- [x] All acceptance criteria met for both tasks

## Self-Check: PASSED

All 6 files verified on disk. Both commit hashes (7edcc2e, 2cd74d9) found in git log.
