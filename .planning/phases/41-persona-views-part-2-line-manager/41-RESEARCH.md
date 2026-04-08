# Phase 41: Persona views Part 2 — Line Manager — Research

**Researched:** 2026-04-08
**Domain:** v5.0 Line Manager persona shell — capacity heatmap, group timeline (expandable per-project rows), approval-queue impact-preview enrichment, change-log feed
**Confidence:** HIGH (in-repo verification of every reuse target; ag-grid edition risk verified against package.json)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (verbatim D-01 … D-21 from `41-CONTEXT.md`)

- **D-01 Routes:** create `src/app/(app)/line-manager/page.tsx` (Home), `…/timeline/page.tsx` (group timeline). `…/approval-queue/page.tsx` exists from Phase 39 — extend the mounted component, do NOT rewrite the page. `…/import-actuals/page.tsx` exists from Phase 38 — leave alone.
- **D-02 Change-log feed page:** `src/app/(app)/admin/change-log/page.tsx`. Persona-scoped default filters: PM→`proposerId`, LM→`departmentId`, Staff→`personId`, R&D/Admin→none. Filter bar lets user clear/override.
- **D-03 Persona route guard:** small client helper `assertPersonaOrRedirect(persona, allowed[])`; renders a "switch persona" hint card if mismatched. UX shortcut, NOT security boundary (ADR-004).
- **D-04 Capacity read module:** new file `src/features/capacity/capacity.read.ts` exporting `getPersonMonthUtilization({ orgId, departmentId?, monthRange })` and `getCapacityBreakdown({ orgId, scope, scopeId, monthKey })`.
- **D-05 v5 thresholds (NOT v4):** `absent` if absence-covered or `targetHours===0`; `over` if pct>100; `under` if pct<60; `ok` otherwise. UI may shade 60–90 vs 90–100 differently — enum stays 4 values.
- **D-06 targetHours:** read `people.target_hours_per_month`, fallback 160, flag fallback in entry.
- **D-07 plannedHours:** sums APPROVED `allocations` only (NOT proposals). Pending wishes do NOT color the LM heatmap.
- **D-08 Absence detection:** if no `absences` table exists, ship `status='absent'` only when `targetHours===0`; full vacation integration deferred.
- **D-09 Change-log read:** new file `src/features/change-log/change-log.read.ts` exporting `getFeed({ orgId, filter, pagination })`.
- **D-10 Cursor pagination:** `(created_at DESC, id DESC)`, default 50, max 200, Drizzle `lt()` on composite cursor.
- **D-11 Heatmap components:** new `src/components/capacity/{capacity-heatmap,capacity-heatmap-cell,capacity-heatmap-legend}.tsx`. Do NOT fork `src/components/heat-map/*`. Tailwind tokens: green-200/amber-200/red-300/neutral-200 (dark variants noted in CONTEXT).
- **D-12 Group timeline:** reuse Phase 40 `<TimelineGrid>` extended with a `scope='line-manager'` prop or thin wrapper. LM cell takes `direct` branch + renders an expand triangle for per-project breakdown rows. New helper `planning.read.getGroupTimeline({ orgId, departmentId, monthRange })`.
- **D-13 Impact preview:** Option A — server-computed via `getCapacityBreakdown` per card, cached per-proposal in TanStack Query. String template: `"${personName}'s ${monthLabel} utilization ${currentPct}% → ${projectedPct}%"`.
- **D-14 Change-log feed component:** new `src/components/change-log/change-log-feed.tsx`. Columns time/actor/entity/action/target/summary; each row expands to show `previousValue → newValue`. Filter bar above with multi-selects + period + advanced disclosure; URL-synced; persona-defaulted per D-02.
- **D-15 New API:** `GET /api/v5/capacity?departmentId&startMonth&endMonth` → `{ cells, people }`. 400 if range > 24 months.
- **D-16 New API:** `GET /api/v5/change-log?…&cursor&limit` → `{ entries, nextCursor }`. Empty params = no filter.
- **D-17 Extend existing API:** add `scope=line-manager&departmentId&startMonth&endMonth` branch to the EXISTING `src/app/api/v5/planning/allocations/route.ts` (Phase 40). Do not create a sibling.
- **D-18 i18n:** new keys under `v5.lineManager.*` and `v5.changeLog.*` in `sv.json` + `en.json` + `keys.ts`. Reuse `v5.proposals.*` for queue strings.
- **D-19 TanStack query keys:** `['line-manager-capacity', departmentId, monthRange]`, `['line-manager-group-timeline', departmentId, monthRange]`, `['approval-queue', departmentId]`, `['change-log', filterHash]`. Phase 40 invalidation hook already covers these prefixes.
- **D-20 Test mapping:** see Validation Architecture section below.
- **D-21:** TC-E2E-2A is the load-bearing gate.

### Claude's Discretion (CONTEXT.md)

- Exact ag-grid column shape for expandable per-project rows (see "ag-grid Master/Detail Risk" below).
- Whether impact preview is client- or server-computed (default: server, Option A — locked to D-13).
- Whether absence detection uses a new `absences` table (planner verified — none exists; ship D-08 fallback).
- Whether `<DesktopOnlyScreen>` exists or must be created (verified — does NOT exist; create thin component).
- Persona switcher department dropdown wiring.

### Deferred Ideas (OUT OF SCOPE)

