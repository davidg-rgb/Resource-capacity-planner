# Technology Stack

**Project:** Nordic Capacity v2.0 -- Visibility & Insights
**Researched:** 2026-03-28

## Existing Stack (validated, DO NOT change)

| Layer      | Technology              | Version   |
| ---------- | ----------------------- | --------- |
| Framework  | Next.js 16 (App Router) | 16.2.1    |
| Language   | TypeScript 5.x          | ^5        |
| Database   | PostgreSQL 17 on Neon   | 17        |
| ORM        | Drizzle 0.45.x          | 0.45.1    |
| Auth       | Clerk (@clerk/nextjs)   | ^7.0.7    |
| Grid       | AG Grid Community       | ^35.2.0   |
| Styling    | Tailwind CSS 4.x        | ^4        |
| State      | TanStack Query 5.x      | ^5.95.2   |
| Validation | Zod 4.x                 | ^4.3.6    |
| Excel      | SheetJS                 | 0.20.3    |
| Monitoring | Sentry                  | latest    |
| Hosting    | Vercel Pro              | --        |
| Icons      | Lucide React            | ^1.7.0    |

## New Stack Additions for v2.0

### Charts & Data Visualization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Recharts | ^3.8.x | KPI dashboards, bar charts, line charts, discipline breakdowns | Most popular React charting library. v3 is actively maintained (3.8.1 released March 2026). TypeScript-first, SVG-based, simple declarative API. Excellent for standard chart types (bar, line, pie, area). Works with React 19. Lighter than Nivo for the chart types we actually need. |
| @nivo/heatmap | ^0.99.x | Team Overview capacity heat map (person x month matrix) | Best-in-class heat map component for React. Built-in color scales, cell shapes (rect/circle), tooltips, theming. React 19 compatible since v0.98. Recharts has NO native heat map -- Nivo fills this gap precisely. Only install `@nivo/core` + `@nivo/heatmap`, not the full Nivo suite. |

