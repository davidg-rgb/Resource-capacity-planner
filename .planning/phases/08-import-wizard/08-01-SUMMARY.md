---
phase: 08-import-wizard
plan: 01
subsystem: import
tags: [sheetjs, excel, csv, parsing, swedish, pivot, templates]

requires:
  - phase: 06-ag-grid-spike-core-grid
    provides: AllocationUpsert types and batch upsert service
provides:
  - Import domain type system (ImportRow, ValidationRow, WizardState, etc.)
  - SheetJS Excel/CSV parsing with Swedish CP1252 encoding
  - Pivot format detection and unpivoting
  - Swedish/English header auto-detection
  - Downloadable .xlsx template generation (flat + pivot)
affects: [08-02, 08-03, 08-04]

tech-stack:
  added: [xlsx 0.20.3 (SheetJS CDN), string-similarity 4.0.4]
  patterns: [server-side Excel parsing, codepage fallback, merged cell forward-fill]

key-files:
  created:
    - src/features/import/import.types.ts
    - src/features/import/import.utils.ts
    - src/features/import/import.templates.ts
  modified:
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "SheetJS 0.20.3 installed from CDN (not npm 0.18.5) per security guidance"
  - "CP1252 as default codepage with UTF-8 re-parse fallback for garbled Swedish"
  - "Pivot detection threshold: 3+ month-pattern columns"
  - "Swedish header dictionary checked before English for auto-mapping priority"

patterns-established:
  - "Codepage fallback: try CP1252 first, detect garbled chars, re-parse as UTF-8"
  - "Merged cell forward-fill: iterate sheet['!merges'] and copy top-left value to range"
  - "Hidden row filtering: check sheet['!rows'][i].hidden before including"

requirements-completed: [IMPEX-02, IMPEX-06, IMPEX-08, IMPEX-09, IMPEX-10, IMPEX-13]

duration: 4min
completed: 2026-03-27
---

# Phase 8 Plan 1: Import Foundation Summary

**SheetJS-based Excel/CSV parsing backbone with Swedish encoding support, pivot detection, unpivoting, header auto-detection, and template generation**

## What Was Built

### Task 1: Dependencies and Import Types
- Installed SheetJS 0.20.3 from CDN (not the outdated npm 0.18.5)
- Installed string-similarity 4.0.4 and @types/string-similarity
- Created `import.types.ts` with 15 exported types covering the entire wizard domain:
  - TargetField, REQUIRED/OPTIONAL_TARGET_FIELDS
  - FormatInfo, ColumnMapping, ParsedFile
  - ImportRow, RowStatus, FuzzyMatch, ValidationRow, ValidationResult
  - UserFixes, ImportResult, WizardStep, WizardState

### Task 2: Parsing Utilities and Templates
- Created `import.utils.ts` with 6 exported functions:
  - `parseExcelBuffer()` -- handles .xlsx/.xls/.csv with CP1252 default, UTF-8 fallback, merged cell forward-fill, hidden row filtering, 5000-row limit
  - `detectFormat()` -- identifies pivot layout when 3+ headers match month patterns
  - `autoDetectMappings()` -- maps Swedish (Namn, Projekt, Timmar, Manad, Avdelning, Disciplin) and English headers to target fields
  - `unpivotData()` -- transforms grid format to flat ImportRow arrays, skipping zero/empty hours
  - `parseMonthHeader()` -- converts "Jan 2025", "Januari 2025", "2025-01" to YYYY-MM
  - Exported SWEDISH_HEADER_MAP and ENGLISH_HEADER_MAP dictionaries
- Created `import.templates.ts` with 2 exported functions:
  - `generateFlatTemplate()` -- .xlsx with Namn/Projekt/Manad/Timmar/Avdelning/Disciplin headers + 2 example rows
  - `generatePivotTemplate()` -- .xlsx with Namn/Projekt + 6 month columns + 3 example rows

## Commits

| Task | Commit  | Description                                       |
| ---- | ------- | ------------------------------------------------- |
| 1    | 0aa5fef | Install SheetJS + string-similarity, create types |
| 2    | 23f187b | Add parsing utilities and template generation     |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all functions are fully implemented with complete logic. Fuzzy matching (string-similarity) is installed but actual matching logic will be implemented in plan 08-03 (validation service).

## Verification

- TypeScript compilation: zero errors (both individual files and full project `tsc --noEmit`)
- SheetJS installed from CDN: `grep "cdn.sheetjs.com" package.json` confirms
- All 3 files exist under `src/features/import/` with correct exports

## Self-Check: PASSED

All 4 files found. Both commit hashes verified.
