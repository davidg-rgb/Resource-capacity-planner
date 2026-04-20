# UI Restructure Action Plan — Goal-Backward From Each User Story

**Date:** 2026-04-15
**Inputs:** `UX-AUDIT-PERSONAS.md`, `WIDGET-INVENTORY.md`, `v5.0-USER-JOURNEYS.md`
**North-star constraint (per journey spec):** *"open the app, land on the view that matches my role, zero hunting."*

This plan works backwards from each user story's target click-count, then enumerates the minimum changes to reach it. Changes are grouped into 5 waves — each wave is independently shippable (no wave depends on the next for its benefit).

---

## 0. Success Metric per Journey

For every journey we define **clicks-to-value** — the number of deliberate interactions between app-open and the user-visible answer. Scroll doesn't count; reading doesn't count. The bar is:

| Persona | Journey | Target clicks-to-value | Today | After plan |
|---|---|:---:|:---:|:---:|
| PM | 1A Monday check-in | **2** | 6 | 2 |
| PM | 1B Submit wish | **3** | 5 | 3 |
| PM | 1C Rejected-wish follow-up | **2** | 4 | 2 |
| PM | 1D Historic edit | **3** (incl. confirm) | untestable | 3 |
| LM | 2A Capacity overview | **1** | blocked | 1 |
| LM | 2B Approve wish | **2** | 4+ | 2 |
| LM | 2C Direct group edit | **2** | blocked | 2 |
| LM | 2D Upload actuals | **2** | 3 | 2 |
| Staff | 3A My schedule | **0** | 2 | 0 |
| R&D | 4A Portfolio | **0** | 2 | 0 |
| R&D | 4B Overcommit drilldown | **1** | 1+ | 1 |
| Admin | 5A Add person | **2** | 4 | 2 |
| Admin | 5B Archive project | **2** | 4 | 2 |

Two journeys (2A, 2C) are fully blocked today. Every other journey is dragged down by persona-blind chrome.

---

## 1. Design Principles (Applied to Every Change)

1. **Landing equals intent** — the URL a user lands on after auth must be the persona's primary job. No "first-time tour" for returning users.
2. **Sidebar = persona scope**; **top-nav = global tools** (search, export, admin). Never mix.
3. **One component, one URL** — if two routes render the same component with the same data, there's only one URL.
4. **Widgets earn their screen-space** — a widget that duplicates data shown on another screen must either (a) provide a new interaction on top of it, or (b) be deleted.
5. **Every page answers one question** — if a user can't finish the journey sentence "I came here to…", trim until they can.

---

## 2. The Plan — 5 Waves

### Wave 0 — Unbreak (prerequisite, ~2 days)

Cannot start the restructure until the broken surfaces load.

| # | Change | File(s) | Journey unblocked |
|---|---|---|---|
| 0.1 | Wire Phase 41 department picker into `/line-manager` and `/line-manager/timeline`. Stop rendering the raw i18n key `v5.lineManager.home.selectDepartment`. | `src/app/(app)/line-manager/page.tsx`, `/timeline/page.tsx`, new `<DepartmentPicker>` | 2A, 2C |
| 0.2 | PM Home empty-state — when `data.projects.length === 0`, render the `empty` translation, not the spinner. | `src/app/(app)/pm/page.tsx:46-66` | 1A |
| 0.3 | Fix `/api/admin/change-log` and `/api/admin/people` 500s so `/admin` and `/admin/people` load. Root-cause pass — no retry shims. | backend services | 5A, 5B |
| 0.4 | `PersonaGate` error i18n — show the **allowed** persona label (from the `allowed` prop), not hardcoded "linjechefs-personan". | `src/features/personas/persona-route-guard.tsx` | all 5 |

**Done when:** every route renders without showing raw i18n keys or API errors as primary content.

---

### Wave 1 — Right Landing For Each Persona (~2 days)