- Counter-proposal flow (UX-V5-06 / REQUIREMENTS L99).
- Bulk approve/reject in queue.
- Full vacation/absence calendar integration.
- Mobile layouts for LM timeline + import (desktop-only via `<DesktopOnlyScreen>` interstitial).
- R&D cross-department capacity view (Phase 42+).
- Change-log feed full-text search.
- Notifications on approval queue events.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (REQUIREMENTS.md) | Research Support |
|----|-------------------------------|------------------|
| **UX-V5-04** | LM Home capacity heatmap with v5 thresholds | New `capacity.read.ts` + `/api/v5/capacity` + `src/components/capacity/*`. Schema column `people.target_hours_per_month` confirmed exists (`src/db/schema.ts:192`, default 160 NOT NULL). v4 `src/components/heat-map/*` is **not reusable** — different threshold semantics. |
| **UX-V5-05** | LM group timeline with project breakdown, direct edit, change log visible | Reuse Phase 40 `<TimelineGrid>` (`src/components/timeline/timeline-grid.tsx` — verified ag-grid wrapper, `getRowId`, `context`, `cellRenderer` pattern). LM cell = wrap `pm-timeline-cell` with `scope='line-manager'`. Direct-edit branch already enforced by `resolveEditGate`. New `planning.read.getGroupTimeline` needed. |
| **UX-V5-06** | Approval queue impact preview with `"X's June utilization 40% → 90%"`, approve/reject; counter-proposal absent | **CRITICAL FINDING:** impact preview is ALREADY wired in `approval-queue.tsx` via `useProposalImpact()` → `/api/v5/proposals/[id]/impact`. BUT the existing `ProposalImpactDTO` returns **hours** (`personMonthPlannedBefore/After: number`), and the current i18n template prints raw hours, not percentages. Phase 41 must extend the impact endpoint + DTO + i18n template to return **utilization percentages** computed via `getCapacityBreakdown`. |
| **UX-V5-10** | Change-log feed filterable by project/person/period/author with persona-scoped defaults | Schema verified: `change_log` table at `src/db/schema.ts:542` with columns `id, organizationId, actorPersonaId text, entity (enum), entityId uuid, action (enum), previousValue jsonb, newValue jsonb, context jsonb, createdAt`. Indexes already cover `(org, createdAt desc)`, `(org, entity, entityId)`, `(org, action, createdAt desc)`, `(actorPersonaId)`. Cursor pagination on `(createdAt, id)` is index-friendly. Read helper missing — must be created. |

</phase_requirements>

## Summary

Phase 41 sits on top of Phase 39 (proposal/approval workflow), Phase 40 (PM persona shell + `<TimelineGrid>` + edit-gate plumbing), and Phase 35 (change_log writer). Most primitives exist on disk, verified file-by-file. The phase reduces to **four new reads, three new routes, two new component sets, two enrichments of existing components, and one missing UX primitive**:

1. **NEW READ MODELS:** `features/capacity/capacity.read.ts` (does not exist), `features/change-log/change-log.read.ts` (does not exist — only `.service.ts`/`.schema.ts`/`.types.ts` exist), `features/planning/planning.read.getGroupTimeline` (additive helper next to `getPmTimeline`).
2. **NEW API ROUTES:** `GET /api/v5/capacity`, `GET /api/v5/change-log`, plus a `scope=line-manager` branch added IN-PLACE to the existing Phase 40 `src/app/api/v5/planning/allocations/route.ts`.
3. **NEW COMPONENT SETS:** `src/components/capacity/*` (heatmap), `src/components/change-log/change-log-feed.tsx`, `src/components/persona/desktop-only-screen.tsx` (does not exist).
4. **EXTEND EXISTING:** `<TimelineGrid>` to accept a `scope` + breakdown render-prop (least-invasive: a wrapper `LineManagerTimelineGrid` that injects an LM cell renderer which knows about expand state). `useProposalImpact` + `/api/v5/proposals/[id]/impact` to return utilization **percentages** (not just hours) so the existing `t('queue.impactPhrase', { before, after })` template can render `40% → 90%` per UX-V5-06 wording.
5. **NEW PAGES:** `/line-manager/page.tsx`, `/line-manager/timeline/page.tsx`, `/admin/change-log/page.tsx`.

The single largest planning risk is **ag-grid master/detail is Enterprise-only** — Phase 40 is on `ag-grid-community` `^35.2.0` (verified `package.json:43-44`), and the community edition does not include master/detail. CONTEXT.md D-12 says "default ag-grid master/detail" — this is wrong and must be replaced. The recommended free-tier alternative is **flat rows with synthetic per-project child rows interleaved**, controlled by a `getRowId` keyspace and an expand-state ref. Details in the dedicated section below.

The second largest finding is that **the impact preview is already shipped end-to-end in Phase 39** (`useProposalImpact` hook + `/api/v5/proposals/[id]/impact` endpoint + `WishCard.impactText` prop wired in `approval-queue.tsx` lines 86-96 + i18n template `v5.proposals.queue.impactPhrase`). However the template currently substitutes **hours**, not utilization percentages, and the `ProposalImpactDTO` (`use-proposals.ts:124-130`) only carries hours. Phase 41 must extend this DTO with `personMonthUtilizationBefore/After: number` (computed by `getCapacityBreakdown`) and update the impact endpoint + i18n key to render the percentages required by UX-V5-06.

**Primary recommendation:** Plan as five waves —
- **W0 (backend gap fill):** add `personMonthUtilization{Before,After}` to `ProposalImpactDTO` + `/api/v5/proposals/[id]/impact` server computation; if any of the `getCapacityBreakdown` dependencies require new shared types, land them first; create `<DesktopOnlyScreen>` primitive; add `scope=line-manager` branch to existing allocations route.
- **W1 (capacity read + API):** `capacity.read.ts` (with v5 thresholds, fallback target hours, no-absences-table fallback) + contract tests + `GET /api/v5/capacity` route.
- **W2 (change-log read + API):** `change-log.read.ts` + cursor pagination + `GET /api/v5/change-log` + contract tests.
- **W3 (UI):** `src/components/capacity/*` heatmap set + `change-log-feed.tsx` + LM home page + admin/change-log page + LM-scoped timeline wrapper + group timeline page; extend `useProposalImpact` and the wish-card template to use the new percentage fields.
- **W4 (i18n + e2e):** Swedish/English keys, persona route guard helper, persona switcher department dropdown wiring, TC-E2E-2A PGlite e2e, TC-MOBILE-001 desktop-only test, TC-NEG-013 guard test.

