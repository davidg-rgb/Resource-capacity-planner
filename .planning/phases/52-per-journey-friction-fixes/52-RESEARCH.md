# Phase 52: Per-journey friction fixes - Research

**Researched:** 2026-04-21
**Domain:** Persona UX friction reduction (Next.js 16 App Router + TanStack Query + ag-grid + sonner + Clerk) gated behind a single `uiV6PerJourney` feature flag, verified by Playwright click-count assertions against the 11 journeys in `v5.0-USER-JOURNEYS.md`.
**Confidence:** HIGH

## Summary

Phase 52 is overwhelmingly a **wiring, test-authoring, and flag-gating phase**, not a greenfield feature phase. The scout in CONTEXT.md was accurate: every major primitive the 13 REQs depend on already ships in the codebase — `PlanVsActualCell`, `HistoricEditDialog`, `ZoomControls` + `useZoom` + `timeline-columns` (with month/quarter/year already implemented), `PlanVsActualDrawer` + `Drawer` (with focus-trap + ESC-dismiss), `RegisterTable` banner for `DEPENDENT_ROWS_EXIST`, `iso-calendar.ts` with 53-week math, `getServerNowMonthKey()`, `/api/v5/capacity/breakdown`, and the shared `blockers` payload on `ConflictError.details`. What is **genuinely new** is: the `/api/v5/proposals/queue/count` endpoint (VERIFY-02 confirms), the `PendingWishChip` top-bar component, the `ClickTrackerProvider` test harness, the `OvercommitDialog` component, 11 new Playwright specs, and the `uiV6PerJourney` flag addition.

A small but load-bearing surprise: **`PmOverviewResult.defaultProjectId` already exists** at `src/features/planning/planning.read.ts:32` and is already populated as `cards[0]?.project.id ?? null`. D-01's server-computed default therefore reduces to (a) sharpening the computation to "exactly one project → its id; else null" per the REQ wording, and (b) adding the client-side `router.replace()` redirect to `/pm/page.tsx`. No API shape change is needed on the server side.

A second, sharper surprise: the `DependentRowsError.blockers` payload today is `Record<string, number>` (kind-aggregated counts — `{ allocations: 3, proposals: 1 }`), NOT per-row items. ADMIN-01's "toast listing dependents" cannot render row-level data like "Allokering: Sara / Juni 2026 (60h)" without a backend change to `collectBlockers()` in `src/features/admin/register.service.ts`. This needs a planning decision: extend the backend, or reinterpret REQ ADMIN-01 as "list blocker counts grouped by kind" which is what `RegisterTable.banner` already renders.

**Primary recommendation:** Plan Phase 52 as six tight waves in this order: (1) flag + click-tracker infrastructure, (2) `/api/v5/proposals/queue/count` endpoint (unblocks LM-01), (3) PM cluster (PM-01 redirect, PM-02 chip, PM-03 Playwright spec, PM-04 snapshot tests), (4) LM+Staff+RD cluster (LM-01 badge wiring, LM-02 Playwright spec, STAFF-01 `readOnly` prop, RD-01 spec coverage for 53-week, RD-02 dialog), (5) SHARED-01 deep-link + ADMIN-01 banner enrichment, (6) 11 Playwright journey specs wired through `ClickTrackerProvider`. Resolve the ADMIN-01 scope question in planning (row-level backend extension vs. kind-count reinterpretation) BEFORE wave 5 fires.

## User Constraints (from CONTEXT.md)

### Locked Decisions (D-01 … D-15)

- **D-01** PM-01 uses server-computed `defaultProjectId` on `/api/v5/planning/pm-home`. Server-side logic: if `projects.length === 1` → `defaultProjectId = projects[0].id`, else `undefined`. Client redirects via `router.replace('/pm/projects/<id>')` when flag is on. localStorage rejected.
- **D-02** PM-02 standalone `<PendingWishChip />` in app-shell top-bar. Visible when `pending + rejected > 0`. Deep-link: `rejected > 0` → `/pm/wishes?tab=rejected`, else `/pm/wishes?tab=proposed`. Flag-gated + `persona.kind === 'pm'` gated.
- **D-03** PM-03 warning fires when `editedPeriodMonthKey < serverNowMonthKey` from `src/lib/server/get-server-now-month-key.ts`. 4-combo matrix: (PM past|future) × (LM past|future). No "don't ask again". Dialog component `historic-edit-dialog.tsx` already shipped.
- **D-04** PM-04 4 snapshot test cases in `src/components/timeline/__tests__/pm-timeline-cell.test.tsx` — draft / proposed / approved / rejected.
- **D-05** LM-03 endpoint: `GET /api/v5/proposals/queue/count?departmentId=<id>` → `{ count, departmentId }`. State `'proposed'` only. Tenant-scoped. New service fn `proposal.service.ts#getQueueCount`. Unit test asserts SQL shape.
- **D-06** LM-01 shared hook `useLmQueueCount(departmentId)` with `refetchInterval: 60_000`. Count rendered on `/line-manager` home AND suffixed into `persona-switcher.tsx` optgroup label (`"Linjechef — Per (3)"`).
- **D-07** LM-02 extend `lm-timeline-cell.tsx` to render stacked project sub-rows (already done via ag-grid expand/collapse; REQ is Playwright spec coverage).
- **D-08** RD-01 reuse `zoom-controls.tsx` + `useZoom.ts` + `TimelineGrid.zoom.test.tsx`. Three-button segmented `Månad | Kvartal | År`. Year mode handles 53-week 2026 via existing `iso-calendar.ts`.
- **D-09** RD-02 new `src/components/dialogs/overcommit-dialog.tsx` following `historic-edit-dialog.tsx` primitive pattern. Two sections: "Bidragande projekt" + "Mest överbokade personer". Data source: `/api/v5/capacity/breakdown`. Per-row `<Link>` affordance.
- **D-10** STAFF-01 add `readOnly?: boolean` prop to `TimelineGrid.tsx`. Default `false`. When `true`: no cell `onClick`, no hover edit affordances, no input fields, cells render as static `<div>` not `<button>`. `/staff/page.tsx` passes `readOnly={true}`.
- **D-11** SHARED-01 query-param URL: `?drawer=person-month&personId=<id>&month=<YYYY-MM>`. Drawer opens via `useSearchParams` + `useEffect`. ESC-dismiss strips params via `router.replace(pathname)`. Focus trap via existing `Drawer.tsx`.
- **D-12** ADMIN-01 toast with expandable `<details>` listing dependents. Extend existing toast renderer. `ConflictError.details[]` must expose dependent-row info — **verify in planning**.
- **D-13** Env-gated click-tracker via `NEXT_PUBLIC_E2E_CLICK_TRACKING === 'true'`. New `src/lib/testing/click-tracker.tsx` + `e2e/helpers/click-counter.ts`. `data-clicks="true"` attribute on primary journey affordances. `window.__clickCount` exposed.
- **D-14** One spec per journey ID under `e2e/{pm,line-manager,staff,rd,admin}/`. 11 files total (journeys 1A, 1B, 1C, 1D, 2A, 2B, 2C, 3A, 4A, 4B, 5B).
- **D-15** Single `uiV6PerJourney` flag atomically gates all 13 REQs. Follow Phase 51 `uiV6LeanTrim` pattern exactly.

### Claude's Discretion

- Exact wording of new i18n keys (Swedish/English) under `v5.pm.*`, `v5.lineManager.*`, `v5.rd.*`.
- Test file organization (one-per-journey is locked; subfolder structure is flexible).
- Whether to create `/api/v5/server-now` helper route or thread server-month through existing pm-home/lm-timeline API responses.
- Exact toast UI polish (border color, icon) for ADMIN-01 `<details>` expansion.
- Whether `PendingWishChip` uses a badge primitive from the existing design system or inline Tailwind classes.
- Order of implementation within Phase 52 (logical wave grouping).
- Click-tracker attribute value format (`"true"` vs numeric weight vs journey-id tag).

### Deferred Ideas (OUT OF SCOPE)

