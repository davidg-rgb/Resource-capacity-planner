# Persona-Driven UX Audit — v5.0

**Date:** 2026-04-15
**Method:** Live browser walkthrough against local dev server (localhost:3000), cross-referenced with `v5.0-USER-JOURNEYS.md` and app/sidebar route tables.
**Observed persona data:** 19 people seeded, 23 projects, none of the projects has `leadPmPersonId` set — PM Home returns empty for every PM.
**Personas covered:** PM (Anna), Line Manager (Per), Staff (Sara), R&D (Karin), Admin (Janne).

---

## Executive Summary

The persona **landing pages exist** and the routing contract is clean (`/pm`, `/line-manager`, `/staff`, `/rd`, `/admin`). **But the chrome around them ignores the persona entirely:**

- No top-nav or sidebar links to any persona landing route.
- The sidebar falls back to the `/dashboard` defaults regardless of which persona is active.
- The role switcher is the *only* way to jump between persona landings — and it requires 2 selects (kind + person) with no "preview".
- Persona-specific sub-routes (approval queue, timeline, wishes, import-actuals, admin/people, admin/projects) are **orphaned** — reachable only by URL typing.
- Two Line Manager pages render raw i18n keys (missing department picker).
- The /admin PersonaGate shows the **wrong** error message ("line manager persona" instead of admin).

Net effect: every persona journey has 2–4 clicks of wasted navigation, and two journeys (LM capacity overview, LM direct edit) cannot be completed at all through UI.

---

## Persona 1 — Project Manager (Anna)

### Journey 1A — Monday morning check-in

| | Current path | Optimal path |
|---|---|---|
| Clicks to value | **6** | **2** |
| Path | Load `/dashboard` (Admin Overview, wrong) → Role dropdown → select `Projektledare` → person dropdown → select Anna → auto-lands `/pm` → click project card | Load `/pm` (auto-routed to persona home) → project auto-selected → click Erik's March cell |
| Friction | (a) lands on wrong page, (b) 2-step role switcher, (c) PM Home hangs on "Laddar…" even when API returns `projects: []`, (d) no sidebar link back to `/pm` once drilled in | — |
| Value obtained | Project overview card, timeline, drill-down drawer | Same |

### Journey 1B — Submit a wish

| | Current | Optimal |
|---|---|---|
| Clicks | **5** | **3** |
| Path | role (2) → `/pm` → project card → Sara's cell → type → submit | `/pm/projects/<default>` → Sara's cell → type → submit |
| Friction | No direct link to "today's project" from any nav; must always go through `/pm` |

### Journey 1C — Rejected wish

| | Current | Optimal |
|---|---|---|
| Clicks | **4** | **2** |
| Path | role (2) → `/pm` → scroll to "My Wishes" link → filter to Rejected | `/pm` badge "1 rejected" → click → opens wishes filtered to Rejected |
| Friction | `/pm/wishes` tab is reachable only via the footer link on `/pm`, no sidebar entry |

### Journey 1D — Historic edit

Could not verify end-to-end (no PM assignments in seed). Historic edit dialog is mentioned in spec; from code it exists in the per-project timeline component.

### Reorganization needs (PM)

- Add sidebar section `SECTION_NAV['/pm']` with **Home / My Projects / My Wishes**.
- Redirect from `/` → `getLandingRoute(persona)` so PMs skip the Admin dashboard on login.
- Unstick the PM Home `isLoading` state when `data.projects.length === 0` (empty-state should render, not spinner).
- On the persona home, add a persistent **"Pending wishes" badge** with direct deep-link to `/pm/wishes?status=rejected|proposed`.

---

## Persona 2 — Line Manager (Per)

### Journey 2A — Capacity overview

| | Current | Optimal |
|---|---|---|
| Clicks | **BLOCKED** | **1** |
| Path | role → `/line-manager` → page renders raw key `v5.lineManager.home.selectDepartment` and **no picker**. Department context never establishes. | `/line-manager` → dept auto-scoped to LM's own group → heatmap |
| Friction | Phase 41 department picker not wired; the header legend renders but the grid never does. Blocks the entire LM experience. |

### Journey 2B — Approve / reject wish