Establish that every persona lands on their job and never sees the Admin dashboard by default.

| # | Change | File(s) |
|---|---|---|
| 1.1 | Root redirect: `/` → `getLandingRoute(persona)`. If no persona selected, default to Admin's landing (`/admin`) since the current user is tenant admin. | `src/app/(app)/page.tsx` (new), using `usePersona` server-side if available, else a thin client redirect component |
| 1.2 | Persona-aware `SECTION_NAV` — add entries for `/pm`, `/line-manager`, `/staff`, `/rd` and expand `/admin`. See §3 for the exact mapping. | `src/components/layout/side-nav.tsx:22` |
| 1.3 | Breadcrumbs include a "Home" link resolving to `getLandingRoute(persona)`. Never link to `/dashboard` unless persona is admin. | `src/components/layout/breadcrumbs.tsx` |
| 1.4 | Persona switcher: collapse kind+person into one grouped `<select>` (`<optgroup label="Projektledare"><option>Anna Johansson</option>…`). Auto-select the authenticated user's own Person row where one exists. | `src/components/persona/persona-switcher.tsx` |

**Done when:** opening the app as a PM lands on `/pm` with a sidebar of PM-relevant items; opening as LM lands on `/line-manager`; etc. Navigating to `/` or `/dashboard` while not-admin always redirects to persona home.

---

### Wave 2 — Delete the Duplicates (~1 day, highest ROI)

Pure lean cleanup. No new functionality.

| # | Change | File(s) | Reduces |
|---|---|---|---|
| 2.1 | Delete `src/app/(app)/team/page.tsx`. Add redirect `/team` → `/admin/people`. Update top-nav "Personal" href. | `top-nav.tsx:78`, new redirect stub | 1 duplicate registry |
| 2.2 | Delete `src/app/(app)/projects/page.tsx`. Add redirect `/projects` → `/admin/projects`. Update top-nav "Projekt" href. Keep `/projects/[projectId]` detail page at its current URL. | `top-nav.tsx:49`, redirect stub | 1 duplicate registry |
| 2.3 | Redirect `/wishes` → `/pm/wishes`. Delete `/wishes/page.tsx`. | `src/app/(app)/wishes/page.tsx` | 1 duplicate route |
| 2.4 | Remove the right-side flat people list on `/input`. Keep only the left-sidebar picker. Replace the main area with a "Välj en person…" empty-state illustration (once), not a second copy of the list. | `src/app/(app)/input/page.tsx` | 1 page-internal duplicate |
| 2.5 | Delete dead widgets: `discipline-progress-widget.tsx`, `discipline-demand-widget.tsx`, `project-impact-widget.tsx`. Also remove from `widgets/index.ts`. **Precondition:** verify with a one-line SQL query that no tenant custom layout references these IDs: `select count(*) from layout_versions where placements::text ilike any(array['%discipline-progress%','%discipline-demand%','%project-impact%'])`. | `src/features/dashboard/widgets/*`, `widgets/index.ts:1-24` | ~14 % of widget bundle |
| 2.6 | Strip from `project-leader:desktop` layout: `kpi-cards`, `capacity-forecast`, `availability-finder`. Replace with project-scoped KPIs (active project count, staffing gap, planned-hours-total). Update `project-leader:mobile` similarly. | `src/features/dashboard/default-layouts.ts:43-67` | 3 widget dupes |
| 2.7 | Remove `utilization-heat-map` from `manager:desktop` and `manager:mobile` layouts. Add a small `heat-map-summary-card` widget that shows "N departments red — open heat map →" linking to `/dashboard/team`. | `default-layouts.ts:14-38`, new widget ~30 LOC | 1 widget dupe |

**Done when:** top-nav has 7 items instead of 10. Zero widget on Project Dashboard is byte-for-byte identical to one on Management Overview. `grep -r "MyWishesPanel" src/app` returns exactly one page.

---

