# Phase 9: Flat Table View & Export - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning
**Source:** Auto-selected recommended defaults

<domain>
## Phase Boundary

Users can view all allocation data in a sortable/filterable flat table and export it to Excel or CSV. The flat table shows one row per allocation (person + project + month + hours) with filters for person, project, department, and date range.

NOT in this phase: Import wizard (Phase 8, done), Platform admin (Phase 10), Team overview heat map (Milestone 2).

</domain>

<decisions>
## Implementation Decisions

### Table Layout
- **D-01:** Reuse AG Grid Community (already installed from Phase 6/7) for the flat table — consistent look, sorting/filtering built-in, familiar to users from the Person Input Form.
- **D-02:** Columns: Person Name, Department, Project Name, Program, Month, Hours. All sortable. Person and Project as text, Month formatted as "YYYY-MM", Hours as numeric with tabular-nums.
- **D-03:** Server-side pagination — fetch page of data via API, not load-all-client-side. Default page size 50, options for 25/50/100.
- **D-04:** Table lives on the `/data` page as the primary content. Import button and template links move to a secondary action bar.

### Filter Controls
- **D-05:** Filter bar above the table with inline dropdowns: Person (searchable), Project (searchable), Department (select), Date range (month pickers for start/end).
- **D-06:** Filters are additive (AND logic). Clearing all filters shows all allocations.
- **D-07:** Filters update the table via API query params — URL-encoded for shareability/bookmarking.
- **D-08:** Filter state persisted in URL search params so page refresh preserves filters.

### Export Behavior
- **D-09:** Server-side export using SheetJS (already installed from Phase 8, ADR-007). Export endpoint receives the same filter params as the table query.
- **D-10:** Two export formats: .xlsx (default) and .csv. Export button with dropdown for format selection.
- **D-11:** Export includes ALL matching rows (not just current page) — server streams the full filtered result set.
- **D-12:** Exported file named: `allocations-{date}.xlsx` or `allocations-{date}.csv`.
- **D-13:** Column headers in export match display names (Person Name, Department, Project Name, Program, Month, Hours).

### Data Page Integration
- **D-14:** `/data` page restructured: flat table as primary view, import/template actions in a compact action bar at the top.
- **D-15:** Export button in the action bar next to Import button.

### Claude's Discretion
- AG Grid column configuration details (widths, flex, pinning)
- Loading skeleton for initial table load
- Empty state when no allocations exist
- Exact filter dropdown styling and search behavior
- Pagination component design
- Export progress indication for large datasets

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Flat table specification
- `ARCHITECTURE.md` §F-009 — Flat table view with sorting, filtering, Excel/CSV export
- `ARCHITECTURE.md` line 2292 — `findFlat(orgId, filters, pagination)` query signature
- `ARCHITECTURE.md` line 385 — File structure: `/data/page.tsx` for Flat Table View
- `ARCHITECTURE.md` line 565 — Component: `flat-table.tsx`

### Architecture decisions
- `ARCHITECTURE.md` §ADR-007 — Server-side Excel processing (SheetJS)

### Requirements
- `.planning/REQUIREMENTS.md` §IMPEX — IMPEX-11 (flat table), IMPEX-12 (export)

### Existing code
- `src/features/allocations/allocation.service.ts` — Existing allocation queries, needs `listAllocationsFlat()` addition
- `src/features/allocations/allocation.types.ts` — Existing types, needs flat table filter/pagination types
- `src/features/import/import.templates.ts` — SheetJS template generation pattern (reuse for export)
- `src/app/(app)/data/page.tsx` — Current data page (needs restructuring)
- `src/components/grid/allocation-grid.tsx` — Existing AG Grid usage pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- AG Grid Community 32.x — already installed and configured from Phase 6/7. Flat table reuses the same grid infrastructure.
- SheetJS 0.20.3 — installed from Phase 8 (CDN package). `import.templates.ts` shows the pattern for generating .xlsx files server-side.
- `allocation.service.ts` — has `listAllocationsForPerson()` which joins allocations with projects. Flat table needs a similar but broader query (`findFlat`) with multi-filter support.
- `use-allocations.ts` hook — TanStack Query pattern for allocation data fetching.
- `src/features/people/person.service.ts` and `src/features/projects/` — needed for filter dropdown data.

### Established Patterns
- Feature modules: `src/features/{domain}/` with service + types + schema.
- API routes: `src/app/api/` with `getTenantId()` for multi-tenant isolation.
- TanStack Query hooks: `src/hooks/use-*.ts` for data fetching.
- AG Grid: `src/components/grid/allocation-grid.tsx` shows column definitions, cell renderers.

### Integration Points
- `/data` page (`src/app/(app)/data/page.tsx`) — needs restructuring from action-only to table + actions.
- Allocation service — needs new `listAllocationsFlat()` and `exportAllocationsFlat()` functions.
- New API routes: `GET /api/allocations/flat` (paginated list), `GET /api/allocations/export` (file download).

</code_context>

<specifics>
## Specific Ideas

No specific external references — standard data table + export pattern.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-flat-table-view-export*
*Context gathered: 2026-03-27*
