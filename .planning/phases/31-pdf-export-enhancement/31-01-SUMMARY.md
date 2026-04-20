---
phase: "31"
plan: "01"
name: "PDF Export Enhancement"
subsystem: dashboard-pdf
tags: [pdf, export, multi-widget, svg-snapshot, cover-page]
dependency_graph:
  requires: [widget-registry, dashboard-layout-engine, react-pdf-renderer]
  provides: [pdf-export-modal, svg-snapshot, multi-widget-pdf, single-widget-export, cover-page]
  affects: [dashboard-edit-mode, dashboard-layout-engine, i18n]
tech_stack:
  added: []
  patterns: [client-side-pdf-generation, svg-to-png-canvas, dynamic-import-code-splitting]
key_files:
  created:
    - src/features/dashboard/pdf-export/index.ts
    - src/features/dashboard/pdf-export/export-pdf-modal.tsx
    - src/features/dashboard/pdf-export/svg-snapshot.ts
    - src/features/dashboard/pdf-export/dashboard-pdf-document.tsx
    - src/features/dashboard/pdf-export/pdf-cover-page.tsx
    - src/features/dashboard/pdf-export/use-pdf-export.ts
  modified:
    - src/features/dashboard/dashboard-edit-mode.tsx
    - src/features/dashboard/dashboard-layout-engine.tsx
    - src/messages/sv.json
    - src/messages/en.json
decisions:
  - Client-side PDF generation via @react-pdf/renderer pdf().toBlob() instead of server-side API route (avoids sending SVG snapshots to server)
  - SVG-to-PNG conversion via Canvas 2x resolution for crisp PDF rendering
  - Dynamic import of @react-pdf/renderer to keep it out of main bundle
  - Widget hover menu (MoreHorizontal icon) for single-widget export instead of always-visible button
  - data-widget-id attribute on widget containers for DOM-based SVG extraction
metrics:
  duration: 8m
  completed: "2026-04-01T13:22:00Z"
  tasks: 6
  files_created: 6
  files_modified: 4
---

# Phase 31 Plan 01: PDF Export Enhancement Summary

Client-side multi-widget PDF export with checkbox modal, SVG snapshot capture from Recharts DOM elements, intelligent page layout, single-widget export from hover menu, and professional cover page template.

## What Was Built

### R31-01: Pre-Export Modal (`export-pdf-modal.tsx`)
- Checkbox list of all active dashboard widgets with icons and colSpan indicators
- Select All / Clear All toggle links
- Orientation radio buttons (Landscape/Portrait, default Landscape)
- Cover page checkbox (default checked)
- Export button with loading state and progress text
- Backdrop overlay with close-on-click

### R31-02: SVG Snapshot Utility (`svg-snapshot.ts`)
- `captureWidgetSnapshot(widgetId)` -- extracts SVG from widget DOM via `data-widget-id` attribute
- `svgToPngDataUri(svg, width, height)` -- clones SVG, inlines computed styles, renders to Canvas at 2x resolution
- `captureWidgetSnapshots(widgetIds)` -- batch capture for multi-widget export
- Handles Recharts `.recharts-wrapper > svg` selector with fallback to any SVG

### R31-03: Multi-Widget PDF Layout Engine (`dashboard-pdf-document.tsx`)
- `DashboardPdfDocument` renders a `@react-pdf/renderer` Document with paginated widgets
- Layout rules: colSpan 12 = full page, colSpan 4-6 = 2 per page in half-column layout
- `groupWidgetsIntoPages()` algorithm flushes small widget queue into paired pages
- Fixed header (org name + date range) and footer (timestamp + page numbers) on every page
- Chart widgets rendered as PNG Image, table-only widgets get styled placeholder

### R31-04: Single-Widget Export (`dashboard-edit-mode.tsx`)
- `WidgetMenu` component with MoreHorizontal (...) icon button
- Visible on hover (opacity transition via `group-hover`)
- "Exportera som PDF" menu item triggers direct single-widget PDF download
- `SortableWidget` receives `widgetName` and `onExportPdf` props
- `data-widget-id` attribute added to widget container for SVG capture

### R31-05: Cover Page Template (`pdf-cover-page.tsx`)
- Professional layout: blue accent bar, large org name, dashboard title, divider
- Date range formatted with `formatMonthHeader()`
- Widget count indicator
- Generated timestamp at bottom
- Supports both landscape and portrait orientation

### R31-06: Wiring and Integration
- `usePdfExport` hook: manages export state, captures snapshots, generates PDF blob, triggers download
- Dynamic import of `@react-pdf/renderer` and `DashboardPdfDocument` for code splitting
- "Exportera PDF" button in dashboard toolbar (visible when not in edit mode)
- `ExportPdfModal` integrated into `DashboardGridInner`
- i18n strings added to both `sv.json` and `en.json` under `pdfExport` namespace

## Decisions Made

1. **Client-side PDF generation** -- Used `pdf().toBlob()` browser API instead of creating a new API route. SVG snapshots are DOM-dependent and cannot be easily serialized to the server. This also avoids serverless function size/timeout concerns.

2. **SVG-to-PNG via Canvas** -- Recharts renders pure SVG, so we clone elements, inline computed styles, and render to a 2x Canvas for crisp PDF output. No need for Puppeteer or html2canvas.

3. **Dynamic imports** -- `@react-pdf/renderer` is ~200KB. Using `await import()` keeps it out of the initial bundle; only loaded when user clicks export.

4. **Widget hover menu** -- Added a `MoreHorizontal` (...) menu that appears on hover, containing "Exportera som PDF". This follows the spec's "widget ⋯ menu" requirement without cluttering the UI.

5. **data-widget-id attribute** -- Added to SortableWidget containers so the SVG snapshot utility can locate specific widget DOM trees by ID.

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 40f8934 | feat(31-01): PDF export enhancement with multi-widget support |

## Known Stubs

1. **Org name hardcoded** -- `orgName` is set to `"Nordic Capacity"` in the layout engine. Future work should resolve this from organization context/API. File: `dashboard-layout-engine.tsx`, lines 152, 213.

## Self-Check: PASSED

All 6 created files exist. Commit 40f8934 verified.