### Wave 3 — Make Each Journey Frictionless (~1 week)

Per-persona work. Ordered by journey.

#### 3.1 PM (Anna) — Journeys 1A / 1B / 1C / 1D

- **1A Monday check-in (target 2 clicks):** `/pm` auto-selects the PM's default project (most recent); the timeline is the primary panel above the project picker. No project grid → timeline transition needed. Click red cell → drawer = 2 clicks from app-open.
  - Change: `/pm/page.tsx` — if `data.projects.length === 1 || data.defaultProjectId`, 301 to `/pm/projects/<id>`; else render project cards.
- **1B Submit wish (target 3 clicks):** Cell edit already exists; ensure the proposal-mode banner and "Submit wish" button are always visible (no hover reveal). Add Cmd/Ctrl+Enter as submit shortcut.
- **1C Rejected follow-up (target 2 clicks):** Add a persistent "Pending wishes" status chip in the PM top-bar: "1 avvisad" → click → `/pm/wishes?tab=rejected`. Deep-link support.
  - Change: `src/components/persona/pm-status-chip.tsx` (new), wired into TopNav only when `persona.kind === 'pm'`.
- **1D Historic edit (target 3 clicks, last one is the confirm):** Verify the warning dialog fires for edits to months < current. Audit the implementation; only enable if tests cover all persona × period combinations.

#### 3.2 Line Manager (Per) — Journeys 2A / 2B / 2C / 2D

- **2A Capacity overview (target 1 click):** After Wave 0.1 ships the picker, `/line-manager` auto-selects the LM's own department if they own exactly one; else the picker foregrounds itself.
- **2B Approve wish (target 2 clicks):** Add an approval-queue count badge on `/line-manager` home card **and** on the persona switcher itself. Clicking the badge deep-links to the queue.
  - Change: `src/features/proposals/ui/lm-queue-badge.tsx` (new), fetch from `/api/v5/proposals/queue/count`.
- **2C Direct edit (target 2 clicks):** Same as 2A — after picker wiring, a single click on a person row opens the editable cell.
- **2D Import actuals (target 2 clicks):** Add "Importera utfall" sidebar item (Wave 1.2). One click from `/line-manager`.

#### 3.3 Staff (Sara) — Journey 3A

- **3A Schedule (target 0 clicks):** Lands on `/staff` directly (Wave 1.1). Sidebar collapsed to a single "Mitt schema" entry (or hidden entirely on narrow viewports). Top-nav filtered to only Home + Help for staff persona.
  - Change: add `visibleFor?: PersonaKind[]` to `NAV_ITEMS` in `top-nav.tsx:40`. For staff, filter everything.

#### 3.4 R&D (Karin) — Journeys 4A / 4B

- **4A Portfolio (target 0 clicks):** Lands on `/rd`. Already clean.
- **4B Overcommit drilldown (target 1 click):** Confirm clicking a red cell opens the breakdown dialog. Currently the cell is clickable but I could not verify the dialog content under dummy data. Add an explicit test for it.
  - Change: Playwright spec `e2e/rd-overcommit-drilldown.spec.ts`.

#### 3.5 Admin (Janne) — Journeys 5A / 5B

- **5A Add person (target 2 clicks):** After Wave 1.2 adds People to the admin sidebar, the path is `/admin` → sidebar People → `+ Ny` → form. Fix the API error (Wave 0.3) so the page actually lists rows.
- **5B Archive project (target 2 clicks):** Same pattern with Projects in admin sidebar.

**Done when:** every row in the §0 table hits its target click-count in a Playwright spec. These specs also double as regressions against future refactors.

---

### Wave 4 — Notification & Chrome Polish (~3 days)

With navigation sorted, tighten the signals.

