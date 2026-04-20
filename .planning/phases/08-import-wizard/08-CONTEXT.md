# Phase 8: Import Wizard - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can upload an Excel/CSV file and import allocation data through a guided 4-step wizard (Upload → Map → Validate → Import) with validation and Swedish header detection. Includes fuzzy name matching, pivot/grid format detection with unpivoting, and downloadable templates.

NOT in this phase: Flat table view (Phase 9), Excel/CSV export (Phase 9), platform admin (Phase 10).

</domain>

<decisions>
## Implementation Decisions

### Wizard UX Flow
- **D-01:** Horizontal stepper bar across the top — numbered steps (1. Upload → 2. Map → 3. Validate → 4. Import) with back/next buttons. Steps lock until reached, no jumping ahead.
- **D-02:** Full back navigation — returning to a previous step preserves all choices. Re-advancing re-validates.
- **D-03:** Final step shows a progress indicator during import, then a results summary (X rows imported, Y skipped, Z warnings). Stay on page with "Done" button that returns to /data.
- **D-04:** Wizard lives at `/data/import` route — button on `/data` page says "Import data".

### Column Mapping UI
- **D-05:** Dropdown table layout — rows: Source Column | Maps To (dropdown) | Sample Data. Auto-detected mappings pre-filled with green checkmarks. User can override any via dropdown.
- **D-06:** Unmapped/extra source columns shown as "Ignored" (grayed out) with option to assign them to a target field via dropdown.
- **D-07:** Target fields: Person name, Project name, Month, Hours (required). Optional: Department, Discipline. Maps to the allocation flat table model.
- **D-08:** Swedish header detection shown inline per column: "Namn → Person name (Swedish detected)". Subtle but informative.

### Validation & Error Display
- **D-09:** Summary cards at top (e.g., "120 ready, 5 warnings, 2 errors") + scrollable row table below with status icons. Filter tabs: All / Ready / Warnings / Errors. Click a row for details.
- **D-10:** Inline fixes for simple issues — fuzzy-matched names show dropdown to pick correct person, invalid hours editable. Structural issues (wrong format) require re-upload.
- **D-11:** Fuzzy name matching shows inline dropdown on warning rows: "Johan Nilson" → warning icon + "Did you mean: Johan Nilsson (93% match)?" User picks or types new name.
- **D-12:** Errors block import (unknown person, missing required field). Warnings are informational — import proceeds, warnings shown in final summary.

### File Format Handling
- **D-13:** Auto-detect pivot vs flat format with confirmation: "We detected a grid format (months as columns). We'll unpivot to flat rows." Shows before/after preview of sample rows. User confirms or overrides.
- **D-14:** Template downloads on the Upload step ("Download template .xlsx") AND on the /data page. Two templates: flat format and grid/pivot format.
- **D-15:** File limits: max 10MB, max 5,000 rows. Clear error if exceeded.
- **D-16:** Encoding: SheetJS auto-detect codepage. If åäö appear garbled, try Swedish codepages (1252, 65001). Warning if encoding looks wrong with manual codepage selection option.

### Claude's Discretion
- Stepper bar visual design (colors, checkmarks, animations)
- Exact fuzzy matching algorithm and threshold
- Loading states and skeleton UIs between steps
- Upload area design (drag-and-drop zone styling)
- Error/warning icon design and color coding
- How "before/after" pivot preview is rendered
- Template file content (example data, header names)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Import wizard specification
- `ARCHITECTURE.md` §F-006 — Bulk import 4-step wizard requirements
- `ARCHITECTURE.md` §F-007 — Column mapping with Swedish/English auto-detection
- `ARCHITECTURE.md` §F-008 — Import validation with error/warning categorization
- `ARCHITECTURE.md` §F-019 — Downloadable import templates
- `ARCHITECTURE.md` §F-026 — Pivot/grid format detection and unpivoting

### Architecture decisions
- `ARCHITECTURE.md` §ADR-007 — Server-side Excel processing (SheetJS in Node.js, not client-side)

### Requirements
- `.planning/REQUIREMENTS.md` §IMPEX — All IMPEX-01 through IMPEX-13 requirements

### Existing code
- `src/features/allocations/allocation.service.ts` — `batchUpsertAllocations()` with transaction support and conflict detection
- `src/features/allocations/allocation.types.ts` — `AllocationUpsert`, `BatchUpsertResult`, `ConflictInfo` types
- `src/features/allocations/allocation.schema.ts` — `allocationUpsertSchema`, `batchUpsertSchema` Zod validation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `batchUpsertAllocations()` in `src/features/allocations/allocation.service.ts` — handles transactional upserts with conflict detection. Import wizard's final step can reuse this (but may need larger batch sizes than current max of 100).
- `allocationUpsertSchema` / `batchUpsertSchema` in `allocation.schema.ts` — Zod validation for allocation payloads. Import validation can extend these.
- Feature modules pattern (`src/features/{domain}/`) — wizard should follow: `src/features/import/` with service, types, schema files.

### Established Patterns
- **Feature modules:** `src/features/allocations/`, `src/features/people/`, etc. — service + types + schema pattern.
- **API routes:** `src/app/api/` with route handlers using `getTenantId()` for multi-tenant isolation.
- **Hooks pattern:** `src/hooks/use-*.ts` for data fetching with TanStack Query.
- **Component organization:** `src/components/{domain}/` for UI components.

### Integration Points
- `/data` route (`src/app/(app)/data/page.tsx`) — wizard entry point, needs "Import data" button.
- People service (`src/features/people/person.service.ts`) — needed for fuzzy name matching against existing persons.
- Projects service (`src/features/projects/`) — needed for project name validation during import.
- Reference data (departments, disciplines) — optional field validation during import.

</code_context>

<specifics>
## Specific Ideas

No specific external references — decisions above are comprehensive. Standard wizard UX patterns apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-import-wizard*
*Context gathered: 2026-03-27*
