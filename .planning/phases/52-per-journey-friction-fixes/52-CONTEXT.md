# Phase 52: Per-journey friction fixes - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Every one of the 13 user journeys documented in `.planning/v5.0-USER-JOURNEYS.md` reaches its click-count target from `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §1 / `.planning/ui-reviews/UX-AUDIT-PERSONAS.md`, verified by Playwright. Every code path and every spec is gated behind a single `uiV6.perJourney` flag; flag-off preserves Phase 51 behavior exactly.

**In scope (13 requirements):**
- **PM-01** — `/pm` auto-redirects to `/pm/projects/<defaultProjectId>` when API returns exactly one project or a `defaultProjectId`; project-cards grid otherwise (journey 1A: 2 clicks)
- **PM-02** — Top-bar pending-wishes chip, deep-linkable to `/pm/wishes?tab=rejected|proposed` (journey 1C: 2 clicks)
- **PM-03** — Historic-edit warning dialog for past-month edits, 4 persona × period combos (journey 1D: 3 clicks)
- **PM-04** — 4 proposal-state visual snapshots: draft / proposed / approved / rejected (journey 1B)
- **LM-01** — Approval-queue count badge on `/line-manager` + persona-switcher reflection (journey 2B: 2 clicks)
- **LM-02** — Project-breakdown cells on `/line-manager/timeline` (journey 2C)
- **LM-03** — `src/app/api/v5/proposals/queue/count/route.ts` (server route + service fn + unit test)
- **STAFF-01** — `readOnly` variant of the timeline; cell edit disabled (journey 3A: 0 clicks)
- **RD-01** — Long-horizon zoom (month/quarter/year), ISO 8601 + 53-week-year for 2026/2027/2028 (journey 4A: 0 clicks with zoom)
- **RD-02** — Red overcommit cell opens breakdown dialog with projects + most-overbooked people + navigation (journey 4B: 1 click)
- **SHARED-01** — Drill-down drawer (Screen S11) supports deep-link open, ESC-dismiss, focus trap — exercised from 1A and 4B
- **ADMIN-01** — `ConflictError DEPENDENT_ROWS_EXIST` toast with dependent list (journey 5B: 2 clicks)
- **PJ-FLAG** — All per-journey changes gated behind single `uiV6.perJourney` flag

**Out of scope (scope guard):**
- Notification bell persona-scoping (Phase 53 POLISH-01)
- `NavItemDef.visibleFor` top-nav filtering (Phase 53 POLISH-02)
- `discipline-chart` + `discipline-distribution` merge (Phase 53 POLISH-03)
- `bench-report` / `resource-conflicts` / `strategic-alerts` widget changes (Phase 53)
- Dashboard quadrant redesign (Phase 54 optional)
- Counter-proposal flow (deferred from v5.0)
- New Playwright spec infra itself (exists from Phase 47; Phase 52 adds per-journey specs only)
- Any source-code change outside the 13 REQ targets

</domain>

<decisions>
## Implementation Decisions

### D-01 — PM-01 default-project auto-select (server-computed)
**`/api/v5/planning/pm-home` response gains `defaultProjectId?: string`.** Server computes it via:
1. If `projects.length === 1` → `defaultProjectId = projects[0].id`
2. Else (future extension hook) → left `undefined` in Phase 52
3. Client reads `defaultProjectId`; if present and `uiV6.perJourney` is on → `router.replace(\`/pm/projects/${id}\`)` via `useEffect`

**Why:** REQ PM-01 wording ("when the API returns exactly one project OR a defaultProjectId") is already server-language. localStorage would fragment across devices. Server centralization enables future rules (most-recent-activity, primary project) without client redeploy.

**How to apply:**
- Extend `PmOverviewResult` type in `src/features/planning/planning.read.ts`
- Add `defaultProjectId` computation to the pm-home API service
- Client-side redirect in `src/app/(app)/pm/page.tsx` wrapped in flag check

### D-02 — PM-02 pending-wish chip
**Standalone `<PendingWishChip />` in app-shell top-bar, next to persona-switcher.** Visible when `pending + rejected > 0`. Deep-link target:
- `rejected > 0` → `/pm/wishes?tab=rejected`
- Else if `pending > 0` → `/pm/wishes?tab=proposed`

Wrapped in `uiV6.perJourney` flag + `persona.kind === 'pm'` guard.