## Standard Stack

| Library | Version (verified) | Purpose | Notes |
|---------|--------------------|---------|-------|
| Next.js (App Router) | existing | Route shells `(app)/line-manager/*`, `(app)/admin/change-log` | Mirror Phase 40 `pm/page.tsx` shape |
| next-intl | ^4.8.3 | i18n via `useTranslations('v5.lineManager')`, `useTranslations('v5.changeLog')` | Single-file `sv.json` / `en.json` catalog with nested keys — same as Phase 40 |
| @tanstack/react-query | existing | LM home + timeline + change-log fetches | Provider mounted in `(app)/layout.tsx` |
| ag-grid-community / ag-grid-react | ^35.2.0 (community — verified `package.json:43-44`) | Group timeline grid | **Master/detail NOT available** — see risk section. Use flat rows with interleaved child rows. |
| Drizzle ORM (pglite for tests) | existing | `capacity.read`, `change-log.read`, `getGroupTimeline` | Pattern: `import { db } from '@/db'; import * as schema from '@/db/schema'`; mirror `actuals.read.ts` and `planning.read.ts` |
| Clerk (`@clerk/nextjs`) | existing | Tenant + actor identity in route handlers | Already used in `requireRole('planner')` in the Phase 40 allocations route |
| Sonner | existing | Save toasts on direct-edit cells | Already wired |

**No new dependencies required.** Critically: do **not** add `@tanstack/react-table` or `ag-grid-enterprise` or `react-aria-components` for the disclosure rows. Reuse the same ag-grid setup that Phase 40 already validated.

**Verified versions (probed `package.json`):**
- `ag-grid-community` ^35.2.0
- `ag-grid-react` ^35.2.0
- (No `@tanstack/react-table` present.)

## Architecture Patterns

### Recommended file layout

```
src/
├── app/
│   ├── (app)/
│   │   ├── line-manager/
│   │   │   ├── page.tsx                            # NEW: LM Home (capacity heatmap)
│   │   │   ├── timeline/page.tsx                   # NEW: group timeline
│   │   │   ├── approval-queue/page.tsx             # EXISTS (Phase 39) — untouched at page level
│   │   │   └── import-actuals/page.tsx             # EXISTS (Phase 38) — untouched
│   │   └── admin/change-log/page.tsx               # NEW: change log feed
│   └── api/v5/
│       ├── capacity/route.ts                       # NEW
│       ├── change-log/route.ts                     # NEW
│       ├── planning/allocations/route.ts           # MODIFY: add scope=line-manager branch (in place)
│       └── proposals/[id]/impact/route.ts          # MODIFY: enrich response with utilization %
├── features/
│   ├── capacity/
│   │   ├── capacity.read.ts                        # NEW
│   │   ├── capacity.types.ts                       # NEW (UtilizationMap, BreakdownRow, status enum)
│   │   └── __tests__/capacity.read.test.ts         # NEW (PGlite)
│   ├── change-log/
│   │   ├── change-log.read.ts                      # NEW (only file missing in this folder)
│   │   ├── change-log.service.ts                   # EXISTS (writer)
│   │   ├── change-log.schema.ts                    # EXISTS (re-export)
│   │   ├── change-log.types.ts                     # EXISTS — extend with FeedFilter / FeedEntry types
│   │   └── __tests__/change-log.read.test.ts       # NEW (PGlite, cursor pagination cases)
│   ├── planning/
│   │   ├── planning.read.ts                        # MODIFY: add getGroupTimeline
│   │   └── __tests__/group-timeline.test.ts        # NEW
│   ├── proposals/
│   │   ├── use-proposals.ts                        # MODIFY: extend ProposalImpactDTO with utilization %
│   │   └── ui/approval-queue.tsx                   # MODIFY: pass new fields to t('queue.impactPhrase')
│   └── personas/
│       ├── persona-switcher.tsx                    # MODIFY: real department dropdown for line-manager
│       └── persona-route-guard.ts                  # NEW: assertPersonaOrRedirect helper
├── components/
│   ├── capacity/
│   │   ├── capacity-heatmap.tsx                    # NEW
│   │   ├── capacity-heatmap-cell.tsx               # NEW
│   │   └── capacity-heatmap-legend.tsx             # NEW
│   ├── change-log/
│   │   └── change-log-feed.tsx                     # NEW
│   ├── persona/
│   │   └── desktop-only-screen.tsx                 # NEW (verified missing)
│   └── timeline/
│       ├── line-manager-timeline-grid.tsx         # NEW (wraps Phase 40 TimelineGrid + expand state)
│       └── lm-timeline-cell.tsx                    # NEW (extends pm-timeline-cell with expand triangle)
└── messages/
    ├── sv.json                                     # MODIFY: v5.lineManager.*, v5.changeLog.* keys
    ├── en.json                                     # MODIFY: same
    └── keys.ts                                     # MODIFY: catalog reference
```

### Pattern 1: Read helper next to feature (mirrors `actuals.read.ts`, `planning.read.ts`)
**What:** Pure async functions taking `orgId` first; return typed rows. No Express-shaped req/res.
**When:** `capacity.read.ts`, `change-log.read.ts`, `planning.read.getGroupTimeline`.

### Pattern 2: Thin route handler over read helper (mirrors `api/v5/planning/allocations/route.ts`)
**What:** `requireRole('planner')` → `zod.parse(searchParams)` → call read helper → `NextResponse.json` → `handleApiError`.
**When:** Both new routes.

### Pattern 3: ag-grid wrapper (mirrors Phase 40 `<TimelineGrid>`)
**What:** `ModuleRegistry.registerModules([AllCommunityModule])` once at module top, `getRowId`, `context` for callbacks, `components` map of cell renderers. Row data = pivot in `useMemo`.
**When:** Group timeline `<LineManagerTimelineGrid>`.

