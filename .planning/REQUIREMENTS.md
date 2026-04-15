# v6.0 Requirements — UI Restructure & Journey Frictionless

**Milestone:** v6.0
**Plan source of truth:** [.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md](ui-reviews/UI-RESTRUCTURE-PLAN-v2.md)
**Derived from:** `UX-AUDIT-PERSONAS.md`, `WIDGET-INVENTORY.md`, `v5.0-USER-JOURNEYS.md`
**v5.0 requirements archived at:** `.planning/milestones/v5.0-REQUIREMENTS.md`

Every requirement is traceable to (a) a user-journey click-count target and/or (b) a specific duplicate or broken surface identified in the audit. Waves are implementation phasing; REQ-IDs are persistent.

---

## v6.0 Requirements

### Pre-Flight Verification (Wave −1 → Phase 48)

- [ ] **VERIFY-01**: `pre-flight-report.md` documents whether `getLandingRoute(persona)` exists in `src/features/personas/persona.routes.ts`
- [ ] **VERIFY-02**: `pre-flight-report.md` documents whether `/api/v5/proposals/queue/count` endpoint exists; if missing, add to Wave 3.2 scope
- [ ] **VERIFY-03**: `pre-flight-report.md` documents Phase 41 department-picker status (component exists / needs build) and scopes the fix in Wave 0 if needed
- [ ] **VERIFY-04**: `/api/admin/change-log` and `/api/admin/people` 500 root causes documented from live server logs
- [ ] **VERIFY-05**: Tenant custom-dashboard audit run via corrected SQL (`SELECT organization_id, clerk_user_id, dashboard_id FROM dashboard_layouts WHERE layout::text ~* 'discipline-progress|discipline-demand|project-impact|utilization-heat-map|bench-report|strategic-alerts|resource-conflicts'`) — report lists affected layouts with strip/migrate decision per row
- [ ] **VERIFY-06**: All 12 existing Playwright specs from Phase 47 inventoried with classification (keep / update / retire) per spec
- [ ] **VERIFY-07**: `sidebar.staff` and `sidebar.projects` existing meanings documented to prevent i18n key collision
- [ ] **VERIFY-08**: `v5.persona.kinds.*` keys present in both `messages/sv.json` and `messages/en.json` (verified by `jq`)
- [ ] **VERIFY-09**: Plan-vs-actual cell and timeline-grid component reuse across PM / Staff / R&D confirmed by snapshot comparison

### Unbreak Broken Surfaces (Wave 0 → Phase 49)

- [ ] **UNBREAK-01**: `/line-manager` renders a functional department picker; the raw i18n key `v5.lineManager.home.selectDepartment` no longer appears
- [ ] **UNBREAK-02**: `/line-manager/timeline` renders a functional department picker; raw `v5.lineManager.timeline.selectDepartment` no longer appears
- [ ] **UNBREAK-03**: PM Home at `src/app/(app)/pm/page.tsx:60` falls through to the empty-state translation when `data.projects.length === 0` instead of remaining on the loading spinner
- [ ] **UNBREAK-04**: `/admin` landing (Ändringslogg) loads without rendering the "Kunde inte ladda ändringsloggen" error; change-log entries populate
- [ ] **UNBREAK-05**: `/admin/people` loads without rendering "Kunde inte ladda listan"; person rows populate
- [ ] **UNBREAK-06**: `PersonaGate` error message reads the persona kind from the `allowed` prop; no hardcoded "linjechefs-personan" when the actual allowed persona is admin or another kind
- [ ] **UNBREAK-07**: Playwright spec inventory complete with updates applied (specs that navigate through `/team`, `/projects`, `/wishes` updated to use new paths / redirects)

### Persona-Aware Landing & Navigation (Wave 1 → Phase 50)

- [ ] **NAV-01**: Root path (`/`) redirects to `getLandingRoute(persona)` via a client-side `PersonaRedirect` in `(app)/page.tsx`; signed-out users keep the existing Clerk `orgRole`-based routing; behavior gated behind `uiV6.landing` flag
- [ ] **NAV-02**: `SECTION_NAV` in `src/components/layout/side-nav.tsx` exposes persona-scoped items for `/pm`, `/line-manager`, `/staff`, `/rd`, and an expanded `/admin` (people / projects / change-log promoted alongside reference data)
- [ ] **NAV-03**: Breadcrumbs include a "Home" link that resolves to `getLandingRoute(persona)`; snapshot tests refreshed
- [ ] **NAV-04**: Persona switcher collapses kind + person into a single grouped `<select>` (`<optgroup>` per kind); auto-picks the signed-in user's Person row when exactly one match; disables PM/Staff options when zero matches; persists last-selected Person to `localStorage` when >1 match; impersonation (admin viewing as PM) requires explicit manual pick
- [ ] **NAV-05**: 18 new i18n keys under `sidebar.personaSections.*` added to both `messages/sv.json` and `messages/en.json` with exact strings per `UI-RESTRUCTURE-PLAN-v2.md` §6