| | Current | Optimal |
|---|---|---|
| Clicks | **4** (URL-typing) | **1** (badge click) |
| Path | role (2) → `/line-manager` → **no visible link to approval queue** → manually type `/line-manager/approval-queue` | LM Home shows "3 wishes waiting" card → click → queue → Approve |
| Friction | `/line-manager/approval-queue` renders a clean empty state ("Inga väntande önskemål") but is orphaned — no sidebar or top-nav entry |

### Journey 2C — Direct edit on own group

| | Current | Optimal |
|---|---|---|
| Clicks | **BLOCKED** | **2** |
| Path | `/line-manager/timeline` renders raw key `v5.lineManager.timeline.selectDepartment` — same missing picker | Heatmap → click a person row → inline-edit a cell |

### Journey 2D — Upload actuals

| | Current | Optimal |
|---|---|---|
| Clicks | **3** (URL-typing) | **2** |
| Path | role (2) → no link → URL `/line-manager/import-actuals` → drop file | `/line-manager` → sub-nav "Import Actuals" → drop file |
| Friction | `/line-manager/import-actuals` looks polished (dropzone, template download) but is unreachable via chrome |

### Reorganization needs (Line Manager)

- **Ship the department picker** (root cause of 2A + 2C). Either a select in the page header or inherit from persona.departmentId once Phase 41 lands.
- Add `SECTION_NAV['/line-manager']` with **Overview / Group Timeline / Approval Queue / Import Actuals**.
- Surface approval-queue count as a top-right notification badge (the bell icon is currently generic — hook it to pending proposals for LMs).
- Make the "Byt persona" button on Wrong-Persona screens go one step further and auto-trigger the kind/person selection.

---

## Persona 3 — Staff Member (Sara)

### Journey 3A — Check my schedule

| | Current | Optimal |
|---|---|---|
| Clicks | **2** | **0** |
| Path | role (2) → `/staff` → grid rendered | Lands directly on `/staff` |
| Value | Works beautifully: project × month grid, Planerat / Utfall / Avvikelse per cell, Månad/Kvartal/År zoom, summary strip | Same |

### Reorganization needs (Staff)

- **Single biggest win across all personas:** redirect `/` → `/staff` for staff persona. They currently see the Admin dashboard first (operational noise they have no business seeing).
- Trim sidebar to a single "Mitt schema" item (or hide it entirely) — staff have no other view to navigate to.
- The top-nav currently shows 10 admin-flavored items (Teambelastning, Planera timmar, Admin, Medlemmar, …) — hide everything except maybe a settings menu.

---

## Persona 4 — R&D Manager (Karin)

### Journey 4A — Portfolio overview

| | Current | Optimal |
|---|---|---|
| Clicks | **2** | **0** |
| Path | role (1) → `/rd` → portfolio | Direct landing |
| Value | "FoU-portfölj" with project/dept toggle, Överbelastning filter, month/quarter/year zoom, planned/actual/delta per cell. Strong. |

### Journey 4B — Overcommit drill-down

Drill-down implementation exists in code (row clicks → dialog). Could not exhaustively test without drilling into every red cell manually, but the architecture is there.

### Reorganization needs (R&D)

- Add `SECTION_NAV['/rd']` with at minimum **Portfolio / By Department / Alerts**. Today the sidebar shows KPI-dashboard/Projektvy/Teambelastning — noisy for a portfolio oversight view.
- Promote the "Överbelastning" toggle to a persistent filter chip, not a hidden control in the top-right.

---

## Persona 5 — Admin (Janne)

### Journey 5A — Add a new engineer

| | Current | Optimal |
|---|---|---|
| Clicks | **4** (URL-typing required) | **2** |
| Path | role → `/admin` (shows change log, fails to load: "Kunde inte ladda ändringsloggen") → **no People link in sidebar** → manually type `/admin/people` → "+ Ny" → form | `/admin` → sidebar "Personer" → "+ Ny" → form |
| Friction | (a) Change log API errors on landing, (b) People registry errors too ("Kunde inte ladda listan"), (c) sidebar only exposes `Discipliner / Avdelningar / Program`. |

### Journey 5B — Archive a project

Same pattern as 5A — `/admin/projects` exists but is not in the sidebar. Forced to URL-type.

### Reorganization needs (Admin)