**Why not just one library?**
Recharts lacks a heat map component entirely (open issue #237 since 2017, never implemented). Nivo has excellent heat maps but is heavier for simple bar/line/pie charts. Using Recharts for dashboards + Nivo for the capacity heat map gives best-of-both: lightweight dashboards and a proper heat map. The two libraries coexist fine -- both use D3 under the hood.

**Alternatives considered:**

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Dashboards | Recharts 3.x | Tremor | Tremor is built ON Recharts -- adds a wrapper layer we don't need. We have our own design system (Nordic Precision), so Tremor's opinionated UI is counterproductive. |
| Dashboards | Recharts 3.x | Chart.js / react-chartjs-2 | Canvas-based (not SVG), harder to style with Tailwind, less React-idiomatic. |
| Heat map | @nivo/heatmap | Custom AG Grid cellStyle | AG Grid cellStyle can do color-coded cells but cannot render a standalone overview matrix (Team Overview shows ALL people x ALL months). The heat map is a read-only visualization, not an editable grid. Different component, different purpose. |
| Heat map | @nivo/heatmap | MUI X Heatmap | Pulls in MUI as a dependency -- massive overhead for one component. |

### PDF Generation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @react-pdf/renderer | ^4.3.x | PDF export of Team Overview heat map and reports | React-component-based PDF creation -- write JSX, get PDF. Works server-side in Node.js (API routes). React 19 compatible since v4.1. No headless browser needed (unlike Puppeteer). Lightweight, fast, scales well. |

**Alternatives considered:**

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| PDF | @react-pdf/renderer | Puppeteer / Playwright | Requires headless Chrome in serverless -- huge cold start, memory-intensive, expensive on Vercel. Overkill for structured report PDFs. |
| PDF | @react-pdf/renderer | jsPDF | Client-side only, imperative API (no JSX), poor layout control for complex reports. |
| PDF | @react-pdf/renderer | html2canvas + jsPDF | Screenshot-based -- blurry, no text selection, poor quality. |

**Important limitation:** @react-pdf/renderer uses its own primitive components (View, Text, Image) -- you cannot render regular React/HTML components directly. The PDF templates must be built separately using react-pdf primitives. This is fine for structured reports but means chart images must be rendered as PNG/SVG first, then embedded.

### Toast Notifications & Alerts

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Sonner | ^2.0.x | Toast notifications for capacity alerts, system messages, announcements | 20M+ weekly downloads, the de facto React toast library in 2025-2026. 9KB gzipped. Beautiful defaults that align with Nordic Precision's clean aesthetic. Promise-based API for async operations. Works with React 19 and Next.js 16. Used by shadcn/ui ecosystem. |

**Alternatives considered:**

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Toasts | Sonner | react-hot-toast | Smaller (5KB) but less actively developed. Sonner has 7x the downloads and better defaults. |
| Toasts | Sonner | react-toastify | Heavier, more opinionated styling that clashes with custom design systems. |

### Feature Flags

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| flags (Vercel Flags SDK) | ^4.0.x | Per-tenant feature flags (F-034) | Official Vercel package, first-class Next.js integration. Server-side only evaluation (no client bundle leak). Free and open-source. Supports custom flag providers via OpenFeature adapter -- store flags in your own DB (no external service needed). Works natively on Vercel Pro. v4.0.4 is current. |

**Architecture for per-tenant flags:**
The Flags SDK evaluates flags server-side. We implement a custom provider that reads from a `feature_flags` table in our Neon DB (keyed by `organization_id`). No external flag service needed. Platform admins toggle flags per tenant via the admin UI.

**Alternatives considered:**

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Feature flags | flags (Vercel SDK) | LaunchDarkly / Unleash | External service dependency, cost, complexity. We need simple boolean flags per tenant, not A/B testing or percentage rollouts. |
| Feature flags | flags (Vercel SDK) | Custom from scratch | The Flags SDK handles the hard parts (precomputation, server-side evaluation, caching) while letting us use our own DB as the flag store. No reason to reinvent. |

### Onboarding / Guided Tours

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| driver.js | ^1.3.x | Onboarding wizard product tour (F-028) | Lightweight (~5KB), zero dependencies, framework-agnostic (works with any React version including 19). DOM-based highlighting with smooth animations. Simple step-based API. No React peer dependency issues -- just works. |

**Why not react-joyride?**
React Joyride v2.x was broken on React 19 for 9+ months. v3.0.0 released only days ago (March 2026) -- too fresh to trust for production. Driver.js has been stable and framework-agnostic, avoiding the React version coupling problem entirely.

**Integration pattern:** Create a `useProductTour` hook that wraps driver.js, managing tour state in localStorage (which tours completed) and triggering from React components via `useEffect`. This gives React-idiomatic usage without framework coupling.

**Alternatives considered:**

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Onboarding | driver.js | react-joyride 3.0 | Just released after 9 months of React 19 incompatibility. Unproven in production. |
| Onboarding | driver.js | Shepherd.js | React wrapper also had React 19 issues. Heavier (Svelte-based core). |
| Onboarding | driver.js | Custom | Highlighting, scroll positioning, and overlay management are genuinely hard. driver.js solves this in 5KB. |

### System Health Monitoring

**No new library needed.** Use existing stack:

| Approach | Technology | Purpose |
|----------|------------|---------|
| Error tracking | Sentry (already installed) | Runtime errors, performance monitoring |
| Uptime checks | Vercel Cron Jobs + DB health query | Periodic health check endpoint (`/api/health`) already exists from v1.0 |
| Dashboard data | Drizzle + TanStack Query | Query system metrics (DB connection count, API response times, error rates) from application logs |
| External uptime | Better Stack Free tier (optional) | Ping `/api/health` every 5 min, alert on downtime. No code dependency -- just a URL monitor. |

**Rationale:** System health monitoring (F-033) is about building a dashboard that surfaces existing metrics, not adding a new monitoring framework. Sentry already captures errors and performance. Vercel provides function execution metrics. We aggregate these into a platform admin dashboard page.

### Announcements / Notifications

**No new library needed beyond Sonner (above).** Architecture:

| Component | Technology | Purpose |
|-----------|------------|---------|
| Storage | `announcements` table in Neon (Drizzle schema) | Platform-wide and per-tenant announcements |
| Display | Sonner toasts + dismissible banner component | Show announcements on login / page load |
| Dismissal tracking | `announcement_reads` table | Track which users have dismissed which announcements |
| API | Next.js API routes + TanStack Query | CRUD for platform admins, read/dismiss for users |

### Tenant Data Operations

**No new library needed.** Uses existing stack:

| Operation | Technology | Notes |
|-----------|------------|-------|
| Data export | Drizzle queries + SheetJS (already installed) | Export all tenant data as Excel/JSON |
| Data deletion | Drizzle transactions | Cascade delete all tenant data with confirmation |
| Data migration | Drizzle + custom scripts | Move data between tenants (platform admin only) |

## Summary: What to Install

### Production Dependencies

```bash
pnpm add recharts@^3.8 @nivo/core@^0.99 @nivo/heatmap@^0.99 @react-pdf/renderer@^4.3 sonner@^2.0 flags@^4.0 driver.js@^1.3
```

### No Dev Dependencies Needed

All new libraries are runtime dependencies. No new build tools or dev-only packages required.

## What NOT to Add

| Library | Why Not |
|---------|---------|
| Tremor | Wrapper on Recharts, own design system conflicts with Nordic Precision |
| Chart.js | Canvas-based, less React-native, harder to theme |
| Puppeteer / Playwright | Too heavy for serverless PDF generation |
| LaunchDarkly / Unleash / Flagsmith | External services overkill for per-tenant boolean flags |
| react-joyride | React 19 support just landed, unproven |
| MUI / Chakra / any component library | Project has its own design system, adding a UI lib creates two competing systems |
| Socket.io / Pusher | No real-time requirement in v2.0. "Near-real-time" alerts are polling-based (TanStack Query refetch intervals). |
| Redis / queue system | No background job requirements. Vercel Cron handles scheduled tasks. |

## Integration Points with Existing Stack

| New Library | Integrates With | How |
|-------------|----------------|-----|
| Recharts | TanStack Query | Charts consume data from query hooks. `useSuspenseQuery` for dashboard data, Recharts renders the result. |
| Recharts | Tailwind CSS 4 | Recharts accepts CSS variables for theming. Map Nordic Precision design tokens to chart colors. |
| @nivo/heatmap | TanStack Query | Heat map data fetched via query hook, transformed to Nivo's `{id, data: [{x, y}]}` format. |
| @nivo/heatmap | AG Grid | Team Overview page has BOTH: heat map for visual overview, AG Grid for detailed editing. Same data source, different views. |
| @react-pdf/renderer | Recharts / Nivo | Charts rendered to SVG/PNG first (via `recharts-to-png` or SVG serialization), then embedded in PDF as images. |
| @react-pdf/renderer | Next.js API routes | PDF generated server-side in `/api/reports/[type]/route.ts`, returned as `application/pdf` stream. |
| Sonner | Capacity alerts (F-016) | When TanStack Query fetches allocation data showing over-allocation, trigger `toast.warning()`. |
| Sonner | Announcements (F-038) | On page load, check for unread announcements, show as dismissible toasts. |
| flags (Vercel SDK) | Drizzle ORM | Custom flag provider reads from `feature_flags` table. Server Components call `flag()` to check. |
| flags (Vercel SDK) | Clerk auth | Flag evaluation includes `organizationId` from Clerk session to scope flags per tenant. |
| driver.js | React hooks | Custom `useProductTour` hook wraps driver.js. Tour completion stored in localStorage + user preferences table. |

## Confidence Assessment

| Decision | Confidence | Rationale |
|----------|------------|-----------|
| Recharts for dashboards | HIGH | v3.8 actively maintained, 24M+ weekly downloads, React 19 compatible, TypeScript-first |
| Nivo for heat maps | HIGH | Only mature React heat map component. React 19 compatible since v0.98. Well-documented API. |
| @react-pdf/renderer | HIGH | v4.3 supports React 19, Node.js 18-21, proven server-side generation pattern |
| Sonner for toasts | HIGH | 20M+ weekly downloads, React 19 + Next.js 16 compatible, clean API |
| flags (Vercel SDK) | HIGH | Official Vercel package, v4.0 current, OpenFeature adapter for custom DB provider |
| driver.js for tours | MEDIUM | Stable and lightweight but requires manual React integration (no hooks out of box). Manageable with a custom hook wrapper. |
| No new lib for health | HIGH | Sentry + Vercel metrics + custom dashboard page covers the requirement |
| No new lib for announcements | HIGH | DB table + Sonner + TanStack Query is the right pattern for this |

## Sources

- [Recharts npm](https://www.npmjs.com/package/recharts) -- v3.8.1
- [Recharts GitHub releases](https://github.com/recharts/recharts/releases)
- [Nivo heatmap docs](https://nivo.rocks/heatmap/)
- [@nivo/core npm](https://www.npmjs.com/package/@nivo/core) -- v0.99.0
- [Nivo React 19 support issue](https://github.com/plouc/nivo/issues/2618)
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) -- v4.3.2
- [react-pdf compatibility](https://react-pdf.org/compatibility) -- React 19 since v4.1
- [Sonner npm](https://www.npmjs.com/package/sonner) -- v2.0.7
- [Flags SDK docs](https://flags-sdk.dev/) -- v4.0.4
- [Vercel Flags SDK reference](https://vercel.com/docs/flags/flags-sdk-reference)
- [Flags SDK OpenFeature adapter](https://openfeature.dev/blog/vercel-flags-sdk-adapter/)
- [driver.js](https://driverjs.com) -- v1.3.x
- [react-joyride React 19 issue](https://github.com/gilbarbara/react-joyride/issues/1122)
- [AG Grid cell styles docs](https://www.ag-grid.com/react-data-grid/cell-styles/)
- [Best React chart libraries 2025 - LogRocket](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [Top React toast libraries compared - LogRocket](https://blog.logrocket.com/react-toast-libraries-compared-2025/)
- [Best React onboarding libraries 2026](https://onboardjs.com/blog/5-best-react-onboarding-libraries-in-2025-compared)