### Pattern 4: Cursor pagination on composite key
**What:** Store `(createdAt, id)` cursor as base64 JSON. Drizzle: `where(or(lt(createdAt, c0), and(eq(createdAt, c0), lt(id, c1))))`. Index `change_log_org_created_idx` already exists at `(organizationId, createdAt desc)`.
**When:** `change-log.read.getFeed`.

### Anti-Patterns to Avoid

- **Forking the v4 heat-map.** Different thresholds (>100/<50 v4 vs >100/<60 v5). Build new `src/components/capacity/*`.
- **Adding ag-grid-enterprise.** Master/detail is the only feature being asked for, and a flat-row alternative is cheaper than the licence.
- **Inventing a second proposal impact endpoint.** The existing `/api/v5/proposals/[id]/impact` is the right surface — extend it, don't sibling it.
- **Putting `<DesktopOnlyScreen>` inside a page.** Make it a layout-level wrap or a small client component used by both `/line-manager/timeline` and `/line-manager/import-actuals`.
- **Recomputing `targetHours` per cell.** Read it once per person, fan out across all months in the requested range.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Edit-gate decision (LM in own dept = direct) | New if/else | `resolveEditGate({ persona: { kind: 'line-manager', departmentId }, targetPerson, month, currentMonth })` from `src/features/proposals/edit-gate.ts` |
| Server "now" month | `new Date().toISOString().slice(0,7)` | `getServerNowMonthKey(tx)` |
| Month range generation | Hand-roll loop | `generateMonthRange(start, end)` from `src/lib/date-utils.ts` |
| Approved-allocations sum per (person, month) | New aggregate | Reuse `actuals.read.aggregateByMonth` shape — but for `allocations`, write a new helper inside `capacity.read.ts` mirroring its query shape |
| Change-log writes | Service call | `recordChange(…)` from `src/features/change-log/change-log.service.ts` (already used by `allocation.service.patchAllocation`) |
| Approval list, approve, reject | New mutations | `useListProposals`, `useApproveProposal`, `useRejectProposal`, `useProposalImpact` from `src/features/proposals/use-proposals.ts` |
| Reject reason modal | New dialog | `RejectModal` from `src/features/proposals/ui/reject-modal.tsx` |
| Cell debounce | New hook | Internal `useRef<setTimeout>` already inside `PlanVsActualCell` (600 ms) — reuse via `pm-timeline-cell` extension |
| Historic-edit dialog | New dialog | `HistoricEditDialog` from `src/components/dialogs/historic-edit-dialog.tsx` (Phase 40, persona-agnostic by design D-16) |
| Department list for switcher | New API | `GET /api/departments` already exists at `src/app/api/departments/route.ts` (returns `{ departments }`); call from persona-switcher |
| Heatmap visual layout (column headers) | New header logic | Mirror visual structure from `src/components/heat-map/heat-map-table.tsx` (do not import from it) |

## Common Pitfalls

### Pitfall 1: Persona stub `departmentId: ''`
**What:** Phase 40-03 SUMMARY documented that `line-manager` personas in the switcher ship with `departmentId: ''`. Phase 41 wires the real dropdown — but until that's done, the LM home will fetch with empty departmentId and 400.
**Avoid:** Wire the dropdown in W4 BEFORE running TC-E2E-2A. Add a defensive 400 check in `/api/v5/capacity` when `departmentId` is empty.

### Pitfall 2: Impact preview hours vs percentages
**What:** Existing `ProposalImpactDTO` exposes `personMonthPlannedBefore/After` in **hours**. UX-V5-06 / REQUIREMENTS L45 wording is **percentages** (`40% → 90%`). The current i18n key `v5.proposals.queue.impactPhrase` interpolates `{before, after}` — if planner "just renames" without adding the percent fields, the test will pass with `40 → 90` (no `%`) and fail acceptance.
**Avoid:** Extend the DTO with `utilizationBefore` / `utilizationAfter` numeric fields, update the endpoint to call `getCapacityBreakdown`, and update the i18n template to print the percent suffix.

### Pitfall 3: ag-grid master/detail does not exist in community
**What:** `package.json` shows `ag-grid-community ^35.2.0`. Master/detail is documented as `enableRowGroup`/`masterDetail` features which require `ag-grid-enterprise`. CONTEXT D-12 says "default ag-grid master/detail" — this is incorrect.
**Avoid:** See dedicated risk section below — use flat rows with interleaved synthetic per-project rows.

### Pitfall 4: Pending proposals in heatmap
**What:** D-07 says approved-only. If the planner naively joins `allocation_proposals` for "completeness", any unapproved PM wish will pre-redden the LM screen and the LM will approve based on a misleading heatmap.
**Avoid:** Strict `INNER JOIN allocations` on `approved` only. Tests must include a fixture with one pending and one approved allocation in the same person/month and assert the cell colour reflects only the approved value.

### Pitfall 5: Change-log cursor drift on equal timestamps
**What:** Multiple change-log rows can share `createdAt` (millisecond resolution + transactional inserts). Single-column cursor on `createdAt` skips rows with the same timestamp.
**Avoid:** Composite cursor `(createdAt, id)` per D-10. Test with a fixture that inserts ≥3 rows in the same `createdAt` and asserts the cursor visits all of them.

### Pitfall 6: Persona-scoped default filter applies BEFORE first fetch
**What:** If the change-log page mounts and fires the unfiltered query, then layers the persona default on top, the user sees a flash of 10000 rows.
**Avoid:** Compute defaults from `usePersona()` synchronously before the first `useQuery` call; the persona context provider is already mounted at layout level.

### Pitfall 7: `<TimelineGrid>` `getRowId` collisions with synthetic project rows
**What:** The Phase 40 grid uses `getRowId={(p) => p.data.personId}`. Per-project breakdown rows must have a different stable id namespace or ag-grid will deduplicate them.
**Avoid:** New row id keyspace `${personId}::${projectId}` for child rows; parent stays bare `personId`.