**Why:** (1) REQ explicitly says "top-bar". (2) Deep-link to rejected tab collapses journey 1C from 4→2 clicks per UX-AUDIT §Persona 1. (3) Standalone component avoids coupling to persona-switcher internals.

**How to apply:**
- New `src/components/persona/pending-wish-chip.tsx`
- `useQuery(['pm-wish-counts', personId])` against existing `/api/v5/wishes` endpoint, selector returns `{ pending, rejected }`
- Mount inside the app-shell header component (near persona-switcher)
- i18n key `pm.pendingWishChip.label` with count interpolation

### D-03 — PM-03 historic-edit warning gating (server month)
**Warning fires when `editedPeriodMonthKey < serverNowMonthKey`.** Server month sourced from existing `src/lib/server/get-server-now-month-key.ts`. No dismiss-with-memory — the dialog always fires for past-month edits; user confirms per-edit.

**4 persona × period combos (spec matrix):**
1. PM editing past-month planning → warning fires
2. PM editing current/future planning → no warning
3. LM editing past-month planning (own dept) → warning fires
4. LM editing current/future planning → no warning

**Why:** (1) Server month prevents client-clock manipulation and timezone drift. (2) Helper already exists (codebase scout). (3) Dialog component `src/components/dialogs/historic-edit-dialog.tsx` already exists from Phase 49. (4) Always-on matches "affects past reports" criticality.

**How to apply:**
- Import `historic-edit-dialog.tsx` into `pm-timeline-cell.tsx` + `lm-timeline-cell.tsx`
- Expose server month via existing pm-home / lm-timeline API responses (or new `/api/v5/server-now` if cleaner)
- Show dialog before committing edit when `period < serverNowMonthKey`
- Playwright spec mocks server month for deterministic 4-combo test

### D-04 — PM-04 proposal-state visual snapshots
**4 snapshot test cases colocated in `src/components/timeline/__tests__/pm-timeline-cell.test.tsx`.** Each case renders `<PmTimelineCell />` with one of 4 proposal states (draft / proposed / approved / rejected) and asserts `toMatchSnapshot()`.

Snapshot assertions cover:
- Dashed border on `proposed`
- Muted color (`text-on-surface-variant`) on `proposed` and `rejected`
- "Pending" badge on `proposed`
- Dual-value rendering (`planned | proposedValue`) on `proposed`

**Why:** (1) Colocates tests with component (existing `pm-timeline-cell.test.tsx` pattern). (2) 4 separate `it()` blocks = 4 diff-able snapshots on PR review. (3) Vitest unit-test cycle is faster than Playwright round-trip for pure render assertions.

**How to apply:**
- Extend existing `pm-timeline-cell.test.tsx` with 4 new `describe('proposal states')` blocks
- Test fixture: allocation rows with varying `proposalState` values

### D-05 — LM-03 endpoint shape (`/api/v5/proposals/queue/count`)
**`GET /api/v5/proposals/queue/count?departmentId=<id>` returns `{ count: number, departmentId: string }`.** Response spec:
- Count = proposals in state `'proposed'` only (not `counter_proposed`, not `rejected`, not `approved`)
- Filtered by `departmentId` (required query param for LM); when omitted → 400
- Tenant-scoped via existing Clerk org middleware
- Service function: `proposal.service.ts#getQueueCount(orgId: string, departmentId: string): Promise<number>`
- Unit test: mocks DB client, asserts SQL `WHERE state = 'proposed' AND department_id = $1 AND org_id = $2`

**Why:** (1) Per-department filter matches LM workflow (Per only approves Electronics Design wishes). (2) `'proposed'` only — counter-proposals are pending PM action, not LM's queue. (3) Tenant isolation automatic (existing middleware). (4) REQ LM-03 mandates server route + service function + unit test.

**How to apply:**
- New `src/app/api/v5/proposals/queue/count/route.ts` — Next.js route handler
- New method in `src/features/proposals/proposal.service.ts` — `getQueueCount()`
- New test in `src/app/api/v5/proposals/__tests__/routes.test.ts` or dedicated file
- Zod schema for query params

### D-06 — LM-01 badge polling + placement + switcher reflection
**Shared TanStack Query hook `useLmQueueCount(departmentId)` with `refetchInterval: 60_000`.** Count rendered on TWO surfaces:
1. `/line-manager/page.tsx` — clickable badge linking to `/line-manager/approval-queue`, shown when `count > 0`
2. `persona-switcher.tsx` optgroup label — suffix format `"Linjechef — Per (3)"` when LM selected and count > 0

