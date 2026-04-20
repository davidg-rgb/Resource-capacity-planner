# Phase 9: Flat Table View & Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 09-flat-table-view-export
**Areas discussed:** Table layout, Filter controls, Export behavior, Data page integration
**Mode:** Auto (all recommended defaults selected)

---

## Table Layout

[auto] Q: "How should the flat table display allocations?" → Selected: "AG Grid reuse" (recommended default)

**Rationale:** AG Grid already installed from Phase 6/7, consistent UX, sorting/filtering built-in.

## Filter Controls

[auto] Q: "How should filters be presented?" → Selected: "Filter bar above table" (recommended default)

**Rationale:** Standard pattern for data tables. Dropdowns for discrete fields, date range for temporal filtering.

## Export Behavior

[auto] Q: "How should export work?" → Selected: "Server-side SheetJS export with current filters" (recommended default)

**Rationale:** Consistent with ADR-007, SheetJS already installed, handles large datasets without client memory issues.

## Data Page Integration

[auto] Q: "Where does the flat table live?" → Selected: "/data route as default view" (recommended default)

**Rationale:** /data page currently only has import/template actions. Flat table becomes primary content.

---

## Claude's Discretion

- AG Grid column configuration
- Loading skeleton
- Empty state
- Filter dropdown styling
- Pagination component
- Export progress indication

## Deferred Ideas

None.