### Pitfall 8: `recordChange` schema columns
**What:** `change_log` does NOT have `project_id`, `person_id`, `period`, or `actor_name` columns. It has `entity` (enum), `entityId`, `actorPersonaId text`, plus `previousValue/newValue/context jsonb`. Filtering by project/person/period in `getFeed` requires JOINs and `context`/`newValue` JSONB introspection.
**Avoid:** Filter strategy:
  - `entity='project'` filter → trivial (`changeLog.entity = 'project'`)
  - filter by `projectId` → `changeLog.entityId = ?` when entity='allocation' or 'project' (allocations carry projectId in `context`/`newValue`); for cross-entity, planner must decide whether to JSON-extract from `context->>'projectId'` or to denormalize. **Recommendation:** ship Phase 41 with simpler filters first (entity, action, actorPersonaId, dateRange) and document the project/person filters as best-effort via `context->>` extraction. Verify with the planner whether richer filtering is gating UX-V5-10 acceptance.
  - filter by `personId` → same JSONB strategy
  - filter by period (date range) → `between(createdAt, from, to)` — straightforward

## Code Examples

### Capacity read v5 thresholds
```ts
// Source: derived from CONTEXT.md D-04..D-08; mirrors actuals.read.ts query shape
import { and, eq, gte, lte, sum } from 'drizzle-orm';
import * as schema from '@/db/schema';

export type CapacityStatus = 'under' | 'ok' | 'over' | 'absent';

export interface UtilizationCell {
  personId: string;
  monthKey: string;
  plannedHours: number;
  targetHours: number;
  targetIsDefault: boolean;
  utilizationPct: number;
  status: CapacityStatus;
}

function classify(planned: number, target: number): CapacityStatus {
  if (target === 0) return 'absent';
  const pct = (planned / target) * 100;
  if (pct > 100) return 'over';
  if (pct < 60) return 'under';
  return 'ok';
}
```

### LM cell renderer (extends pm-timeline-cell)
```tsx
// Source: derived from src/components/timeline/pm-timeline-cell.tsx (Phase 40)
// LM cell adds: (1) expand triangle, (2) per-project breakdown render-prop.
// Edit-gate routing is unchanged — resolveEditGate returns 'direct' for in-dept persons.
```

### Change-log feed cursor
```ts
// Source: schema columns verified at src/db/schema.ts:542
import { and, desc, eq, lt, or } from 'drizzle-orm';

export async function getFeed({ orgId, filter, pagination }: FeedArgs) {
  const { cursor, limit = 50 } = pagination;
  const c = cursor ? decodeCursor(cursor) : null;
  const where = and(
    eq(schema.changeLog.organizationId, orgId),
    c ? or(
      lt(schema.changeLog.createdAt, c.createdAt),
      and(eq(schema.changeLog.createdAt, c.createdAt), lt(schema.changeLog.id, c.id)),
    ) : undefined,
    // ... entity / action / actor / date filters
  );
  const rows = await db.select().from(schema.changeLog).where(where)
    .orderBy(desc(schema.changeLog.createdAt), desc(schema.changeLog.id))
    .limit(Math.min(limit, 200) + 1);
  const hasMore = rows.length > limit;
  const entries = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? encodeCursor(entries[entries.length - 1]) : null;
  return { entries, nextCursor };
}
```

## Open Questions Resolved

