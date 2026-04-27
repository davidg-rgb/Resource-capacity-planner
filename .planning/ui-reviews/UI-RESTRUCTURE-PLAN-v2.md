# UI Restructure Plan — v2 (post-review)

**Date:** 2026-04-15
**Supersedes:** `UI-RESTRUCTURE-PLAN.md` (v1)
**Review inputs:** three independent agents (technical verification, journey coverage, risk analysis) — findings consolidated below.

---

## 0. What Changed From v1

Three verification passes uncovered **34 distinct findings**. Severity:

- 🔴 **4 blocking errors** — false technical claims, wrong DB schema reference, wave ordering bug, root-redirect approach doesn't work
- 🟡 **16 correctness gaps** — missing journeys, missing components (drill-down drawer, long-horizon zoom, historic edit dialog), missing i18n keys, missing flag gating
- 🟢 **14 polish issues** — line-number drift, rollback story absent, a11y unaddressed, PDF regression risk, edge-case holes

The biggest single change: **Wave 0 gains a pre-flight assumption verification step**, Wave 1 and Wave 2 are no longer parallelizable, and all waves now ship behind feature flags with explicit rollback paths.

### Consolidated Findings → v2 Response Map

| # | Finding (from review) | v2 response |
|---|---|---|
| R1 | Root `/page.tsx:9-24` uses Clerk `orgRole`, not persona — `getLandingRoute()` is never called | New Wave 1.1: client-side `PersonaRedirect` wrapper in `(app)/page.tsx`; keep Clerk fallback for signed-out users |
| R2 | `SECTION_NAV` has zero persona entries today | Already captured in v1 §3 — no change |
| R3 | `PersonaGate` already has `allowed` prop; error message just ignores it | Wave 0.4 updated: pull label from prop, not hardcoded key |
| R4 | 3 dead widgets confirmed (`discipline-progress`, `discipline-demand`, `project-impact`) | v1 correct — no change |
| R5 | `NavItemDef` lacks `visibleFor` field (Wave 4.2 assumes it exists) | Wave 4.2: explicit interface change step |
| R6 | Line-number drift: PM empty-state at `pm/page.tsx:60`, not 46-66 | Corrected |
| R7 | `breadcrumbs.tsx` has zero persona context; Wave 1.3 is from-scratch | Wave 1.3: marked "new component logic, not patch" |
| J1 | Drill-down drawer (S11) unaddressed in any wave | New Wave 3.6: drawer component audit + Playwright spec |
| J2 | Plan-vs-actual cell reuse across personas not validated | New Wave 0.5: snapshot test that same component renders on PM + Staff + R&D |
| J3 | Long-horizon zoom (month/quarter/year, ISO 8601, 53-week) missing | New Wave 3.4 task: zoom implementation + `date-fns` ISO week test matrix |
| J4 | Historic edit warning (S13) — audited but not implemented/tested | Wave 3.1 now includes implementation + Playwright spec for edits to months < current |
| J5 | Proposal state rendering (dashed border, Pending badge, dual-value) untested | Wave 3.1 gains visual snapshot for each of 4 proposal states |
| J6 | Counter-propose state — plan silent on whether it ships | **Decision committed:** counter-propose stays deferred per v5.0 non-goals; not in any wave |
| J7 | Group-timeline project-breakdown cells (2C) not verified | Wave 3.2 gains a test for project-breakdown rendering |
| J8 | Import wizard preview/override/rollback UX not specified | Wave 2D path expanded to reference existing `import-actuals/page.tsx`; gap is in tests, not code |
| J9 | Admin archive dependent-row blocking (5B) not verified | Wave 5.2 adds E2E for `ConflictError DEPENDENT_ROWS_EXIST` rendering |
| K1 | DB schema query in Wave 2.5 is wrong: table is `dashboard_layouts(layout jsonb)`, not `layout_versions.placements` | 🔴 Critical fix — corrected SQL in Wave 2.5 + mandatory pre-flight run |
| K2 | `next.config.ts` has zero `redirects()` configured; client redirects won't fix external bookmarks | Wave 2 redirects now use `next.config.redirects[]` with `permanent: true` (308) |
| K3 | `sidebar.*` namespace missing ~18 new keys; `sidebar.staff`/`sidebar.projects` collide with existing headings | Renamed to avoid collision; v2 §6 lists exact key names + Swedish/English values |
| K4 | 12 existing Playwright specs from Phase 47 will break; plan doesn't list them | New Wave 0.5 sub-task: inventory and classify each spec |
| K5 | App has `FLAG_ROUTE_MAP`; plan proposes 5 waves with zero flag gating | Each wave ships behind a flag: `uiV6.landing`, `uiV6.leanTrim`, `uiV6.perJourney`, `uiV6.polish` |
| K6 | a11y never addressed; focus-order changes on every page | New §7 Accessibility acceptance criteria; `@axe-core/playwright` gate per wave |
| K7 | 🔴 Wave 1 and Wave 2 are **not** parallelizable — they mutually invalidate `SECTION_NAV` | Dependency graph corrected: Wave 1 strictly precedes Wave 2 (or merge into one PR) |
| K8 | Manager dashboard post-trim layout never committed — "7 widgets" without naming | v2 §5 commits to final `manager:desktop` and `project-leader:desktop` placements |
| K9 | 6 existence assumptions unverified (`getLandingRoute`, `/api/v5/proposals/queue/count`, Phase 41 picker, admin API root-causes, PM default project, redirect query-string preservation) | New Wave −1 pre-flight checklist; every assumption = a grep task with expected match |
| K10 | Rollback story absent | New §8 rollback matrix; every wave has a kill-switch flag + revert commit SHA target |
| K11 | PersonaGate error i18n assumes `v5.persona.kinds.*` keys exist | Wave 0.4 verifies keys exist in both `sv.json` and `en.json`; adds if missing |
| K12 | Members route — widget-inventory keeps in top-nav, plan puts in sidebar; contradiction | v2 decision: top-nav removes Medlemmar; moves to admin sidebar under `referenceData` |
| K13 | PDF export regression risk (widgets get trimmed; PDF renders via same layouts) | Wave 2.6 gains PDF snapshot regression |
| K14 | >1 or 0 PM-persona Person rows — switcher auto-pick undefined | Wave 1.4 edge-case handling: 0 rows → disable PM persona option; >1 → persist last selection |
| K15 | Breadcrumb snapshot tests will break in Wave 1.3 | Snapshot refresh step added to Wave 1.3 |