**Why:** (1) 1-min polling balances freshness vs. request load; no WebSocket infra exists. (2) Shared `useQuery(['lm-queue-count', deptId])` hook deduplicates fetches across both surfaces. (3) REQ LM-01 explicitly requires count on both surfaces.

**How to apply:**
- New `src/features/proposals/use-lm-queue-count.ts` hook wrapping `/api/v5/proposals/queue/count`
- Mount badge component in `/line-manager/page.tsx`
- Extend `src/components/persona/persona-switcher.tsx` optgroup label builder to append count
- i18n key `v5.lineManager.home.approvalQueueBadge` with count interpolation

### D-07 — LM-02 project-breakdown cells on LM timeline
**Extend existing `src/components/timeline/lm-timeline-cell.tsx` to render stacked project sub-rows.** Layout: cell body = vertical stack of `<div role="row">` entries, each row = project short-name + hours. When allocations has single project, render single row (visual consistency).

**Why:** (1) Component exists; this is extension, not new. (2) Stacked rows match journey 2C narrative ("cells broken down by project"). (3) `role="row"` enables Playwright `getByRole('row')` assertions.

**How to apply:**
- Modify `lm-timeline-cell.tsx` to iterate `allocations` array (each row = one allocation)
- New test case in `src/components/timeline/__tests__/line-manager-timeline-grid.test.tsx`
- Playwright spec 2C asserts `getByRole('row').all()` count matches fixture

### D-08 — RD-01 zoom control UX
**Three-button segmented toggle (`Månad | Kvartal | År`) in `/rd` page header, reusing existing `src/components/timeline/zoom-controls.tsx`.** Default level = `month`. Year mode handles 53-week 2026 via existing `lib/time/iso-calendar.ts` + `getISOWeek`.

**Why:** (1) Segmented toggle has higher discoverability than dropdown for 3 mutually-exclusive options. (2) `zoom-controls.tsx` + `useZoom.ts` + `TimelineGrid.zoom.test.tsx` already exist. (3) `month` default = matches PM/Staff default; lowest cognitive load.

**How to apply:**
- Mount `<ZoomControls level="month" onChange={setLevel} options={['month','quarter','year']} />` in `src/app/(app)/rd/page.tsx`
- Pass `level` into `TimelineGrid` props which routes column generation via existing `timeline-columns.ts`
- Playwright spec matrix: 2026 (53-week), 2027, 2028 — each level tested

### D-09 — RD-02 overcommit dialog structure
**Single dialog with two labeled sections:**
1. **"Bidragande projekt"** — table: project name | planned hours | % of total overcommit
2. **"Mest överbokade personer"** — table: person name | total planned | capacity | delta (overbook hours)

Each row has a per-row `<Link>` affordance — project rows link to project timeline, person rows link to person-month drill.

**Why:** (1) Two sections mirror journey 4B narrative literally ("which projects contribute, which people are most overbooked"). (2) Per-row links give 1-click navigation (journey target: 1 click). (3) REQ RD-02 explicit: "lists contributing projects AND most-overbooked people" + "navigation affordance".

**How to apply:**
- New `src/components/dialogs/overcommit-dialog.tsx` following `historic-edit-dialog.tsx` primitive pattern
- Data from existing `/api/v5/capacity/breakdown` endpoint (scout confirmed exists)
- Mount from `/rd` timeline cells when `state === 'overcommit'` (red cell onClick)
- Playwright spec 4B asserts both sections present + link targets resolve

### D-10 — STAFF-01 readOnly prop on TimelineGrid
**Add `readOnly?: boolean` prop (default `false`) to `src/components/timeline/TimelineGrid.tsx`.** When `true`:
- No cell `onClick` handler
- No hover edit affordances (`cursor-pointer`, hover border)
- No inline edit buttons or input fields
- Cells render as static `<div>` instead of `<button>`
- plan|actual split still displays

`/staff/page.tsx` passes `readOnly={true}`.

**Why:** (1) Prop-based reuse avoids a parallel component tree. (2) Staff journey 3A is narrow ("completely read-only") — a prop is sufficient. (3) Hiding hover affordances matches journey narrative ("no edit controls, no admin tools").

