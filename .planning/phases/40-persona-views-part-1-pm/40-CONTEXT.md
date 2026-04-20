# Phase 40: Persona views Part 1 — PM — Context

**Gathered:** 2026-04-08
**Status:** Ready for research / planning
**Mode:** `--auto` (recommended defaults selected by Claude; review and override before planning if needed)

<domain>
## Phase Boundary

First of the persona-view phases (40→41→42). Ships the PM-persona screens on top of the proposal/approval workflow already landed in Phase 39 and the plan-vs-actual cell from Phase 37.

In scope:
- **PM Home** (`/pm`) — overview card + drill-in to project timelines (UX-V5-02 S2).
- **PM project timeline** (`/pm/projects/[projectId]`) — horizontal month-column grid rendering plan-vs-actual cells per person row, inline cell edit with approval-gate routing (UX-V5-02 S3).
- **My Wishes panel** (`/pm/wishes` — or reuse existing `/wishes`) — filter tabs proposed / approved / rejected and resubmit-from-rejected (UX-V5-03 S4).
- **Historic-edit confirmation dialog** shared component (`components/dialogs/historic-edit-dialog.tsx`) — soft warning on any edit targeting a period before `getServerNowMonthKey()`; writes `ALLOCATION_HISTORIC_EDITED` on direct path (UX-V5-11 / HIST-01).
- Role switcher header globally wired so switching role changes default landing + scope without page reload (UX-V5-01) — the existing `persona-switcher.tsx` + `persona.context.tsx` need to be mounted in the authenticated shell layout if not yet mounted.
- i18n coverage for every new user-visible string under `v5.pm.*` and `v5.historicEdit.*`.

Out of scope (deferred to later phases):
- Line Manager screens (heatmap, group timeline, approval queue surfacing as LM page, change log feed) — Phase 41.
- Staff / R&D / drill-down drawer / long-horizon zoom — Phase 42.
- Counter-proposal flow (out per UX-V5-06).
- Notifications on historic edits / wish lifecycle.
- Mobile-first layouts beyond the "required / best-effort / optional" table in ARCHITECTURE §1739-1741 (ship desktop first; mobile polish is Phase 43+).

</domain>

<decisions>
## Implementation Decisions