| # | Change | File(s) | Journey |
|---|---|---|---|
| 4.1 | Persona-scoped notification badge on the bell icon: PM → rejected wishes count; LM → pending approvals count; R&D → new overcommits count; Staff → none (hide). | `src/components/layout/top-nav.tsx:153-163`, `src/components/alerts/alert-badge.tsx` | 1C, 2B, 4B |
| 4.2 | Top-nav filtering by persona — extend `NAV_ITEMS` with `visibleFor: PersonaKind[]`. Staff sees Home only. PM sees Home + Overview + Projekt (for context). | `top-nav.tsx:40-82` | all |
| 4.3 | Consolidate overlapping widgets: merge `discipline-chart` + `discipline-distribution` into one with chart-type toggle. Delete `bench-report`; `availability-finder` already covers it. Fold `resource-conflicts` widget into `/alerts` as a tab; remove the dashboard placement. | `src/features/dashboard/widgets/*`, `default-layouts.ts` | page-fit scores |
| 4.4 | Replace `strategic-alerts` widget with inline banner on the manager dashboard linking to `/alerts`. | `src/features/dashboard/widgets/strategic-alerts-widget.tsx` (delete), `dashboard-content.tsx` | page-fit |

**Done when:** manager dashboard fits on a single 1440×900 screen without scrolling; project-leader dashboard fits too; notification bell always reflects *the user's* pending work.

---

### Wave 5 — Optional: Dashboard-Scope Redesign (~2 weeks)

Only if Waves 0–4 leave unresolved user confusion. Otherwise defer to a separate milestone.

- Replace the manager dashboard with a 4-quadrant layout tailored to the **question** asked, not a widget catalog:
  1. **Health today** (overcommit count, utilization avg, alerts)
  2. **Who's free** (bench + availability finder merged)
  3. **What's changing** (capacity forecast, period comparison)
  4. **Department deep-dives** (drill-in)
- Same treatment for project-leader dashboard — 4 quadrants keyed to PM journeys, not widget IDs.
- Ship behind a feature flag; A/B against current layouts to avoid regressing tenants who built custom dashboards.

---

## 3. Concrete Sidebar Mapping

To be inserted at `src/components/layout/side-nav.tsx:22` in Wave 1.2.

```ts
const SECTION_NAV: Record<string, NavSectionDef[]> = {
  '/pm': [{
    headingKey: 'pm',
    items: [
      { labelKey: 'pmHome',     href: '/pm',         icon: 'home' },
      { labelKey: 'pmProjects', href: '/pm',         icon: 'folder_open' }, // auto-first
      { labelKey: 'pmWishes',   href: '/pm/wishes',  icon: 'outgoing_mail' },
    ],
  }],
  '/line-manager': [{
    headingKey: 'lineManager',
    items: [
      { labelKey: 'lmOverview',     href: '/line-manager',                  icon: 'grid_view' },
      { labelKey: 'lmTimeline',     href: '/line-manager/timeline',         icon: 'calendar_view_month' },
      { labelKey: 'lmApprovalQueue',href: '/line-manager/approval-queue',   icon: 'inbox' },
      { labelKey: 'lmImportActuals',href: '/line-manager/import-actuals',   icon: 'upload' },
    ],
  }],
  '/staff': [{
    headingKey: 'staff',
    items: [
      { labelKey: 'staffSchedule', href: '/staff', icon: 'calendar_today' },
    ],
  }],
  '/rd': [{
    headingKey: 'rd',
    items: [
      { labelKey: 'rdPortfolio', href: '/rd',         icon: 'account_tree' },
      { labelKey: 'rdAlerts',    href: '/alerts',     icon: 'warning' },
    ],
  }],
  '/admin': [{
    headingKey: 'adminMain',
    items: [
      { labelKey: 'changeLog', href: '/admin',           icon: 'history' },
      { labelKey: 'people',    href: '/admin/people',    icon: 'group' },
      { labelKey: 'projects',  href: '/admin/projects',  icon: 'flag' },
    ],
  }, {
    headingKey: 'referenceData',
    items: [
      { labelKey: 'disciplines', href: '/admin/disciplines', icon: 'category' },
      { labelKey: 'departments', href: '/admin/departments', icon: 'corporate_fare' },
      { labelKey: 'programs',    href: '/admin/programs',    icon: 'flag' },
      { labelKey: 'members',     href: '/admin/members',     icon: 'shield_person' },
    ],
  }],
  // Keep existing /dashboard, /input, /projects, /team, /data, /scenarios entries unchanged
  // (the /team and /projects pages themselves are removed in Wave 2.1/2.2; their sidebar keys stay as redirect targets).
};
```