---

## 1. Success Metric Per Journey (unchanged from v1)

See v1 §0 — targets hold.

**Addition**: every target is now a Playwright assertion on a `data-clicks` counter emitted by a test-only click tracker. If a wave ships and the counter exceeds the target, CI fails.

---

## 2. The Plan — 6 Waves (was 5)

Wave −1 is new; Wave 0 gains sub-tasks; Wave 2 now strictly follows Wave 1.

### Wave −1 — Pre-flight Verification (~4 hours, NEW)

Grep-verify every assumption before starting.

| Check | Command | Expected |
|---|---|---|
| `getLandingRoute` exists | `grep -rn "export function getLandingRoute" src/` | one match in `persona.routes.ts:15` |
| `/api/v5/proposals/queue/count` endpoint | `ls src/app/api/v5/proposals/queue/count` or grep route | if missing, add to Wave 3.2 scope |
| Phase 41 picker status | `grep -rn "DepartmentPicker\|selectDepartment" src/features/personas src/components` | verify component ships or scope its build into Wave 0.1 |
| Admin change-log 500 root cause | `npm run dev` + hit `/api/admin/change-log` once; tail server log | document the actual error |
| Admin people 500 root cause | same for `/api/admin/people` | document |
| Custom-dashboard usage of dead widgets | `SELECT organization_id, clerk_user_id, dashboard_id FROM dashboard_layouts WHERE layout::text ~* 'discipline-progress\|discipline-demand\|project-impact\|utilization-heat-map\|bench-report\|strategic-alerts\|resource-conflicts'` | if >0 rows: widget stripping requires a data migration, not just a code delete |
| Existing Playwright specs | `ls e2e/{pm,line-manager,staff,rd,admin}/*.spec.ts` | catalog each; classify keep/update/retire |
| i18n key collisions | `grep -rn "sidebar.staff\|sidebar.projects" src/ messages/` | confirm existing meanings so new keys don't collide |
| `v5.persona.kinds.*` keys present | `jq '.v5.persona.kinds' messages/sv.json messages/en.json` | both return an object with pm/lineManager/staff/rd/admin |