### Routes & file layout (matches ARCHITECTURE §310-314)
- **D-01:** Create the `src/app/(app)/pm/` route group:
  - `pm/page.tsx` — PM Home (S2)
  - `pm/projects/[projectId]/page.tsx` — PM project timeline (S3)
  - `pm/wishes/page.tsx` — thin wrapper that re-exports the existing `/wishes` page body so both URLs work; the persona-router lands PM at `/pm` and the PM Home links to `/pm/wishes`. Keep the flat `/wishes` route alive to avoid breaking Phase 39 links. (Alternative — remove `/wishes` and redirect — rejected to minimise churn; see Claude's Discretion.)
- **D-02:** Do NOT touch the existing `(app)/projects/[projectId]/page.tsx` route — that is the v4 generic project view. The new PM timeline lives under `pm/projects/[projectId]` per ARCHITECTURE §314 and has its own loader + timeline primitives. The generic route stays as the Admin/RD fallback.
- **D-03:** Global role-switcher mount: add `<PersonaSwitcher />` to `src/app/(app)/layout.tsx` header slot if not present; the persona context provider wraps the same layout. Switching role calls `router.push(getLandingRoute(next))` — already implemented in `persona.routes.ts` — no reload.

### PM Home data loading
- **D-04:** PM Home reads via TanStack Query key `['pm-home', personaId]`. Server handler = a new route `GET /api/v5/planning/pm-home?projectId?=...&startMonth=...&endMonth=...` that returns `{ projects: PmOverviewCard[], defaultProjectId }`.
- **D-05:** `PmOverviewCard` is built by a new `planning.read.ts` helper `getPmOverview({ orgId, leadPmPersonId, monthRange })` that composes:
  - list of projects where `projects.lead_pm_person_id = leadPmPersonId`
  - `getProjectBurn()` from `src/features/actuals/actuals.read.ts` (already exists, per §785) for planned vs actual totals
  - pending wish counts from `proposal.service.listByProposer(status='proposed')`
- **D-06:** Empty state: if no projects own this PM, render the empty-state card per ARCHITECTURE §1710 with the persona switcher hint.
- **D-07:** `planning.read.ts` lives at `src/features/planning/planning.read.ts` — this is the first concrete file in the `planning` feature folder (ARCHITECTURE §327). Only read helpers for now; no service yet.

### PM project timeline
- **D-08:** Reuse `components/timeline/PlanVsActualCell.tsx` directly — do not fork. The timeline grid wrapper is a NEW component `components/timeline/timeline-grid.tsx` (thin ag-grid wrapper per §391) that assembles rows = people, columns = months, cell renderer = `PlanVsActualCell`. Column builder = new `components/timeline/timeline-columns.ts` with `buildTimelineColumns(range, zoom='month')` — fixed at month zoom in this phase; quarter/year zoom is Phase 42.
- **D-09:** Data source: a new route `GET /api/v5/planning/allocations?scope=pm&projectId=...&startMonth=...&endMonth=...` that calls a new `planning.read.getPmTimeline({ orgId, projectId, monthRange })`. Internally joins:
  - `allocations` (approved hours per person×month)
  - `allocation_proposals WHERE status='proposed'` (pending wishes, merged into cell state)
  - `actuals.read.aggregateByMonth` (actual totals per person×month)
  into a `CellView` map: `{ personId, monthKey, plannedHours, pendingProposal?, actualHours }`.
- **D-10:** Default month range on first load: current month − 1 through current month + 11 (13 columns). Use `getCurrentMonth()` for the anchor and `generateMonthRange` from `lib/date-utils` — same helpers the legacy project page already uses.
- **D-11:** Cell edit flow (UX-V5-02 success criterion #2):
  1. User types a value. Cell component owns draft state.
  2. On blur / enter, call `resolveEditGate({ persona, targetPerson, month })` from `src/features/proposals/edit-gate.ts` (exists from Phase 39).
  3. If `direct` → debounced 600ms auto-save via existing `batchUpsertAllocations` path wrapped in `PATCH /api/v5/planning/allocations/[id]` (route already exists from Phase 39 work; verify during research, create if missing). No dialog.
  4. If `proposal` → open the existing `ProposalCell` popover (optional note textarea) then `POST /api/v5/proposals` via the existing hook `use-proposals.ts`. No debounce — explicit Submit-wish click.
  5. If `historic-warn-direct` → open `HistoricEditDialog`; on confirm, PATCH with `confirmHistoric: true`, server writes `ALLOCATION_HISTORIC_EDITED` via `recordChange` (the allocation service already accepts this flag per ARCHITECTURE §616-627).
  6. If `historic-warn-proposal` → open `HistoricEditDialog` first; on confirm, drop into `proposal` mode (step 4).
  7. If `blocked` → cell is read-only (should never happen for PM persona but belt-and-suspenders).
- **D-12:** The 600ms debounce is owned by the cell wrapper, NOT the grid. Use a single `useDebouncedCallback` from the existing utility (or `lodash.debounce` if already a dep). Decision on the exact hook name is Claude's discretion.

### Historic-edit dialog
- **D-13:** Create `src/components/dialogs/historic-edit-dialog.tsx` with the exact prop shape from ARCHITECTURE §1069-1074:
  ```
  { targetMonthKey: string, onConfirm: () => void, onCancel: () => void, open: boolean }
  ```
  Text primary Swedish: `"Du redigerar historisk planering för [<monthLabel>]. Detta påverkar tidigare rapporter. Fortsätt?"` — keyed in i18n as `v5.historicEdit.title` + `v5.historicEdit.body` (interpolated month).
- **D-14:** Escape cancels, Enter confirms. Use the shadcn `<Dialog>` primitive already in use elsewhere in `components/dialogs/` or `components/ui/dialog`. Planner to verify primitive path.
  - **UPDATE 2026-04-08 (post-research):** Research found no shadcn Dialog in codebase; hand-rolled `<div role="dialog" fixed inset-0>` pattern adopted per `reject-modal.tsx` / `my-wishes-panel.tsx` precedent. See 40-RESEARCH.md § "Dialog Primitive Investigation".
- **D-15:** Server-side defense in depth: the PATCH allocation route must still re-evaluate `isHistoricPeriod(month, nowMonthKey)` using `getServerNowMonthKey(tx)` and reject silent historic edits that omit `confirmHistoric: true`. This is already spec'd in ARCHITECTURE §616-627 — Phase 40 only needs to ensure the flag is plumbed end-to-end, not invent new server logic.
- **D-16:** `HistoricEditDialog` is reused by Phase 41 (Line Manager direct edits in own dept can also hit historic months). Keep it persona-agnostic.

### My Wishes panel reuse
- **D-17:** The existing `MyWishesPanel` (from Phase 39, `src/features/proposals/ui/my-wishes-panel.tsx`) already satisfies success criterion #3 including resubmit-from-rejected. Phase 40 mounts it at `/pm/wishes` and ensures the PM home links to it. No duplication of the panel logic — if a tweak is needed (e.g., a "back to project" link), modify in place.
- **D-18:** Verify i18n: the existing panel uses `v5.proposals.*` keys. Phase 40 does NOT rename these. Any new strings for the PM shell (greeting, card titles, nav labels) go under `v5.pm.*`.

### Role switcher wiring (UX-V5-01)
- **D-19:** Confirm `persona.context.tsx` is already mounted at the authenticated shell root. If not, add it to `src/app/(app)/layout.tsx`. The switcher is `src/components/persona/persona-switcher-button.tsx` (per §417) — mount in the header. On change, `router.push(getLandingRoute(next))` is invoked, which must NOT cause a full reload — verify with a smoke test that `window.location` doesn't change document identity.
- **D-20:** Scope change: switching persona invalidates TanStack Query keys tagged with the old persona. Use a `queryClient.invalidateQueries({ queryKey: ['pm-home'] })` + sibling persona keys on persona change event. Hook into `persona.context.tsx`'s setter.

### Tests (mapping to roadmap success criteria)
- **D-21:** Test files match the roadmap codes:
  - `TC-UI-001..002` — PM Home overview card + project timeline render smoke tests under `src/app/(app)/pm/__tests__/` (Playwright component or vitest + RTL — planner decides; project already uses PGlite + vitest for integration tests, prefer that).
  - `TC-UI debounce` — debounce auto-save test under `src/components/timeline/__tests__/` or alongside the cell wrapper.
  - `TC-PR-001` — proposal submission from cell (already covered in `proposal.service.create.test.ts`; add a UI integration test that asserts cell → POST /api/v5/proposals round-trip).
  - `TC-PS-005..006` — historic-edit dialog confirm → `ALLOCATION_HISTORIC_EDITED` write; direct path + proposal path variants. Lives under `src/components/dialogs/__tests__/historic-edit-dialog.test.tsx` plus server-side in `src/features/allocations/__tests__/`.
  - `TC-PSN-003` — PM persona lands on `/pm` when selected; switching away redirects. Lives under `src/features/personas/__tests__/`.
  - `TC-API-004` — PATCH allocation route rejects silent historic edits without `confirmHistoric`. Lives under the allocations route tests.
- **D-22:** E2E happy path: "Anna opens /pm, clicks a project, types 60 in Sara's June cell → wish is submitted → Anna sees it in /pm/wishes." One PGlite-backed e2e test mirroring the Phase 39 e2e style (`proposal.service.e2e.test.ts`).

### Claude's Discretion
- Whether `/pm/wishes` is a new page or a redirect to `/wishes`. Default = thin wrapper that re-renders `MyWishesPanel`; planner may collapse to a redirect if that simplifies routing.
- Exact ag-grid vs custom grid choice for `timeline-grid.tsx`. ARCHITECTURE says "thin ag-grid wrapper" but the existing codebase may already have a chosen grid primitive — planner checks `src/components/grid/allocation-grid.tsx` first and reuses if possible rather than adding a second grid library.
- Whether PM Home's overview card and project list are a single query or two parallel queries (perf decision).
- The exact shape of the `PmTimelineView` / `CellView` types — planner may mirror whatever Phase 37 already exports from `src/components/timeline/` rather than inventing new ones.
- Whether `planning.read.ts` is the final home for `getPmOverview` / `getPmTimeline` or whether they live next to the API routes. Default = create `src/features/planning/planning.read.ts` per architecture.

### Folded Todos
None — no pending todos matched Phase 40.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & ADRs
- `.planning/v5.0-ARCHITECTURE.md`
  - §53 (F-001 PM persona feature)
  - §234 (PM "own dept" check)
  - §310-318 (route layout — pm/, wishes/, projects/[projectId]/)
  - §391 (timeline-grid, timeline-columns)
  - §411 (historic-edit-dialog location)
  - §547, §616-627 (getServerNowMonthKey + historic edit flag contract)
  - §785 (getProjectBurn for PM overview card)
  - §1069-1074 (historic-edit-dialog component contract)
  - §1448-1476 (Journey 1A — Anna opens PM Home data flow)
  - §1477-1502 (Journey 1B — Anna submits a wish flow)
  - §1710-1712 (empty / loading / error states for S2/S3/S4)
  - §1729 (one PM per project rule — `projects.lead_pm_person_id`)
  - §1739-1741 (mobile support matrix)

### Requirements
- `.planning/REQUIREMENTS.md`
  - L53 UX-V5-01 — role switcher
  - L54 UX-V5-02 — PM Home + project timeline + inline edit gate
  - L55 UX-V5-03 — My Wishes panel
  - L63 UX-V5-11 — historic edit confirmation dialog
  - L79 HIST-01 — historic warn rule (soft, no hard lock)

### Roadmap
- `.planning/ROADMAP.md` §169-179 — Phase 40 goal, dependencies, success criteria, test code mapping

### Prior phase context
- `.planning/phases/39-proposal-approval-workflow/39-CONTEXT.md` — edit-gate helper, proposal cell, wish card, approval queue already implemented
- `.planning/phases/37-actuals-layer-services-distribution-plan-vs-actual-cell/` — `PlanVsActualCell` component contract and reusable cell renderer
- `.planning/phases/34-foundations-personas-i18n-catalog-historic-edit-helper/` — persona types + i18n catalog bootstrap

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (confirmed on disk)
- `src/features/proposals/edit-gate.ts` — `resolveEditGate()` already returns `'direct' | 'proposal' | 'historic-warn-direct' | 'historic-warn-proposal' | 'blocked'`. Phase 40 consumes it; does NOT modify it.
- `src/features/proposals/ui/proposal-cell.tsx`, `my-wishes-panel.tsx`, `wish-card.tsx`, `reject-modal.tsx`, `approval-queue.tsx` — shipped in Phase 39, ready to mount.
- `src/features/proposals/use-proposals.ts` — existing TanStack Query hooks for create/list/approve/reject/resubmit.
- `src/components/timeline/PlanVsActualCell.tsx` — Phase 37 cell; reuse as the grid cell renderer.
- `src/components/grid/allocation-grid.tsx` — existing grid primitive; planner evaluates whether to reuse instead of introducing ag-grid fresh.
- `src/features/actuals/actuals.read.ts` — exports `getProjectBurn` and `aggregateByMonth` (confirmed at line 175).
- `src/features/personas/persona.context.tsx`, `persona.routes.ts`, `persona.types.ts` — persona provider + landing-route map.
- `src/lib/server/get-server-now-month-key.ts` — per-request cached server clock source for historic guards (Phase 33/34 output).
- `src/lib/date-utils.ts` — `getCurrentMonth()`, `generateMonthRange()`, `formatMonthHeader()` — already used by the legacy `projects/[projectId]/page.tsx`.
- Existing `/wishes` route at `src/app/(app)/wishes/page.tsx` — already renders `MyWishesPanel` scoped to Clerk `userId`.

### Established Patterns
- Route-group `(app)` = authenticated shell; all persona routes live under it.
- Client pages use `'use client'` + `useParams` + TanStack Query hooks (see existing `projects/[projectId]/page.tsx`).
- i18n via `next-intl`'s `useTranslations('v5.<namespace>')` — see wishes page.
- API routes under `src/app/api/v5/**` return `AppError` hierarchy.
- PGlite + vitest for DB integration tests; RTL for component tests.
- Tests live under `__tests__/` next to the feature.

### Integration Points
- Authenticated shell layout `src/app/(app)/layout.tsx` is where the `<PersonaSwitcher />` button + `<PersonaProvider>` must mount (verify on plan kickoff).
- `/api/v5/planning/allocations` PATCH route handles direct edits — Phase 40 extends its payload with `confirmHistoric?: boolean` if that field isn't already accepted (verify during research).
- Phase 39's `/api/v5/proposals` POST already handles wish creation; Phase 40 only consumes it.

### Known gaps (must be created by Phase 40)
- `src/features/planning/planning.read.ts` — does not exist yet.
- `src/app/(app)/pm/` — directory does not exist yet.
- `src/components/dialogs/historic-edit-dialog.tsx` — does not exist yet.
- `src/components/timeline/timeline-grid.tsx` + `timeline-columns.ts` — do not exist yet.
- `/api/v5/planning/pm-home` — does not exist yet.

</code_context>

<specifics>
## Specific Ideas

- **Reuse, don't rebuild.** Phase 39 already built the proposal cell, wish card, my-wishes panel, edit-gate helper, and approval queue. Phase 40's job is to compose these inside the PM route shell and add the three missing pieces: PM Home loader, timeline grid wrapper, historic-edit dialog.
- **Historic dialog is shared infra**, not PM-only. Keep it persona-agnostic so Phase 41 can reuse it for line-manager direct-edit historic warnings.
- **The `confirmHistoric` round-trip is the load-bearing test.** TC-PS-005/006 + TC-API-004 together prove the full soft-warn contract end-to-end. The planner should flag this as a gate.
- **Debounce only applies to direct edits.** Proposals are explicit submit-click per ADR-008. Do not debounce the proposal path.
- **Month range anchor.** 13 months (current − 1 … current + 11) avoids a visually empty left edge on the first of the month and gives PMs a one-month look-back without scroll.
- **`lead_pm_person_id` is the PM ↔ project link** per ARCHITECTURE §1729. Confirm the `projects` table has this column (added in Phase 36 schema) before the planner designs the PM Home query. If missing, the phase scope expands to include a small additive migration — call this out in the plan-check gate.

</specifics>

<deferred>
## Deferred Ideas

- **Mobile-tuned PM project timeline** (tap-a-cell → edit sheet per §1740). Desktop only in Phase 40.
- **Quarter / year zoom** on the PM timeline. Fixed to month zoom; zoom controls land in Phase 42.
- **Drill-down drawer** from a cell with a red delta. Phase 42.
- **Persona-scoped notifications** ("Per will be notified..."). Out of scope; see Phase 39 deferred list.
- **PM dashboard widgets** (burn charts, velocity, etc.) beyond the single overview card. Post-v5.0 polish.
- **Replacing the legacy `/projects/[projectId]` generic page** with the PM timeline. Out of scope — the generic page stays as the admin/RD fallback.

### Reviewed Todos (not folded)
None — no todos matched Phase 40.

</deferred>

---

*Phase: 40-persona-views-part-1-pm*
*Context gathered: 2026-04-08*
