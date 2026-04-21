# Phase 52: Per-journey friction fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 52-per-journey-friction-fixes
**Mode:** Auto (user selected "run with recommended choices for all subjects")
**Areas discussed:** PM friction, LM badge + endpoint, R&D zoom + overcommit, Staff/Shared/Admin + test strategy

---

## Gray-Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| PM friction (PM-01..04) | Default-project auto-select, pending-wish chip, historic-edit gating, proposal-state snapshots | ✓ |
| LM badge + endpoint (LM-01..03) | Queue-count endpoint shape, badge polling + placement, project-breakdown cells | ✓ |
| R&D zoom + overcommit (RD-01, RD-02) | Zoom control UX, overcommit dialog structure | ✓ |
| Staff/Shared/Admin + test strategy | readOnly prop, drawer deep-link, dependent toast, click-counter, spec organization, flag granularity | ✓ |

**User's choice:** Free-text "run with recommended choices for all subjects"
**Interpretation:** Auto-mode — all 4 areas selected, recommended option auto-selected for every decision within each area, no follow-up questions.

---

## PM friction (PM-01..04)

### PM-01 — Default-project auto-select logic

| Option | Description | Selected |
|--------|-------------|----------|
| Server-computed `defaultProjectId` on `/api/v5/planning/pm-home` | Server computes from `projects.length === 1`; future hook for preference/most-recent | ✓ (recommended) |
| Client-side localStorage "last visited" | Browser remembers last-opened project per persona | |
| User-selectable preference | New preference UI to pin a default project | |

**Rationale:** REQ PM-01 language ("when the API returns exactly one project OR a defaultProjectId") is already server-oriented. localStorage fragments across devices. Server centralization enables future business rules without client redeploy.

### PM-02 — Pending-wish chip location and visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Standalone `<PendingWishChip />` in top-bar | Separate component next to persona-switcher; visible when pending+rejected > 0 | ✓ (recommended) |
| Badge on persona-switcher | Suffix count on switcher label | |
| Inline on `/pm` home only | Non-persistent, shown only on home page | |

**Rationale:** REQ explicitly says "top-bar." Deep-link to rejected tab collapses journey 1C from 4→2 clicks per UX-AUDIT. Standalone component avoids coupling to persona-switcher internals.

### PM-03 — Historic-edit warning gating

| Option | Description | Selected |
|--------|-------------|----------|
| Server-month source, always-on | Uses `get-server-now-month-key.ts`; fires every time for past-month edits | ✓ (recommended) |
| Client `Date.now()` | Uses browser clock; susceptible to clock drift | |
| Server-month with dismiss-with-memory | Fires once per session, then remembers | |

**Rationale:** Server month prevents client-clock manipulation and timezone drift. Helper exists. Always-on matches "affects past reports" audit criticality.

### PM-04 — Proposal-state visual snapshot test host

| Option | Description | Selected |
|--------|-------------|----------|
| 4 cases in `pm-timeline-cell.test.tsx` (Vitest snapshots) | Colocated with component, fast unit-test cycle | ✓ (recommended) |
| Playwright visual regression | E2E-level snapshot against rendered page | |
| Storybook stories | Isolated component docs + snapshot | |

**Rationale:** Colocates tests with component. 4 separate `it()` blocks = diff-able snapshots. Vitest faster than Playwright round-trip for pure render assertions.

---

## LM badge + endpoint (LM-01..03)

### LM-03 — Endpoint shape for `/api/v5/proposals/queue/count`

| Option | Description | Selected |
|--------|-------------|----------|
| `?departmentId=<id>` → `{count}`; `proposed` state only | Per-department filter, tenant-scoped | ✓ (recommended) |
| Tenant-total (no departmentId filter) | Global count for all LMs in org | |
| Include counter_proposed in count | Broader definition of "queue" | |

**Rationale:** Per-department filter matches LM workflow (Per only approves Electronics Design). `'proposed'` only — counter-proposals are pending PM action, not LM's queue. Tenant isolation automatic (existing middleware).

### LM-01 — Badge polling strategy

| Option | Description | Selected |
|--------|-------------|----------|
| TanStack `refetchInterval: 60_000` (1-min polling) | Shared hook deduplicates across badge + switcher | ✓ (recommended) |
| Mount-only fetch (no polling) | Requires page refresh for count updates | |
| WebSocket push | Real-time but needs infra | |

**Rationale:** 1-min polling balances freshness vs. request load. No WebSocket infra exists. Shared hook avoids duplicate fetches.

### LM-02 — Project-breakdown cell rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Extend `lm-timeline-cell.tsx` with stacked project sub-rows | `<div role="row">` per allocation inside cell | ✓ (recommended) |
| New `LmTimelineCellBreakdown` wrapper | Parallel component tree | |
| Table inside cell | `<table>` per cell — heavier markup | |

**Rationale:** Component exists; extension, not new. Stacked rows match journey 2C narrative. `role="row"` enables Playwright `getByRole('row')`.

---

## R&D zoom + overcommit (RD-01, RD-02)

### RD-01 — Zoom control UX

| Option | Description | Selected |
|--------|-------------|----------|
| 3-button segmented toggle (Månad/Kvartal/År), default month | Reuses existing `zoom-controls.tsx` | ✓ (recommended) |
| Select dropdown | Lower discoverability for 3 options | |
| Continuous slider | Complex UX for discrete levels | |

