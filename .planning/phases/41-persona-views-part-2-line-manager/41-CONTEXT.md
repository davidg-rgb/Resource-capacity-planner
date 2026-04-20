# Phase 41: Persona views Part 2 — Line Manager — Context

**Gathered:** 2026-04-08
**Status:** Ready for research / planning
**Mode:** `--auto` (recommended defaults selected by Claude; review and override before planning if needed)

<domain>
## Phase Boundary

Second persona-view phase (after Phase 40 PM). Ships the Line Manager persona surface on top of the primitives already landed in Phases 33–40.

In scope:
- **Line Manager Home** (`/line-manager`) — capacity heatmap (people × months) with v5.0 thresholds: green 60–90%, red >100%, yellow <60%, grey absence (UX-V5-04 / S5).
- **Group timeline** (`/line-manager/timeline`) — person rows × month columns, each row expandable to show per-project breakdown, inline direct edit (no approval gate — line manager is editing within their own department), visible change-log excerpt per cell (UX-V5-05 / S6).
- **Approval queue enrichment** — `/line-manager/approval-queue` already exists from Phase 39 but must surface the **impact preview** row ("Sara's June utilization 40% → 90%") using real `capacity.read` data. Counter-proposal is explicitly absent (UX-V5-06 / S7).
- **Change log feed** (`/admin/change-log` — per ARCHITECTURE §331) — filterable by project / person / period / author with persona-scoped defaults (UX-V5-10 / S12).
- Required new read-model modules: `features/capacity/capacity.read.ts`, `features/change-log/change-log.read.ts`.
- Required new API routes: `GET /api/v5/capacity`, `GET /api/v5/change-log`, `GET /api/v5/planning/allocations?scope=line-manager` extension (or new route).
- Line Manager nav entry wiring and persona-route guard.

Out of scope (deferred):
- Staff / R&D / drill-down drawer / long-horizon zoom — Phase 42.
- Counter-proposal flow — explicitly out per UX-V5-06 and REQUIREMENTS L99.
- Admin self-service CRUD registers — Phase 43.
- Bulk approve/reject in the queue.
- Mobile layouts (Line Manager timeline + import are desktop-only; Phase 41 ships `<DesktopOnlyScreen>` interstitial per TC-MOBILE-001).

</domain>

<decisions>
## Implementation Decisions

### Routes & file layout (matches ARCHITECTURE §315-318, §331)
- **D-01:** Create the missing `src/app/(app)/line-manager/` shells:
  - `line-manager/page.tsx` — LM Home (capacity heatmap) — **NEW**
  - `line-manager/timeline/page.tsx` — group timeline — **NEW**
  - `line-manager/approval-queue/page.tsx` — **EXISTS** from Phase 39; extend to show impact preview rows per card. Do NOT rewrite.
  - `line-manager/import-actuals/page.tsx` — **EXISTS** from Phase 38; leave alone.