**How to apply:**
- Add prop to `TimelineGrid.tsx` and propagate to cell components
- Playwright spec 3A asserts:
  - No `button[aria-label*="edit"]` elements
  - No `cursor-pointer` class on cells
  - plan/actual values still visible

### D-11 — SHARED-01 drill-down drawer deep-link
**Query-param style URL:** `?drawer=person-month&personId=<id>&month=<YYYY-MM>`

Drawer opens via `useSearchParams` + `useEffect` reading these params. ESC-dismiss calls `router.replace(pathname)` stripping the `drawer=*` params. Focus trap via existing `Drawer.tsx` primitive. Deep-link from external source (pasted URL) opens drawer on page mount.

**Why:** (1) Query-params preserve underlying route (back-navigate returns to timeline). (2) Shareable URL satisfies REQ deep-link. (3) `src/components/drawer/Drawer.tsx` already has focus-trap.

**How to apply:**
- Extend `src/components/drawer/PlanVsActualDrawer.tsx` + `usePlanVsActualDrawer.tsx` to read/write `drawer=*` query params
- Playwright spec 1A (PM journey): navigate to `/pm/projects/<id>` with drawer params → assert drawer visible
- Playwright spec 4B (R&D journey): same test on `/rd` route
- ESC key test: drawer open → press Escape → assert params stripped from URL

### D-12 — ADMIN-01 dependent-list rendering
**Toast with expandable `<details>` block listing dependent rows inline.** Uses existing toast primitive; `lib/errors.ts` already maps `ConflictError DEPENDENT_ROWS_EXIST`. Toast content:
```
Kan inte arkivera projekt — [N] aktiva beroenden
▶ Visa detaljer
  • Allokering: Sara / Juni 2026 (60h planerat)
  • Allokering: Erik / Juli 2026 (40h planerat)
  ...
```

**Why:** (1) Toast matches REQ "DEPENDENT_ROWS_EXIST toast" wording literally. (2) `<details>` keeps initial toast terse. (3) Existing error plumbing — no new dialog component needed.

**How to apply:**
- Extend toast renderer (likely `src/components/ui/toast.tsx`) to detect `ConflictError.details[]` payload and render expandable list
- `ConflictError` schema should already expose `details[]` with dependent row info — verify in `src/lib/errors.ts` during planning
- Playwright spec 5B: click Archive on project with allocations → assert toast text + expand `<details>` → assert list entries match fixture

### D-13 — Data-clicks counter (Playwright verification infrastructure)
**Env-gated global React Context `<ClickTrackerProvider>`.** Mounted only when `NEXT_PUBLIC_E2E_CLICK_TRACKING === 'true'` (set only in Playwright CI via `playwright.config.ts` env override). Counter increments on any element with a `data-clicks="true"` attribute via delegated click listener. Counter exposed as `window.__clickCount`.

**Why:** (1) Env-gated = zero production overhead. (2) Attribute-based annotation = opt-in per journey-critical element. (3) Global context + `window` exposure = single, testable source of truth.

**How to apply:**
- New `src/lib/testing/click-tracker.tsx` with `ClickTrackerProvider` + delegated listener
- Conditional mount in `src/app/(app)/layout.tsx` guarded by env var
- Add `data-clicks="true"` to every primary journey affordance (project cards, badges, cells, dialog buttons)
- New `e2e/helpers/click-counter.ts` — `getClickCount(page): Promise<number>`
- Every journey spec starts with `await resetClickCount(page)` + ends with `expect(await getClickCount(page)).toBeLessThanOrEqual(target)`

### D-14 — Playwright spec organization (11 specs)
**One spec per journey ID**, grouped by persona directory:
- `e2e/pm/1a-monday-checkin.spec.ts` — target 2 clicks
- `e2e/pm/1b-submit-wish.spec.ts` — target 3 clicks
- `e2e/pm/1c-rejected-wish.spec.ts` — target 2 clicks
- `e2e/pm/1d-historic-edit.spec.ts` — target 3 clicks
- `e2e/line-manager/2a-capacity-overview.spec.ts` — target 1 click
- `e2e/line-manager/2b-approve-reject.spec.ts` — target 1 click
- `e2e/line-manager/2c-direct-edit.spec.ts` — (click target from UX-AUDIT)
- `e2e/staff/3a-check-schedule.spec.ts` — target 0 clicks
- `e2e/rd/4a-portfolio-overview.spec.ts` — target 0 clicks with zoom
- `e2e/rd/4b-overcommit-drilldown.spec.ts` — target 1 click
- `e2e/admin/5b-archive-dependent.spec.ts` — target 2 clicks