**Rationale:** Segmented toggle higher discoverability. `zoom-controls.tsx` + `useZoom.ts` already exist. `month` default matches PM/Staff, lowest cognitive load.

### RD-02 — Overcommit dialog structure

| Option | Description | Selected |
|--------|-------------|----------|
| Two labeled sections (projects + people tables) with per-row links | Mirrors journey 4B narrative | ✓ (recommended) |
| Single combined table (project×people matrix) | Denser but harder to scan | |
| Tabbed view (projects tab / people tab) | Extra click per journey | |

**Rationale:** Two sections mirror 4B narrative literally. Per-row links = 1-click navigation. REQ RD-02 explicit: "lists contributing projects AND most-overbooked people" + "navigation affordance."

---

## Staff/Shared/Admin + test strategy

### STAFF-01 — readOnly variant

| Option | Description | Selected |
|--------|-------------|----------|
| `readOnly?: boolean` prop on existing `TimelineGrid.tsx` | No onClick, no hover affordances, no inline edit | ✓ (recommended) |
| Separate `StaffTimeline` wrapper component | Parallel component tree | |
| Role-based check inside TimelineGrid | Persona coupling inside primitive | |

**Rationale:** Prop-based reuse avoids duplication. Staff journey 3A is narrow ("completely read-only"). Hover affordances hidden matches narrative.

### SHARED-01 — Drill-down drawer deep-link URL

| Option | Description | Selected |
|--------|-------------|----------|
| Query-param style (`?drawer=person-month&personId=<>&month=<>`) | Preserves underlying route, shareable URL | ✓ (recommended) |
| Path-based (`/pm/projects/<id>/drill/<person>/<month>`) | New route segment per drawer variant | |
| Hash fragment | Not SSR-friendly | |

**Rationale:** Query-params preserve underlying route (back-navigate returns to timeline). Shareable URL satisfies REQ deep-link. `Drawer.tsx` already has focus-trap.

### ADMIN-01 — Dependent-list rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Toast with expandable `<details>` block | Reuses existing toast primitive + `lib/errors.ts` | ✓ (recommended) |
| Modal dialog | Heavier; requires dismiss click | |
| Separate panel | Navigation away from archive action | |

**Rationale:** Toast matches REQ "DEPENDENT_ROWS_EXIST toast" wording literally. `<details>` keeps toast terse. Existing error plumbing — no new component needed.

### Data-clicks counter design

| Option | Description | Selected |
|--------|-------------|----------|
| Env-gated global React Context (`NEXT_PUBLIC_E2E_CLICK_TRACKING`) | Zero prod overhead; attribute-based annotation | ✓ (recommended) |
| Always-on with dev flag | Runtime cost in production | |
| Playwright-page-eval-based counting | Fragile against re-mounts | |

**Rationale:** Env-gated = zero production overhead. Attribute-based = opt-in per journey-critical element. Global context + `window` exposure = single, testable source of truth.

### Playwright spec organization

| Option | Description | Selected |
|--------|-------------|----------|
| One spec per journey ID (11 specs) | `e2e/{persona}/{journey-id}.spec.ts` — 1:1 with USER-JOURNEYS.md | ✓ (recommended) |
| One spec per persona (5 specs) | All journeys bundled per persona | |
| Single comprehensive spec | Low parallelism | |

**Rationale:** 1:1 matches v5.0-USER-JOURNEYS.md. Parallel execution (one failure = one journey). REQ verification list references journey IDs directly.

### Flag fallback granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Single `uiV6PerJourney` flag gates all 13 REQs atomically | Matches REQ PJ-FLAG + Phase 51 single-flag pattern | ✓ (recommended) |
| Sub-feature toggles per REQ | 2^13 test-matrix explosion | |
| Persona-cluster flags (PM/LM/RD/Staff/Admin) | 5 flags = 32-combo matrix | |

**Rationale:** REQ PJ-FLAG says "All per-journey changes gated behind `uiV6.perJourney`." Matches Phase 50/51 single-flag pattern. Sub-flags create test-matrix explosion.

---

## Claude's Discretion

- Exact i18n key wording (Swedish/English) for new keys
- Test file organization beyond one-per-journey (subfolder structure flexible)
- Whether to create `/api/v5/server-now` helper route or thread server-month through existing API responses
- Toast UI polish (border color, icon) for ADMIN-01 `<details>`
- Whether `PendingWishChip` uses design-system badge primitive or inline Tailwind
- Order of implementation within Phase 52 (logical wave grouping)
- Click-tracker attribute value format (`"true"` vs numeric weight vs journey-id tag)

## Deferred Ideas

- Counter-proposal flow UI (deferred from v5.0)
- Email/Slack notifications (v6.0 is in-app only)
- WebSocket push for real-time counts (post-v6.0)
- Preference-based `defaultProjectId` beyond `length === 1` (post-v6.0)
- NVDA/JAWS a11y testing for grouped `<select>` (axe-core only in Phase 52)
- Historic-edit dismiss-with-memory (rejected for audit integrity)
- Production click-tracker for analytics (test-only in Phase 52)
- Notification bell persona-scoping (Phase 53 POLISH-01)
- `NavItemDef.visibleFor` (Phase 53 POLISH-02)
- Dashboard quadrant redesign (Phase 54 optional)