| # | Question | Answer | Source |
|---|----------|--------|--------|
| 1 | Does `people.target_hours_per_month` exist? | **YES.** `integer('target_hours_per_month').default(160).notNull()` | `src/db/schema.ts:192` |
| 2 | Does an `absences` / `vacations` table exist? | **NO.** Grep `(absence|absences|vacation)` returns only the `target_hours_per_month` matches. Ship the D-08 fallback (`status='absent'` when `targetHours===0`) and document the partial delivery in SUMMARY. | `src/db/schema.ts` (no matches) |
| 3 | Does `<DesktopOnlyScreen>` exist? | **NO.** Glob `src/components/**/desktop-only*` returns no files. Plan a minimal new component `src/components/persona/desktop-only-screen.tsx`: a `<div className="md:hidden">…</div>` interstitial with i18n message, mounted by `/line-manager/timeline/page.tsx` and `/line-manager/import-actuals/page.tsx` (revisit phase 38 page if Phase 41 is the first to enforce mobile blocking on it — confirm with Phase 38 SUMMARY). | Glob: no matches |
| 4 | Department list endpoint? | **EXISTS.** `GET /api/departments` at `src/app/api/departments/route.ts` returns `{ departments }` via `listDepartments(orgId)`. Use this from persona-switcher department dropdown. There is also `src/app/api/analytics/departments/route.ts` (analytics-scoped — do not use). | `src/app/api/departments/route.ts:8-15` |
| 5 | Approval queue + wish-card prop shapes? | **VERIFIED.** `ApprovalQueue({ departmentId })` calls `useListProposals({ status: 'proposed', departmentId })`, then for each proposal a `<QueueRow>` calls `useProposalImpact(p.id)` and renders `<WishCard proposal impactText onApprove onReject disabled />`. `WishCard.impactText` is a pre-formatted string. Phase 41 changes are: (a) update the impact text computation to print percentages, (b) update the i18n key, (c) NO structural changes needed. | `src/features/proposals/ui/approval-queue.tsx:28-107`, `wish-card.tsx:12-86` |
| 6 | `change_log` schema columns? | **VERIFIED.** `id, organizationId, actorPersonaId text, entity (enum), entityId uuid, action (enum), previousValue jsonb, newValue jsonb, context jsonb, createdAt`. Indexes: `(org, createdAt desc)`, `(org, entity, entityId)`, `(org, action, createdAt desc)`, `(actorPersonaId)`. **No columns for project/person/period — those must come from JSONB extraction or entity-specific JOINs.** See Pitfall 8. | `src/db/schema.ts:542-564` |
| 7 | Phase 40 allocations route shape for `scope=pm`? | **VERIFIED.** Single GET handler with `Query = z.object({ scope: z.literal('pm'), projectId, startMonth, endMonth })` then `getPmTimeline({ orgId, projectId, monthRange })`. To add line-manager: change `scope` to `z.union([z.literal('pm'), z.literal('line-manager')])` and discriminate on `parsed.scope` to call `getPmTimeline` vs `getGroupTimeline`. Different required params per scope — use `z.discriminatedUnion('scope', […])` for clarity. | `src/app/api/v5/planning/allocations/route.ts:1-39` |
| 8 | ag-grid master/detail in free tier? | **NO — Enterprise only.** `package.json` declares `ag-grid-community ^35.2.0` and `ag-grid-react ^35.2.0`; no enterprise dependency, no licence key. See "ag-grid Master/Detail Risk" section for the recommended free-tier alternative. | `package.json:43-44`, AG Grid docs (master/detail listed under Enterprise modules) |
| 9 | v4 heat-map layout pattern to mirror visually? | **EXISTS** at `src/components/heat-map/heat-map-table.tsx` — uses `formatMonthHeader` from `@/lib/date-utils` for column headers and a fixed left column for row labels. v5 heatmap copies the layout structure but uses different threshold colours and v5-scoped data types. Do NOT `import` from `src/features/analytics`. | `src/components/heat-map/heat-map-table.tsx` (visual reference only) |
| 10 | Did any partial impact-preview code land before Phase 41? | **YES — fully shipped in Phase 39.** `useProposalImpact()` hook + `/api/v5/proposals/[id]/impact` endpoint + `WishCard.impactText` + `t('queue.impactPhrase', { name, monthName, before, after })` template are all in place. **However the values are HOURS, not percentages.** Phase 41 must enrich (not invent) the impact preview. | `src/features/proposals/use-proposals.ts:124-192`, `approval-queue.tsx:86-96` |
| 11 | Is `listProposalsForApprovalQueue` already implemented? | **NOT under that name** — but the equivalent functionality ships via `useListProposals({ status: 'proposed', departmentId })` in `use-proposals.ts`, hitting `GET /api/v5/proposals?status=proposed&departmentId=…` (Phase 39). The ARCHITECTURE §1169 reference name is aspirational; the actual function is the existing list endpoint with department filter. No new helper required. | Grep: `listProposalsForApprovalQueue` matches only docs/CONTEXT files, not source code |
| 12 | Test harness recap? | **PGlite + vitest** for DB integration tests; **Vitest + RTL** for component tests; **Playwright** is NOT used in v5.0 phases (Phase 40 e2e is PGlite + vitest mirroring `proposal.service.e2e.test.ts`). Same harness as Phase 40. | Phase 40 RESEARCH §"Standard Stack" + 40-CONTEXT D-21 |

## Wave 0 Gaps

These backend / shared-primitive items must land BEFORE the UI waves can build. Pattern matches Phase 40's "Wave 0 backend gap" approach.

- [ ] **Impact DTO percentage fields** — extend `ProposalImpactDTO` (`src/features/proposals/use-proposals.ts:124`) with `utilizationBefore: number` and `utilizationAfter: number`. Update `/api/v5/proposals/[id]/impact/route.ts` to compute these via `getCapacityBreakdown` (which means `capacity.read.ts` from W1 must land first OR W0 ships a minimal `computeUtilizationPct(personId, monthKey)` helper that W1 later folds into `capacity.read`). **Recommended:** land the helper in W0 next to the impact route and refactor in W1.
- [ ] **i18n template wording** — add `v5.proposals.queue.impactPhrasePct` (or rename existing key with a migration) so the template renders `{name}'s {monthName} utilization {before}% → {after}%`. Coordinate with sv.json + en.json + keys.ts. UX-V5-06 acceptance depends on this exact wording.
- [ ] **`scope=line-manager` branch** in `src/app/api/v5/planning/allocations/route.ts` — refactor zod schema to `z.discriminatedUnion('scope', […])`. This unblocks W3 group timeline UI work.
- [ ] **`<DesktopOnlyScreen>` primitive** at `src/components/persona/desktop-only-screen.tsx` — ~30 LOC, used by `/line-manager/timeline` and the import-actuals route. Required by TC-MOBILE-001.
- [ ] **Persona-switcher department dropdown** — replace `departmentId: ''` stub with a real `useQuery(['departments'], …)` populated dropdown. Required for TC-E2E-2A (Per switches to LM persona → lands on `/line-manager` → heatmap renders for a real department).
- [ ] **Persona route guard helper** `src/features/personas/persona-route-guard.ts` exporting `assertPersonaOrRedirect(persona, allowed[])` (D-03). Required by TC-NEG-013.

*If no gaps were found, this section would say "None — backend already supports phase 41". It does not.*

## ag-grid Master/Detail Risk

**Status:** **HIGH RISK — CONTEXT.md D-12 default is wrong.**

**The problem.** CONTEXT.md D-12 says:
> "extend Phase 40 `<TimelineGrid>` with expandable per-project child rows (default ag-grid master/detail)"

But `package.json` shows `ag-grid-community ^35.2.0` (verified `package.json:43-44`). **Master/detail is an Enterprise feature** in AG Grid v35 — requires `ag-grid-enterprise`, a licence key, and the `MasterDetailModule` import. None of these exist in the codebase. Naively writing `<AgGridReact masterDetail={true} detailCellRenderer={…} />` will silently fail (the `masterDetail` prop is ignored by community builds, and AG Grid logs a console warning at registration time).

**Why this matters.** UX-V5-05 acceptance requires per-project breakdown rows under each person row in the group timeline. Without master/detail (or a workable substitute), the entire group-timeline success criterion fails.