- Expand `SECTION_NAV['/admin']` to include `people`, `projects`, and `change-log` (the landing page!) — currently only `disciplines/departments/programs` are exposed even though these are the *least* frequently used per the journey descriptions.
- Fix the PersonaGate error i18n for `/admin`: it reads **"bara tillgänglig för linjechefs-personan"** (line manager persona) when wrong-persona'd on admin. Pull the allowed-persona label from the gate's `allowed` prop.
- Fix change log + people registry API errors (separate backend ticket — the `/api/people` public endpoint works, but the admin-scoped endpoints return 500).

---

## Cross-Cutting Defects

These hit every persona:

1. **Landing routing** — `/` and `/dashboard` do not respect persona. Add a server-side redirect in `(app)/page.tsx` using `getLandingRoute(currentPersona)`.
2. **Sidebar ignores persona** — `SECTION_NAV` in `src/components/layout/side-nav.tsx:22` has no entries for any of `/pm`, `/line-manager`, `/staff`, `/rd`; all fall back to the `/dashboard` default.
3. **Top-nav is persona-unaware** — `NAV_ITEMS` in `src/components/layout/top-nav.tsx:40` is a flat list of v1–v4 tools with no relevance to PM/Staff/R&D scope. Consider a `visibleFor: PersonaKind[]` field per item and filtering at render.
4. **Role switcher is 2-step** — per `persona-switcher.tsx:78`, PM and Staff need both kind+person selects. Combine into a single grouped dropdown (`Projektledare — Anna Johansson`) or auto-pick the current user's Person row.
5. **Home affordance missing** — once a user drills into `/pm/projects/<id>` or `/admin/people/<id>`, there is no persistent "Home" link back to their persona landing. The breadcrumbs component exists but doesn't expose persona home.
6. **Notification bell is generic** — the alerts badge is not persona-scoped. PM should see "rejected wishes", LM "pending approvals", R&D "new overcommits".
7. **No empty-state handling** in PM Home — page hangs on "Laddar…" when API returns `{projects: []}` instead of showing the empty-state translation.

---

## Click-Count Summary

| Journey | Today | Optimal | Delta |
|---|---:|---:|---:|
| 1A PM Monday check-in | 6 | 2 | −4 |
| 1B PM submit wish | 5 | 3 | −2 |
| 1C PM rejected wish | 4 | 2 | −2 |
| 2A LM capacity overview | ∞ (blocked) | 1 | — |
| 2B LM approve/reject | 4 | 1 | −3 |
| 2C LM direct edit | ∞ (blocked) | 2 | — |
| 2D LM import actuals | 3 | 2 | −1 |
| 3A Staff schedule | 2 | 0 | −2 |
| 4A R&D portfolio | 2 | 0 | −2 |
| 5A Admin add person | 4 | 2 | −2 |
| 5B Admin archive project | 4 | 2 | −2 |

**Two journeys are fully blocked today** (2A, 2C) by the Line Manager department-picker regression. **Every other journey carries 2–4 unnecessary clicks** driven by the chrome ignoring persona.

---

## Recommended Roadmap (Ordered by Impact × Cost)

| # | Change | Impact | Cost |
|---|---|---|---|
| 1 | Landing redirect: `/` → `getLandingRoute(persona)` | All personas, removes 2 clicks on every session start | 1 file, ~5 lines |
| 2 | Ship the LM department picker (unblocks 2A + 2C) | Critical — LM persona unusable without it | Phase 41 follow-up |
| 3 | Add persona-aware `SECTION_NAV` entries for `/pm`, `/line-manager`, `/staff`, `/rd`, plus new `/admin` items (`people`, `projects`, `change-log`) | Removes orphan pages across every persona | `side-nav.tsx`, ~40 lines |
| 4 | Fix PM Home empty-state (don't stick on loading when `data.projects.length === 0`) | Stops the #1 "broken app" impression | `pm/page.tsx`, 2 lines |
| 5 | Collapse role switcher to single grouped dropdown | Saves 1 click per persona change | `persona-switcher.tsx`, refactor |
| 6 | Persona-scoped notification badge (pending wishes / rejected wishes / overcommits) | Replaces hunting with push | ~1 week |
| 7 | Fix admin PersonaGate error message | Minor but visible polish | 2 lines |
| 8 | Hide top-nav items not relevant to current persona (add `visibleFor` to NAV_ITEMS) | Huge cognitive-load reduction for Staff & PM | `top-nav.tsx`, filter logic |

Items **1, 3, 4, 7** are one-sitting changes; shipping them alone would cut persona-session friction roughly in half.