**Done when:** `pre-flight-report.md` exists with pass/fail for each check, signed off by one other reviewer.

### Wave 0 — Unbreak (~2 days, updated)

Additions over v1:

- **0.2** (PM empty-state) — line number corrected: `src/app/(app)/pm/page.tsx:60`
- **0.4** (PersonaGate i18n) — verify `v5.persona.kinds.*` keys exist (K11)
- **0.5 NEW** — inventory and classify the 12 existing Playwright specs (K4); reuse-verify plan-vs-actual cell and timeline grid components render identically across PM, Staff, R&D (J2)

### Wave 1 — Right Landing (~3 days, updated, now **blocking** Wave 2)

- **1.1 REWRITTEN** — root redirect is NOT a server redirect from `/`. The real path is:
  1. `(app)/page.tsx` becomes a client component that reads `usePersona()` + `useAuth()`;
  2. if signed-in and persona is set → `router.replace(getLandingRoute(persona))`;
  3. if signed-in but no persona → fall back to `orgRole`-based routing (current behavior of `src/app/page.tsx:9-24`);
  4. gate behind the new `uiV6.landing` flag.

  Touches: new `src/app/(app)/page.tsx`, update `src/app/page.tsx:9-24` to respect the flag.

- **1.3 EXPANDED** — breadcrumbs gains new `home` link; snapshot tests refreshed; component moves from parser-only to persona-aware (per R7).
- **1.4 EXPANDED** — edge cases for persona-switcher auto-select:
  - 0 Person rows matching user → disable PM/Staff options with tooltip "Admin måste koppla ditt användarkonto till en Person-post först";
  - >1 rows → persist last-selected Person in `localStorage` per persona-kind;
  - impersonation (admin viewing as PM) → require explicit manual pick, no auto-select.

### Wave 2 — Lean Cleanup (~2 days, **after Wave 1**, updated)

- **2.1/2.2/2.3** — redirects now go in `next.config.ts`:
  ```ts
  // next.config.ts
  async redirects() {
    return [
      { source: '/team', destination: '/admin/people', permanent: true },
      { source: '/team/:path*', destination: '/admin/people/:path*', permanent: true },
      { source: '/projects', destination: '/admin/projects', permanent: true },
      // /projects/:projectId stays live — detail page is kept
      { source: '/wishes', destination: '/pm/wishes', permanent: true },
    ];
  }
  ```
  Permanent (308) redirects preserve the request method and query string — the status-chip deep-link `/pm/wishes?tab=rejected` works through the redirect. Also: fix the hard-coded `<Link href="/projects">` in `projects/[projectId]/page.tsx:167` to `/admin/projects` (K1).

- **2.5 SQL CORRECTED** (K1):
  ```sql
  -- Pre-deletion gate — must return 0 rows
  SELECT organization_id, clerk_user_id, dashboard_id
  FROM dashboard_layouts
  WHERE layout::text ~* 'discipline-progress|discipline-demand|project-impact';
  ```
  If any rows return, write a one-shot migration that strips unknown widget IDs from `layout` before deletion:
  ```sql
  UPDATE dashboard_layouts
  SET layout = (
    SELECT jsonb_agg(placement)
    FROM jsonb_array_elements(layout) placement
    WHERE placement->>'widgetId' NOT IN ('discipline-progress','discipline-demand','project-impact')
  );
  ```

- **2.6** — PDF export regression test (K13). Snapshot-compare `/api/reports/team-heatmap` PDF before and after the layout trim.

- **2.7** — also adds a **defensive fallback** in `widget-registry.ts`: unknown widget ID renders a small "Widget ej tillgänglig" placeholder card instead of throwing. This lets any pre-migration tenant layouts degrade gracefully (K2).

All changes gated behind `uiV6.leanTrim` flag.

### Wave 3 — Per-Journey Friction Fixes (~6 days, updated)

Additions over v1:

- **3.1** (PM) — new sub-tasks:
  - Implement + test the historic-edit warning dialog for all 4 persona × period combinations (J4).
  - Visual snapshot for each of 4 proposal states (draft / proposed / approved / rejected) per journey 1B (J5).
- **3.2** (LM) — verify group-timeline project-breakdown cells (J7).
- **3.3** (Staff) — verify read-only variant of the timeline component actually disables cell edit (J-coverage S9).
- **3.4** (R&D) — implement + test long-horizon zoom (month / quarter / year), including ISO 8601 week rollover and 53-week-year math. Use `date-fns/getISOWeek` (J3).
- **3.5** (Admin) — verify dependent-row blocking for `5B Archive`; E2E spec clicks Archive on a project with active allocations and asserts the `ConflictError DEPENDENT_ROWS_EXIST` toast (J9).
- **3.6 NEW** — drill-down drawer (S11): audit existence, deep-link support, and keyboard dismiss; E2E specs in 1A and 4B both trigger it (J1).

All changes gated behind `uiV6.perJourney` flag.

### Wave 4 — Chrome Polish (~3 days, updated)

- **4.2** — add `visibleFor: PersonaKind[]` field to `NavItemDef` interface at `top-nav.tsx:32-38` (R5). Current flag `'dashboards'` plumbing stays.
- Everything behind `uiV6.polish` flag.

### Wave 5 — Optional Dashboard Quadrant Redesign (unchanged from v1)

---

## 3. Corrected Dependency Graph

```
Wave −1 (Pre-flight) ──▶ Wave 0 (Unbreak) ──▶ Wave 1 (Landing) ──▶ Wave 2 (Lean trim) ──▶ Wave 3 (Per-journey) ──▶ Wave 4 (Polish)
                                                                                                                     │
                                                                                                                     └──▶ Wave 5 (optional)
```

Wave 1 must land before Wave 2 (not parallel). If they must ship together, combine into a single PR with atomic commits per sub-task.

---

## 4. Feature-Flag Gating (K5, K10)

> **Note (audit-r1 / CONS-P1-03):** the dotted-form names below were the
> *plan-time* identifiers. The shipped TS code uses camelCase (`uiV6Landing`,
> `uiV6LeanTrim`, `uiV6PerJourney`, `uiV6Polish`) per the Nordic TS naming
> convention — the flag-toggle endpoint, helpers, and `FlagName` union are
> all camelCase. Treat the dotted form as a documentation artifact only.

New flags added to `src/features/flags/flag.types.ts`:

```ts
export type FlagName =
  | 'dashboards'
  | 'pdfExport'
  | 'alerts'
  | 'onboarding'
  | 'scenarios'
  // v6 restructure flags — remove after rollout stable
  | 'uiV6Landing'      // Wave 1 (was: uiV6.landing in plan v1)
  | 'uiV6LeanTrim'     // Wave 2 (was: uiV6.leanTrim)
  | 'uiV6PerJourney'   // Wave 3 (was: uiV6.perJourney)
  | 'uiV6Polish';      // Wave 4 (was: uiV6.polish)
```

Rollout protocol: each flag defaults OFF in production; enabled for internal Nordic Precision tenant first; expanded to all tenants after 1 week of green telemetry.

Kill-switch: toggle flag OFF → routes revert to pre-wave behavior (deleted pages restore via retained code paths until Wave ends; Wave 2 files physically deleted only at the *end* of rollout, not at flag-ON).

---

## 5. Final Dashboard Layouts (Committed, K8)

Replaces v1's vague "7 unique widgets" promise.

### `manager:desktop` (after Wave 2.7 + Wave 4.3)

```ts
'manager:desktop': [
  { widgetId: 'kpi-cards',             position: 0, colSpan: 12 },
  { widgetId: 'heat-map-summary-card', position: 1, colSpan: 12 }, // NEW — replaces utilization-heat-map
  { widgetId: 'capacity-gauges',       position: 2, colSpan: 6 },
  { widgetId: 'department-bar-chart',  position: 3, colSpan: 6 },
  { widgetId: 'utilization-sparklines',position: 4, colSpan: 6 },
  { widgetId: 'discipline-chart',      position: 5, colSpan: 6 }, // merged with discipline-distribution, toggle-able
  { widgetId: 'capacity-forecast',     position: 6, colSpan: 12 },
  { widgetId: 'availability-finder',   position: 7, colSpan: 12 }, // bench-report merged in
],
```