**Recommended free-tier alternative — flat rows with interleaved synthetic child rows + expand state.**

**Approach:**
1. **Row data is flattened.** The pivot in `<LineManagerTimelineGrid>` produces an array where each `personRow` is followed (when expanded) by N `projectChildRow` entries. A discriminator field `kind: 'person' | 'project-child'` lives on each row.
2. **Stable IDs in two namespaces.** `getRowId={(p) => p.data.kind === 'person' ? p.data.personId : `${p.data.personId}::${p.data.projectId}` }` — avoids the Pitfall 7 collision.
3. **Expand state lives in a `useState<Set<string>>(expandedPersonIds)`** in the parent grid wrapper. Toggling an id rebuilds `rowData` via a `useMemo` that filters interleaved child rows by membership. No grid-level event subscriptions required.
4. **Visual expand triangle** lives inside the LM cell renderer's row label cell (the leftmost `personName` column gets a custom renderer with a `<button>` that toggles the parent's `Set`).
5. **Indentation** of child rows is purely a CSS class on the renderer keyed by `kind`.
6. **Edit semantics** — child rows are read-only display of per-project hours per month; the editable surface remains the parent person row (which sums across projects). If UX requires editing a single project's hours, the cell renderer routes through `resolveEditGate` with the same logic, just scoped to a `(personId, projectId, monthKey)` allocation row.

**Why this works in community ag-grid:**
- Flat row arrays + dynamic `rowData` is a first-class AG Grid feature.
- `getRowId` is community.
- Custom cell renderers are community.
- No grouping/master/detail/tree-data Enterprise modules required.

**Why this is acceptable UX:**
- The visual outcome (a person row with expand triangle revealing project sub-rows) is identical to AG Grid's native master/detail.
- The "detail grid" pattern (a separate inner grid) would actually be **worse** here because the project breakdown columns (months) must align with the parent's columns.
- The only feature this approach loses is the AG Grid built-in animation; the planner can add a CSS transition manually.

**Alternative considered (rejected):** TanStack Table tree mode with `row.getCanExpand()`. Would require introducing a second grid library — violates the Phase 40 anti-pattern "no second grid library" and forces re-implementing the cell-renderer integration the codebase already validated.

**Alternative considered (rejected):** Render a `<details>` HTML disclosure under each row. Breaks the column-aligned grid layout that makes the timeline scannable.

**Action required:** Planner must update the W3 task description to reflect this approach and override CONTEXT.md D-12's "ag-grid master/detail" default. This is the single biggest delta from CONTEXT.md and should be flagged in the plan introduction.

## State of the Art

| Old Approach | Current Approach (Phase 41) | When Changed | Impact |
|--------------|------------------------------|--------------|--------|
| v4 heat-map thresholds (>100 / <50) | v5 heat-map thresholds (>100 / <60) | Phase 41 design | New `src/components/capacity/*` set; do NOT reuse v4 |
| Impact preview shows hours | Impact preview shows utilization percentages | Phase 41 W0 | Extends `ProposalImpactDTO` + i18n template |
| ag-grid master/detail (CONTEXT default) | Flat rows + interleaved child rows | This research | Replaces locked default; planner must call out |
| Change-log writer only (Phase 35) | Change-log writer + reader (Phase 41) | This phase | New `change-log.read.ts` |

## Open Questions

1. **Does the change-log feed need project/person filtering by Phase 41 ship date?** The feed schema does not natively support this — requires JSONB extraction. UX-V5-10 says "filterable by project/person/period/author" — strict reading suggests yes. Recommendation: ship the simpler filters (entity, action, actor, period) first and add JSONB-based project/person filters in a follow-up task or W3 stretch. Surface to user before planning.
2. **Should `<DesktopOnlyScreen>` retroactively wrap `/line-manager/import-actuals/`?** Phase 38 may not have shipped a mobile blocker for that page. TC-MOBILE-001 needs to clarify scope.
3. **Persona-switcher department dropdown — single global LM persona or per-department?** ARCHITECTURE §229 says one LM per department. Implication: each department should have its own LM persona instance, OR the single `line-manager` persona's `departmentId` is mutable. Recommendation: keep one mutable persona; the switcher exposes a department picker that swaps the in-memory `departmentId`. Confirm during planning.

## Environment Availability

> Skipped — Phase 41 is purely code/config (read helpers, API routes, components) inside the existing Next.js + Drizzle + ag-grid stack. No new external services or runtimes required. PGlite + vitest already in use.

## Validation Architecture