---

## 4. Wave Dependency Graph

```
Wave 0 (Unbreak) ──┬──▶ Wave 1 (Landing)  ──┬──▶ Wave 3 (Per-journey)  ──▶ Wave 4 (Polish)
                   │                        │
                   └──▶ Wave 2 (Lean trim) ─┘                             Wave 5 (optional)
```

- **Wave 0** is a hard gate for everything.
- **Wave 1 and Wave 2 are independent**; ship them in whichever order has capacity.
- **Wave 3** needs both 1 and 2 to land.
- **Wave 4** is pure polish; safe to defer.
- **Wave 5** depends on Wave 4 telemetry.

---

## 5. Verification Strategy

Each wave ships with:

1. **Playwright E2E** for every journey in §0 — a failing click-count check fails the wave.
2. **Visual snapshot tests** on the 3 persona landing pages (`/pm`, `/line-manager`, `/staff`, `/rd`, `/admin`) to prevent layout regressions.
3. **Dead-code check** after Wave 2: `depcruise` / `ts-prune` confirms the deleted widget files have no referrers.
4. **Per-persona manual walkthrough** at wave end — click-count each journey with a stopwatch, compare against §0 targets.

---

## 6. Estimated Total Effort

| Wave | Effort | Shippable alone? |
|---|---|---|
| 0 Unbreak | 2 days | No (prereq) |
| 1 Landing | 2 days | ✅ |
| 2 Lean trim | 1 day | ✅ (biggest ROI per hour) |
| 3 Per-journey | 5 days | ✅ |
| 4 Polish | 3 days | ✅ |
| 5 Dashboard redesign (optional) | 2 weeks | ✅ |

**Total to "every journey at its target clicks": ~13 working days.** Round 2 alone (Waves 0 + 2) ships in 3 days and already unblocks the 2 broken journeys and cuts the navigation surface by ~20 %.

---

## 7. What NOT to Do (Scope Discipline)

Guard-rails so this restructure doesn't bloat:

- **Don't add new widgets.** The existing 18 live widgets (after Wave 2 deletes 3) are more than enough; consolidate before adding.
- **Don't build counter-proposals (journey 2B's optional branch).** Deferred per the original v5.0 scope note.
- **Don't introduce email/Slack notifications.** In-app badges only.
- **Don't redesign the dashboards from scratch** unless Wave 5 telemetry justifies it.
- **Don't touch the AG Grid planning editor** (`/input/[personId]`) — it is outside this restructure; it's already aligned to its single job.
- **Don't add a mobile-first pass.** Keep desktop primary; mobile is acceptable-degradation.

---

## 8. Ready-to-Slice Tasks for GSD Phases

If this plan is adopted, each wave maps cleanly to one GSD phase:

| GSD Phase | Wave | Title |
|---|---|---|
| 48 | 0 | Unbreak broken persona surfaces |
| 49 | 1 | Persona-aware landing & navigation |
| 50 | 2 | Lean cleanup — delete duplicate routes & widgets |
| 51 | 3 | Per-journey friction fixes |
| 52 | 4 | Chrome polish & persona notifications |
| 53 (opt) | 5 | Dashboard quadrant redesign |

Each phase has a concrete goal verifiable by a Playwright spec count or a grep-count, so Nyquist-style verification is straightforward.