Net: 9 widgets → 8 widgets, no duplicate with project-leader dashboard.

### `project-leader:desktop` (after Wave 2.6)

> **R2-P1-08 audit-r2 deferral note:** `project-kpi-cards` was never built and is deferred — similar to the QUAD-* deferral pattern from Phase 54. The v6.0 ship omits `project-kpi-cards`; deferred to a future polish phase if user research surfaces a need. The 8-widget aspirational layout below is **archived intent**; the actual shipped 6-widget shape is documented immediately after.

```ts
// Aspirational (planned 8-widget layout — project-kpi-cards never shipped)
'project-leader:desktop': [
  { widgetId: 'project-kpi-cards',     position: 0, colSpan: 12 }, // DEFERRED — never shipped (R2-P1-08)
  { widgetId: 'capacity-distribution', position: 1, colSpan: 12 },
  { widgetId: 'availability-timeline', position: 2, colSpan: 12 },
  { widgetId: 'period-comparison',     position: 3, colSpan: 12 }, // promoted — unique to PL view
  { widgetId: 'allocation-trends',     position: 4, colSpan: 6 },
  { widgetId: 'discipline-distribution', position: 5, colSpan: 6 }, // will collapse after merge (Wave 4.3)
  { widgetId: 'program-rollup',        position: 6, colSpan: 12 },
  { widgetId: 'resource-conflicts',    position: 7, colSpan: 12 }, // stays here; deleted from manager dashboard
],
```

**As shipped (6 widgets, project-kpi-cards omitted):**

```ts
'project-leader:desktop': [
  { widgetId: 'capacity-distribution',   position: 0, colSpan: 12 },
  { widgetId: 'availability-timeline',   position: 1, colSpan: 12 },
  { widgetId: 'period-comparison',       position: 2, colSpan: 12 },
  { widgetId: 'allocation-trends',       position: 3, colSpan: 6 },
  { widgetId: 'discipline-distribution', position: 4, colSpan: 6 },
  { widgetId: 'program-rollup',          position: 5, colSpan: 12 },
  { widgetId: 'resource-conflicts',      position: 6, colSpan: 12 },
],
```

Net: 10 widgets → 6 widgets shipped (planned 8, project-kpi-cards deferred), zero overlap with manager.

Project-KPIs that *would* ship in `project-kpi-cards` if revived: (1) active projects count, (2) staffing gap (sum of unstaffed planned hours), (3) planned hours this month, (4) approval lag (median days from wish to resolution).

---

## 6. i18n Keys (K3, committed)

All keys land in both `messages/sv.json` and `messages/en.json`. New keys go under `sidebar.personaSections.*` to avoid colliding with the existing `sidebar.staff` (section heading "Medarbetare") and `sidebar.projects` (section heading "Projekt").

| Key | sv.json | en.json |
|---|---|---|
| `sidebar.personaSections.pm` | Projektledare | Project Manager |
| `sidebar.personaSections.pmHome` | Hem | Home |
| `sidebar.personaSections.pmProjects` | Mina projekt | My Projects |
| `sidebar.personaSections.pmWishes` | Mina önskemål | My Wishes |
| `sidebar.personaSections.lineManager` | Linjechef | Line Manager |
| `sidebar.personaSections.lmOverview` | Översikt | Overview |
| `sidebar.personaSections.lmTimeline` | Gruppschema | Group Schedule |
| `sidebar.personaSections.lmApprovalQueue` | Godkännandekö | Approval Queue |
| `sidebar.personaSections.lmImportActuals` | Importera utfall | Import Actuals |
| `sidebar.personaSections.staff` | Medarbetare | Staff |
| `sidebar.personaSections.staffSchedule` | Mitt schema | My Schedule |
| `sidebar.personaSections.rd` | FoU | R&D |
| `sidebar.personaSections.rdPortfolio` | Portfölj | Portfolio |
| `sidebar.personaSections.rdAlerts` | Varningar | Alerts |
| `sidebar.personaSections.adminMain` | Administration | Administration |
| `sidebar.personaSections.changeLog` | Ändringslogg | Change Log |
| `sidebar.personaSections.adminPeople` | Personer | People |
| `sidebar.personaSections.adminProjects` | Projekt | Projects |

