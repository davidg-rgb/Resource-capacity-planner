---
phase: 08-import-wizard
plan: 03
subsystem: import
tags: [wizard, stepper, upload, drag-drop, tanstack-query, hooks]

requires:
  - phase: 08-import-wizard
    plan: 01
    provides: Import domain types (WizardState, ParsedFile, ColumnMapping)
provides:
  - Import wizard shell with 4-step navigation
  - Upload step with drag-and-drop, size validation, pivot detection
  - TanStack Query hooks for upload, validate, execute API endpoints
  - /data/import page route
  - Updated /data page with import button and template downloads
affects: [08-04]

tech-stack:
  added: []
  patterns: [wizard state management with useState, drag-and-drop file upload zone]

key-files:
  created:
    - src/hooks/use-import.ts
    - src/components/import/import-wizard.tsx
    - src/components/import/wizard-stepper.tsx
    - src/components/import/step-upload.tsx
    - src/app/(app)/data/import/page.tsx
  modified:
    - src/app/(app)/data/page.tsx

key-decisions:
  - "Wizard state managed with single useState (WizardState) -- simple, no context needed for single-page wizard"
  - "Upload step advances directly to map step on flat format, requires confirmation on pivot format"
  - "Steps 2-4 rendered as placeholders for Plan 04 implementation"

requirements-completed: [IMPEX-01, IMPEX-02]

duration: 5min
completed: 2026-03-27
---

# Phase 8 Plan 3: Wizard Shell & Upload Step Summary

**4-step import wizard shell with horizontal stepper, drag-and-drop upload, pivot format detection, and TanStack Query hooks for all import API endpoints**

## What Was Built

### Task 1: TanStack Query Hooks and Wizard Page Route
- Created `src/hooks/use-import.ts` with three mutation hooks:
  - `useUploadFile()` -- POSTs FormData to `/api/import/upload`, returns ParsedFile + suggestedMappings
  - `useValidateRows()` -- POSTs ImportRow[] to `/api/import/validate`, returns ValidationResult
  - `useExecuteImport()` -- POSTs resolved rows to `/api/import/execute`, returns ImportResult
- Created `/data/import` page route rendering the ImportWizard component
- Updated `/data` page with "Import data" primary button (Link to /data/import) and template download links (flat + pivot .xlsx formats)

### Task 2: Wizard Shell and Upload Step Components
- Created `WizardStepper` -- horizontal 4-step indicator bar with numbered circles, green checkmarks for completed steps, connecting lines, locked future steps (grayed out, not clickable)
- Created `StepUpload` -- drag-and-drop zone accepting .xlsx/.xls/.csv with:
  - Client-side 10 MB file size enforcement
  - Loading spinner during upload/parse
  - Pivot format detection with before/after preview table and Confirm button
  - Encoding warning banner with codepage dropdown (UTF-8, Windows-1252, ISO-8859-1) and re-upload
  - Template download links
- Created `ImportWizard` -- main container managing WizardState:
  - Back/Next navigation preserving all wizard state on step changes
  - Steps 2-4 as placeholders for Plan 04
  - `getCompletedSteps()` utility for stepper
  - Centered layout with max-w-5xl

## Commits

| Task | Commit  | Description                                           |
| ---- | ------- | ----------------------------------------------------- |
| 1    | e55531f | Add import hooks, wizard page route, data page actions |
| 2    | e7bb396 | Create wizard shell, stepper bar, upload step          |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

- `src/components/import/import-wizard.tsx` lines 95-105: Steps 'map', 'validate', 'import' render placeholder divs. These are intentional -- Plan 04 will implement the remaining step UIs.

## Verification

- TypeScript compilation: zero errors across all new files (full project `tsc --noEmit`)
- All acceptance criteria verified via grep checks
- All 6 files created/modified with correct exports

## Self-Check: PASSED