### Lean Cleanup — Duplicate Removal (Wave 2 → Phase 51)

- [ ] **LEAN-01**: `next.config.ts.redirects[]` contains permanent (308) redirect from `/team` → `/admin/people` (and `/team/:path*` → `/admin/people/:path*`); the source page `src/app/(app)/team/page.tsx` is deleted
- [ ] **LEAN-02**: Permanent redirect from `/projects` → `/admin/projects`; `src/app/(app)/projects/page.tsx` is deleted; `/projects/[projectId]` detail page preserved at its current URL; hard-coded `<Link href="/projects">` at `projects/[projectId]/page.tsx:167` updated
- [ ] **LEAN-03**: Permanent redirect from `/wishes` → `/pm/wishes`; `src/app/(app)/wishes/page.tsx` is deleted
- [ ] **LEAN-04**: `/input` renders the people list only once (left-sidebar picker); main area shows a single "Välj en person…" empty-state prompt instead of a second flat list
- [ ] **LEAN-05**: Three dead widget files deleted — `discipline-progress-widget.tsx`, `discipline-demand-widget.tsx`, `project-impact-widget.tsx` — only after the VERIFY-05 SQL query returns 0 rows **or** the one-shot migration strips these IDs from affected `dashboard_layouts.layout` values; `widgets/index.ts` updated
- [ ] **LEAN-06**: `project-leader:desktop` and `project-leader:mobile` layouts in `default-layouts.ts` no longer place `kpi-cards`, `capacity-forecast`, `availability-finder` (byte-for-byte duplicates of manager dashboard)
- [ ] **LEAN-07**: `manager:desktop` and `manager:mobile` layouts no longer place the full `utilization-heat-map` widget; replaced by a new lightweight `heat-map-summary-card` widget that links to `/dashboard/team`
- [ ] **LEAN-08**: `widget-registry.ts` renders a "Widget ej tillgänglig" placeholder when a saved layout references an unknown widget ID, instead of throwing
- [ ] **LEAN-09**: PDF export (`/api/reports/team-heatmap`) snapshot matches pre-trim baseline — Wave 2 ships a regression test that fails if the trim breaks the PDF
- [ ] **LEAN-10**: All changes gated behind `uiV6.leanTrim` flag; with the flag off, deleted routes still 308-redirect (files physically removed only post-stable rollout)

### Per-Journey Friction Fixes (Wave 3 → Phase 52)

- [ ] **PM-01**: `/pm` auto-redirects to `/pm/projects/<defaultProjectId>` when the API returns exactly one project or a `defaultProjectId`; renders project-cards grid otherwise (journey 1A target: 2 clicks)
- [ ] **PM-02**: PM persona surfaces a "Pending wishes" status chip in the top-bar; deep-linkable to `/pm/wishes?tab=rejected|proposed` (journey 1C target: 2 clicks)
- [ ] **PM-03**: Historic-edit warning dialog fires for any edit to a period before the current month; verified by Playwright spec for all 4 persona × period combinations (journey 1D target: 3 clicks including confirm)
- [ ] **PM-04**: Visual-snapshot test covers each of 4 proposal cell states — draft / proposed / approved / rejected — with correct dashed-border, muted color, and Pending badge dual-value rendering (journey 1B)
- [ ] **LM-01**: `/line-manager` renders an approval-queue count badge linking to `/line-manager/approval-queue`; same count reflected on the persona switcher (journey 2B target: 2 clicks)
- [ ] **LM-02**: `/line-manager/timeline` renders project-breakdown cells (one cell per person × project × month) — Playwright spec asserts breakdown visibility (journey 2C)
- [ ] **STAFF-01**: `/staff` timeline component renders with `readOnly` variant; cell edit is disabled; verified by Playwright spec (journey 3A target: 0 clicks)
- [ ] **RD-01**: `/rd` supports long-horizon zoom at month / quarter / year levels, including ISO 8601 week rollover and 53-week-year math (reuse `lib/time/iso-calendar.ts`); spec matrix covers 2026 (53-week), 2027, 2028 (journey 4A target: 0 clicks with zoom)
- [ ] **RD-02**: Clicking a red overcommit cell opens the breakdown dialog; dialog lists contributing projects and most-overbooked people with navigation affordance; Playwright spec asserts content (journey 4B target: 1 click)
- [ ] **SHARED-01**: Drill-down drawer (Screen S11) exists, supports deep-link open, ESC-dismiss, focus trap on open; Playwright specs exercise it from journeys 1A and 4B
- [ ] **ADMIN-01**: Archiving a project with active allocations shows the `ConflictError DEPENDENT_ROWS_EXIST` toast listing dependents; Playwright spec asserts the error UI (journey 5B target: 2 clicks)
- [ ] **PJ-FLAG**: All per-journey changes gated behind `uiV6.perJourney` flag