- **Counter-proposal flow UI** — still deferred from v5.0; `counter_proposed` state not included in LM-03 queue count.
- **Email/Slack notification channel** — in-app only; LM badge polling is the notification mechanism for v6.0.
- **WebSocket push for real-time counts** — deferred to post-v6.0 if 1-min polling proves insufficient.
- **Preference-based `defaultProjectId`** beyond `projects.length === 1` — fall-through logic (most-recent-activity, primary-project preference) is post-v6.0.
- **A11y NVDA/JAWS testing for grouped `<select>`** — Phase 52 runs `axe-core` zero-violations only (but see Environment Availability — axe is not yet installed).
- **Historic-edit dialog "don't ask again" preference** — explicitly rejected (always fires per edit for audit integrity).
- **Click-tracker data layer for analytics** — Phase 52 click-tracker is test-only (env-gated); production analytics is separate deferred work.
- **Notification bell persona-scoping** — Phase 53 POLISH-01.
- **`NavItemDef.visibleFor` top-nav filtering** — Phase 53 POLISH-02.
- **Dashboard quadrant redesign** — Phase 54 optional.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PM-01 | `/pm` auto-redirects to `/pm/projects/<defaultProjectId>` when exactly one project; project-cards grid otherwise | `PmOverviewResult.defaultProjectId` already exists (`planning.read.ts:32`); logic needs sharpening from `cards[0]?.project.id ?? null` → "exactly one project" rule; `useRouter().replace()` in client. |
| PM-02 | Top-bar pending-wishes chip deep-linking to `/pm/wishes?tab=rejected\|proposed` | New component `pending-wish-chip.tsx` mounted in `top-nav.tsx` (between bell and `<PersonaSwitcher />`); consumes existing `/api/v5/proposals?proposerId=<clerkUserId>` filtered client-side by `rejected` + `proposed` status. |
| PM-03 | Historic-edit warning dialog, 4 persona × period combos | `HistoricEditDialog` already imported in both `pm-timeline-cell.tsx:110` and `lm-timeline-cell.tsx:188`; `resolveEditGate` already emits `historic-warn-direct` / `historic-warn-proposal`. REQ collapses to **Playwright spec coverage**. |
| PM-04 | 4 proposal-state visual snapshots | Extend existing `src/components/timeline/__tests__/pm-timeline-cell.test.tsx` with 4 `toMatchSnapshot()` cases. `CellView.pendingProposal` already feeds `PmTimelineCell`. |
| LM-01 | `/line-manager` approval-queue badge + persona-switcher reflection | New `useLmQueueCount(departmentId)` hook consuming LM-03 endpoint; rendered in `/line-manager/page.tsx` and suffixed into `persona-switcher.tsx` optgroup label builder. |
| LM-02 | `/line-manager/timeline` project-breakdown cells | Already shipped via ag-grid flat-row master/detail (`line-manager-timeline-grid.tsx:163-186` builds per-project child rows on expand). REQ is **Playwright spec coverage**. |
| LM-03 | `/api/v5/proposals/queue/count/route.ts` + service fn + unit test | VERIFY-02 confirms no such endpoint exists. Net-new: route + `proposal.service.ts#getQueueCount(orgId, departmentId)` + unit test. |
| STAFF-01 | `readOnly` variant of timeline, cell edit disabled | Staff already uses `StaffTimelineCell` (read-only wrapper around `PlanVsActualCell` without `onCellEdit`). REQ asks for prop on **`TimelineGrid`** — ag-grid-based PM grid. Since `/staff` uses its own HTML `<table>`, the REQ's "readOnly prop on TimelineGrid" is a defensive add for when Staff/RD eventually use ag-grid, OR a Playwright spec verifying no edit affordances on `/staff`. |
| RD-01 | Long-horizon zoom, ISO 8601 + 53-week year | `timeline-columns.ts#buildTimelineColumns` already supports `['month','quarter','year']` via `iso-calendar.ts` (`rangeQuarters`, `rangeYears`, `getISOWeeksInYear`). ZoomControls already mounted at `rd/page.tsx:108`. REQ is **spec matrix coverage** for 2026 (53-week), 2027, 2028. |
| RD-02 | Red overcommit cell opens breakdown dialog | New `overcommit-dialog.tsx`. Data source: `/api/v5/capacity/breakdown` (exists; accepts `scope='department'` + `scopeId` + `monthKey`). Response shape `{ rows: BreakdownRow[] }` — must inspect to confirm it carries "contributing projects" AND "most-overbooked people". |
| SHARED-01 | Drill-down drawer deep-link + ESC-dismiss + focus trap | Deep-link is additive: `useSearchParams` + `useEffect` in `/pm/projects/[projectId]/page.tsx` and `/rd/page.tsx` calling `drawer.open()`. ESC-dismiss already shipped (`Drawer.tsx:33-40`). Focus trap — see Open Questions. |
| ADMIN-01 | `DEPENDENT_ROWS_EXIST` toast with dependent list | Banner already rendered on `RegisterTable` via `AdminRegisterPageShell.handleArchive`. REQ asks for "list" — **semantic gap**: current `blockers` is `Record<string, number>`, not per-row detail. See Open Questions Q1. |
| PJ-FLAG | All changes gated by `uiV6PerJourney` | Add `'uiV6PerJourney'` to `FLAG_NAMES` in `flag.types.ts:1-10`, `FeatureFlags` interface line 12-20, `FLAG_ROUTE_MAP` line 22-30 (as `[]` — flag does not gate routes, only behavior), `DEFAULT_FLAGS` in `flag.service.ts:10-18`, and `DEFAULT_FLAGS` in `flag.context.tsx:7-14`. |

<findings>

## Standard Stack (VERIFIED — already in use)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.1 | App Router routing, `useSearchParams`, `useRouter().replace()` | Shipped; all pages use it |
| `react` | 19.2.4 | `useEffect`, `useState`, Context | Shipped |
| `@tanstack/react-query` | ^5.95.2 | `useQuery` with `refetchInterval` for LM badge polling | Already used in every data-fetching page (pm-home, line-manager, rd, staff) |
| `sonner` | ^2.0.7 | Toast rendering; `toast()`, `toast.error()`, `toast.success()`, `toast.info()` | Already mounted in `src/app/(app)/layout.tsx:44` + `(platform)/layout.tsx:1`. Supports React-node content via `toast(element)`. |
| `ag-grid-community` + `ag-grid-react` | ^35.2.0 | PM + LM timeline grids (community edition; master/detail is enterprise-only) | Already used; LM uses flat-row expand/collapse hack per `line-manager-timeline-grid.tsx:3-33` because master/detail requires enterprise |
| `drizzle-orm` | ^0.45.1 | `proposal.service.ts#getQueueCount` SQL via drizzle | Every `*.service.ts` file uses it |
| `zod` | ^4.3.6 | Query param schema for `queue/count` route | All API routes use zod for request validation |
| `next-intl` | ^4.8.3 | All user-facing strings via `useTranslations('v5.*')` | Hard eslint rule; no literal JSX text allowed in v5 files |
| `@clerk/nextjs` | ^7.0.7 | `useAuth()`, `requireRole()`, org scoping for `queue/count` | Already the auth layer |
| `@playwright/test` | ^1.59.1 | All E2E specs | Already used; 12 existing specs in `e2e/` |
| `vitest` | ^2.1.9 | Snapshot tests (PM-04) | Already used; `toMatchSnapshot()` supported out of the box |
| `lucide-react` | ^1.7.0 | Icons (Bell, Plus, etc.) — for PendingWishChip | Already imported in top-nav |

### Missing / needs install

| Library | Needed for | Status |
|---------|-----------|--------|
| `@axe-core/playwright` | UI-RESTRUCTURE-PLAN-v2 §7 a11y zero-violations claim | **NOT installed** (grep found matches only in `.planning/` docs). Planning decision required: add as devDependency or explicitly defer a11y to Phase 53. |

**Version verification:** All versions above come from `package.json`; no `npm view` needed since packages are locked by the pnpm lockfile.

## REQ-by-REQ technical approach (with file:line anchors)

### PM-01 — `/pm` auto-redirect to default project

**Current state:**
- `src/features/planning/planning.read.ts:32` already declares `defaultProjectId: string | null` in `PmOverviewResult`.
- Same file line 109-112 already computes `defaultProjectId: cards[0]?.project.id ?? null`.
- `src/app/(app)/pm/page.tsx:40-44` already queries `['pm-home', personaId]` and receives the result but ignores `defaultProjectId`.
- `src/app/api/v5/planning/pm-home/route.ts` is a thin wrapper and does NOT need changes — the result already includes `defaultProjectId` via the read-model.

**Changes required:**
1. Sharpen the computation in `planning.read.ts:109` to match REQ wording exactly: `defaultProjectId = projects.length === 1 ? projects[0].id : null` (currently it always returns the first project ID which would auto-redirect even with 3 projects — WRONG per REQ).
2. In `src/app/(app)/pm/page.tsx` inside `PmHomeInner`, after `data` loads and before rendering the cards grid, add a `useEffect` that calls `router.replace(/pm/projects/${data.defaultProjectId})` when:
   - `uiV6PerJourney` flag is on,
   - `data.defaultProjectId !== null`.
3. Playwright spec 1A asserts: seed 1 PM project → visit `/pm` → expect URL to be `/pm/projects/<id>` AFTER hydration.

**Edge cases:**
- Empty state (`data.projects.length === 0`) — no redirect; renders existing "ingen projektdata" empty state (`pm/page.tsx:60-66`).
- Multiple projects — no redirect; renders cards grid (unchanged).
- Click count: the redirect doesn't consume a click, but it also doesn't render a clickable card. Playwright target = 2 clicks for journey 1A (project drill → cell drill).

### PM-02 — Pending-wish top-bar chip

**Mount point:** `src/components/layout/top-nav.tsx:144-174` (the right-side cluster). Insert `<PendingWishChip />` between `flags.alerts && <Link href="/alerts"><Bell /></Link>` (line 153-163) and `<PersonaSwitcher />` (line 172).

**Data source:** The chip needs `{ pending, rejected }` for the current PM persona. Options:
1. **Reuse `/api/v5/proposals?proposerId=<clerkUserId>&status=proposed,rejected`** — exists (`src/app/api/v5/proposals/route.ts:60-90`, returns `{ proposals: ProposalDTO[] }`), client-side count by status.
2. **New endpoint `/api/v5/proposals/my-counts`** — deferred; option 1 is sufficient.

Recommendation: option 1 with a new hook `src/features/proposals/use-pm-wish-counts.ts`:
```ts
useQuery({
  queryKey: ['pm-wish-counts', clerkUserId],
  queryFn: () => fetch(`/api/v5/proposals?proposerId=${clerkUserId}&status=proposed,rejected`).then(r => r.json()),
  select: (data) => ({
    pending: data.proposals.filter((p) => p.status === 'proposed').length,
    rejected: data.proposals.filter((p) => p.status === 'rejected').length,
  }),
  refetchInterval: 60_000,
  enabled: persona.kind === 'pm',
});
```

**Deep-link priority:** `rejected > 0 → /pm/wishes?tab=rejected`, else `pending > 0 → /pm/wishes?tab=proposed`. **Verify that `/pm/wishes` actually honors `?tab=...`.** Scan of `src/app/(app)/pm/wishes/page.tsx` shows it mounts `<MyWishesPanel proposerId={userId} />` — no tab param handling. **Either `MyWishesPanel` already reads tab from `useSearchParams`, or PM-02 must plumb it through.** See Open Questions Q4.

**Visibility rule:** Chip renders when `flag.uiV6PerJourney === true && persona.kind === 'pm' && (pending + rejected > 0)`.

### PM-03 — Historic-edit warning (4-combo Playwright)

**Already shipped:** `historic-edit-dialog.tsx` exists and is imported by both `pm-timeline-cell.tsx:20` and `lm-timeline-cell.tsx:20`. The `resolveEditGate` function in `src/features/proposals/edit-gate.ts` emits `historic-warn-direct` / `historic-warn-proposal` decisions that trigger the dialog. The `currentMonth` prop is threaded from each page's `getCurrentMonth()` (not yet server-sourced).

**Server month gap:** `currentMonth` currently comes from `getCurrentMonth()` (client-side, `src/lib/date-utils.ts`), NOT `getServerNowMonthKey()` (server, `src/lib/server/get-server-now-month-key.ts`). REQ wording in CONTEXT D-03 says "server month sourced from existing `src/lib/server/get-server-now-month-key.ts`" — **Phase 52 must thread server month through one of: `/api/v5/planning/pm-home` response, `/api/v5/planning/allocations` response, or a new `/api/v5/server-now` endpoint** (Claude's discretion per CONTEXT). Simplest: extend `PmOverviewResult` and `PmTimelineView` with `currentMonth: string` from `getServerNowMonthKey(tx)` called in each read-model. No schema change needed (it's already plumbed via `tx`).