> Nyquist sampling enabled (workflow.nyquist_validation key absent → enabled per template).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + RTL + PGlite (same as Phase 40 — verified by `proposal.service.e2e.test.ts` pattern) |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `npx vitest run --reporter=basic <pattern>` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| **UX-V5-04** | v5 threshold classification (under/ok/over/absent boundaries) | unit (PGlite) | `npx vitest run src/features/capacity/__tests__/capacity.read.test.ts` | ❌ Wave 1 (NEW) |
| **UX-V5-04** | LM Home heatmap renders cells with correct colour per status | component (RTL) | `npx vitest run src/components/capacity/__tests__/capacity-heatmap.test.tsx` | ❌ Wave 3 (NEW) |
| **UX-V5-04** | `GET /api/v5/capacity` contract — happy path + 400 on >24 month range + missing departmentId | integration (PGlite) | `npx vitest run src/app/api/v5/capacity/__tests__/capacity.contract.test.ts` | ❌ Wave 1 (NEW) |
| **UX-V5-05** | `getGroupTimeline` returns per-project breakdown for in-dept persons | integration (PGlite) | `npx vitest run src/features/planning/__tests__/group-timeline.test.ts` | ❌ Wave 3 (NEW) |
| **UX-V5-05** | LM cell direct-edit branch on in-dept person; PATCH succeeds without proposal | integration | `npx vitest run src/features/proposals/__tests__/edit-gate.line-manager.test.ts` | ❌ Wave 3 (NEW) |
| **UX-V5-05** | LM cell expand triangle reveals child rows (no master/detail) | component | `npx vitest run src/components/timeline/__tests__/line-manager-timeline-grid.test.tsx` | ❌ Wave 3 (NEW) |
| **UX-V5-06** | Approval queue impact preview text matches `"X's June utilization 40% → 90%"` | component + contract | `npx vitest run src/features/proposals/__tests__/approval-queue.impact.test.tsx` | ❌ Wave 0 (extend existing approval-queue test) |
| **UX-V5-06** | Approve writes through; reject requires reason; **counter-proposal absent** | integration | `npx vitest run src/features/proposals/__tests__/approval-queue.test.tsx` | ✅ EXISTS — extend |
| **UX-V5-10** | `change-log.read.getFeed` cursor pagination, equal-timestamp safety, persona defaults | integration (PGlite) | `npx vitest run src/features/change-log/__tests__/change-log.read.test.ts` | ❌ Wave 2 (NEW) |
| **UX-V5-10** | `GET /api/v5/change-log` contract — filter combinations, cursor round-trip | integration | `npx vitest run src/app/api/v5/change-log/__tests__/change-log.contract.test.ts` | ❌ Wave 2 (NEW) |
| **UX-V5-10** | Change-log feed UI applies persona-scoped default before first fetch | component | `npx vitest run src/components/change-log/__tests__/change-log-feed.test.tsx` | ❌ Wave 3 (NEW) |
| **TC-E2E-2A** | Per switches → `/line-manager` → heatmap renders → approval queue count visible | e2e (PGlite + RTL) | `npx vitest run src/features/planning/__tests__/line-manager.e2e.test.ts` | ❌ Wave 4 (NEW) |
| **TC-MOBILE-001** | `<DesktopOnlyScreen>` interstitial shown <768px on `/line-manager/timeline` | component | `npx vitest run src/components/persona/__tests__/desktop-only-screen.test.tsx` | ❌ Wave 0 (NEW) |
| **TC-NEG-013** | PM persona accessing `/line-manager/*` sees switch-persona hint, not the page | component | `npx vitest run src/features/personas/__tests__/persona-route-guard.test.ts` | ❌ Wave 0 (NEW) |
| **TC-CL-*** | change_log invariants (writer side already covered Phase 35) — Phase 41 adds reader-side coverage only | integration | `npx vitest run src/features/change-log/__tests__/change-log.read.test.ts` | shared with UX-V5-10 above |

### Sampling Rate
- **Per task commit:** quick run of the file under edit + sibling files (`npx vitest run <changed file>`)
- **Per wave merge:** wave-scoped run (`npx vitest run src/features/capacity src/app/api/v5/capacity` etc.)
- **Phase gate:** `npx vitest run` full suite green before `/gsd:verify-work`
- **Load-bearing gate:** TC-E2E-2A must pass (per CONTEXT D-21)

### Wave 0 Gaps (test infrastructure)

- [ ] `src/features/proposals/__tests__/approval-queue.impact.test.tsx` — assert `40% → 90%` wording (extends existing approval-queue.test)
- [ ] `src/components/persona/__tests__/desktop-only-screen.test.tsx` — interstitial component test
- [ ] `src/features/personas/__tests__/persona-route-guard.test.ts` — guard helper test
- (Other test files listed above land in their respective waves; none need new framework setup — vitest + PGlite + RTL already configured for Phase 40.)

## Sources

### Primary (HIGH confidence — in-repo verification)
- `src/db/schema.ts` lines 180-207 (people.target_hours_per_month), 542-564 (change_log columns + indexes), 63-89 (change_log enums)
- `src/app/api/v5/planning/allocations/route.ts` (Phase 40 GET shape)
- `src/app/api/departments/route.ts` (department list endpoint)
- `src/features/proposals/ui/approval-queue.tsx` (current impact wiring)
- `src/features/proposals/ui/wish-card.tsx` (impactText prop)
- `src/features/proposals/use-proposals.ts` lines 124-192 (`ProposalImpactDTO`, `useProposalImpact`)
- `src/features/personas/persona.types.ts` (persona discriminated union)
- `src/components/timeline/timeline-grid.tsx` (Phase 40 ag-grid wrapper pattern)
- `package.json` lines 43-44 (`ag-grid-community ^35.2.0`)
- `.planning/REQUIREMENTS.md` lines 40-65, 99 (UX-V5-04..10, counter-proposal deferred)
- `.planning/ROADMAP.md` lines 181-191 (Phase 41 success criteria + test codes)
- `.planning/phases/40-persona-views-part-1-pm/40-RESEARCH.md` (reuse map, ag-grid setup confirmation)
- `.planning/phases/40-persona-views-part-1-pm/40-CONTEXT.md` (`<TimelineGrid>` and `resolveEditGate` decisions)
- `.planning/phases/41-persona-views-part-2-line-manager/41-CONTEXT.md` (locked decisions D-01..D-21)

### Secondary (MEDIUM — single-source / docs not re-fetched)
- AG Grid documentation that master/detail is Enterprise (training-data — not re-verified against current ag-grid docs; HIGH-confidence reasoning because the codebase has no `ag-grid-enterprise` dependency and no licence key, so the feature is unreachable regardless of doc currency)

### Tertiary (LOW)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every reuse target verified by reading the file
- Architecture / file layout: HIGH — mirrors Phase 40 conventions verified on disk
- Pitfalls: HIGH — every pitfall traced to a specific file/line
- ag-grid risk: HIGH on the negative claim (no enterprise dep in package.json, no licence key); MEDIUM on the recommended alternative (no in-repo precedent for flat-row interleaving, but pattern is standard ag-grid usage)
- Impact DTO finding: HIGH — endpoint and DTO inspected directly

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days; Phase 41 expected to plan immediately)
