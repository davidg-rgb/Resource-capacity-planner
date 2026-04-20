# Phase 15: PDF Export - Research

**Researched:** 2026-03-28
**Domain:** Server-side PDF generation with @react-pdf/renderer in Next.js 16 API routes
**Confidence:** HIGH

## Summary

Phase 15 adds a PDF export button to the Team Overview heat map page. The PDF must render the full heat map (all departments, all months in the selected range) in landscape orientation with color-coded cells, a color legend, and header/footer containing org name, date range, and generation timestamp.

The key architectural insight is that @react-pdf/renderer uses its own primitive components (View, Text, Document, Page) with a flexbox-based layout engine -- NOT HTML or regular React components. The heat map must be reconstructed as a react-pdf layout, which means building a dedicated PDF template that mirrors the visual structure of the HTML heat map but using react-pdf primitives. There is no table or CSS grid support, so the heat map grid must be built with nested flexbox Views.

**Primary recommendation:** Create a server-side API route (`/api/reports/team-heatmap`) that fetches heat map data from `getTeamHeatMap()`, pipes it through a react-pdf Document template, and returns a PDF stream. The client triggers this via a download button on the Team Overview page. Gate behind the existing `pdfExport` feature flag.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PDF-01 | User can export the Team Overview heat map as a PDF document | API route generates PDF from heat map data; download button on Team Overview page triggers fetch |
| PDF-02 | PDF renders in landscape orientation with department grouping and color legend | Page component supports `orientation="landscape"`; flexbox Views replicate department-grouped table layout; legend rendered as colored View rectangles with Text labels |
| PDF-03 | PDF includes org name, date range, and generation timestamp as header/footer | `fixed` prop on View renders on every page; org name from organizations table; date range from query params; timestamp from `new Date()` |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | 4.3.2 | Server-side PDF generation | React 19 compatible since v4.1. JSX-based PDF creation. No headless browser. Lightweight for serverless. Already chosen in STACK.md. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | All other dependencies already in the project |

**No additional libraries needed.** The heat map data comes from the existing `analytics.service.ts`. The org name comes from the `organizations` table. Styling uses react-pdf's built-in `StyleSheet.create()`.

**Installation:**
```bash
pnpm add @react-pdf/renderer@^4.3
```

**Version verification:** `@react-pdf/renderer` latest is 4.3.2 (verified via npm registry 2026-03-28).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/pdf/
│   ├── heat-map-pdf.tsx          # PDF Document template (react-pdf primitives)
│   ├── pdf-header-footer.tsx     # Reusable header/footer with fixed positioning
│   └── pdf-styles.ts             # StyleSheet.create() definitions
├── app/api/reports/
│   └── team-heatmap/
│       └── route.ts              # GET handler: fetch data -> render PDF -> stream response
├── features/analytics/
│   └── analytics.service.ts      # EXISTING - getTeamHeatMap() already returns all needed data
└── components/heat-map/
    └── heat-map-table.tsx        # EXISTING - add export button here or on Team Overview page
```

### Pattern 1: Server-Side PDF Generation via API Route

**What:** Generate PDF entirely on the server in a Next.js API route. Client triggers a download by navigating to the API URL or fetching it as a blob.

**When to use:** Always -- this is the only pattern for this phase.

**Example:**
```typescript
// src/app/api/reports/team-heatmap/route.ts
import { renderToStream } from '@react-pdf/renderer';
import { NextRequest, NextResponse } from 'next/server';
import { getTeamHeatMap } from '@/features/analytics/analytics.service';
import { getTenantId } from '@/lib/auth';
import { HeatMapPDF } from '@/components/pdf/heat-map-pdf';

