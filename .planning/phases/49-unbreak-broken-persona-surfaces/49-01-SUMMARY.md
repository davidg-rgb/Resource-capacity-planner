---
phase: 49-unbreak-broken-persona-surfaces
plan: 01
subsystem: persona-switcher, persona-route-guard, line-manager-pages
tags: [persona, department-picker, i18n, route-guard]
dependency_graph:
  requires: []
  provides: [department-sub-picker, persona-gate-dynamic-label]
  affects: [line-manager-home, line-manager-timeline, persona-switcher]
tech_stack:
  added: []
  patterns: [localStorage-persistence, auto-select-single-option, dynamic-i18n-interpolation]
key_files:
  created: []
  modified:
    - src/messages/sv.json
    - src/messages/en.json
    - src/components/persona/persona-switcher.tsx
    - src/components/persona/__tests__/persona-switcher.test.tsx
    - src/features/personas/persona-route-guard.ts
    - src/features/personas/__tests__/persona-route-guard.test.tsx
    - src/app/(app)/line-manager/page.tsx
    - src/app/(app)/line-manager/timeline/page.tsx
decisions:
  - "Department sub-picker lives inline in persona-switcher.tsx (no standalone DepartmentPicker component per CONTEXT D-02)"
  - "PersonaGate hint uses Swedish inline template with interpolated label (per CONTEXT D-05, no new ICU key)"
  - "v5.persona.kind.* singular namespace reused; no plural kinds.* introduced"
metrics:
  duration: 336s
  completed: "2026-04-20T09:10:49Z"
  tasks: 3
  files: 8
---

# Phase 49 Plan 01: Persona Switcher Cluster Fix Summary

Department sub-picker added to persona-switcher with auto-select/localStorage persistence + PersonaGate rewired to dynamically interpolate allowed persona label from v5.persona.kind.*

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add departmentLabel + noDepartmentHint locale keys | d3215fd | sv.json, en.json |
| 2 | Department sub-picker + remove LM page fallbacks | d78449c | persona-switcher.tsx, persona-switcher.test.tsx, line-manager/page.tsx, timeline/page.tsx |
| 3 | Rewire PersonaGate allowed-persona label | 7942e0f | persona-route-guard.ts, persona-route-guard.test.tsx |

## What Was Done

### Task 1: Locale Keys
Added `v5.persona.departmentLabel` ("Avdelning"/"Department") and `v5.persona.noDepartmentHint` to both sv.json and en.json. Existing `kind.*` keys preserved; no plural `kinds.*` namespace introduced.

### Task 2: Department Sub-Picker (UNBREAK-01/02/08)
- Rewrote `buildPersona` to accept `departmentId` parameter (removed hardcoded `''` placeholder)
- Added `lmDeptId` state with localStorage hydration via `LM_DEPT_STORAGE_KEY`
- Auto-select effect: single department auto-selects; stale stored ID resets
- Propagation effect: syncs `lmDeptId` into persona context + persists to localStorage
- Department `<select>` rendered when LM persona active and departments > 0
- No-department hint + disabled `<option>` when departments = 0
- Removed `selectDepartment` fallback branches from both LM pages (skeleton shows via `useQuery({ enabled: !!departmentId })`)

### Task 3: PersonaGate Rewire (UNBREAK-06/09)
- Added `useTranslations('v5.persona')` alongside existing `useTranslations('v5.lineManager')`
- Derives `allowedLabel` from `tPersona(\`kind.${allowed[0]}\`)` -- no camelCase transform needed
- Hint description now reads "Kunde inte ladda -- denna sida ar for {label}-personan" with dynamic label
- Title and CTA button still use `v5.lineManager.wrongPersonaHint.*` (intentionally minimal rewire)

## Test Coverage

- **persona-switcher.test.tsx**: 6 tests (2 existing + 4 new)
  - >1 departments: renders department dropdown with both options
  - 1 department: auto-selects, picker shows with single option
  - 0 departments: line-manager option disabled, no dropdown
  - localStorage persistence: selecting dept writes to storage key
- **persona-route-guard.test.tsx**: 9 tests (4 existing + 5 new)
  - allowed=[admin]: hint shows "Administrator" not "linjechefs-personan"
  - allowed=[line-manager]: hint shows "Linjechef"
  - allowed=[rd, admin]: uses first kind label ("FoU-chef")
  - allowed=[pm] when persona=pm: renders children
  - Regression: switch-cta button still present

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all data paths are wired (departments from usePersona().departments, labels from v5.persona.kind.*).

## Requirements Addressed

- **UNBREAK-01**: /line-manager no longer renders selectDepartment literal as primary content
- **UNBREAK-02**: /line-manager/timeline no longer renders selectDepartment literal
- **UNBREAK-06**: PersonaGate hint names the correct allowed persona via v5.persona.kind.*
- **UNBREAK-08**: Department picker in persona-switcher with 0/1/>1 edge cases + localStorage
- **UNBREAK-09**: v5.persona.kind.* singular namespace is single source of truth; no kinds.* plural exists

## Self-Check: PASSED

All 8 modified files exist. All 3 task commits verified (d3215fd, d78449c, 7942e0f). SUMMARY.md present.