**Playwright spec matrix (4 combos, in `e2e/pm/1d-historic-edit.spec.ts`):**
| # | Persona | Target month | Expect dialog? |
|---|---------|-------------|----------------|
| 1 | PM | 2025-11 (past) | YES |
| 2 | PM | 2026-05 (current/future) | NO |
| 3 | LM | 2025-11 (past, own dept) | YES |
| 4 | LM | 2026-05 (current/future) | NO |

For deterministic 4-combo testing, the spec must mock `NC_TEST_NOW` env var (the escape hatch at `get-server-now-month-key.ts:29-31`).

### PM-04 — Proposal-state visual snapshots

**Host file:** `src/components/timeline/__tests__/pm-timeline-cell.test.tsx` already exists (60+ lines verified). Add a new `describe('proposal states', () => { ... })` block with 4 `it()` blocks, each rendering `<PmTimelineCell cell={fixture} />` with a different `CellView.pendingProposal` payload and calling `expect(container).toMatchSnapshot()`.

**Fixtures per state:**
- `draft`: `pendingProposal: null`, `plannedHours: 40`
- `proposed`: `pendingProposal: { id: 'p1', proposedHours: 60, proposerId: 'user-x' }`, `plannedHours: 40` → assert dashed border + "Pending" badge + dual-value `40 | 60`
- `approved`: `pendingProposal: null`, `plannedHours: 60` (approved merges into planned)
- `rejected`: **Semantic gap** — a rejected proposal clears the pending marker and leaves `plannedHours` unchanged; the cell LOOKS identical to `draft`. REQ wording ("4 proposal-state visual snapshots: draft / proposed / approved / rejected") assumes a visible rejected state. See Open Questions Q2.

**Snapshot serializer:** Vitest uses the default snapshot serializer which captures the rendered HTML. No custom serializer needed.

### LM-01 — Approval-queue badge + persona-switcher reflection

**Two surfaces:**
1. `src/app/(app)/line-manager/page.tsx` — add a `<ApprovalQueueBadge count={count} />` next to or inside the heatmap header. Link target `/line-manager/approval-queue`.
2. `src/components/persona/persona-switcher.tsx:84-94` — extend `handleKindChange`'s label builder. Currently `const label = t(\`kind.${nextKind}\`)` produces `"Linjechef"`. For the LM kind, append ` (${count})` when count > 0. This requires the switcher to consume `useLmQueueCount` — but only when `persona.kind === 'line-manager'` AND `persona.departmentId !== ''`.

**Shared hook** `src/features/proposals/use-lm-queue-count.ts`:
```ts
export function useLmQueueCount(departmentId: string | null) {
  return useQuery({
    queryKey: ['lm-queue-count', departmentId],
    queryFn: () => fetch(`/api/v5/proposals/queue/count?departmentId=${departmentId}`).then((r) => r.json()),
    select: (data: { count: number }) => data.count,
    refetchInterval: 60_000,
    enabled: !!departmentId && persona.kind === 'line-manager', // defensive
  });
}
```

**Re-fetch on department switch:** When user switches LM department via `persona-switcher.tsx#handlePersonChange` (equivalent for LM kind — currently line 96-102 handles PM/Staff person changes; Phase 41 department-picker path needs the same treatment), the query key changes to `['lm-queue-count', newDeptId]` and TanStack auto-fetches.

### LM-02 — Project-breakdown cells

**Already shipped:** `src/components/timeline/line-manager-timeline-grid.tsx:149-186` builds a flat row array interleaving `person` parent rows with `project` child rows (only when the person is expanded). `src/components/timeline/lm-timeline-cell.tsx:39-64` renders the `LmPersonColumnCell` with disclosure triangles (lines 50-63). Month cell renderers at `lm-timeline-cell.tsx:92-103` render per-project hours read-only.

REQ is satisfied by the code; Phase 52 adds a Playwright spec `e2e/line-manager/2c-direct-edit.spec.ts` that:
1. Navigates to `/line-manager/timeline`.
2. Clicks the first person-row disclosure triangle (`data-testid="lm-expand-toggle-<personId>"`).
3. Asserts N project rows appear via `getByTestId(/lm-project-label-/)`.
4. Asserts `getByTestId(/lm-project-cell-.*2026-05/)` shows per-project hours.

### LM-03 — `/api/v5/proposals/queue/count` endpoint

**Net-new file tree:**
- `src/app/api/v5/proposals/queue/count/route.ts` — Next.js route handler
- `src/app/api/v5/proposals/queue/__tests__/count.test.ts` — unit test

**Service function** in `src/features/proposals/proposal.service.ts` (add method at the bottom):

```ts
export async function getQueueCount(orgId: string, departmentId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.allocationProposals)
    .innerJoin(schema.people, eq(schema.allocationProposals.personId, schema.people.id))
    .where(
      and(
        eq(schema.allocationProposals.organizationId, orgId),
        eq(schema.allocationProposals.status, 'proposed'),
        eq(schema.people.departmentId, departmentId),  // PROP-07: LIVE dept, not snapshot
      ),
    );
  return Number(row?.count ?? 0);
}
```