- **D-02:** Change log feed page lives at `src/app/(app)/admin/change-log/page.tsx` per ARCHITECTURE §331. The page itself is accessible to all personas (it's read-only history) but defaults to a **persona-scoped filter** when a non-admin persona opens it:
  - PM default: `proposerId = currentPersona.personId`
  - Line Manager default: `departmentId = currentPersona.departmentId`
  - Staff default: `personId = currentPersona.personId`
  - R&D / Admin default: no filter (full feed)
  The filter bar lets the user clear / override defaults.
- **D-03:** Persona route guard: add a small client-side helper `assertPersonaOrRedirect(persona, allowed[])` used by the `line-manager/*` pages. If active persona is not in `allowed`, render a "switch persona" hint card (matching the Phase 39 approval-queue page pattern). This is a UX shortcut, NOT a security boundary (ADR-004) — the API still authorizes by org membership.

### Capacity read-model (new feature folder)
- **D-04:** New module `src/features/capacity/capacity.read.ts` with two exports matching ARCHITECTURE §945:
  ```
  getPersonMonthUtilization({ orgId, departmentId?, monthRange }): Promise<UtilizationMap>
  getCapacityBreakdown({ orgId, scope, scopeId, monthKey }): Promise<BreakdownRow[]>
  ```
  `UtilizationMap` keyed `${personId}::${monthKey}` → `{ plannedHours, targetHours, utilizationPct, status: 'under' | 'ok' | 'over' | 'absent' }`.
- **D-05:** Thresholds are v5.0-specific and **must not** reuse the v4.0 analytics thresholds (which use >100 overloaded / <50 underutil). The v5 thresholds are:
  - `status = 'absent'` if person has an absence (vacation/sick) covering the whole month, OR if `targetHours === 0`
  - `status = 'over'` if `utilizationPct > 100`
  - `status = 'under'` if `utilizationPct < 60`
  - `status = 'ok'` otherwise (60 ≤ pct ≤ 100; UI splits into two shades — green 60–90, yellow-green 90–100 — see D-11)
  Roadmap success criterion says "green 60–90, red >100, yellow <60, grey absence" — use green for 60–90 and treat 90–100 as green for parity with the spec. Status enum stays 4 values; the 60–90 vs 90–100 split is purely a UI shading detail.
- **D-06:** `targetHours` per person-month: read from existing `people.target_hours_per_month` if populated (v4.0 column — planner must verify). If missing, fall back to `160` (configurable org constant) and flag as "default" in the UtilizationMap entry so the UI can show a "using default capacity" note.
- **D-07:** `plannedHours` sums APPROVED `allocations` rows only (NOT `allocation_proposals`). Pending proposals do not affect heatmap color — otherwise the PM's un-approved wish would pre-redden the LM's own screen.
- **D-08:** Absence detection: check an `absences` table if one exists (planner verifies — v4.0 may have this; if not, defer absence-grey to a later phase and document the partial delivery in SUMMARY). For Phase 41, absence detection can return `status='absent'` only when `targetHours === 0`; full vacation integration is deferred.

### Change-log read-model (new file in existing feature folder)
- **D-09:** New file `src/features/change-log/change-log.read.ts` matching ARCHITECTURE §822:
  ```
  getFeed({ orgId, filter: { personaScope?, projectIds?, personIds?, entity?, actions?, dateRange? }, pagination: { limit, cursor? } }):
    Promise<{ entries: ChangeLogEntry[], nextCursor: string | null }>
  ```
- **D-10:** Cursor pagination on `(created_at DESC, id DESC)` to match existing feed conventions; limit default 50, max 200. Use Drizzle's `lt()` comparison on the composite cursor.

### UI components
- **D-11:** **Line Manager heatmap** — the existing `src/components/heat-map/` suite is v4.0 analytics-scoped (see `heat-map-table.tsx` using `@/features/analytics/analytics.types` and >100/<50 thresholds). Do NOT fork it.
  - Create a NEW component set under `src/components/capacity/`:
    - `capacity-heatmap.tsx` — table with rows = people, columns = months, cells colored per v5 thresholds
    - `capacity-heatmap-cell.tsx` — cell with utilization % + color state
    - `capacity-heatmap-legend.tsx` — threshold legend
  - Reuse `formatMonthHeader` from `@/lib/date-utils` and the same column-header layout pattern as the existing heat-map-table for visual consistency, but do not import from `@/features/analytics`.
  - Color tokens (Tailwind): `bg-green-200 dark:bg-green-900/40` (60–100 ok), `bg-amber-200 dark:bg-amber-900/40` (under <60), `bg-red-300 dark:bg-red-900/60` (over >100), `bg-neutral-200 dark:bg-neutral-800` (absent/grey). Exact tokens can be refined by the planner against the existing UI brand reference.
- **D-12:** **Group timeline** — reuse the Phase 40 `<TimelineGrid>` component. Add a `scope='line-manager'` prop or a thin wrapper that injects the LM-specific cell renderer. The LM cell differs from the PM cell in exactly two ways:
  1. It always takes the `direct` edit branch when `resolveEditGate()` returns `direct` (person in own dept) — proposal mode is still possible for out-of-dept people, but LM should never see those in this view because the query filters on `department_id = currentPersona.departmentId`.
  2. It renders an expandable disclosure triangle that reveals per-project breakdown rows (child rows) below the person row. The breakdown comes from a new `planning.read.getGroupTimeline({ orgId, departmentId, monthRange })` helper that returns `{ persons: [{ personId, projects: [{ projectId, months: Record<monthKey, hours> }] }] }`.
- **D-13:** **Approval queue impact preview** — extend the existing `ApprovalQueue` component (or its `wish-card.tsx` child) to fetch impact data per card. Backend:
  - Option A: batch `getCapacityBreakdown({ scope: 'person', scopeId: proposal.person_id, monthKey: proposal.month })` calls — one per card
  - Option B: extend the proposals list query to join utilization data server-side
  Default = Option A (simpler, matches CONTEXT 39 D-15 where impact was left to planner). Cache via TanStack Query per-proposal key. The preview string template is:
  `"${personName}'s ${monthLabel} utilization ${currentPct}% → ${projectedPct}%"` (matches REQUIREMENTS L45).
- **D-14:** **Change log feed** — new component `src/components/change-log/change-log-feed.tsx` per ARCHITECTURE §417. Table with columns: time, actor, entity, action, target (person/project), summary. Each row expandable to show `previousValue` → `newValue` diff. Filter bar above the table:
  - Project multi-select
  - Person multi-select
  - Period (start date / end date)
  - Actor multi-select (from distinct `actorPersonaId` values in the current result set)
  - Entity/action dropdowns (optional, behind an "Advanced" disclosure)
  Filters sync to URL query params so links are shareable. Default filter values are derived from active persona per D-02.

### API routes
- **D-15:** New: `GET /api/v5/capacity?departmentId=&startMonth=&endMonth=` → returns `UtilizationMap` serialized as `{ cells: Array<{ personId, monthKey, plannedHours, targetHours, utilizationPct, status }>, people: PersonLite[] }`. 400 if monthRange > 24 months.
- **D-16:** New: `GET /api/v5/change-log?projectIds=&personIds=&entity=&actions=&from=&to=&cursor=&limit=` → `{ entries, nextCursor }`. Empty params = no filter.
- **D-17:** Extend or add: `GET /api/v5/planning/allocations?scope=line-manager&departmentId=&startMonth=&endMonth=` — may already exist from Phase 40 (the existing file `src/app/api/v5/planning/allocations/route.ts` was created in Phase 40 Wave 1 with `scope=pm`). Planner verifies and adds the `line-manager` scope branch there rather than creating a sibling file. The LM response shape includes the per-project breakdown needed by D-12.

### i18n
- **D-18:** New i18n keys under `v5.lineManager.*` and `v5.changeLog.*` in `src/messages/sv.json` + `en.json` + `keys.ts`. Reuse `v5.proposals.*` where applicable for approval-queue strings. Swedish-first per prior phases.

### Persona-switch impact (continues Phase 40 D-19/D-20 pattern)
- **D-19:** The Phase 40 query-invalidation hook already broadens to all persona-scoped prefixes (`line-manager-*`, `staff-*`, `rd-*`). Phase 41 just needs to USE the key convention:
  - `['line-manager-capacity', departmentId, monthRange]`
  - `['line-manager-group-timeline', departmentId, monthRange]`
  - `['approval-queue', departmentId]` (already exists from Phase 39 — verify key shape)
  - `['change-log', filterHash]`
  No changes to the invalidation hook itself.

### Tests (mapping to roadmap success criteria)
- **D-20:** Test codes and locations:
  - **TC-CP-001..004** — capacity.read threshold boundary tests — `src/features/capacity/__tests__/capacity.read.test.ts` (PGlite)
  - **TC-API-050..051** — `GET /api/v5/capacity` contract — `src/app/api/v5/capacity/__tests__/capacity.contract.test.ts` (PGlite)
  - **TC-PS-001..010** — group timeline direct edit + change-log visibility — reuse `src/features/proposals/__tests__/` patterns; new file `src/features/planning/__tests__/group-timeline.test.ts` covers the read helper
  - **TC-API-040..041** — `GET /api/v5/change-log` contract + feed filter edge cases — `src/app/api/v5/change-log/__tests__/change-log.contract.test.ts` (PGlite)
  - **TC-PR-004..009** — approval queue impact preview + approve/reject — extend existing `src/features/proposals/__tests__/approval-queue.test.tsx` + a PGlite integration test for impact preview
  - **TC-CL-*** — universal change-log invariants (the recordChange helper is already tested in Phase 35; Phase 41 adds feed-read coverage only)
  - **TC-E2E-2A** — end-to-end "Per switches to line-manager → lands on /line-manager → heatmap shows people → approval queue count" — `src/features/planning/__tests__/line-manager.e2e.test.ts` (PGlite + RTL)
  - **TC-MOBILE-001** — `<DesktopOnlyScreen>` interstitial on `/line-manager/timeline` at <768px viewport — component test
  - **TC-NEG-013** — PM persona cannot access `/line-manager/*` routes (page-level guard test)
- **D-21:** Happy-path e2e (TC-E2E-2A) is the load-bearing gate — must pass before verification.

### Claude's Discretion
- Exact ag-grid column definitions for the group timeline's expandable rows (TanStack Table tree model vs ag-grid master/detail). Default: ag-grid master/detail since Phase 40 already uses ag-grid.
- Whether the approval-queue impact preview is client-computed from already-loaded data or server-computed via `getCapacityBreakdown`. Default: server-computed per D-13 Option A.
- Whether absence detection extends to a new `absences` table or reuses whatever v4 has. Planner researches.
- Whether `<DesktopOnlyScreen>` exists from a prior phase or needs to be created; if it doesn't exist, plan a thin component.
- Persona switcher already shows `departmentId: ''` placeholder for line-manager personas (noted in Phase 40-03 SUMMARY). Phase 41 should wire a real department dropdown into the persona picker so switching to line-manager selects a concrete department.

### Folded Todos
None — no pending todos matched Phase 41.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & ADRs
- `.planning/v5.0-ARCHITECTURE.md`
  - §57 (F-005 Line Manager capacity heatmap feature)
  - §83, §213 (ADR-004b — LM direct-edit gate keyed on department, not project ownership)
  - §229 (one-LM-per-department constraint)
  - §315-318 (route layout for line-manager/*)
  - §331 (admin/change-log/page.tsx location)
  - §355-356 (api/v5/change-log + api/v5/capacity routes)
  - §373-377 (features/change-log layout — service exists, read missing)
  - §395-397 (features/capacity layout — does not exist)
  - §414-417 (approval-queue-card + change-log-feed component locations)
  - §581 (planning.read call-site for scope=line-manager)
  - §822-840 (change-log.read.getFeed contract)
  - §945-956 (capacity.read contract)
  - §995 (Persona discriminated union — line-manager variant)
  - §1169 (listProposalsForApprovalQueue — join people on department_id)
  - §1236 (change_log.actor_persona_id shape)
  - §1289-1291 (planning.read scope param)
  - §1404 (api/v5/change-log → change-log.read.getFeed mapping)
  - §1423-1428 (api/v5/capacity → capacity.read mapping)
  - §1514 (query invalidation keys — line-manager-heatmap, approval-queue)
  - §2077 (TC-PSN-005 line-manager scope filter)
  - §2124 (TC-E2E-2A Journey 2A spec)
  - §2196 (TC-PSN-010 persona dropdown)
  - §2198 (TC-MOBILE-001 desktop-only interstitial)
  - §2243 (TC-NEG-013 PM cannot access /line-manager/*)

### Requirements
- `.planning/REQUIREMENTS.md`
  - L56 UX-V5-04 — LM Home capacity heatmap + thresholds
  - L57 UX-V5-05 — LM group timeline + direct edit + change log visible
  - L58 UX-V5-06 — approval queue with impact preview; counter-proposal out
  - L62 UX-V5-10 — change log feed filterable with persona-scoped defaults
  - L45 — impact preview phrase template

### Roadmap
- `.planning/ROADMAP.md` §181-191 — Phase 41 goal, deps, 4 success criteria, test code mapping

### Prior phase context
- `.planning/phases/40-persona-views-part-1-pm/40-CONTEXT.md` — edit-gate, timeline-grid, persona provider, query invalidation hook (reused by 41)
- `.planning/phases/40-persona-views-part-1-pm/40-03-SUMMARY.md` — noted: `line-manager` persona has `departmentId: ''` stub; Phase 41 wires the real department dropdown
- `.planning/phases/39-proposal-approval-workflow/39-CONTEXT.md` — approval-queue component + wish-card reused and extended
- `.planning/phases/35-foundations-universal-change_log-infrastructure/` — change_log schema + recordChange (writer) — Phase 41 reads only

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (confirmed on disk)
- `src/features/change-log/change-log.service.ts` + `.schema.ts` + `.types.ts` — writer + types exist; only `change-log.read.ts` missing.
- `src/features/proposals/ui/approval-queue.tsx` + `wish-card.tsx` — Phase 39 components; Phase 41 extends them.
- `src/app/(app)/line-manager/approval-queue/page.tsx` — Phase 39 route; Phase 41 does not modify the page itself, only the component it mounts.
- `src/app/(app)/line-manager/import-actuals/page.tsx` — Phase 38 route; untouched.
- `src/components/timeline/timeline-grid.tsx` + `timeline-columns.ts` + `pm-timeline-cell.tsx` — Phase 40 primitives; group timeline reuses `<TimelineGrid>` directly.
- `src/features/planning/planning.read.ts` — Phase 40 file; add `getGroupTimeline` helper here.
- `src/app/api/v5/planning/allocations/route.ts` — Phase 40 GET route with `scope=pm`; extend with `scope=line-manager` branch rather than creating a sibling.
- `src/features/personas/persona.context.tsx` — includes query invalidation on persona change (Phase 40 broadened it to all persona prefixes).
- `src/features/personas/persona.types.ts` — persona discriminated union already has `line-manager` variant.
- `src/components/dialogs/historic-edit-dialog.tsx` — Phase 40; reused if LM direct-edits a historic month.
- `src/features/allocations/allocation.service.ts` — `patchAllocation` with historic gate — reused for LM direct edits.

### NOT reusable (explicitly)
- `src/components/heat-map/*` and `src/features/analytics/analytics.types.ts` HeatMap types — v4.0 thresholds (>100/<50) do not match v5.0 spec. Do NOT import from these in the new capacity heatmap.
- Any v4 "capacity" helpers inside `analytics.service.ts` — they compute dashboard-wide aggregates, not LM-department-scoped utilization.

### Established Patterns
- `(app)` route group for authenticated shells.
- Client pages: `'use client'` + `useParams` + TanStack Query hooks.
- i18n via `useTranslations('v5.<namespace>')`, keys added to sv.json + en.json + keys.ts.
- API routes under `src/app/api/v5/**` return AppError hierarchy.
- PGlite + vitest for DB integration tests; RTL for component tests.
- `__tests__/` folders next to feature/component.

### Integration Points
- Persona switcher department dropdown (Phase 40-03 stub) — Phase 41 feeds it via a new `/api/v5/departments` list endpoint or the existing `/api/departments` if present (planner verifies).
- `<TimelineGrid>` props need to accept a `breakdown` render-prop or a child-row shape for the group-timeline expand/collapse.
- Approval queue card already renders Approve/Reject/Reason buttons — adding the impact preview strip is a purely additive change.

### Known gaps (must be created by Phase 41)
- `src/features/capacity/capacity.read.ts` + types + tests — does not exist
- `src/features/change-log/change-log.read.ts` + tests — does not exist
- `src/app/(app)/line-manager/page.tsx` — does not exist (LM Home)
- `src/app/(app)/line-manager/timeline/page.tsx` — does not exist (group timeline)
- `src/app/(app)/admin/change-log/page.tsx` — does not exist (change log feed)
- `src/app/api/v5/capacity/route.ts` — does not exist
- `src/app/api/v5/change-log/route.ts` — does not exist
- `src/components/capacity/` — new component set
- `src/components/change-log/change-log-feed.tsx` — does not exist
- `<DesktopOnlyScreen>` component — may not exist; planner verifies

</code_context>

<specifics>
## Specific Ideas

- **Don't fork the v4 heatmap.** The thresholds are different and mixing them in one component is the path to a future bug. New `src/components/capacity/*` set scoped to v5 semantics.
- **Capacity read is department-scoped.** Always require `departmentId` for the LM heatmap query. A future R&D cross-department view can add a different helper.
- **Pending proposals do NOT color the LM heatmap** (D-07). This is deliberate and matches ADR-001's two-table model — proposals are wishes, not commitments.
- **Approval queue impact preview is the load-bearing new UX** for UX-V5-06. Make sure TC-PR-004..009 explicitly assert the `"X's June utilization 40% → 90%"` string format.
- **Persona-scoped filter defaults in the change log feed** is what makes the page actually useful for a line manager opening it cold — otherwise they'd see 10000 rows and bounce. Defaults must be computed client-side from `persona.context` and applied before the first fetch.
- **ADR-004b** (LM direct-edit gate keyed on department, NOT project) is already enforced by the Phase 40 `resolveEditGate` helper. Phase 41 just needs to pass `persona.kind='line-manager'` + `departmentId` correctly.
- **Change log feed pagination** uses cursor-based (not offset) because the feed grows monotonically and offset pagination drifts under concurrent writes.

</specifics>

<deferred>
## Deferred Ideas

- **Counter-proposal flow** — explicitly out per UX-V5-06 / REQUIREMENTS L99.
- **Bulk approve/reject in queue** — future polish.
- **Absences integration** — if no `absences` table exists in v4, ship with `status='absent'` only when `targetHours === 0` (D-08). Full vacation calendar integration is a later phase.
- **Mobile layouts for LM timeline + import** — desktop-only per TC-MOBILE-001; mobile polish deferred to post-v5.0.
- **R&D cross-department capacity view** — Phase 42 or later; separate read helper.
- **Change log feed full-text search** — filter bar only in Phase 41; FTS is post-v5.0.
- **Notifications on approval queue events** — out of scope; see Phase 39 deferred list.

### Reviewed Todos (not folded)
None — no todos matched Phase 41.

</deferred>

---

*Phase: 41-persona-views-part-2-line-manager*
*Context gathered: 2026-04-08*
