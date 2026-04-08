---
phase: 41-persona-views-part-2-line-manager
plan: 02
subsystem: line-manager home (capacity heatmap UI)
tags: [frontend, wave-1, capacity, heatmap, line-manager, persona-guard]
requires:
  - capacity.read + GET /api/v5/capacity (Plan 41-01)
  - PersonaProvider (Phase 34)
provides:
  - assertPersonaOrRedirect + PersonaGate (client-side persona guard)
  - CapacityHeatmap / CapacityHeatmapCell / CapacityHeatmapLegend (v5 threshold component set)
  - /line-manager Home route wired to GET /api/v5/capacity
affects:
  - src/features/personas/* (new route-guard module, no API changes)
tech-stack:
  added: []
  patterns:
    - safeT wrapper for i18n keys landing in a later wave (no hard crash on missing key)
    - useMemo Map<personId, Map<monthKey, cell>> for O(1) heatmap cell lookup
    - PersonaGate wraps exported page default so gate also covers persona-dependent child hooks
key-files:
  created:
    - src/features/personas/persona-route-guard.ts
    - src/features/personas/__tests__/persona-route-guard.test.tsx
    - src/components/capacity/capacity-heatmap.tsx
    - src/components/capacity/capacity-heatmap-cell.tsx
    - src/components/capacity/capacity-heatmap-legend.tsx
    - src/components/capacity/__tests__/capacity-heatmap.test.tsx
    - src/app/(app)/line-manager/page.tsx
  modified: []
decisions:
  - PersonaGate exposes a data-testid hint card (not a real navigation) so the switcher event is decoupled from the router (D-03 — UX hint, not security boundary).
  - i18n keys referenced by heatmap legend / LM Home / wrongPersonaHint land in Wave 4; both components use a `safeT` fallback so Wave 2 ships without touching the catalog.
  - Plan referenced `getClientNowMonthKey()` which does not exist in the repo — used existing `getCurrentMonth()` from `@/lib/date-utils` (same semantics).
  - LineManagerHomePage wraps its body component in `<PersonaGate>` at the default-export level so `usePersona`/`useQuery` in the inner component never run for non-LM personas (avoids the "departmentId='' → enabled=false" stub path).
metrics:
  duration: ~15min
  completed: 2026-04-08
  tasks: 3
  files_created: 7
  files_modified: 0
---

# Phase 41 Plan 02: Line Manager Home — capacity heatmap Summary

Wave 1 UI for UX-V5-04. Ships the v5 capacity heatmap component set (deliberately NOT a fork of v4 `components/heat-map`), the `assertPersonaOrRedirect` / `PersonaGate` helper with TC-NEG-013 coverage, and the `/line-manager` Home route that fetches `/api/v5/capacity` (shipped in Wave 0) under the D-19 query-key convention. Unblocks Wave 2 group timeline and Wave 3 approval-queue impact preview.

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | persona-route-guard + PersonaGate (TC-NEG-013) | `c017930` | persona-route-guard.ts, persona-route-guard.test.tsx |
| 2 | capacity heatmap component set (cell/legend/heatmap) | `d63a9f9` | capacity-heatmap{,-cell,-legend}.tsx, capacity-heatmap.test.tsx |
| 3 | /line-manager Home route | `480aad8` | app/(app)/line-manager/page.tsx (+ comment tidy in capacity-heatmap.tsx) |

## Verification

| Test File | Tests | Status |
|-----------|-------|--------|
| src/features/personas/__tests__/persona-route-guard.test.tsx | 4 (TC-NEG-013 + allowed path + 2 pure-helper) | green |
| src/components/capacity/__tests__/capacity-heatmap.test.tsx | 6 (ok/over/under/absent/missing + legend + grid count) | green |

`pnpm tsc --noEmit` clean after every task.

### Acceptance grep checks (from PLAN)

- `export.*assertPersonaOrRedirect` / `export.*PersonaGate` — present in persona-route-guard.ts
- `TC-NEG-013` — present in persona-route-guard.test.tsx
- `bg-green-200` / `bg-amber-200` / `bg-red-300` / `bg-neutral-200` — all four present in capacity-heatmap-cell.tsx
- `PersonaGate` / `allowed={['line-manager']}` — present in (app)/line-manager/page.tsx
- `line-manager-capacity` — present in (app)/line-manager/page.tsx (D-19)
- `/api/v5/capacity` — present in (app)/line-manager/page.tsx
- `CapacityHeatmap` — present in (app)/line-manager/page.tsx and heatmap module export
- `src/components/capacity/` contains no `from '@/features/analytics'` or `from '@/components/heat-map'` imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `getClientNowMonthKey()` does not exist**
- **Found during:** Task 3 (LM Home route)
- **Issue:** Plan action block referenced `getClientNowMonthKey()` from `@/lib/date-utils`; the module only exports `getCurrentMonth()`.
- **Fix:** Used `getCurrentMonth()` — same `YYYY-MM` semantics; plan intent preserved.
- **Files:** src/app/(app)/line-manager/page.tsx

**2. [Rule 1 - Bug] setState-in-render warning in RTL test helper**
- **Found during:** Task 1 (first test run)
- **Issue:** Initial `SetPersona` helper called `setPersona` synchronously during render, triggering React 19 setState-in-render warning.
- **Fix:** Moved the `setPersona(persona)` call into a `useEffect`. Test semantics unchanged (helper still short-circuits to `null` until persona matches).
- **File:** src/features/personas/__tests__/persona-route-guard.test.tsx

**3. [Rule 2 - Critical] i18n "MISSING_MESSAGE" console noise**
- **Found during:** Task 2 (heatmap test initial run)
- **Issue:** Legend keys `v5.lineManager.heatmap.legend.*` don't exist until Wave 4 (plan explicitly defers them). `safeT` swallowed the error but next-intl still logged 4 stack traces per test to stderr.
- **Fix:** Added inline messages in the test's `NextIntlClientProvider` fixture covering the four legend keys. Catalog itself is untouched — Wave 4 still owns the real sv/en strings.
- **File:** src/components/capacity/__tests__/capacity-heatmap.test.tsx

### Auth gates

None.

## Known Stubs

- Heatmap / LM Home / wrongPersonaHint i18n strings are rendered via a `safeT` fallback. The fallback copies are English-only and will be replaced by real sv/en entries in Wave 4 (planned — key namespace `v5.lineManager.*` confirmed in keys.ts seed).
- PersonaGate "Switch persona" CTA dispatches a `nc:open-persona-switcher` CustomEvent — the top-nav switcher does NOT listen for it yet. Clicking the button currently no-ops; Wave 4 wires the listener. This is acceptable because the hint text itself already tells the user what to do.

## Self-Check: PASSED

All 7 created files exist on disk:
- FOUND: src/features/personas/persona-route-guard.ts
- FOUND: src/features/personas/__tests__/persona-route-guard.test.tsx
- FOUND: src/components/capacity/capacity-heatmap.tsx
- FOUND: src/components/capacity/capacity-heatmap-cell.tsx
- FOUND: src/components/capacity/capacity-heatmap-legend.tsx
- FOUND: src/components/capacity/__tests__/capacity-heatmap.test.tsx
- FOUND: src/app/(app)/line-manager/page.tsx

All 3 task commits resolve via `git log --oneline`:
- FOUND: c017930 (Task 1)
- FOUND: d63a9f9 (Task 2)
- FOUND: 480aad8 (Task 3)

`pnpm tsc --noEmit` green. All new tests pass (10 total).