export async function GET(request: NextRequest) {
  const orgId = await getTenantId();
  const params = request.nextUrl.searchParams;
  const from = params.get('from')!;
  const to = params.get('to')!;
  // ... validate params ...

  // Fetch org name for header
  const orgName = await getOrgName(orgId);

  // Fetch heat map data (reuse existing service)
  const data = await getTeamHeatMap(orgId, from, to);

  // Render PDF to Node.js stream
  const stream = await renderToStream(
    <HeatMapPDF data={data} orgName={orgName} dateRange={{ from, to }} />
  );

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="team-overview-${from}-to-${to}.pdf"`,
    },
  });
}
```

### Pattern 2: React-PDF Heat Map Layout with Flexbox

**What:** Reconstruct the HTML heat map table as nested flexbox Views. Each row is a horizontal flex container; each cell is a fixed-width View with a background color.

**When to use:** For the heat map grid inside the PDF.

**Example:**
```typescript
// Source: react-pdf.org/styling (flexbox is fully supported)
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    orientation: 'landscape',
    padding: 30,
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  nameCell: {
    width: 120,
    padding: 3,
    borderRightWidth: 0.5,
    borderRightColor: '#e5e7eb',
  },
  dataCell: {
    width: 36,
    padding: 2,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#e5e7eb',
  },
  // Color variants matching HEAT_MAP_COLORS
  cellOver:    { backgroundColor: '#ef444480' },  // red-500/50
  cellHealthy: { backgroundColor: '#22c55e60' },  // green-500/40
  cellUnder:   { backgroundColor: '#f59e0b60' },  // amber-400/40
  cellIdle:    { backgroundColor: '#e5e7eb' },     // gray-200
});
```

### Pattern 3: Fixed Header/Footer on Every Page

**What:** Use the `fixed` prop on View elements to render them on every page of a multi-page PDF.

**When to use:** For org name, date range, and timestamp that must appear on every page.

**Example:**
```typescript
// Source: react-pdf.org/components (fixed prop)
const Header = ({ orgName, dateRange }: Props) => (
  <View fixed style={styles.header}>
    <Text>{orgName}</Text>
    <Text>{dateRange.from} to {dateRange.to}</Text>
  </View>
);

const Footer = ({ generatedAt }: { generatedAt: string }) => (
  <View fixed style={styles.footer}>
    <Text>Generated: {generatedAt}</Text>
    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
  </View>
);
```

### Pattern 4: Client-Side Download Trigger

**What:** Use a simple anchor tag or fetch + blob download. No need for client-side PDF libraries.

**When to use:** For the export button on the Team Overview page.

**Example:**
```typescript
// Simple approach: anchor tag pointing to API route
const exportUrl = `/api/reports/team-heatmap?from=${filters.monthFrom}&to=${filters.monthTo}`;

<a href={exportUrl} download className="btn">
  <Download size={16} /> Export PDF
</a>

// Or with loading state:
const handleExport = async () => {
  setExporting(true);
  const res = await fetch(exportUrl);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `team-overview.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  setExporting(false);
};
```

### Anti-Patterns to Avoid
- **Using Puppeteer/Playwright:** Exceeds Vercel 50MB function size limit. Never add headless browser dependencies.
- **Using html2canvas + jsPDF:** Screenshot-based, blurry output, no text selection in PDF, unreliable with complex layouts.
- **Rendering regular React components in PDF:** react-pdf has its own View/Text primitives. `<div>`, `<table>`, `<td>` do NOT work.
- **Client-side react-pdf rendering:** Would require shipping the entire react-pdf bundle to the client. Keep PDF generation server-side.
- **Building a generic PDF service:** Only the heat map export is needed. Do not over-engineer a generic report framework.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom Puppeteer/Canvas pipeline | @react-pdf/renderer `renderToStream` | Vercel 50MB limit, cold start, memory |
| Heat map data | New query for PDF | Existing `getTeamHeatMap()` from analytics.service.ts | Same data, already optimized with CTE |
| Color mapping | New color logic | Existing `calculateHeatMapStatus()` + color mapping | Keep PDF colors consistent with web UI |
| Auth/tenant isolation | Custom auth check | Existing `getTenantId()` | Already handles Clerk session + org resolution |
| Feature gating | Inline flag check | Existing `pdfExport` flag (flag-definitions.ts) | Flag already defined, just needs route check |

## Common Pitfalls

### Pitfall 1: react-pdf Stream Type Mismatch with Next.js Response
**What goes wrong:** `renderToStream()` returns a Node.js `ReadableStream` (from `stream` module), but `NextResponse` expects a Web `ReadableStream`. Passing it directly causes TypeScript errors or runtime failures.
**Why it happens:** react-pdf predates the Web Streams API.
**How to avoid:** Convert using Node.js `Readable.toWeb()` or cast through `ReadableStream`. Test locally before deploying.
**Warning signs:** TypeScript error on `new NextResponse(stream)`, or empty/corrupt PDF downloads.

### Pitfall 2: Heat Map Exceeding Single Page Width
**What goes wrong:** A 12-18 month heat map with person names may exceed landscape A4 width (842 points). Cells get truncated or overflow.
**Why it happens:** Fixed cell widths times 18 columns plus name column exceeds page width.
**How to avoid:** Calculate maximum columns that fit per page. For 18 months at 36pt per cell plus 120pt name column = 768pt, which fits in landscape A4 (842pt) with 30pt margins on each side (842 - 60 = 782pt). For wider ranges, either reduce cell width or paginate horizontally (split into two pages).
**Warning signs:** Cell text overlapping, columns disappearing off right edge.

### Pitfall 3: Font Registration for Non-Latin Characters
**What goes wrong:** Default Helvetica font in react-pdf does not support Swedish characters (a, o, a with diacritics). Person names or department names with special characters render as blank or question marks.
**Why it happens:** react-pdf ships with standard PDF fonts (Helvetica, Times, Courier) which have limited Unicode support.
**How to avoid:** Register a font that supports Nordic characters. The simplest approach is to use `Font.register()` with a web-hosted font (e.g., Inter from Google Fonts) or embed a TTF file. Swedish names like "Bjornsson" or "Stromsborg" need proper rendering.
**Warning signs:** Missing or garbled characters in person/department names.

### Pitfall 4: Vercel Serverless Timeout for Large Orgs
**What goes wrong:** An org with 200+ people and 18 months of data means the PDF template renders 3,600+ cells. Combined with the DB query and PDF layout engine, this may approach Vercel's 60-second Pro timeout.
**Why it happens:** react-pdf's layout engine processes every View/Text node. Thousands of nodes take time.
**How to avoid:** The DB query is already optimized (single CTE). For the PDF layout, keep styles simple (no gradients, no images). 3,600 cells should render in under 10 seconds. If issues arise, consider limiting the export to 12 months maximum.
**Warning signs:** Export button spinner lasting more than 5 seconds locally.

### Pitfall 5: Feature Flag Not Checked on API Route
**What goes wrong:** The export button is hidden when `pdfExport` flag is off, but the API route `/api/reports/team-heatmap` is still accessible via direct URL. Users with the URL can bypass the flag.
**Why it happens:** Feature flags typically gate UI visibility, not API access.
**How to avoid:** Check the `pdfExport` flag in the API route handler. Return 404 if flag is disabled for the org.
**Warning signs:** PDF downloads working for orgs without the feature flag enabled.

## Code Examples

### Getting Org Name for PDF Header
```typescript
// Add to analytics.service.ts or create a lightweight helper
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizations } from '@/db/schema';

