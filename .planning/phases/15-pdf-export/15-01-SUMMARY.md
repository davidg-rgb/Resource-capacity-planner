---
phase: 15-pdf-export
plan: 01
subsystem: pdf, api
tags: [react-pdf, pdf-export, renderToStream, heat-map, landscape-pdf]

requires:
  - phase: 12-team-overview
    provides: getTeamHeatMap analytics service and HeatMapResponse types
  - phase: 11-infra-flags
    provides: pdfExport feature flag and getOrgFlags service

provides:
  - PDF export of Team Overview heat map via /api/reports/team-heatmap
  - react-pdf template components (HeatMapPDF, PdfHeader, PdfFooter, pdf-styles)
  - Export PDF button on Team Overview page with loading state

affects: []

tech-stack:
  added: ["@react-pdf/renderer@^4.3"]
  patterns: ["Server-side PDF generation via renderToStream in API route", "Node-to-Web stream conversion for NextResponse", "Feature flag gating on API routes (not just UI)"]

key-files:
  created:
    - src/components/pdf/pdf-styles.ts
    - src/components/pdf/pdf-header-footer.tsx
    - src/components/pdf/heat-map-pdf.tsx
    - src/app/api/reports/team-heatmap/route.tsx
  modified:
    - src/app/(app)/dashboard/team/page.tsx
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "API route uses .tsx extension for JSX in renderToStream call"
  - "Export button always rendered when data loaded; API route enforces flag gate (simpler than client-side flag check)"
  - "Node.js Readable.toWeb() conversion for stream type compatibility with NextResponse"

patterns-established:
  - "PDF components in src/components/pdf/ with separate styles, header/footer, and document template files"
  - "API route PDF generation pattern: auth -> flag check -> param validation -> data fetch -> renderToStream -> web stream response"

requirements-completed: [PDF-01, PDF-02, PDF-03]

duration: 3min
completed: 2026-03-28
---

# Phase 15 Plan 01: PDF Export Summary

**Server-side heat map PDF export via @react-pdf/renderer with landscape A4 layout, department grouping, color-coded cells, and feature flag gating**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T13:25:21Z
- **Completed:** 2026-03-28T13:27:59Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Installed @react-pdf/renderer and created three PDF template components (styles, header/footer, document)
- Built GET /api/reports/team-heatmap API route with pdfExport flag gate, param validation, and stream-to-web conversion
- Added Export PDF button on Team Overview page with loading state and blob download

## Task Commits

Each task was committed atomically:

1. **Task 1: Install react-pdf and create PDF template components** - `352a189` (feat)
2. **Task 2: Create API route and wire export button on Team Overview page** - `88e07c1` (feat)

## Files Created/Modified

- `src/components/pdf/pdf-styles.ts` - StyleSheet.create with page/row/cell/header/footer/legend styles and PDF_CELL_COLORS map
- `src/components/pdf/pdf-header-footer.tsx` - Fixed PdfHeader (org name, date range) and PdfFooter (timestamp, page numbers) components
- `src/components/pdf/heat-map-pdf.tsx` - HeatMapPDF Document with landscape A4, department groups, color-coded cells, legend
- `src/app/api/reports/team-heatmap/route.tsx` - GET handler: auth, flag gate, param validation, data fetch, PDF render, stream response
- `src/app/(app)/dashboard/team/page.tsx` - Added Export PDF button with exporting state and blob download handler
- `package.json` - Added @react-pdf/renderer dependency
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made

- API route file uses `.tsx` extension (not `.ts`) because renderToStream requires JSX syntax for the HeatMapPDF component
- Export button is always visible when data is loaded; the API route enforces the pdfExport feature flag (returns 404 when disabled), avoiding client-side flag fetching complexity
- Used `Readable.toWeb(Readable.from(stream))` for Node.js-to-Web stream conversion as recommended by research

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Renamed API route from .ts to .tsx**
- **Found during:** Task 2 (API route creation)
- **Issue:** Plan specified `route.ts` but the file contains JSX (`<HeatMapPDF ... />` in renderToStream call), causing TypeScript compilation errors
- **Fix:** Created file as `route.tsx` instead of `route.ts`
- **Files modified:** src/app/api/reports/team-heatmap/route.tsx
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 88e07c1

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial file extension fix required for JSX compilation. No scope creep.

## Issues Encountered

None

## Known Stubs

None - all data flows are wired to existing services (getTeamHeatMap, getOrgFlags, getTenantId).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PDF export is complete and ready for manual testing
- Swedish/Nordic character support may need Font.register() if Helvetica doesn't render diacritics correctly (deferred per research recommendation)
- Large org performance (200+ people) should be monitored in production

## Self-Check: PASSED

- All 5 created/modified files verified on disk
- Commit 352a189 (Task 1) verified in git log
- Commit 88e07c1 (Task 2) verified in git log

---
*Phase: 15-pdf-export*
*Completed: 2026-03-28*
