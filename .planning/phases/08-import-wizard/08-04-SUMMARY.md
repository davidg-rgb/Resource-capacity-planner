---
phase: 08-import-wizard
plan: 04
subsystem: import
tags: [wizard, column-mapping, validation, fuzzy-matching, import-execution, swedish-detection]

requires:
  - phase: 08-import-wizard
    plan: 02
    provides: Import validation service, API routes, fuzzy matching
  - phase: 08-import-wizard
    plan: 03
    provides: Wizard shell, upload step, TanStack Query hooks
provides:
  - Column mapping step with Swedish/English auto-detection and dropdown overrides
  - Validation step with summary cards, filter tabs, fuzzy match dropdowns, inline fixes
  - Import execution step with progress indicator and results summary
  - Fully wired 4-step wizard (upload -> map -> validate -> import)
affects: []

tech-stack:
  added: []
  patterns: [wizard state management with single useState, effective status computation with user fixes overlay]

key-files:
  created:
    - src/components/import/step-map.tsx
    - src/components/import/step-validate.tsx
    - src/components/import/step-import.tsx
  modified:
    - src/components/import/import-wizard.tsx

key-decisions:
  - "Map step prevents duplicate target field assignments by clearing previous column when reassigned"
  - "Validate step computes effective status overlay from user fixes rather than mutating validation rows"
  - "Import step receives readyCount prop from wizard rather than computing internally"
  - "Back navigation from import step only allowed in idle or error state, blocked during importing/success"
  - "StepMap and StepValidate handle their own Next buttons; wizard only renders Back button"

requirements-completed: [IMPEX-01, IMPEX-03, IMPEX-04, IMPEX-05, IMPEX-06, IMPEX-07, IMPEX-09]

duration: 5min
completed: 2026-03-27
---

# Phase 8 Plan 4: Map, Validate, Import Steps & Wizard Wiring Summary

**Column mapping with Swedish auto-detection, validation with fuzzy match dropdowns and filter tabs, transactional import with progress indicator, all wired into the 4-step wizard**

## What Was Built

### Task 1: Column Mapping and Validation Step Components
- Created `step-map.tsx` -- StepMap component with:
  - Table layout: Source Column | Maps To (dropdown) | Sample Data
  - Auto-detected mappings pre-filled with green CheckCircle2 icons
  - Swedish header detection shown inline: "(Swedish detected)" badge next to column name
  - Unmapped columns displayed as "-- Ignored --" with muted/grayed-out styling (opacity-60)
  - Duplicate prevention: reassigning a target field clears the previous column
  - Next button disabled until all 4 required fields (personName, projectName, month, hours) are mapped
  - Missing required fields listed in helper text below table

- Created `step-validate.tsx` -- StepValidate component with:
  - Three summary cards at top: Ready (green), Warnings (amber), Errors (red) with counts
  - Filter tabs: All/Ready/Warnings/Errors with active underline styling
  - Scrollable table with Row, Person, Project, Month, Hours, Status, Issues columns
  - Status icons: CheckCircle2 (green), AlertTriangle (amber), XCircle (red)
  - Fuzzy match handling: inline "Did you mean:" dropdown with suggestions showing "Name (XX% match)"
  - Inline hours fix: number input for rows with hours errors
  - Effective status computation: overlays user fixes on validation rows to recalculate status
  - Import blocked when any error rows remain after applying fixes

### Task 2: Import Step and Wizard Wiring
- Created `step-import.tsx` -- StepImport component with 4 states:
  - **idle**: "Ready to import X allocations" confirmation with Import button
  - **importing**: Spinner with "Please don't close this page" message
  - **success**: Green checkmark, "Import Complete", imported/skipped/warnings counts, Done button -> /data
  - **error**: Red X, error message, "The import was rolled back. No data was changed." reassurance, Try Again + Back buttons

- Rewrote `import-wizard.tsx` -- replaced placeholder divs with full step wiring:
  - Imports all 4 step components + useValidateRows/useExecuteImport hooks + unpivotData utility
  - `handleMappingsConfirmed()`: builds ImportRow[] from flat mapping or pivot unpivoting, triggers validation
  - `handleExecuteImport()`: builds execute payload with user fix overlay, calls transactional import
  - Loading spinner shown while validateMutation.isPending
  - Back navigation per D-02: preserves state at every step, blocked during importing/success
  - No more placeholder divs -- all steps render real components

## Commits

| Task | Commit  | Description                                           |
| ---- | ------- | ----------------------------------------------------- |
| 1    | ad8bed7 | Create column mapping and validation step components  |
| 2    | ba6e389 | Create import step and wire all 4 wizard steps        |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all components are fully implemented with complete logic. The wizard is end-to-end functional: upload -> map -> validate -> import.

## Verification

- TypeScript compilation: zero errors (full project `tsc --noEmit`)
- All acceptance criteria verified:
  - step-map.tsx: exports StepMap, contains select dropdown, REQUIRED_TARGET_FIELDS import, "Swedish detected" label, "Ignored" option
  - step-validate.tsx: exports StepValidate, filter tab logic, fuzzy match handling with suggestions dropdown, userFixes state management
  - step-import.tsx: exports StepImport, importing state with Loader2, useRouter for Done navigation, "Import Complete" text, rollback reassurance
  - import-wizard.tsx: imports all 4 step components, unpivotData, useValidateRows/useExecuteImport hooks, handleExecuteImport function, no placeholder divs

## Self-Check: PASSED
