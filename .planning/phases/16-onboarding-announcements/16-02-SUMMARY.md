---
phase: 16-onboarding-announcements
plan: 02
subsystem: ui, onboarding
tags: [react, wizard, onboarding, clerk, client-components]

requires:
  - phase: 16-onboarding-announcements
    plan: 01
    provides: onboarding service, API routes, suggestion constants
provides:
  - Onboarding wizard UI with 4 steps (departments, disciplines, people, complete)
  - Updated onboarding page with org creation + wizard flow
affects: []

tech-stack:
  added: []
  patterns: [multi-step-wizard-with-idempotent-loading, suggestion-chip-ui-pattern]

key-files:
  created:
    - src/components/onboarding/onboarding-wizard.tsx
    - src/components/onboarding/step-departments.tsx
    - src/components/onboarding/step-disciplines.tsx
    - src/components/onboarding/step-people.tsx
    - src/components/onboarding/step-complete.tsx
  modified:
    - src/app/onboarding/page.tsx

key-decisions:
  - "Person step requires firstName+lastName+departmentId+disciplineId per existing schema validation"
  - "Team overview link points to /team (existing route) instead of /team-overview"

patterns-established:
  - "Suggestion chip pattern: clickable chips that POST on click, disable when added, show greyed for existing"
  - "Wizard idempotency: fetch existing data on mount, grey out already-created items"

requirements-completed: [ONBR-01, ONBR-02, ONBR-03, ONBR-05]

duration: 3min
completed: 2026-03-28
---

# Phase 16 Plan 02: Onboarding Wizard UI Summary

**Multi-step onboarding wizard with department/discipline suggestion chips, person form, skip support, and idempotent refresh behavior**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T13:51:30Z
- **Completed:** 2026-03-28T13:54:07Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Built 5-component onboarding wizard: orchestrator, departments, disciplines, people, and complete steps
- Department and discipline steps render suggestion constants as clickable chip buttons that POST to existing APIs
- People step includes form with firstName, lastName, department select, discipline select per schema requirements
- Complete step auto-calls /api/onboarding/complete and shows navigation CTAs
- Skip button on every step calls /api/onboarding/complete and navigates to /input
- Wizard loads existing data on mount for idempotent behavior on refresh
- Updated onboarding page to show CreateOrganization first, then wizard after org exists

## Task Commits

Each task was committed atomically:

1. **Task 1: Create wizard orchestrator and all step components** - `049d93d` (feat)
2. **Task 2: Replace onboarding page with wizard** - `371397d` (feat)

## Files Created/Modified
- `src/components/onboarding/onboarding-wizard.tsx` - Main wizard with step state, data loading, step indicator
- `src/components/onboarding/step-departments.tsx` - Department creation with DEPARTMENT_SUGGESTIONS chips
- `src/components/onboarding/step-disciplines.tsx` - Discipline creation with DISCIPLINE_SUGGESTIONS chips
- `src/components/onboarding/step-people.tsx` - Person form with department/discipline selects
- `src/components/onboarding/step-complete.tsx` - Completion screen with CheckCircle icon and CTAs
- `src/app/onboarding/page.tsx` - Updated to use Clerk useOrganization hook and render wizard

## Decisions Made
- Person step requires all fields (firstName, lastName, departmentId, disciplineId) per existing personCreateSchema validation
- Team overview CTA links to /team (existing route) rather than /team-overview which does not exist

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None.

## Known Stubs
None - all components are wired to real API endpoints and use actual suggestion constants.

## Self-Check: PASSED

All 6 files verified on disk. Both commit hashes (049d93d, 371397d) confirmed in git log.

---
*Phase: 16-onboarding-announcements*
*Completed: 2026-03-28*