**Route handler** shape (mirror existing `src/app/api/v5/proposals/route.ts:60-90`):

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getQueueCount } from '@/features/proposals/proposal.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const Query = z.object({ departmentId: z.string().uuid() });

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const parsed = Query.parse(Object.fromEntries(request.nextUrl.searchParams));
    const count = await getQueueCount(orgId, parsed.departmentId);
    return NextResponse.json({ count, departmentId: parsed.departmentId }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Unit test** mirrors `src/app/api/v5/proposals/__tests__/routes.test.ts` (PGlite + mocked `requireRole`). Asserts:
- `{ count: 0, departmentId }` when no proposed rows.
- `{ count: 3, departmentId }` when 3 proposed rows in dept, 1 approved in dept (not counted), 2 proposed in OTHER dept (not counted).
- 400 when `departmentId` missing or malformed.
- 401/403 when `requireRole` rejects.
- Cross-tenant isolation: seed two orgs, assert caller only sees their own count.

### STAFF-01 — `readOnly` prop on TimelineGrid

**Current state:**
- `src/components/timeline/TimelineGrid.tsx` is PM-specific (ag-grid-based, editable; imports `PmTimelineCell` which wraps `PlanVsActualCell` with `onCellEdit`).
- `src/app/(app)/staff/page.tsx` does NOT use `TimelineGrid` — it renders its own HTML `<table>` (lines 149-198) using `StaffTimelineCell` (a read-only wrapper around `PlanVsActualCell` that omits `onCellEdit`).

**Interpretation of REQ:** `readOnly` already IS the Staff behavior via the cell-level wrapper pattern (VERIFY-09 finding: "grid container intentionally NOT shared per Phase 42 D-19"). REQ wording ("readOnly variant of the timeline component") can mean:
- **(A)** Add `readOnly?: boolean` to the PM `TimelineGrid` component per CONTEXT D-10 — defensive, enables future Staff/RD convergence, but /staff doesn't consume it today.
- **(B)** Playwright spec 3A verifies `/staff/page.tsx` has NO edit affordances (no `<input>`, no `<button aria-label*="edit">`, no hover pointer).

Recommendation: do **BOTH**. D-10 locks (A); (B) is the verification. The prop addition is small and forward-compatible. Spec 3A:
```ts
await expect(page.locator('input[type="number"]')).toHaveCount(0);
await expect(page.locator('[data-testid="plan-vs-actual-cell"][data-editable="true"]')).toHaveCount(0);
// Add `data-editable={editable ? 'true' : 'false'}` to PlanVsActualCell as part of STAFF-01.
```

### RD-01 — Long-horizon zoom, 53-week 2026

**Already shipped:**
- `src/components/timeline/zoom-controls.tsx` — 3-button segmented toggle with `LEVELS: ['month','quarter','year']` (line 22).
- `src/components/timeline/timeline-columns.ts:119-133` — `buildTimelineColumns(monthRange, zoom)` with `month` | `quarter` | `year` branches.
- `src/lib/time/iso-calendar.ts` — `rangeQuarters`, `rangeYears`, `getISOWeeksInYear(2026) === 53`, `isISO53WeekYear(2026) === true`, `yearKeyForMonth('2026-12')` uses ISO-year majority.
- `src/app/(app)/rd/page.tsx:108` — `<ZoomControls value={zoom} onChange={setZoom} />` already mounted in the header.

**What's missing:**
- RD page uses its own HTML `<table>` (not ag-grid / `TimelineGrid`); the `zoom` state changes, but the grid rendering at lines 204-237 iterates `monthRange` regardless of zoom. **Zoom aggregation is NOT currently applied to the /rd grid.** This is a real gap — the zoom state is set but the RD table doesn't aggregate months into quarters/years.

**Fix:** Extend `/rd/page.tsx` to call the existing `rangeQuarters(monthRange)` / `rangeYears(monthRange)` helpers from `iso-calendar.ts`, pick columns based on `zoom`, and aggregate cell data in the grid body (mirror the aggregation logic from `timeline-columns.ts#aggregateCellViews:31-58`).

Alternative: route `/rd` through `TimelineGrid.tsx` (the ag-grid-based PM grid with `readOnly={true}` — see STAFF-01). This would give `/rd` zoom aggregation for free AND satisfy STAFF-01's defensive prop. But /rd currently uses `PortfolioGridResult` (projects × months), not the PM `PmTimelineView` (people × months) — different shapes. So this would require a read-model refactor. Out of scope for Phase 52. **Recommendation: ship the HTML-table-level aggregation.**

**Playwright spec matrix** (`e2e/rd/4a-portfolio-overview.spec.ts`):
```ts
for (const year of ['2026', '2027', '2028']) {
  for (const level of ['month', 'quarter', 'year']) {
    test(`RD portfolio ${year} @ ${level}`, async ({ page }) => {
      process.env.NC_TEST_NOW = `${year}-01-15`;  // force clock
      await personaAs(page, 'rd');
      await page.goto('/rd');
      await page.getByTestId(`zoom-${level}`).click();
      // assert column count matches expected for year+level
      // 2026 year mode must show 53 ISO weeks when zoom='year'? NO — year mode shows 1 column per year.
    });
  }
}
```

**53-week year test** lives at the unit level (already exists per VERIFY finding). Playwright just needs to verify the year column header renders "2026" cleanly and that `iso-calendar.rangeYears(['2026-01'..'2026-12']) === ['2026']` (no year-spill into 2027 due to ISO Dec 2026 = week 53 of ISO 2026 per `iso-calendar.ts:219-225`).

### RD-02 — Overcommit breakdown dialog

**New component** `src/components/dialogs/overcommit-dialog.tsx` patterning after `historic-edit-dialog.tsx`. Uses the `hand-rolled <div role="dialog">` pattern (not `Drawer.tsx` since this is centered, not side-drawer — note `historic-edit-dialog.tsx:39-46` uses the same pattern).

**Data source:** `GET /api/v5/capacity/breakdown?scope=department&scopeId=<deptId>&monthKey=<YYYY-MM>` — existing endpoint, returns `{ rows: BreakdownRow[] }`. **Need to verify `BreakdownRow` shape supports both "contributing projects" AND "most-overbooked people".** The `capacity.types.ts` file was not read in full; see Open Questions Q3.

**Mount point:** `/rd/page.tsx`. The page already has an `overcommitOpen` state (line 67) and renders a placeholder `<div role="dialog">` (lines 159-182) — Phase 52 replaces that placeholder with the real `<OvercommitDialog />`. The dialog should open when user clicks a red (`data-state='over'`) `PlanVsActualCell` in the RD grid — currently the cell fires `onCellClick` which opens the `PlanVsActualDrawer` in `project-person-breakdown` mode. **Design tension:** RD-02 says red cell → overcommit dialog, but existing `/rd/page.tsx:78-93` says red cell → drawer.

**Resolution:** For red cells only (`data-state='over'`), open the OvercommitDialog instead of the drawer. For non-red cells, preserve existing drawer behavior. Either branch the `handleCellClick` logic based on `PlanVsActualCell.state`, or split the two dialogs by click target (cell vs. separate overcommit button in header).

### SHARED-01 — Drill-down drawer deep-link

**What works already:**
- ESC-dismiss: `src/components/drawer/PlanVsActualDrawer.tsx:136-143` and `Drawer.tsx:33-40` both bind `keydown → Escape → close()`.
- Drawer provider + store: `src/components/drawer/usePlanVsActualDrawer.tsx:46-63`.
- Focus trap: **partially shipped** — the drawer uses `role="dialog" aria-label={...}` (`PlanVsActualDrawer.tsx:167`) but there is no explicit focus-trap logic (no `focus-trap-react` dependency, no `.focus()` management). See Open Questions Q5.

**Deep-link wiring:**
In `/pm/projects/[projectId]/page.tsx` and `/rd/page.tsx` (the two surfaces per CONTEXT §specifics), add a `useEffect` at page-level:
```ts
const searchParams = useSearchParams();
useEffect(() => {
  if (searchParams.get('drawer') !== 'person-month') return;
  const personId = searchParams.get('personId');
  const month = searchParams.get('month');
  if (!personId || !month) return;
  drawer.open({
    mode: 'daily',
    personId,
    projectId,  // from useParams on PM; from rowId on RD
    monthKey: month,
    personName: '', projectName: '', monthLabel: month,  // labels filled by drawer on fetch
  });
}, [searchParams, drawer, projectId]);
```

**ESC strip-params:**
Extend `PlanVsActualDrawer.tsx` close handler to optionally strip the query params:
```ts
function handleClose() {
  store.close();
  const params = new URLSearchParams(searchParams.toString());
  params.delete('drawer');
  params.delete('personId');
  params.delete('month');
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
}
```

### ADMIN-01 — `DEPENDENT_ROWS_EXIST` toast with dependents

**Current state:**
- `src/components/admin/AdminRegisterPageShell.tsx:145-164` catches `DependentRowsError` and renders a **banner** (not a toast) via `<RegisterTable banner={...} />`.
- Banner text: `useBlockerFormatter` (same file, lines 42-60) produces e.g. `"Kan inte arkivera: 3 allokeringar, 1 förslag"`.
- `DependentRowsError.blockers` is `Record<string, number>` (kind-aggregated counts — `{ allocations: 3, proposals: 1 }`), NOT per-row detail.

**REQ-vs-shipped gap:** REQ ADMIN-01 says "toast with dependent list" (implying row-level data like "Sara / Juni 2026"). Current impl renders kind-counts in a banner, not a toast. CONTEXT D-12 specifies `<details>` block listing per-row info. **To ship D-12 as written**, backend `collectBlockers` (`src/features/admin/register.service.ts:454-559`) must be extended to include a sample of row identifiers. This is a backend extension, not a UI change. Example:
```ts
export type BlockerDetails = {
  counts: Record<string, number>;
  samples: Array<{ kind: string; label: string }>;  // first 5 per kind
};
```

**Alternative minimal path (if backend scope is too large):** Reinterpret REQ ADMIN-01 + D-12 as "toast with expandable count breakdown" — no row-level data, but grouped by kind. `<details>` block would show:
```
Kan inte arkivera: 4 beroenden
▶ Visa detaljer
  • 3 aktiva allokeringar
  • 1 väntande förslag
```

**Planning decision required.** See Open Questions Q1.

**Toast vs. banner:** REQ says "toast". Switching from banner → toast means:
1. Remove `banner` prop usage in `AdminRegisterPageShell.handleArchive`.
2. Call `toast.error(<ErrorContent />)` via sonner (already imported in `layout.tsx:3`).
3. Sonner's `toast()` accepts React nodes, so `<details>` works.

### PJ-FLAG — Single `uiV6PerJourney` flag

**Pattern (from Phase 51 `uiV6LeanTrim`):**
1. `src/features/flags/flag.types.ts:1-10` — add `'uiV6PerJourney'` to `FLAG_NAMES`.
2. Same file line 12-20 — add `uiV6PerJourney: boolean` to `FeatureFlags` interface.
3. Same file line 22-30 — add `uiV6PerJourney: []` to `FLAG_ROUTE_MAP` (no routes gated — only behavior).
4. `src/features/flags/flag.service.ts:10-18` — add `uiV6PerJourney: false` to `DEFAULT_FLAGS`.
5. `src/features/flags/flag.context.tsx:7-14` — add `uiV6PerJourney: false` to `DEFAULT_FLAGS`.
6. Every PM/LM/R&D/Staff/Admin behavior change reads `const { uiV6PerJourney } = useFlags();` and branches to preserve Phase 51 behavior when off.
7. Every Playwright spec begins with `test.skip(!uiV6PerJourney, 'flag off')` — or forces flag on via DB seed / env.

**Flag enable path (for testing):** The `getOrgFlags` service reads from the `featureFlags` table. E2E seed must insert `{ organization_id: <tenant>, flag_name: 'uiV6PerJourney', enabled: true }` before specs run. Or Playwright `playwright.config.ts` sets `NEXT_PUBLIC_UI_V6_PER_JOURNEY=true` as an env override and the flag service reads it as a fallback (NOT currently implemented — would need a small addition to `flag.service.ts`).

## Playwright spec organization

| Spec file (NEW) | Journey ID | Click-count target | Supersedes (existing) |
|----------------|-----------|---------------------|----------------------|
| `e2e/pm/1a-monday-checkin.spec.ts` | 1A | 2 clicks | `e2e/pm/monday-checkin.spec.ts` |
| `e2e/pm/1b-submit-wish.spec.ts` | 1B | 3 clicks | `e2e/pm/submit-wish.spec.ts` |
| `e2e/pm/1c-rejected-wish.spec.ts` | 1C | 2 clicks | `e2e/pm/rejected-resubmit.spec.ts` |
| `e2e/pm/1d-historic-edit.spec.ts` | 1D | 3 clicks | `e2e/pm/historic-edit.spec.ts` |
| `e2e/line-manager/2a-capacity-overview.spec.ts` | 2A | 1 click | `e2e/line-manager/heatmap.spec.ts` |
| `e2e/line-manager/2b-approve-reject.spec.ts` | 2B | 1 click | `e2e/line-manager/approve.spec.ts` + `reject.spec.ts` |
| `e2e/line-manager/2c-direct-edit.spec.ts` | 2C | — | `e2e/line-manager/direct-edit.spec.ts` |
| `e2e/staff/3a-check-schedule.spec.ts` | 3A | 0 clicks | `e2e/staff/read-only.spec.ts` |
| `e2e/rd/4a-portfolio-overview.spec.ts` | 4A | 0 clicks w/ zoom | `e2e/rd/portfolio.spec.ts` |
| `e2e/rd/4b-overcommit-drilldown.spec.ts` | 4B | 1 click | `e2e/rd/overcommit-drill.spec.ts` |
| `e2e/admin/5b-archive-dependent.spec.ts` | 5B | 2 clicks | — (NEW, no admin spec exists today) |

**Retirement question:** The 12 existing specs from Phase 47/49 were classified `update` by VERIFY-06 (all go to `/` which changes in Phase 50). Phase 52's new 11 specs supersede them with stricter click-count assertions. CONTEXT doesn't say "delete the old specs"; the safe move is to keep both — old specs as smoke tests, new specs as journey assertions. Alternative: Phase 52 replaces them. **Planner choice.**

## Click-tracker wiring

**Component** `src/lib/testing/click-tracker.tsx`:
```tsx
'use client';
import { useEffect, type ReactNode } from 'react';

export function ClickTrackerProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_CLICK_TRACKING !== 'true') return;
    (window as any).__clickCount = 0;
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-clicks="true"]')) {
        (window as any).__clickCount = ((window as any).__clickCount ?? 0) + 1;
      }
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return <>{children}</>;
}
```

**Mount:** Inside `src/app/(app)/layout.tsx`, wrap `<AppShell>` (at line 42) or place inside `QueryProvider`. Since the provider only does work when the env var is `'true'`, production overhead is zero.

**Spec helper** `e2e/helpers/click-counter.ts`:
```ts
export async function resetClickCount(page: Page) {
  await page.evaluate(() => { (window as any).__clickCount = 0; });
}
export async function getClickCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__clickCount ?? 0);
}
```

**Attribute annotation targets** (per journey):
- 1A: project card `<Link>` in `/pm/page.tsx` → `data-clicks="true"`; cell click in `/pm/projects/[projectId]/page.tsx` → cell already has `role='button'` — add attribute.
- 1B: Sara's cell → `data-clicks="true"`; type → 0 clicks (keyboard); Submit wish button → `data-clicks="true"`.
- 1C: rejected chip in top-bar → `data-clicks="true"` (opens deep link); rejected card in `/pm/wishes` → `data-clicks="true"` (opens edit).
- 1D: past cell click → `data-clicks="true"`; dialog confirm → `data-clicks="true"`; save confirm → `data-clicks="true"`.
- 2A: heatmap row → `data-clicks="true"` (0 if zero-click target is "see data on landing"; CONTEXT says 1 click for 2A).
- 2B: approval-queue badge → `data-clicks="true"`; Approve button → `data-clicks="true"`.
- 2C: expand triangle → `data-clicks="true"`; person cell → `data-clicks="true"`.
- 3A: no clicks targeted.
- 4A: no clicks targeted (zoom changes ARE clicks but scoped out).
- 4B: red cell → `data-clicks="true"`.
- 5B: Archive button → `data-clicks="true"`; Confirm dialog → `data-clicks="true"`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `next` | All routes | ✓ | 16.2.1 | — |
| `react` | All components | ✓ | 19.2.4 | — |
| `@tanstack/react-query` | LM-01 hook, PM-02 chip | ✓ | ^5.95.2 | — |
| `sonner` | ADMIN-01 toast | ✓ | ^2.0.7 | — |
| `ag-grid-community` | LM-02 existing impl | ✓ | ^35.2.0 | — |
| `drizzle-orm` | LM-03 service fn | ✓ | ^0.45.1 | — |
| `zod` | LM-03 query schema | ✓ | ^4.3.6 | — |
| `@playwright/test` | All 11 journey specs | ✓ | ^1.59.1 | — |
| `vitest` | PM-04 snapshots | ✓ | ^2.1.9 | — |
| `next-intl` | All user-facing strings | ✓ | ^4.8.3 | — |
| `@clerk/nextjs` | Auth on LM-03 route | ✓ | ^7.0.7 | — |
| `PGlite` (`@electric-sql/pglite`) | LM-03 unit test DB | ✓ | ^0.4.3 | — |
| `@axe-core/playwright` | UI-RESTRUCTURE-PLAN-v2 §7 a11y zero-violations | ✗ | — | Defer a11y to Phase 53, OR install as part of Phase 52 Wave 0 |
| `focus-trap-react` or equivalent | SHARED-01 explicit focus trap | ✗ | — | Use native `<dialog>` / manual `tabindex` + `.focus()` wiring. Browsers ship focus-trap for `<dialog>` natively in modern versions. See Open Q5. |

**Missing dependencies with no fallback:**
- None that fully block Phase 52. The axe gap downgrades scope of the a11y acceptance criterion; the focus-trap gap requires a design call.

**Missing dependencies with fallback:**
- `@axe-core/playwright` — can be added in a dedicated task or deferred.
- `focus-trap-react` — native `<dialog>` element trap is viable.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Unit framework | Vitest ^2.1.9 (jsdom env for React components) |
| Unit config file | `vitest.config.ts` (not read but assumed standard — tests pass `pnpm test` in existing phases) |
| E2E framework | Playwright ^1.59.1 |
| E2E config file | `e2e/playwright.config.ts` |
| Unit quick run | `pnpm test --run src/components/timeline/__tests__/pm-timeline-cell.test.tsx` |
| Unit full | `pnpm test` |
| E2E run | `pnpm test:e2e` |
| E2E file filter | `pnpm test:e2e e2e/pm/1a-*` |
| Contract test pattern | `*.contract.test.ts(x)` (numerous examples in `src/**/__tests__/`) |

### Phase Requirements → Test Map

| REQ ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PM-01 | Exactly-one-project redirects to `/pm/projects/<id>`; multi-project shows grid | E2E | `pnpm test:e2e e2e/pm/1a-monday-checkin.spec.ts` | ❌ Wave 6 |
| PM-01 | `defaultProjectId` computed correctly | unit (read-model) | `pnpm test --run src/features/planning/__tests__/planning.read.test.ts` | ❌ Wave 3 (extend existing) |
| PM-02 | Chip renders when `pending+rejected>0`, deep-links correctly | unit + E2E | `pnpm test` + `e2e/pm/1c-rejected-wish.spec.ts` | ❌ Wave 3 (unit), Wave 6 (E2E) |
| PM-03 | Dialog fires for past, silent for current/future | E2E (4-combo matrix) | `pnpm test:e2e e2e/pm/1d-historic-edit.spec.ts` | ❌ Wave 6 |
| PM-03 | `resolveEditGate` historic branch | unit (already shipped) | `pnpm test --run src/features/proposals/__tests__/edit-gate.test.ts` | ✅ existing |
| PM-04 | 4 proposal-state renders | unit (snapshot) | `pnpm test --run src/components/timeline/__tests__/pm-timeline-cell.test.tsx` | ❌ Wave 3 (extend existing) |
| LM-01 | Badge count renders on home + switcher | unit + E2E | `pnpm test` + `e2e/line-manager/2b-approve-reject.spec.ts` | ❌ Wave 4 (unit), Wave 6 (E2E) |
| LM-02 | Project-breakdown rows render on expand | E2E | `pnpm test:e2e e2e/line-manager/2c-direct-edit.spec.ts` | ❌ Wave 6 |
| LM-03 | `getQueueCount` returns correct count, tenant-scoped | unit (integration w/ PGlite) | `pnpm test --run src/app/api/v5/proposals/queue/__tests__/count.test.ts` | ❌ Wave 2 |
| LM-03 | Route handler shape | unit (API integration) | same file | ❌ Wave 2 |
| STAFF-01 | No edit affordances on `/staff` | E2E | `pnpm test:e2e e2e/staff/3a-check-schedule.spec.ts` | ❌ Wave 6 |
| STAFF-01 | `readOnly` prop propagates to cells | unit | `pnpm test --run src/components/timeline/__tests__/TimelineGrid.contract.test.tsx` | ❌ Wave 4 (extend existing) |
| RD-01 | Zoom toggle renders correct column count per year | E2E (matrix 2026×{month,quarter,year} + 2027 + 2028) | `pnpm test:e2e e2e/rd/4a-portfolio-overview.spec.ts` | ❌ Wave 6 |
| RD-01 | `getISOWeeksInYear(2026) === 53`, `rangeYears` ISO-majority | unit (already shipped) | `pnpm test --run src/lib/time/__tests__/iso-calendar.test.ts` | ✅ existing |
| RD-02 | Red cell opens OvercommitDialog with 2 sections + links | E2E | `pnpm test:e2e e2e/rd/4b-overcommit-drilldown.spec.ts` | ❌ Wave 6 |
| RD-02 | Dialog consumes `/api/v5/capacity/breakdown` correctly | unit | `pnpm test --run src/components/dialogs/__tests__/overcommit-dialog.test.tsx` | ❌ Wave 4 |
| SHARED-01 | `?drawer=person-month&...` opens drawer on mount | E2E (integrated into 1A + 4B) | `pnpm test:e2e e2e/pm/1a-*.spec.ts` + `e2e/rd/4b-*.spec.ts` | ❌ Wave 6 |
| SHARED-01 | ESC strips query params | E2E | same specs | ❌ Wave 6 |
| SHARED-01 | Focus trap (see Open Q5) | E2E a11y | `pnpm test:e2e e2e/pm/1a-*.spec.ts` (axe check) | ❌ Wave 6 (if axe installed) |
| ADMIN-01 | Archive with deps → toast w/ `<details>` | E2E | `pnpm test:e2e e2e/admin/5b-archive-dependent.spec.ts` | ❌ Wave 6 |
| ADMIN-01 | Handler catches `DependentRowsError` and surfaces to toast | unit | `pnpm test --run src/components/admin/__tests__/register-pages.test.tsx` (already tests banner — needs toast migration) | ⚠️ partial (banner path exists; must extend to toast path) |
| PJ-FLAG | Flag off = Phase 51 behavior preserved | E2E (flag-off variant) | `pnpm test:e2e --grep "flag-off"` | ❌ Wave 6 |

### Sampling Rate
- **Per task commit:** `pnpm test --run <impacted test files>` + `pnpm typecheck` + `pnpm lint`
- **Per wave merge:** `pnpm test` (all unit) + `pnpm test:e2e e2e/<persona>/*.spec.ts` for the persona touched
- **Phase gate:** `pnpm test` green + `pnpm test:e2e` green (all 11 journey specs including cross-journey invariants) before `/gsd-verify-work`

### Wave 0 Gaps (test infrastructure that must exist before specs run)

- [ ] `e2e/helpers/click-counter.ts` — shared `resetClickCount` / `getClickCount`
- [ ] `src/lib/testing/click-tracker.tsx` — provider + delegated listener
- [ ] `e2e/admin/` directory — does not exist today (VERIFY-06); must be created for spec 5B
- [ ] `playwright.config.ts` env override: `NEXT_PUBLIC_E2E_CLICK_TRACKING=true` added to `webServer.env`
- [ ] E2E seed extension (`e2e/lib/seed.ts`) — must insert `featureFlags` row with `uiV6PerJourney=true` for the test tenant so specs exercise flag-on path
- [ ] (Optional, a11y) `@axe-core/playwright` install + `axe.run(page)` helper in `e2e/helpers/a11y.ts`

## Cross-journey invariants (verified per wave merge)

1. **Click count never exceeds target** — via `getClickCount(page)` assertion at end of each spec.
2. **Axe zero-violations on each of 5 persona landings** — only if `@axe-core/playwright` is installed.
3. **ISO 8601 53-week math correct for 2026/2027/2028** — unit-level (already shipped); E2E spot-check that 2026 year column renders exactly once (not spilled to 2027).
4. **Focus trap on `Drawer` / `HistoricEditDialog` / `OvercommitDialog`** — spec tab-presses verify focus stays within dialog.
5. **Flag-off = Phase 51 behavior** — dedicated "flag-off" spec variant per REQ PJ-FLAG.

</findings>

<existing_patterns>

## Reusable Assets (DO consume; don't rebuild)

| Asset | Path | Consumed By |
|-------|------|-------------|
| `PlanVsActualCell` | `src/components/timeline/PlanVsActualCell.tsx` | PM-04 snapshots, STAFF-01 `data-editable`, RD-01 cells |
| `HistoricEditDialog` | `src/components/dialogs/historic-edit-dialog.tsx` | PM-03 (already wired into pm-/lm-timeline-cell) |
| `resolveEditGate` | `src/features/proposals/edit-gate.ts` | PM-03 (already wired) |
| `getServerNowMonthKey` | `src/lib/server/get-server-now-month-key.ts` | PM-03 server-month source |
| `getISOWeek` / `getISOWeeksInYear` / `isISO53WeekYear` / `rangeYears` / `rangeQuarters` / `yearKeyForMonth` / `quarterKeyForMonth` | `src/lib/time/iso-calendar.ts` | RD-01 zoom aggregation |
| `buildTimelineColumns(monthRange, zoom)` + `aggregateCellViews` | `src/components/timeline/timeline-columns.ts` | Reference implementation for RD-01 HTML-table aggregation |
| `ZoomControls` + `useZoom` | `src/components/timeline/zoom-controls.tsx`, `useZoom.ts` | Already mounted on `/rd` |
| `Drawer` (generic) | `src/components/drawer/Drawer.tsx` | Potentially wrap `OvercommitDialog` (RD-02) — but prefer `role="dialog"` centered pattern per historic-edit-dialog |
| `PlanVsActualDrawer` + `usePlanVsActualDrawer` + `PlanVsActualDrawerProvider` | `src/components/drawer/` | SHARED-01 deep-link base |
| `PersonaSwitcher` | `src/components/persona/persona-switcher.tsx` | LM-01 count-suffix on optgroup |
| `AdminRegisterPageShell` + `useBlockerFormatter` + `DependentRowsError` | `src/components/admin/AdminRegisterPageShell.tsx`, `src/hooks/use-admin-registers.ts` | ADMIN-01 foundation |
| `/api/v5/capacity/breakdown` | `src/app/api/v5/capacity/breakdown/route.ts` | RD-02 dialog data source |
| `PersonaGate` | `src/features/personas/persona-route-guard.ts` | All persona-scoped UI |
| `useFlags` hook + `FlagProvider` | `src/features/flags/flag.context.tsx` | All flag-gated reads |
| Sonner `Toaster` (top-right, richColors, closeButton) | Mounted at `src/app/(app)/layout.tsx:44` | ADMIN-01 toast surface |
| `personaAs` fixture | `e2e/fixtures/persona.ts` | All 11 journey specs |
| `test-base` auto-seeded fixture | `e2e/fixtures/test-base.ts` | All 11 journey specs |

## Established Patterns

- **Feature flag addition** — five-file change (types + service + context + DEFAULT_FLAGS × 2). Phase 51's `uiV6LeanTrim` is the canonical example.
- **TanStack Query polling** — `useQuery({ queryKey: [...], queryFn, refetchInterval: N_ms, enabled: bool })`. See `src/app/(app)/line-manager/page.tsx:54-58`.
- **Tenant-scoped SQL** — ALWAYS filter on `organizationId` first in every DB query. Drizzle pattern: `and(eq(schema.X.organizationId, orgId), eq(...))`.
- **Service-function boundary** — business logic in `*.service.ts` / `*.read.ts`; route handlers are thin wrappers per `§8.2` (architecture). LM-03 follows this exactly.
- **Hand-rolled dialog** — `<div role="dialog" fixed inset-0 bg-black/40>` + `useEffect` for keydown Escape. No shadcn/radix Dialog in the codebase. See `historic-edit-dialog.tsx`.
- **i18n discipline** — every JSX text literal is forbidden in v5-scoped files by eslint. Use `useTranslations('v5.<namespace>')` + `t('key')`. New keys go under the persona namespace (`v5.pm.pendingWishChip.*`, `v5.lineManager.approvalQueueBadge.*`, `v5.rd.overcommitDialog.*`).
- **Snapshot testing** — Vitest `toMatchSnapshot()` against `container` from `render()`. `.snap` files auto-generated in `__snapshots__/`.
- **E2E seed-per-test** — `test-base.ts` auto-fixture reseeds the DB before every test. No `beforeEach(seedDb)` needed in spec files.
- **Persona injection for E2E** — `await personaAs(page, 'pm')` before `page.goto('/')`. Sets localStorage key `nc:persona` via `addInitScript`.
- **Error response shape** — `{ error: { code, message, details? } }` from `AppError.toJSON()`. Client unwraps via `parseErrorBody` in `use-admin-registers.ts:58-83`.
- **Query-param URL sync** — `useSearchParams` + `router.replace(\`\${pathname}?\${new URLSearchParams(...)}\`, { scroll: false })`. Canonical in `useZoom.ts:73-87`.

## Integration Points (where new code gets mounted)

- `src/app/(app)/layout.tsx:42` — `<AppShell>` wrapper; `<ClickTrackerProvider>` goes outside (or inside `QueryProvider`).
- `src/components/layout/top-nav.tsx:144-174` — right-side cluster; `<PendingWishChip />` inserts between bell and `<PersonaSwitcher />`.
- `src/app/(app)/pm/page.tsx:32-66` — `PmHomeInner` gains `useEffect` reading `defaultProjectId` and calling `router.replace`.
- `src/app/(app)/pm/projects/[projectId]/page.tsx:53-107` — `PmProjectTimelinePageInner` gains `useEffect` reading drawer query params.
- `src/app/(app)/rd/page.tsx:61-185` — `RdPageInner` gains: (a) HTML-table-level zoom aggregation, (b) `?drawer=` deep-link effect, (c) overcommit-dialog swap on red-cell click.
- `src/app/(app)/staff/page.tsx` — no new mount; STAFF-01's `readOnly` prop is defensive future hook.
- `src/app/(app)/line-manager/page.tsx:43-87` — mount approval-queue badge in header.
- `src/components/persona/persona-switcher.tsx:86-95` — `handleKindChange` label builder gains count suffix when `nextKind === 'line-manager'`.
- `src/components/admin/AdminRegisterPageShell.tsx:145-164` — `handleArchive` switches from `setBanner` to `toast.error(<details>...</details>)`.
- `src/app/api/v5/planning/pm-home/route.ts:48` — `getPmOverview` call returns refined `defaultProjectId`.
- `src/features/planning/planning.read.ts:109-112` — `defaultProjectId: projects.length === 1 ? projects[0].id : null`.
- `src/features/proposals/proposal.service.ts` — append `getQueueCount(orgId, departmentId)`.

</existing_patterns>

<risks>

## Common Pitfalls

### Pitfall 1: Next.js `useSearchParams` requires `Suspense` boundary in Next 16
**What goes wrong:** SHARED-01's deep-link effect in a Client Component using `useSearchParams` without a `<Suspense>` wrapper can prerender-fail.
**Why it happens:** Next.js 15+ / 16 requires `useSearchParams` callers to be inside `<Suspense>` for static rendering.
**How to avoid:** Existing `useZoom.ts:63` already uses `useSearchParams` directly; the app has been using this pattern through Phase 42-51. Confirm there's no build warning in current dev logs; if there is, wrap the deep-link `useEffect` host in Suspense.
**Warning signs:** "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties" or prerendering warnings in build logs.

### Pitfall 2: `router.replace()` in `useEffect` on initial mount fires before data ready
**What goes wrong:** PM-01's redirect `useEffect([data])` fires on first render when `data` is still undefined → no redirect; then fires again when data arrives → redirects. If the user's URL changed between the two renders, the redirect can clobber their navigation.
**Why it happens:** React strict mode double-effect + TanStack Query load sequence.
**How to avoid:** Guard the effect with `if (!data?.defaultProjectId) return;`. Also guard with `if (pathname !== '/pm') return;` to avoid clobbering navigation away from /pm.
**Warning signs:** Back-button from `/pm/projects/<id>` lands briefly on `/pm` then bounces back.

### Pitfall 3: ag-grid flat-row expand/collapse state lost on re-render
**What goes wrong:** Adding new cell behaviors in `lm-timeline-cell.tsx` can accidentally trigger `useMemo` invalidation of `rowData`, collapsing all expanded rows.
**Why it happens:** `line-manager-timeline-grid.tsx:205-208` rebuilds `rowData` whenever `expanded` Set changes. If a new prop/dep is added to the `useMemo`, it over-invalidates.
**How to avoid:** Keep `rowData` dependencies minimal (`[view, departmentId, expanded]`). Do NOT add `currentMonth` or click handlers to the memo deps.
**Warning signs:** E2E spec 2C expand-click → assert child rows fails because rows collapsed between clicks.

### Pitfall 4: ISO 8601 year-majority mis-computation at Dec/Jan boundary
**What goes wrong:** RD-01 year mode shows "2027" column for December 2026 data if `yearKeyForMonth` uses calendar year instead of ISO-year majority.
**Why it happens:** 2026-12-28..31 is ISO week 53 of 2026 (NOT ISO week 1 of 2027). `iso-calendar.ts:241-260` handles this correctly via working-day majority count. But a naive client re-implementation (e.g. `monthKey.slice(0, 4)`) would break at year boundaries.
**How to avoid:** ALWAYS use `yearKeyForMonth` / `quarterKeyForMonth` from `iso-calendar.ts`. Never parse the year from a month key directly.
**Warning signs:** Spec `rd-portfolio 2026 @ year` shows 2 columns instead of 1; December data appears under 2027.

### Pitfall 5: Sonner toast with React node doesn't render `<details>` semantics on all browsers
**What goes wrong:** ADMIN-01's `<details>` expandable block inside a sonner toast may not render interactively in all browsers/zoom levels because sonner wraps content in a fixed-height container.
**Why it happens:** Sonner's default toast layout is optimized for one-line messages; long collapsible content pushes past the wrapper's overflow clip.
**How to avoid:** Test with sonner `toast.custom((t) => <CustomToast />, { duration: Infinity, dismissible: true })` — gives full control over the rendered node. Alternatively keep the banner pattern (`RegisterTable.banner`) which already renders `<details>`-compatible HTML.
**Warning signs:** `<details>` expand shows content truncated; toast disappears before user can read list.

### Pitfall 6: `getServerNowMonthKey` requires `tx` parameter — can't call from a read-model that doesn't start a transaction
**What goes wrong:** Threading server month through `/api/v5/planning/pm-home` response requires calling `getServerNowMonthKey(tx)`, but `getPmOverview` currently does `db.select(...)` directly (no `db.transaction(...)` wrapper).
**Why it happens:** Helper is designed for transaction-cached month key.
**How to avoid:** Wrap the read-model in a transaction even if it's read-only: `db.transaction(async (tx) => { const nowMonth = await getServerNowMonthKey(tx); ... }, { isolationLevel: 'read committed' })`. Alternatively add a new helper `getServerNowMonthKeyGlobal()` that uses `db.execute(sql\`SELECT to_char(CURRENT_DATE, 'YYYY-MM')\`)` without caching.
**Warning signs:** Runtime error `Cannot read property '__nowMonthKey' of undefined` when server-month is read outside a tx context.

### Pitfall 7: `ProposalStatus` enum has 5 values; queue count filter must be exact
**What goes wrong:** LM-03 `getQueueCount` uses `eq(allocationProposals.status, 'proposed')`. If spec allows `'proposed' | 'counter_proposed'` or lazy `!== 'approved'`, count is wrong.
**Why it happens:** CONTEXT.md D-05 is explicit: "state 'proposed' only — counter-proposals are pending PM action, not LM's queue". Valid enum values per `proposal.types.ts:4` are `proposed | approved | rejected | withdrawn | superseded` — there is NO `counter_proposed`. Plan mistakenly anticipates it.
**How to avoid:** Use `eq(status, 'proposed')` — single value. Do not use `inArray([...])`.
**Warning signs:** Count includes rows in `withdrawn` or `superseded` state.

### Pitfall 8: `persona-switcher.tsx` optgroup count re-renders every 60s
**What goes wrong:** LM-01's switcher suffix calls `useLmQueueCount` inside the switcher. The count refreshes every 60s, which causes the whole switcher to re-render every 60s (fine for React), but it also re-triggers any `useEffect` that depends on the switcher's rendered DOM.
**Why it happens:** `refetchInterval: 60_000` is a live query.
**How to avoid:** Accept the re-render (cheap). Don't place heavy side-effects on switcher mount.
**Warning signs:** Flaky E2E tests that `await page.getByRole('option')` race with the 60s refetch.

### Pitfall 9: Click-tracker delegated listener fires twice on nested `data-clicks` elements
**What goes wrong:** A `data-clicks="true"` button inside a `data-clicks="true"` card causes `event.target.closest('[data-clicks="true"]')` to match twice if the listener doesn't `stopPropagation`.
**Why it happens:** Event bubbles; `closest` matches at every level.
**How to avoid:** Only annotate the INNERMOST clickable element. Or track which element was matched and count only unique elements per bubble phase (use `useRef(new WeakSet())`).
**Warning signs:** `__clickCount === 4` for a journey that only clicked 2 times.

### Pitfall 10: `/api/v5/proposals?proposerId=<clerkUserId>&status=proposed,rejected` returns flat list — client must filter
**What goes wrong:** PM-02 chip's `useQuery` receives ALL of the PM's proposals in those two states. If the tenant has thousands, the response is bloated.
**Why it happens:** `proposal.service.ts#listProposals` has no `limit` clause (see `src/features/proposals/proposal.service.ts:154-164`).
**How to avoid:** For Phase 52, the count query is sufficient via client-side `.filter().length`. If performance is a concern, a future REQ can add a `/api/v5/proposals/my-counts` endpoint.
**Warning signs:** Slow page load for PMs with many historical proposals.

### Pitfall 11: Playwright `personaAs(page, 'line-manager')` sets kind but not `departmentId`
**What goes wrong:** `persona.ts:38-49` uses `extras` to inject extra fields into localStorage, but existing specs don't pass `departmentId`. LM specs therefore start with `persona.departmentId === ''` which means LM pages render the "Select a department" placeholder (VERIFY-03 confirms).
**Why it happens:** Phase 41 department picker not yet built (VERIFY-03 → Phase 49 scope).
**How to avoid:** For Phase 52 specs, pass `await personaAs(page, 'line-manager', { departmentId: '<seed-dept-id>' })`. The seed in `e2e/lib/seed.ts` must expose a deterministic department ID.
**Warning signs:** LM specs fail at "heatmap not visible" step with placeholder text visible.

### Pitfall 12: Flag gating via `useFlags()` doesn't work in server components
**What goes wrong:** If Phase 52 tries to gate server-rendered content (e.g. the pm-home route handler's `defaultProjectId`), `useFlags()` is a client hook and can't be called server-side.
**Why it happens:** Server / client component boundary.
**How to avoid:** For server-side flag checks use `getOrgFlags(orgId)` directly (imported from `flag.service.ts:24`). For client components use `useFlags()`.
**Warning signs:** Runtime error "useFlags must be used inside FlagProvider" on SSR pre-render.

</risks>

<validation_architecture>

See **Validation Architecture** section under `<findings>` above. Summary:

- **Unit** (Vitest): Service functions, read-model shape, component snapshots, hook behavior. Fast (<5s per file).
- **Contract** (Vitest, co-located): API route handlers with PGlite. Mid (<30s per file).
- **E2E** (Playwright): 11 journey specs with click-count assertions + flag-on/off parity. Slow (~2min for all 11 serial).
- **Snapshot** (Vitest, `.snap` files): PM-04's 4 proposal-state renders.
- **A11y** (Playwright + axe-core): ONLY if `@axe-core/playwright` is installed.

**Nyquist sampling:**
- Per-task commit runs only impacted test files.
- Per-wave merge runs full unit suite + persona-scoped E2E suite.
- Phase gate runs everything + cross-journey invariants.

</validation_architecture>

<open_questions>

## Q1: ADMIN-01 — row-level detail vs. kind-count breakdown

**Question:** Does `DependentRowsError.blockers` need per-row information (e.g. "Sara / Juni 2026 / 60h"), or is kind-aggregated count (e.g. "3 allocations") sufficient?

**What we know:**
- Current backend: `collectBlockers()` in `register.service.ts:454-559` returns `Record<string, number>` — kind-counts only.
- Current UI: `useBlockerFormatter` + `RegisterTable.banner` renders `"Kan inte arkivera: 3 allokeringar, 1 förslag"`.
- REQ ADMIN-01 wording: "toast listing dependents".
- CONTEXT D-12 example: "Allokering: Sara / Juni 2026 (60h planerat)" — implies row-level data.

**Resolution paths:**
- **(A) Row-level:** Backend extension to `collectBlockers` returning `{ counts, samples: Array<{ kind, label, detail }> }` (first N rows per kind). ~1 backend task + UI wiring.
- **(B) Kind-count breakdown (as shipped):** Reinterpret REQ as "toast listing dependent kinds + counts". UI-only change: migrate from banner to toast, wrap existing count string in `<details>`. ~0.5 UI task.

**Recommendation:** Ask the user in planning. Ship (A) if the demo value is high; ship (B) if time-boxed.

## Q2: PM-04 — `rejected` proposal state visual

**Question:** What does a `rejected` proposal state look like at the cell level? Today, rejection clears `pendingProposal`, so the cell renders identically to `draft` (no visible marker).

**What we know:**
- `CellView.pendingProposal` shape only includes `{ id, proposedHours, proposerId }` — no `status` field (see `planning.read.ts:127`).
- Rejection flow: `rejectProposal` in `proposal.service.ts:590-666` sets `status='rejected'`, but the cell's `pendingProposal` comes from `listProposals({status: 'proposed'})` — `rejected` rows are filtered out.
- REQ PM-04 asks for 4 distinct visual snapshots.

**Resolution paths:**
- **(A)** Extend `CellView.pendingProposal` to include `status`, and show a "Rejected" badge on the cell for some time window after rejection.
- **(B)** Interpret "rejected" as the state visible on the `MyWishesPanel` (a different component, not the cell). PM-04 snapshots then target `MyWishesPanel` instead of `PmTimelineCell`.
- **(C)** Consider the chip (PM-02) to be the rejected-state surface (it shows `rejected` count). PM-04 snapshots cover draft/proposed/approved at the cell level; rejected is out of PM-04 scope.

**Recommendation:** (C) is the cleanest — the chip is designed specifically to surface rejections. Planning can confirm.

## Q3: RD-02 — `/api/v5/capacity/breakdown` response shape

**Question:** Does `BreakdownRow[]` from `/api/v5/capacity/breakdown` include both "contributing projects" AND "most-overbooked people" when `scope='department'`?

**What we know:**
- Route: `src/app/api/v5/capacity/breakdown/route.ts:27-33` calls `getCapacityBreakdown({ orgId, scope, scopeId, monthKey })`.
- Service: `src/features/capacity/capacity.read.ts` (partially read; BreakdownRow type in `capacity.types.ts` was not read).
- CONTEXT D-09 asserts "Data from existing `/api/v5/capacity/breakdown` endpoint (scout confirmed exists)".

**Resolution paths:**
- **(A)** Endpoint returns one row shape that's projectable into both sections. Plan consumes the same endpoint twice with different projections.
- **(B)** Endpoint returns projects only; a second endpoint (or extension) is needed for people. RD-02 scope expands.

**Recommendation:** Planning phase should read `src/features/capacity/capacity.types.ts` (full type) + `getCapacityBreakdown` implementation to confirm. If mixed-scope or single-kind, plan the extension accordingly.

## Q4: PM-02 — `/pm/wishes?tab=rejected|proposed` — does `MyWishesPanel` read the tab query param?

**Question:** Current `/pm/wishes/page.tsx` mounts `<MyWishesPanel proposerId={userId} />` with no tab routing. Does `MyWishesPanel` internally read `useSearchParams().get('tab')`?

**What we know:**
- `src/features/proposals/ui/my-wishes-panel.tsx` was not read (not in glob).
- The chip deep-link target is `/pm/wishes?tab=rejected` or `/pm/wishes?tab=proposed`.
- If the panel doesn't honor `?tab=`, the deep-link lands on /pm/wishes but shows the default tab (whatever that is).

**Resolution paths:**
- **(A)** `MyWishesPanel` already reads `?tab=` → Phase 52 change is zero.
- **(B)** `MyWishesPanel` does NOT read `?tab=` → Phase 52 must extend it to honor the param + scroll to tab.

**Recommendation:** Planner reads `my-wishes-panel.tsx` during task decomposition. Low-risk either way.

## Q5: SHARED-01 — focus trap implementation

**Question:** Does Phase 52 ship a real focus trap, or rely on existing `role="dialog"` + `aria-label`?

**What we know:**
- No `focus-trap-react` or similar dep in `package.json`.
- `Drawer.tsx:52` uses `role="dialog" aria-label={...}` but no `tabindex` management or focus lock.
- Modern browsers ship native focus trap for `<dialog>` HTML element — but `Drawer` uses `<aside>`.
- REQ SHARED-01 explicitly requires "focus trap on open".

**Resolution paths:**
- **(A)** Migrate `Drawer` and `HistoricEditDialog` / `OvercommitDialog` to native `<dialog>` — gets focus trap for free. ~1 task per component.
- **(B)** Install `focus-trap-react` or write a small `useFocusTrap` hook (~30 lines). ~0.5 task.
- **(C)** Accept the current `role="dialog"` + aria-label as "trap enough" per screen-reader semantics; verify NVDA at a11y audit step. ~0 task.

**Recommendation:** (B) — small, self-contained, no component migration risk.

## Q6: Flag gating of API endpoints

**Question:** Should `/api/v5/proposals/queue/count/route.ts` (LM-03) itself be flag-gated (503 when flag off), or is it always available?

**What we know:**
- `FLAG_ROUTE_MAP` at `src/features/flags/flag.types.ts:22-30` only gates UI routes, not API routes.
- `FlagGuard` client component at `src/features/flags/flag-guard.tsx` blocks navigation, not API calls.
- If flag is off, nobody should call the endpoint — but a malicious caller could.

**Resolution paths:**
- **(A)** Endpoint is always live (backend-driven consistency). Client-side flag prevents UI from ever rendering the badge that calls it. Leaking the endpoint's existence is harmless (it returns a count; no PII).
- **(B)** Gate the endpoint with `const flags = await getOrgFlags(orgId); if (!flags.uiV6PerJourney) return 404`. Stronger but coupling.

**Recommendation:** (A) — Phase 51 `uiV6LeanTrim` pattern doesn't gate endpoints either. Consistency > strictness.

</open_questions>

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@axe-core/playwright` is the correct a11y testing dep for Phase 52 | Environment Availability | UI-RESTRUCTURE-PLAN-v2 §7 lists it by name; low risk |
| A2 | Sonner `toast()` accepts React nodes including `<details>` | Pitfall 5, ADMIN-01 | Verified by official sonner docs per training; low risk but Pitfall 5 captures it |
| A3 | `MyWishesPanel` can be extended to honor `?tab=` query param without major refactor | PM-02, Open Q4 | Medium — file not read in research; planner must verify |
| A4 | Backend `getCapacityBreakdown` at `scope='department'` returns enough detail to render RD-02's two sections | RD-02, Open Q3 | Medium — response shape not verified in research; planner must read `capacity.types.ts` |
| A5 | Extending `DependentRowsError.blockers` to include per-row samples is a single-file backend change | ADMIN-01, Open Q1 | Medium — may require schema introspection helpers; planner must prototype |
| A6 | `getServerNowMonthKey` can be called from within a read-only transaction wrapper in `getPmOverview` | Pitfall 6, PM-03 | Low — pattern is well-documented in the helper's header |
| A7 | E2E seed can insert `featureFlags` row to toggle `uiV6PerJourney=true` for test tenant | Validation, PJ-FLAG | Low — `flag.service.ts` reads from the table directly; seed path is standard |
| A8 | `ProposalStatus` enum does NOT include `counter_proposed` (confirmed by reading `proposal.types.ts:4`) | Pitfall 7, LM-03 | VERIFIED (not assumed) |
| A9 | `PmOverviewResult.defaultProjectId` field already exists and just needs semantic refinement | PM-01 | VERIFIED (read `planning.read.ts:30-33`) |
| A10 | `HistoricEditDialog` is already imported by both `pm-timeline-cell.tsx` and `lm-timeline-cell.tsx` | PM-03 | VERIFIED (read both files) |
| A11 | `timeline-columns.ts` already supports `['month','quarter','year']` via ISO-year-majority | RD-01 | VERIFIED (read file) |
| A12 | VERIFY-02's finding that `/api/v5/proposals/queue/count` doesn't exist is still accurate | LM-03 | VERIFIED (re-globbed; no such file) |

## Sources

### Primary (HIGH confidence — read in this session)
- `src/features/flags/flag.types.ts` — FLAG_NAMES, FeatureFlags, FLAG_ROUTE_MAP current state
- `src/features/flags/flag.service.ts` — DEFAULT_FLAGS + `getOrgFlags` fetch
- `src/features/flags/flag.context.tsx` — client-side DEFAULT_FLAGS + `FlagProvider`
- `src/features/flags/flag-guard.tsx` — route-gating logic (redirects to /input)
- `src/features/planning/planning.read.ts:1-150` — `PmOverviewResult` already has `defaultProjectId`
- `src/app/api/v5/planning/pm-home/route.ts` — thin delegation to `getPmOverview`
- `src/components/persona/persona-switcher.tsx` — PM/Staff 2-step, LM department-empty stub
- `src/components/timeline/timeline-grid.tsx` — PM ag-grid surface
- `src/components/timeline/zoom-controls.tsx` — already ships `['month','quarter','year']`
- `src/components/timeline/timeline-columns.ts` — `buildTimelineColumns` + `aggregateCellViews`
- `src/components/timeline/useZoom.ts` — URL-sync + localStorage hook
- `src/components/timeline/pm-timeline-cell.tsx` — already imports `HistoricEditDialog`
- `src/components/timeline/lm-timeline-cell.tsx` — already imports `HistoricEditDialog`; project-breakdown via flat-row expand
- `src/components/timeline/line-manager-timeline-grid.tsx` — flat-row master/detail hack
- `src/components/timeline/staff-timeline-cell.tsx` — read-only wrapper, no `onCellEdit`
- `src/components/timeline/rd-portfolio-cell.tsx` — read-only wrapper, `project-person-breakdown` drawer mode
- `src/components/timeline/PlanVsActualCell.tsx` — single source of cell rendering; state machine for no-actual/on-plan/under/over
- `src/components/dialogs/historic-edit-dialog.tsx` — hand-rolled `role="dialog"` pattern
- `src/components/drawer/Drawer.tsx` — generic drawer with ESC-close
- `src/components/drawer/PlanVsActualDrawer.tsx` — daily + project-person-breakdown modes
- `src/components/drawer/usePlanVsActualDrawer.tsx` — provider + store
- `src/lib/errors.ts` — `ConflictError`, `DependentRowsExistError`, `AppError.toJSON()`
- `src/lib/server/get-server-now-month-key.ts` — tx-based clock
- `src/lib/time/iso-calendar.ts` — full ISO + 53-week math (including `rangeYears`, `quarterKeyForMonth`, `getISOWeeksInYear`)
- `src/app/api/v5/capacity/breakdown/route.ts` — exists, accepts scope='department'
- `src/app/api/v5/proposals/route.ts` — POST create, GET list (with status filter)
- `src/features/proposals/proposal.service.ts` — full read; no `getQueueCount` yet
- `src/features/proposals/proposal.types.ts` — `ProposalStatus` enum (no `counter_proposed`)
- `src/features/proposals/proposal.read.ts` — impact preview (reference for service patterns)
- `src/app/(app)/pm/page.tsx` — PM home; consumes `PmOverviewResult` but ignores `defaultProjectId`
- `src/app/(app)/pm/projects/[projectId]/page.tsx` — drawer mounted; perfect host for SHARED-01 effect
- `src/app/(app)/pm/wishes/page.tsx` — thin wrap around `<MyWishesPanel>` (no tab handling visible)
- `src/app/(app)/rd/page.tsx` — zoom + drawer already, placeholder overcommit modal
- `src/app/(app)/staff/page.tsx` — HTML `<table>`, no `TimelineGrid`
- `src/app/(app)/admin/page.tsx` — ChangeLogFeed landing
- `src/app/(app)/admin/projects/page.tsx` — AdminRegisterPageShell<Project>
- `src/app/(app)/line-manager/page.tsx` — heatmap landing
- `src/app/(app)/line-manager/timeline/page.tsx` — group timeline with zoom
- `src/app/(app)/line-manager/approval-queue/page.tsx` — `<ApprovalQueue>` mount
- `src/app/(app)/layout.tsx` — FlagProvider, QueryProvider, PersonaProvider, PersonCardProvider, Sonner Toaster
- `src/components/layout/app-shell.tsx` — TopNav + SideNav
- `src/components/layout/top-nav.tsx` — persona switcher mount point; bell notification; NAV_ITEMS
- `src/components/admin/RegisterTable.tsx` — banner slot already renders `DEPENDENT_ROWS_EXIST` messages
- `src/components/admin/AdminRegisterPageShell.tsx` — `handleArchive` → `setBanner` on `DependentRowsError`
- `src/hooks/use-admin-registers.ts` — `DependentRowsError` type + `blockers: Record<string, number>`
- `src/features/capacity/capacity.read.ts:1-80` — classify, utilization read-model (breakdown shape not verified)
- `package.json` — versions + no `@axe-core/playwright`
- `e2e/playwright.config.ts` — webServer env
- `e2e/fixtures/persona.ts` + `test-base.ts` — spec fixtures
- `e2e/pm/historic-edit.spec.ts` + `monday-checkin.spec.ts` + `rd/overcommit-drill.spec.ts` + `line-manager/heatmap.spec.ts` — existing spec patterns

### Secondary (MEDIUM confidence — from project docs)
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §1, §2 Wave 3, §4, §7, §8 — design contract (read in full)
- `.planning/ui-reviews/UX-AUDIT-PERSONAS.md` — click-count targets (read in full)
- `.planning/v5.0-USER-JOURNEYS.md` — journey narratives (read in full)
- `.planning/pre-flight-report.md` — VERIFY-02 (`queue/count` missing), VERIFY-06 (12 specs classified update), VERIFY-09 (`PlanVsActualCell` shared, grid intentionally not shared)
- `.planning/REQUIREMENTS.md` lines 62-74 — 13 REQ definitions
- `.planning/ROADMAP.md` Phase 52 entry lines 388-401
- `.planning/STATE.md` — milestone context
- `.planning/phases/52-per-journey-friction-fixes/52-CONTEXT.md` — 15 locked decisions

### Tertiary (LOW confidence / not read in session)
- `src/features/proposals/ui/my-wishes-panel.tsx` — not read; tab query handling unknown (Open Q4)
- `src/features/capacity/capacity.types.ts` — not read; `BreakdownRow` shape for RD-02 unknown (Open Q3)
- `src/features/admin/register.service.ts` full file — only grep'd; `collectBlockers` shape confirmed but full extension effort unknown (Open Q1)
- `src/components/timeline/__tests__/pm-timeline-cell.test.tsx` — read first 60 lines; pattern for PM-04 extension confirmed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions + semantics verified against `package.json` and source files
- Architecture / integration points: HIGH — source files read with file:line anchors
- Reusable assets: HIGH — each asset's public API was read
- Runtime behavior of existing primitives (historic-edit, zoom, drawer): HIGH — wired-in paths traced from cell → page
- Backend extension feasibility (ADMIN-01 row-level samples): MEDIUM — blockers types confirmed, but full schema introspection effort not prototyped
- `/api/v5/capacity/breakdown` response detail: MEDIUM — route reads confirmed, service output shape not read
- Axe install + E2E flag-seed: MEDIUM — patterns well-established, specific commands not verified in this session

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stable mature codebase at Phase 52)

## RESEARCH COMPLETE