**Why:** (1) Matches `v5.0-USER-JOURNEYS.md` 1:1 — trivially traceable. (2) Parallel test execution (one failure = one journey). (3) REQ verification list references journey IDs directly.

**How to apply:**
- Each spec: seed persona, navigate, perform actions, assert click-count + journey content
- All specs guard against `uiV6.perJourney === false` by skipping (per PJ-FLAG spec)

### D-15 — PJ-FLAG single flag atomic gating
**Single `uiV6PerJourney` flag gates ALL 13 requirements atomically.** Flag-off = Phase 51 behavior preserved exactly. Additions:
- `'uiV6PerJourney'` added to `FLAG_NAMES` in `src/features/flags/flag.types.ts`
- `uiV6PerJourney: boolean` added to `FeatureFlags` interface
- `uiV6PerJourney: false` default in `src/features/flags/flag.service.ts` + `flag.context.tsx`
- Every PM/LM/R&D/Staff/Admin surface modification reads this flag via `useFlag('uiV6PerJourney')`

**Why:** (1) REQ PJ-FLAG says "All per-journey changes gated behind `uiV6.perJourney`". (2) Matches Phase 50/51 single-flag pattern. (3) Sub-flags would create test-matrix explosion (2^13 combinations).

**How to apply:**
- Follow Phase 51's `uiV6LeanTrim` flag-addition pattern exactly
- Every D-01..D-12 code site wraps new behavior in flag check; falls through to current behavior when off

### Claude's Discretion
- Exact wording of new i18n keys (Swedish/English) — planner can choose from UI convention
- Test file organization for new specs (one-per-journey is locked; subfolder structure is flexible)
- Whether to create `/api/v5/server-now` helper route or thread server-month through existing pm-home/lm-timeline API responses
- Exact toast UI polish (border color, icon) for ADMIN-01 `<details>` expansion
- Whether `PendingWishChip` uses a badge primitive from the existing design system or inline Tailwind classes
- Order of implementation within Phase 52 (logical wave grouping: [LM-03 endpoint → LM-01 badge], [Flag + infra], [PM cluster], [R&D cluster], [Staff/Shared/Admin], [Journey specs + click tracker])
- Click-tracker attribute value format (`"true"` vs numeric weight vs journey-id tag)

### Folded Todos
None — no active todos matched Phase 52 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plan source of truth
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §1 — Click-count targets per journey (Playwright assertion source)
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §2 Wave 3 — Per-journey sub-task list (3.1 PM, 3.2 LM, 3.3 Staff, 3.4 R&D zoom, 3.5 Admin, 3.6 drill-drawer audit)
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §4 — Feature flag definitions (`uiV6.perJourney` pattern)
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §7 — a11y acceptance criteria (axe zero-violations per wave)
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §8 — Rollback matrix (`uiV6.perJourney=false` reverts)
- `.planning/ui-reviews/UX-AUDIT-PERSONAS.md` §Persona 1-5 — Exact click-count targets + friction notes per journey
- `.planning/v5.0-USER-JOURNEYS.md` §Persona 1-5 — Journey narratives (1A, 1B, 1C, 1D, 2A, 2B, 2C, 3A, 4A, 4B, 5B)

### Requirements + roadmap
- `.planning/REQUIREMENTS.md` §v6.0 PM-01..PJ-FLAG — 13 requirements (lines 62-74)
- `.planning/ROADMAP.md` §Phase 52 (lines 388-401) — Goal, `Depends on: Phase 51`, `Expanded by VERIFY-02`, success criteria

### Pre-flight evidence
- `.planning/pre-flight-report.md` §VERIFY-02 — Confirms `/api/v5/proposals/queue/count` endpoint does NOT exist (drives LM-03)
- `.planning/pre-flight-report.md` §VERIFY-06 — Playwright spec inventory (per-spec update targets already captured in Phase 48)

### Session context
- `.planning/STATE.md` — milestone position
- Prior CONTEXT.md files in `.planning/phases/48-*` through `51-*` — locked decisions
- `.planning/v6.0-HANDOFF.md` §Locked decisions