### Chrome Polish (Wave 4 → Phase 53)

- [ ] **POLISH-01**: Notification bell is persona-scoped — PM shows rejected-wish count, LM shows pending-approval count, R&D shows new-overcommit count, Staff hides the bell
- [ ] **POLISH-02**: `NavItemDef` interface in `top-nav.tsx:32-38` extended with `visibleFor?: PersonaKind[]`; Staff persona sees only Home + Help; PM persona sees Home + Overview + Projekt; other personas get appropriate subsets
- [ ] **POLISH-03**: `discipline-chart` and `discipline-distribution` widgets merged into a single widget with a chart-type toggle (bar / donut); the redundant widget file deleted
- [ ] **POLISH-04**: `bench-report` widget deleted — `availability-finder` covers the same data
- [ ] **POLISH-05**: `resource-conflicts` widget moved to `/alerts` as a tab; removed from all dashboard layouts
- [ ] **POLISH-06**: `strategic-alerts` widget replaced with an inline banner linking to `/alerts`; removed from `manager:mobile` layout
- [ ] **POLISH-07**: Manager dashboard and project-leader dashboard fit within a 1440×900 viewport without scrolling
- [ ] **POLISH-FLAG**: All chrome changes gated behind `uiV6.polish` flag

### Optional — Dashboard Quadrant Redesign (Wave 5 → Phase 54)

*Deferred unless Wave 4 telemetry indicates continued user confusion on either dashboard.*

- [ ] **QUAD-01** (deferred): Manager dashboard restructured into 4 question-keyed quadrants — Health today / Who's free / What's changing / Department deep-dives
- [ ] **QUAD-02** (deferred): Project-leader dashboard restructured into 4 PM-journey-keyed quadrants
- [ ] **QUAD-03** (deferred): Quadrant layouts ship behind `uiV6.dashboardQuadrants` flag with A/B against current layouts

---

## Future Requirements (post-v6.0)

- Counter-proposal flow for LM approval (still deferred from v5.0)
- Mobile-first responsive pass
- Email/Slack notification channel (currently in-app only)
- Real role-based permissions replacing the persona "UX shortcut"

---

## Out of Scope (v6.0)

- **New widgets** — v6.0 is pure restructure; widget count decreases
- **AG Grid planning editor** — `/input/[personId]` is aligned to its job; untouched
- **Dashboard scope redesign** — deferred to optional Wave 5
- **Backend refactors** — only the 2 known admin API 500s are fixed (UNBREAK-04/05); deeper refactor deferred
- **i18n for new languages** — Swedish + English only, matching existing support
- **Accessibility overhaul** — incremental a11y acceptance criteria per wave (axe, keyboard tab-order); full WCAG audit deferred

---

## Traceability

Populated by `/gsd-plan-phase` during phase planning. Each REQ-ID will be linked to its implementing phase and to the Playwright spec(s) that verify it.

| REQ-ID | Phase | Verifying spec | Status |
|---|---|---|---|
| VERIFY-01 … VERIFY-09 | 48 | (pre-flight — no runtime spec) | pending |
| UNBREAK-01 … UNBREAK-07 | 49 | TBD | pending |
| NAV-01 … NAV-05 | 50 | TBD | pending |
| LEAN-01 … LEAN-10 | 51 | TBD | pending |
| PM-01 … ADMIN-01, PJ-FLAG | 52 | TBD | pending |
| POLISH-01 … POLISH-FLAG | 53 | TBD | pending |
| QUAD-01 … QUAD-03 | 54 (optional) | TBD | pending |

**Total:** 42 active requirements (9 verify + 7 unbreak + 5 nav + 10 lean + 12 per-journey + 8 polish) across 6 phases; +3 optional in Wave 5.

---

## Quality Gate

Each phase's exit criteria:

1. Every REQ-ID in its scope is checked off.
2. Playwright specs assert the journey click-count target (§1 of the plan).
3. `@axe-core/playwright` reports zero violations on the affected pages.
4. The wave's feature flag can be toggled off without error (rollback verified).
5. If Wave 2: the PDF snapshot regression passes.
