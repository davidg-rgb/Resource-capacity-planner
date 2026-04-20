---
phase: 08-import-wizard
plan: 02
subsystem: import
tags: [validation, fuzzy-matching, api-routes, transactional-import, templates]

requires:
  - phase: 08-import-wizard
    plan: 01
    provides: Import types, SheetJS parsing, template generation
provides:
  - Import validation service with fuzzy name matching (string-similarity Dice coefficient)
  - Transactional bulk import execution (up to 5,000 rows)
  - Zod validation schemas for import API payloads
  - Four API routes under /api/import/ (upload, validate, execute, templates)
affects: [08-03, 08-04]

tech-stack:
  added: []
  patterns: [fuzzy-matching with string-similarity, transactional bulk upsert, FormData file upload]

key-files:
  created:
    - src/features/import/import.service.ts
    - src/features/import/import.schema.ts
    - src/app/api/import/upload/route.ts
    - src/app/api/import/validate/route.ts
    - src/app/api/import/execute/route.ts
    - src/app/api/import/templates/route.ts
  modified: []

key-decisions:
  - "Explicit type annotations on string-similarity ratings to avoid implicit any with untyped CDN package"
  - "Buffer converted to Uint8Array for NextResponse body compatibility with Node.js types"
  - "handleApiError used consistently across all routes (matching existing API pattern)"
  - "orgId validated via requireRole but void-used in upload route (parsing is org-agnostic)"

requirements-completed: [IMPEX-03, IMPEX-04, IMPEX-05, IMPEX-07, IMPEX-08]

duration: 3min
completed: 2026-03-27
---

# Phase 8 Plan 2: Import Validation & API Routes Summary

**Fuzzy name matching validation service, transactional bulk import, Zod schemas, and 4 API route handlers for the complete import server-side API**

## What Was Built

### Task 1: Import Service and Zod Schemas
- Created `import.schema.ts` with 3 Zod schemas:
  - `validateRequestSchema` -- rows array with person/project names, month, hours (max 5,000)
  - `executeRequestSchema` -- rows array with resolved person/project UUIDs (max 5,000)
  - `uploadResponseSchema` -- client-side response validation for upload endpoint
- Created `import.service.ts` with 2 exported functions + 1 internal helper:
  - `matchName()` -- internal fuzzy matching using string-similarity's `findBestMatch()`. Exact match (case-insensitive) returns status='exact'. Score >= 0.95 auto-matches. Score >= 0.8 returns status='fuzzy' with top 3 suggestions. Below 0.8 returns status='unknown'.
  - `validateImportRows(orgId, rows)` -- fetches all people/projects for org, matches each row's person and project names, validates hours (1-999 integer) and month format (YYYY-MM), categorizes rows as ready/warning/error with summary counts.
  - `executeImport(orgId, rows)` -- wraps all inserts in `db.transaction()`, uses `onConflictDoUpdate` on the 4-column unique constraint (organizationId, personId, projectId, month), normalizes month to YYYY-MM-01 for date column storage. Returns imported count on success, or error message on rollback.

### Task 2: API Route Handlers
- Created 4 Next.js App Router API routes under `src/app/api/import/`:
  - `POST /api/import/upload` -- receives FormData file, validates extension (.xlsx/.xls/.csv) and size (10MB max), parses with SheetJS, returns headers + 5-row preview + format detection + suggested column mappings. Optional `codepage` query param for encoding override.
  - `POST /api/import/validate` -- accepts mapped rows, runs fuzzy validation against org's people/projects, returns categorized ValidationResult with row-level status and suggestions.
  - `POST /api/import/execute` -- accepts resolved rows (with person/project UUIDs), executes transactional bulk upsert, returns import result with count or error.
  - `GET /api/import/templates?format=flat|pivot` -- generates and downloads .xlsx template file in flat or pivot format.
- All routes use `requireRole('planner')` for authorization and `handleApiError()` for consistent error handling.

## Commits

| Task | Commit  | Description                                          |
| ---- | ------- | ---------------------------------------------------- |
| 1    | 6678d98 | Add import validation service and Zod schemas        |
| 2    | 3346018 | Add import API routes (upload, validate, execute, templates) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed implicit any types on string-similarity ratings**
- **Found during:** Task 1
- **Issue:** string-similarity installed from CDN lacks proper type declarations, causing `ratings` array to be untyped
- **Fix:** Added explicit type annotations `(r: { target: string; rating: number })` on filter/sort/map callbacks
- **Files modified:** src/features/import/import.service.ts
- **Commit:** 6678d98

**2. [Rule 1 - Bug] Fixed Buffer not assignable to BodyInit in templates route**
- **Found during:** Task 2
- **Issue:** Node.js Buffer type not compatible with NextResponse constructor's BodyInit parameter
- **Fix:** Wrapped buffer in `new Uint8Array(buffer)` for Web API compatibility
- **Files modified:** src/app/api/import/templates/route.ts
- **Commit:** 3346018

## Known Stubs

None -- all functions are fully implemented with complete logic. The validation service calls real `listPeople()` and `listProjects()` service functions, and the execution service uses real `db.transaction()` with `onConflictDoUpdate`.

## Verification

- TypeScript compilation: zero project-level errors (excluding pre-existing node_modules Zod locale warnings)
- All 6 files exist at correct paths under `src/features/import/` and `src/app/api/import/`
- API route paths match Next.js App Router conventions for automatic routing
- Service layer correctly imports from people and projects services

## Self-Check: PASSED

All 6 files found. Both commit hashes verified.