### Existing components to extend (verified by scout 2026-04-21)
- `src/components/timeline/TimelineGrid.tsx` — gains `readOnly` prop (D-10)
- `src/components/timeline/pm-timeline-cell.tsx` — imports historic-edit-dialog (D-03); snapshot test host (D-04)
- `src/components/timeline/lm-timeline-cell.tsx` — gains project-breakdown rendering (D-07); imports historic-edit-dialog (D-03)
- `src/components/timeline/zoom-controls.tsx` + `src/components/timeline/useZoom.ts` + `src/components/timeline/timeline-columns.ts` — RD-01 zoom (D-08)
- `src/components/dialogs/historic-edit-dialog.tsx` — reused for PM-03 / LM historic edits (D-03)
- `src/components/drawer/PlanVsActualDrawer.tsx` + `src/components/drawer/usePlanVsActualDrawer.tsx` + `src/components/drawer/Drawer.tsx` — SHARED-01 deep-link (D-11)
- `src/components/persona/persona-switcher.tsx` — LM-01 count-suffix on optgroup label (D-06)

### New files to create
- `src/app/api/v5/proposals/queue/count/route.ts` — LM-03 endpoint (D-05)
- `src/components/persona/pending-wish-chip.tsx` — PM-02 top-bar chip (D-02)
- `src/features/proposals/use-lm-queue-count.ts` — LM-01 shared hook (D-06)
- `src/components/dialogs/overcommit-dialog.tsx` — RD-02 dialog (D-09)
- `src/lib/testing/click-tracker.tsx` — Playwright click-count infra (D-13)
- `e2e/helpers/click-counter.ts` — spec helper (D-13)
- 11 Playwright spec files under `e2e/{pm,line-manager,staff,rd,admin}/` (D-14)

### Feature flag infrastructure
- `src/features/flags/flag.types.ts` — add `'uiV6PerJourney'` to `FLAG_NAMES`, add to `FeatureFlags` interface, add to `FLAG_ROUTE_MAP` defaults
- `src/features/flags/flag.service.ts` — add `uiV6PerJourney: false` default
- `src/features/flags/flag.context.tsx` — add `uiV6PerJourney: false` default

### Supporting utilities
- `src/lib/time/iso-calendar.ts` — RD-01 ISO 8601 + 53-week math (REUSE, no changes)
- `src/lib/server/get-server-now-month-key.ts` — PM-03 server-month source (REUSE, may need thread through API response)
- `src/lib/errors.ts` — `ConflictError` + `DEPENDENT_ROWS_EXIST` mapping (ADMIN-01)
- `src/app/api/v5/capacity/breakdown/route.ts` — RD-02 dialog data source (REUSE)
- `src/features/proposals/proposal.service.ts` — LM-03 new service method `getQueueCount`
- `src/app/api/v5/planning/pm-home/route.ts` — PM-01 extend with `defaultProjectId` (D-01)

### Playwright baseline
- `e2e/` directory — 12 existing specs from Phase 47 (updated in Phase 49); Phase 52 adds 11 journey specs
- `playwright.config.ts` — add `NEXT_PUBLIC_E2E_CLICK_TRACKING='true'` env override (D-13)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `historic-edit-dialog.tsx` + its contract test — Phase 49 work covers the dialog shell; PM-03 reuses it
- `zoom-controls.tsx` + `useZoom.ts` + `TimelineGrid.zoom.test.tsx` — R&D zoom infra exists; RD-01 is wiring-only
- `PlanVsActualDrawer.tsx` + `Drawer.tsx` focus-trap primitive — SHARED-01 deep-link is a prop + router addition
- `lm-timeline-cell.tsx` + `pm-timeline-cell.tsx` — both cells exist with edit handlers; Phase 52 adds snapshot coverage + historic-edit gating
- `/api/v5/capacity/breakdown` endpoint — already returns overcommit breakdown; RD-02 only needs dialog UI
- `/line-manager/approval-queue/page.tsx` — already exists; LM-01 wires badge + link
- `lib/time/iso-calendar.ts` — 53-week / ISO 8601 math already shipped
- `get-server-now-month-key.ts` — server-month helper exists; PM-03 threads it through API responses
- `ConflictError DEPENDENT_ROWS_EXIST` in `lib/errors.ts` — ADMIN-01 renders it; backend check already emits it