export async function getOrgName(orgId: string): Promise<string> {
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return org?.name ?? 'Unknown Organization';
}
```

### Heat Map Status to PDF Color Mapping
```typescript
// Reuse calculateHeatMapStatus from src/lib/capacity.ts
// Map HeatMapStatus to hex colors for react-pdf (Tailwind classes don't work)
import { calculateHeatMapStatus, type HeatMapStatus } from '@/lib/capacity';

const PDF_HEAT_MAP_COLORS: Record<HeatMapStatus, string> = {
  over:    '#fca5a5',  // red-300 equivalent
  healthy: '#86efac',  // green-300 equivalent
  under:   '#fde68a',  // amber-200 equivalent
  idle:    '#e5e7eb',  // gray-200 equivalent
};
```

### Page Dimensions Reference
```
Landscape A4: 842 x 595 points (1 point = 1/72 inch)
With 30pt margins each side: usable width = 782pt, usable height = 535pt

Cell width: 36pt -> max columns in 782pt = (782 - 120 name col) / 36 = ~18 months
At 7pt font size with 3pt padding, each row is ~13pt tall
Max rows per page: (535 - header 40pt - footer 30pt) / 13 = ~35 person rows
```

## Existing Code to Reuse

| Component/Function | Location | What It Provides |
|---|---|---|
| `getTeamHeatMap()` | `src/features/analytics/analytics.service.ts` | Full heat map data: departments -> people -> months -> hours |
| `HeatMapResponse` type | `src/features/analytics/analytics.types.ts` | TypeScript interface for heat map data |
| `calculateHeatMapStatus()` | `src/lib/capacity.ts` | Status classification: over/healthy/under/idle |
| `HEAT_MAP_COLORS` | `src/lib/capacity.ts` | Tailwind color classes (need hex equivalents for PDF) |
| `getTenantId()` | `src/lib/auth.ts` | Auth + org resolution for API route |
| `pdfExportFlag` | `src/features/flags/flag-definitions.ts` | Feature flag definition (already exists) |
| `organizations.name` | `src/db/schema.ts` | Org name column for PDF header |
| `generateMonthRange()` | `src/lib/date-utils.ts` | Month range generation |
| `formatMonthHeader()` | `src/lib/date-utils.ts` | "Jan 26" style month labels |
| Team Overview page | `src/app/(app)/dashboard/team/page.tsx` | Where the export button will be added |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer in serverless | @react-pdf/renderer | 2024+ | No headless browser, <1MB vs 130MB bundle |
| html2canvas screenshots | Data-driven PDF templates | 2023+ | Text-selectable, sharp at any zoom, smaller files |
| Client-side jsPDF | Server-side renderToStream | 2024+ | No client bundle, faster perceived performance |

## Open Questions

1. **Swedish/Nordic character support**
   - What we know: Default Helvetica has limited Unicode. Swedish names are common in this app.
   - What's unclear: Whether the specific diacritics used (a-ring, o-umlaut, a-umlaut) are covered by Helvetica.
   - Recommendation: Test with Swedish names early. If broken, register Inter or similar font via `Font.register()`. This is a Wave 1 task since it's quick to test and fix.

2. **Maximum practical org size for PDF**
   - What we know: Layout calculation is O(n) on cell count. 200 people x 18 months = 3,600 cells.
   - What's unclear: Exact rendering time on Vercel serverless.
   - Recommendation: Build it, test with realistic data. Add a timeout/size guard if needed (e.g., cap at 500 people or show error).

## Sources

### Primary (HIGH confidence)
- [react-pdf.org/node](https://react-pdf.org/node) - renderToStream, renderToFile, renderToString APIs
- [react-pdf.org/components](https://react-pdf.org/components) - Document, Page, View, Text, Image primitives; `fixed` prop for headers/footers
- [react-pdf.org/styling](https://react-pdf.org/styling) - Full flexbox support, StyleSheet.create(), background colors, borders, padding
- [react-pdf.org/compatibility](https://react-pdf.org/compatibility) - React 19 support since v4.1.0
- [npm: @react-pdf/renderer](https://www.npmjs.com/package/@react-pdf/renderer) - v4.3.2 current

### Secondary (MEDIUM confidence)
- [GitHub Discussion #2402](https://github.com/diegomura/react-pdf/discussions/2402) - Server-side rendering patterns with Next.js App Router
- [Medium: Next.js PDF generation](https://medium.com/@stanleyfok/pdf-generation-with-react-componenets-using-next-js-at-server-side-ee9c2dea06a7) - API route pattern

### Project Sources (HIGH confidence)
- `src/features/analytics/analytics.service.ts` - Existing heat map data service
- `src/components/heat-map/heat-map-table.tsx` - Existing heat map UI (structure to mirror)
- `src/lib/capacity.ts` - Heat map status calculation and color constants
- `.planning/research/STACK.md` - @react-pdf/renderer chosen, Puppeteer rejected
- `.planning/research/PITFALLS.md` - Pitfall 2: Vercel 50MB limit

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @react-pdf/renderer 4.3.2 verified on npm, React 19 compatible, well-documented
- Architecture: HIGH - API route + renderToStream is the standard pattern, all data sources already exist
- Pitfalls: HIGH - Vercel limits well-documented, font issues are known react-pdf concern, stream type mismatch is documented in GitHub issues

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable library, mature API)
