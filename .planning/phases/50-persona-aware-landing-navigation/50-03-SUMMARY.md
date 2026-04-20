---
phase: 50-persona-aware-landing-navigation
plan: 03
subsystem: persona-switcher
tags: [persona, switcher, optgroup, navigation, feature-flag]
dependency_graph:
  requires: [50-01]
  provides: [grouped-persona-switcher]
  affects: [persona-switcher.tsx, persona-switcher.test.tsx, sv.json, en.json]
tech_stack:
  added: []
  patterns: [composite-value-encoding, optgroup-grouped-select, feature-flag-dual-mode]
key_files:
  created: []
  modified:
    - src/components/persona/persona-switcher.tsx
    - src/components/persona/__tests__/persona-switcher.test.tsx
    - src/messages/sv.json
    - src/messages/en.json
decisions:
  - Composite value pattern (kind:entityId) for select options enables single-select persona switching
  - Legacy two-select extracted to LegacyPersonaSwitcher internal component for clean flag-gated dual mode
  - Separate localStorage keys per persona kind (pm, staff, line-manager) for persistence
metrics:
  duration: 577s
  completed: 2026-04-20T11:07:08Z
  tasks: 1
  files: 4
---

# Phase 50 Plan 03: Grouped Select Persona Switcher Summary

Single grouped `<select>` with `<optgroup>` per PersonaKind behind uiV6Landing flag, replacing the two-select approach with composite value encoding (`kind:entityId`).

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for grouped select | 1fed349 | persona-switcher.test.tsx |
| 1 (GREEN) | Implement grouped select + legacy split | aea464f | persona-switcher.tsx, persona-switcher.test.tsx, sv.json, en.json |

## What Changed

### persona-switcher.tsx
- Split into three components: `GroupedPersonaSwitcher` (v6), `LegacyPersonaSwitcher` (legacy), `PersonaSwitcher` (flag router)
- Grouped select uses 5 `<optgroup>` elements: PM, Line Manager, Staff, R&D, Admin
- Composite value pattern encodes `kind:entityId` (e.g., `pm:uuid`, `line-manager:deptId`, `rd:`, `admin:`)
- PM/Staff optgroups disabled when 0 people returned from /api/people
- LM optgroup disabled when 0 departments from usePersona().departments
- localStorage persistence for PM (`persona.pm.personId`), Staff (`persona.staff.personId`), and LM (`persona.line-manager.departmentId`)
- R&D and Admin optgroups always enabled with single option each

### persona-switcher.test.tsx
- 9 new tests for grouped select mode (uiV6Landing ON)
- 7 preserved legacy tests (uiV6Landing OFF)
- Mocked `useFlags` to control flag per describe block
- Tests verify optgroup structure, composite values, disabled states, localStorage, navigation

### i18n (sv.json + en.json)
- Added `v5.persona.noPersonMatch` key: "Ingen person kopplad" / "No person linked"

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- 16/16 tests pass
- TypeScript compiles clean (only pre-existing tenants/[orgId] error from 50-01)
- 11 optgroup references in component (5 opening + 5 closing + 1 comment context)
- Flag-gated dual mode confirmed: grouped select when ON, legacy two-select when OFF

## Self-Check: PASSED