Total 18 new keys. Zero collisions with existing `sidebar.*` headings.

---

## 7. Accessibility Acceptance Criteria (K6)

Every wave must pass:

- `@axe-core/playwright` zero-violations run on each of the 5 persona landings.
- Keyboard tab-order preserved through Wave 2.4 (`/input` list removal). New E2E: tab from `#search-people` → first person → enter → opens `/input/[personId]`.
- Role switcher: if kept as grouped native `<select>`, verify NVDA on Windows reads `<optgroup>` labels. If it fails, migrate to ARIA `listbox` pattern before Wave 1.4 ships.
- Screen reader announcement on flag-driven redirects (new behavior from Wave 1.1) — add `aria-live` polite toast.

---

## 8. Rollback Matrix (K10)

| Wave | Rollback mechanism | RTO |
|---|---|---|
| −1 Pre-flight | No code changes; rollback = discard the report | instant |
| 0 Unbreak | Feature of broken code → revert commits; no flag needed | < 5 min via `git revert` + redeploy |
| 1 Landing | `uiV6.landing=false` restores Clerk-orgRole routing | < 1 min (flag flip) |
| 2 Lean trim | `uiV6.leanTrim=false` re-enables old pages (files kept for one milestone post-flag-on); `next.config.redirects[]` still active but old pages load | < 1 min |
| 3 Per-journey | `uiV6.perJourney=false` hides new status-chip, reverts edge-case flows | < 1 min |
| 4 Polish | `uiV6.polish=false` restores unfiltered top-nav | < 1 min |
| 5 Dashboard redesign | Separate `uiV6.dashboardQuadrants` flag | < 1 min |

Pre-Wave 0 tag: `git tag v5.0-pre-ui-restructure` anchors the rollback point.

Tenant escalation path: if Nordic Precision pilots surface a regression, a single-tenant flag override (via `flag.service.ts` getter per-org) disables the wave for them only, letting the broader rollout proceed.

---

## 9. Updated Effort

| Wave | v1 days | v2 days | Delta reason |
|---|---:|---:|---|
| −1 Pre-flight | — | 0.5 | NEW (K9) |
| 0 Unbreak | 2 | 2.5 | +0.5 for spec inventory + plan-vs-actual reuse check (J2, K4) |
| 1 Landing | 2 | 3 | +1 for rewrite (R1), breadcrumbs refit (R7), persona edge cases (K14) |
| 2 Lean trim | 1 | 2 | +1 for DB migration (K1), PDF snapshot (K13), defensive widget fallback (K2) |
| 3 Per-journey | 5 | 6 | +1 for drill-down drawer audit (J1), long-horizon zoom (J3), historic-edit impl (J4) |
| 4 Polish | 3 | 3 | unchanged |
| 5 Optional | 10 | 10 | unchanged |
| **Total to complete 0-4** | **13** | **17** | +4 days |

The extra 4 days pay back by preventing at least two post-deploy fire-drills (custom-dashboard breakage from K1; PDF regression from K13).

---

## 10. Handoff Package for GSD Phase Planning

One GSD phase per wave, numbered 48-53:

| Phase | Wave | Title | Entrypoint command |
|---|---|---|---|
| 48 | −1 | Pre-flight verification | `/gsd-research-phase` (research-only phase) |
| 49 | 0 | Unbreak broken persona surfaces | `/gsd-plan-phase` |
| 50 | 1 | Persona-aware landing + navigation | `/gsd-plan-phase` |
| 51 | 2 | Lean cleanup — redirects + duplicate deletion | `/gsd-plan-phase` |
| 52 | 3 | Per-journey friction fixes | `/gsd-plan-phase` |
| 53 | 4 | Chrome polish + persona notifications | `/gsd-plan-phase` |
| 54 (opt) | 5 | Dashboard quadrant redesign | `/gsd-plan-phase` |

Each phase's verification lives in the Playwright spec suite plus a click-counter assertion on the §1 table.
