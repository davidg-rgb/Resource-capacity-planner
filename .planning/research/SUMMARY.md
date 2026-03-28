# Research Summary: Nordic Capacity v2.0 -- Visibility & Insights

**Domain:** Resource capacity planning SaaS -- visualization and insights layer
**Researched:** 2026-03-28
**Overall confidence:** HIGH

## Executive Summary

The v2.0 milestone adds a read-heavy visualization layer on top of the existing write-heavy allocation system. The good news: most features (announcements, system health, tenant data ops, feature flags) require NO new libraries -- they build on the existing Drizzle + TanStack Query + Next.js API route stack.

The features that DO need new libraries are: charts/dashboards (Recharts 3.x), capacity heat maps (Nivo heatmap), PDF export (@react-pdf/renderer), toast notifications (Sonner), feature flags (Vercel Flags SDK), and onboarding tours (driver.js). Total: 7 new npm packages, all lightweight, all React 19 compatible, all actively maintained.

The architectural challenge is not complexity but discipline: all data aggregation must happen server-side in SQL, chart components must be client-only with proper Suspense boundaries, and PDF generation must use react-pdf's own primitives (not regular React components). These are well-understood patterns with clear implementation paths.

The biggest risk is the PDF export feature, where @react-pdf/renderer's inability to render standard React components means charts must be serialized as images before embedding. This adds a pipeline step but is a solved problem.

## Key Findings

**Stack:** 7 new packages (Recharts, @nivo/core, @nivo/heatmap, @react-pdf/renderer, Sonner, flags, driver.js). Zero new infrastructure. Zero new services.
**Architecture:** Read-heavy layer derived from flat allocation table. Server-side aggregation via SQL. Client-side rendering via chart libraries.
**Critical pitfall:** @react-pdf/renderer cannot render Recharts/Nivo components directly -- must serialize charts as images first.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Infrastructure & Feature Flags** - Install all new packages. Set up feature flag system (F-034) and Sonner toast provider. These are prerequisites for everything else.
   - Addresses: F-034 (feature flags), toast infrastructure
   - Avoids: Having to retrofit flag gating later

2. **Heat Map & Team Overview** - The headline feature. Build the capacity heat map with @nivo/heatmap, color scale system, and Team Overview page.
   - Addresses: F-013 (Team Overview heat map)
   - Avoids: Color scale misrepresentation pitfall (#4)

3. **Dashboards & Charts** - Management Dashboard with KPIs, discipline breakdowns, utilization metrics using Recharts.
   - Addresses: F-015 (Management Dashboard), F-017 (Discipline breakdown)
   - Avoids: Client-side aggregation pitfall (#2)

4. **Alerts & Project View** - Capacity alerts system and project-centric staffing view.
   - Addresses: F-016 (Capacity alerts), F-014 (Project View)
   - Avoids: Toast overload pitfall (#7)

5. **PDF Export** - Generate PDFs from heat map and dashboard data. Requires heat map and dashboards to exist first.
   - Addresses: F-027 (PDF export)
   - Avoids: React component rendering pitfall (#1), timeout pitfall (#6)

6. **Onboarding & Announcements** - Product tours and platform communication. Build last because tours reference completed pages.
   - Addresses: F-028 (Onboarding), F-038 (Announcements)
   - Avoids: Tour breaks on layout changes pitfall (#8)

7. **Platform Admin Features** - System health monitoring and tenant data operations.
   - Addresses: F-033 (System health), F-035 (Tenant data ops)
   - Avoids: No specific pitfall -- straightforward CRUD + metrics display

**Phase ordering rationale:**
- Feature flags first because they gate everything else (gradual rollout)
- Heat map before dashboards because it is the headline feature and validates the Nivo integration
- Dashboards before alerts because alerts reference threshold values from dashboard context
- PDF after heat map + dashboards because it exports their output
- Onboarding last because it tours completed pages
- Platform admin features are independent but lowest user-facing priority

**Research flags for phases:**
- Phase 5 (PDF Export): Likely needs deeper research on chart-to-image serialization pipeline
- Phase 2 (Heat Map): Standard Nivo integration, unlikely to need additional research
- Phase 3 (Dashboards): Standard Recharts integration, unlikely to need additional research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified on npm with current versions, React 19 compatibility confirmed |
| Features | HIGH | Feature set is well-defined in PROJECT.md, clear scope boundaries |
| Architecture | HIGH | Server-side aggregation + client chart rendering is a proven pattern |
| Pitfalls | HIGH | Known issues documented by library maintainers and community |

## Gaps to Address

- **Chart-to-image pipeline for PDF:** The exact mechanism for converting Recharts/Nivo output to embeddable images in @react-pdf/renderer needs prototyping. Options: SVG serialization, `recharts-to-png`, or server-side canvas rendering.
- **Nivo heat map performance at scale:** 200+ people x 18 months = 3,600 cells. Should be fine based on Nivo's SVG renderer, but worth benchmarking.
- **Flags SDK v4 custom provider:** The OpenFeature adapter for reading from Drizzle/Neon needs to be implemented. The pattern is documented but there is no off-the-shelf Drizzle adapter.
- **driver.js in Next.js App Router:** driver.js is framework-agnostic and requires manual React integration via hooks. The `useProductTour` wrapper needs to handle SSR correctly (only import driver.js client-side via dynamic import).