### Established Patterns
- Feature flag addition pattern — follow Phase 51's `uiV6LeanTrim`: update `FLAG_NAMES` + `FeatureFlags` + service default + context default
- TanStack Query patterns — `useQuery(['key', scope])` with `refetchInterval` for polling; mirror for LM badge (D-06)
- Dialog primitive convention — `historic-edit-dialog.tsx` is the template for `overcommit-dialog.tsx` (D-09)
- Playwright spec per journey — one file per REQ ID, co-located under persona subfolder
- Test-only env var pattern — `NEXT_PUBLIC_E2E_*` flags gate conditional mounts (D-13 click-tracker)
- i18n namespace discipline — new keys go under persona-scoped namespaces (`v5.pm.*`, `v5.lineManager.*`, `v5.rd.*`)

### Integration Points
- `src/app/(app)/pm/page.tsx` — client redirect on `defaultProjectId` (D-01)
- `src/app/(app)/layout.tsx` — mount point for `ClickTrackerProvider` + `PendingWishChip` (flag-gated)
- `src/app/(app)/rd/page.tsx` — mount `ZoomControls` + listen to overcommit cell clicks for dialog (D-08, D-09)
- `src/app/(app)/staff/page.tsx` — pass `readOnly={true}` to `TimelineGrid` (D-10)
- `src/app/(app)/admin/projects/page.tsx` — Archive action surface; toast renders `ConflictError` details (D-12)
- `src/app/(app)/pm/projects/[projectId]/page.tsx` — reads `drawer=*` query params → opens drawer (D-11)

### Creative Options
- Server-computed defaults vs client-localStorage — chose server for PM-01 to keep business logic centralized and device-agnostic
- Polling vs WebSocket for LM badge — chose 1-min polling; no WebSocket infra exists and count change latency is not critical
- Single prop vs parallel component for Staff read-only — chose prop to avoid component tree duplication (TimelineGrid fast-path is `readOnly === false`)

</code_context>

<specifics>
## Specific Ideas

- Click-count targets are hard constraints from `UX-AUDIT-PERSONAS.md` — CI must fail if any journey exceeds its target
- PM pending-wish chip visibility logic: `rejected > 0` → link to `?tab=rejected` first (UX-AUDIT §1C reorganization note), else `?tab=proposed`
- R&D year mode must correctly render 2026 as a 53-week year — this is the edge case that drove `iso-calendar.ts` to exist
- Historic-edit dialog must differentiate PM (own-project) vs LM (own-department-own-month) — warning text can be the same, but the 4-combo spec must assert the `personaKind` and `period` inputs
- LM approval-queue badge count is persona-switcher sensitive: when user switches LM department, count must refetch (invalidate `['lm-queue-count', deptId]` query key)
- Playwright click-count assertions run BEFORE any journey-narrative assertions — if click count exceeds target, fail fast without needing follow-up checks

</specifics>

<deferred>
## Deferred Ideas

- **Counter-proposal flow UI** — still deferred from v5.0; `counter_proposed` state not included in LM-03 queue count
- **Email/Slack notification channel** — in-app only; LM badge polling is the notification mechanism for v6.0
- **WebSocket push for real-time counts** — deferred to post-v6.0 if 1-min polling proves insufficient
- **Preference-based `defaultProjectId` beyond `projects.length === 1`** — server hook is in place (D-01) but fall-through logic (most-recent-activity, primary-project preference) is post-v6.0
- **A11y NVDA/JAWS testing for grouped `<select>`** — captured in UI-RESTRUCTURE-PLAN-v2 §7; Phase 52 runs `axe-core` zero-violations only
- **Historic-edit dialog "don't ask again" preference** — explicitly rejected for PM-03 (always fires per edit for audit integrity)
- **Click-tracker data layer for analytics** — Phase 52 click-tracker is test-only (env-gated); production analytics is separate deferred work
- **Notification bell persona-scoping** — Phase 53 POLISH-01
- **`NavItemDef.visibleFor` top-nav filtering** — Phase 53 POLISH-02
- **Dashboard quadrant redesign** — Phase 54 optional

### Reviewed Todos (not folded)
None — no pending todos in queue matched Phase 52 scope.

</deferred>

---

*Phase: 52-per-journey-friction-fixes*
*Context gathered: 2026-04-21*
