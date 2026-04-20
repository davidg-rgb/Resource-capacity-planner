---
phase: 50-persona-aware-landing-navigation
plan: 02
subsystem: layout/navigation
tags: [sidebar, breadcrumbs, i18n, persona, feature-flag]
dependency_graph:
  requires: [50-01]
  provides: [persona-keyed-sidebar, home-breadcrumb, persona-section-i18n]
  affects: [side-nav.tsx, breadcrumbs.tsx, sv.json, en.json]
tech_stack:
  added: []
  patterns: [dual-mode-flag-gating, persona-keyed-nav-map]
key_files:
  created:
    - src/components/layout/__tests__/side-nav.test.tsx
    - src/components/layout/__tests__/breadcrumbs.test.tsx
    - src/components/layout/__tests__/__snapshots__/breadcrumbs.test.tsx.snap
    - tests/unit/i18n-persona-sections.test.ts
  modified:
    - src/components/layout/side-nav.tsx
    - src/components/layout/breadcrumbs.tsx
    - src/messages/sv.json
    - src/messages/en.json
decisions:
  - "Exported PERSONA_SECTION_NAV for testability and potential reuse"
  - "Used generic isActive logic (startsWith + exact match) replacing dashboard-specific checks"
  - "PM projects href set to /pm/projects (not /pm) to avoid collision with pmHome"
metrics:
  duration: 748s
  completed: 2026-04-20T11:11:18Z
  tasks: 2/2
  files: 8
---

# Phase 50 Plan 02: Persona-keyed Sidebar & Home Breadcrumb Summary

Dual-mode sidebar navigation keyed by PersonaKind with 18 i18n keys and Home breadcrumb linking to persona landing route, all gated behind uiV6Landing flag.

## Task Results

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | i18n keys + persona-keyed sidebar + tests | `65c186f` | 18 personaSections keys in sv/en.json, PERSONA_SECTION_NAV with 5 persona entries, LEGACY_SECTION_NAV preserved, 9 tests |
| 2 | Home breadcrumb + snapshot tests | `765a98b` | Breadcrumbs show Home link via getLandingRoute, intermediate segments as Links, 9 tests + 3 snapshots |

## Implementation Details

### Sidebar (NAV-02)
- `PERSONA_SECTION_NAV` record maps each `PersonaKind` to its navigation sections
- PM: Home, My Projects (/pm/projects), My Wishes (/pm/wishes)
- Line Manager: Overview, Group Schedule, Approval Queue, Import Actuals
- Staff: My Schedule
- R&D: Portfolio, Alerts
- Admin: Change Log, People, Projects + existing reference data (Disciplines, Departments, Programs)
- `LEGACY_SECTION_NAV` (renamed from `SECTION_NAV`) preserved for flag-off path
- `usePersona()` and `useFlags()` hooks drive dual-mode selection
- Generic `isActive` logic: exact match OR startsWith with trailing slash

### Breadcrumbs (NAV-03)
- When `uiV6Landing` on: "Home" link prepended, resolves to `getLandingRoute(persona)`
- Intermediate path segments rendered as `<Link>` components with accumulated href
- Last segment rendered as plain `<span>` (current page indicator)
- When flag off: original text-only behavior preserved

### i18n (NAV-05)
- 18 keys under `sidebar.personaSections.*` in both sv.json and en.json
- Swedish copy uses proper diacritics (Oversikt, Andringslogg, Portfolj, etc.)
- Existing `sidebar.*` keys untouched (collision avoidance per VERIFY-07)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PM projects href corrected**
- **Found during:** Task 1
- **Issue:** Plan specified `/pm` for both pmHome and pmProjects, creating duplicate hrefs
- **Fix:** Set pmProjects href to `/pm/projects` which matches the actual route structure
- **Files modified:** src/components/layout/side-nav.tsx

**2. [Rule 1 - Bug] Generic isActive logic**
- **Found during:** Task 1
- **Issue:** Old isActive had hardcoded dashboard-specific checks that wouldn't work for persona routes
- **Fix:** Replaced with generic `pathname === href || pathname.startsWith(href + '/')` pattern
- **Files modified:** src/components/layout/side-nav.tsx

## Verification

- TypeScript: `pnpm tsc --noEmit` passes (only pre-existing tenants error, out of scope)
- Side-nav tests: 6/6 pass (persona coverage, PM/LM/admin sections, legacy mode)
- Breadcrumb tests: 9/9 pass (3 snapshots, Home link, intermediate Links, last-segment text, aria-label)
- i18n tests: 3/3 pass (18 keys sv, 18 keys en, no empty values)
- Total: 18 new tests, all passing

## Self-Check: PASSED
