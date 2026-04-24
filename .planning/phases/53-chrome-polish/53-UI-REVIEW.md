# Phase 53 — UI Review (Retroactive)

**Audited:** 2026-04-24
**Reviewer:** gsd-ui-auditor (code-only; no live dev server; Playwright-MCP unavailable)
**Baseline:** Phase 53 plans (53-01..53-05) + UI-RESTRUCTURE-PLAN-v2.md + v5.0-USER-JOURNEYS.md + known [UI Design Gap] (no Stitch-prototype responsive parity)
**Screenshots:** not captured (no dev server at :3000/:5173/:8080; Playwright-MCP not available in this session)
**Method:** static audit of 10 scope files + i18n namespace parity check + test-suite cross-reference. Flag-OFF parity already ratified on Vercel prod 2026-04-23 — excluded from re-audit.

---

## Pillar Scores

| Pillar | Score | Verdict | Key Finding |
|--------|-------|---------|-------------|
| 1. Visual hierarchy | 3/4 | PASS | Banner + bell + tabs hit their scan weights; chart-toggle row lacks visual anchor. |
| 2. Accessibility | 2/4 | FLAG | Count changes are silent (no `aria-live`); tab panel not associated (`aria-controls`/`tabpanel`); low-contrast donut palette; no reduced-motion gate on spinner/transitions. |
| 3. Consistency | 3/4 | PASS | Bell mirrors PendingWishChip; tabs mirror PM-02 query-param pattern; Swedish copy is consistent. Small drift: bell uses circular badge, chip uses rounded pill. |
| 4. Responsive | 2/4 | FLAG | Phase 53 viewport gate is SOFT (D-04 by design); no finger-size review on tab controls or banner CTA; known [UI Design Gap] vs. Stitch prototypes persists. Not a Phase 53 regression, but scored honestly. |
| 5. Persona clarity | 4/4 | PASS | Each persona gets exactly one destination per bell; Staff → Help-only nav is crisp; structural + live verification align (53-HUMAN-UAT Test 2). |
| 6. Flag-off parity | 4/4 | PASS | Verified on prod 2026-04-23 (commit e0186e1 on resource-capacity-planner-psi). No visual leak: legacy bell, full NAV_ITEMS, legacy widgets, tabless /alerts all revert. |

**Overall: 18/24**

---

## Top 3 Priority Fixes

1. **NotificationBell count changes are silent to screen readers** (`src/components/persona/notification-bell.tsx:96-110`).
   *User impact:* LM whose 5-pending queue drops to 0 after approvals — or PM whose rejection count ticks from 0 → 1 mid-session — hears nothing. The `aria-label` is only announced on focus, not on count change; `<Link>` is not a live region.
   *Concrete fix:* Wrap the count badge in a visually hidden `<span role="status" aria-live="polite" aria-atomic="true">`, announcing `{label}` whenever `count` updates. Keep the visual badge unchanged. Add one RTL test asserting the live-region updates when the mocked hook return changes.

2. **`/alerts` tabs are not wired as a proper tab pattern — `aria-controls` and `tabpanel` missing** (`src/app/(app)/alerts/page.tsx:78-131`).
   *User impact:* Screen-reader users navigating with the tab-switch shortcut won't land on the right panel; `aria-selected` without `aria-controls` is a WCAG 4.1.2 gap. Keyboard users also get no arrow-key navigation between tabs (WAI-ARIA APG tab pattern).
   *Concrete fix:* Give each button `id={\`alerts-tab-${k}\`}` + `aria-controls={\`alerts-panel-${k}\`}`. Wrap the content `<div className="mt-6">` in `role="tabpanel"` with matching `id` + `aria-labelledby`. Add `onKeyDown` (ArrowLeft/ArrowRight) for roving focus across the two tabs. ~30 LOC; no visual change.

3. **Donut chart palette is 8 monochromatic slate/grey shades — indistinguishable for categorical data** (`src/components/charts/chart-colors.ts:25`, consumed by `discipline-donut.tsx:37`).
   *User impact:* R&D and admin users reading per-project discipline mix on /dashboard/projects cannot tell Mechanical from Civil from Electrical at a glance. Bar chart's categorical height differentiation compensates; donut arcs do not. Actively mis-serves a widget whose whole purpose is "at-a-glance discipline split".
   *Concrete fix:* Add a dedicated `CHART_COLORS.categoricalPalette` with 8 hue-distinct (but still muted-Nordic) colors — e.g., add the existing `over`/`healthy`/`under`/`idle` plus 4 new hues from a colorblind-safe palette (Viridis or Tol). Pass it explicitly: `<DisciplineDonut colors={CHART_COLORS.categoricalPalette}/>`. Zero token churn elsewhere.

---

## Detailed Findings

### Pillar 1: Visual hierarchy (3/4) — PASS

**Observations:**
- `StrategicAlertsBanner` (`strategic-alerts-banner.tsx:32-49`) renders **above** `<DashboardGrid>` (`dashboard-content.tsx:20-21`) with `mb-6`, amber border + 50% tint, 18px icon, count-prefixed Swedish copy. Reads as a proper "interrupt" ahead of KPI cards without crowding them (empty state returns null, so zero cost on no-alert tenants).
- `NotificationBell` (`notification-bell.tsx:96-110`) uses `-top-1 -right-1` absolute badge on an 18px bell; badge is `h-4 min-w-4` red pill with white `text-[10px] font-bold`. Correct attention-weight for a top-nav chrome signal (not over-competing with the persona switcher or user button).
- `/alerts` page (`alerts/page.tsx:68-77`) leads with an `text-3xl font-semibold` H1 + muted subtitle, then tablist, then content. Standard 3-tier hierarchy.
- `DisciplineBreakdownWidget` toggle row (`discipline-breakdown-widget.tsx:136-168`) is flat: two underlined text buttons with no container card, no visual anchor. In the widget's 6-col box the toggles can read as orphan links until you notice the chart.

**Minor recommendation:** Wrap the discipline toggle in a small `bg-surface-container-low rounded-md px-2 py-1` pill group, mirror the viewMode toggle pattern already used in `resource-conflicts-panel.tsx:430-449`. Not urgent.

### Pillar 2: Accessibility (2/4) — FLAG

**aria-label correctness on NotificationBell** — asked in the prompt: *e.g., "Avvisade önskemål: 0" — should it announce when count changes?*

- The label text is **semantically correct** (e.g., `v6.polish.bell.pmRejectedLabel` = `"Avvisade önskemål: {count}"`). Label resolution in code (`notification-bell.tsx:75-93`) branches per-persona and pulls the right ICU string. ✓
- **But zero-state labels are confusing.** For Staff the bell returns null (good). For all other personas, when `count === 0` the bell still renders with the persona's label (e.g., "Avvisade önskemål: 0" for PM even if they have no rejections at all). That's a label for a non-state: a bell that announces "0 rejected" on focus is noise. Consider: when `count === 0` and persona is non-admin, return `null` (matches the PendingWishChip pattern at `pending-wish-chip.tsx:39` — "return null if nothing to show").
- **Count-change silence** — see Top Fix #1. Screen readers only announce `aria-label` on focus; polling tick updates (60s) go unnoticed.

**Focus management on tab switch in /alerts:**
- `router.replace(...)` in `alerts/page.tsx:65` moves the URL but does not re-focus the selected tab button. Keyboard users who arrow-tab to "Konflikter" then press Enter watch the content swap but stay focused on the button — acceptable per APG, but the content region is unlabeled. See Top Fix #2.
- No `tabpanel` role, no `aria-controls`, no arrow-key navigation between tabs.

**Color contrast — discipline-donut:**
- Palette in `chart-colors.ts:25` is 8 shades: `#496173 #586065 #5b6063 #3d5567 #727d80 #a9b4b7 #465e70 #4c5459`. Maximum ΔE* between adjacent slices ≈ 12–18; indistinguishable at small size. See Top Fix #3.
- On the StrategicAlertsBanner (`strategic-alerts-banner.tsx:35-39`): `text-amber-900` on `bg-amber-50` → ~12.6:1 (AAA). Good.
- NotificationBell badge: `bg-red-500` + `text-white` → ~4.5:1 (AA). Acceptable.

**Keyboard nav through top-nav with filtered items:**
- Tab order follows DOM order in `top-nav.tsx:211-227` (desktop) and `:303-326` (mobile drawer). Filtered items are removed from the tree (not hidden), so keyboard focus skips them cleanly. ✓
- The Help item's labelKey is a fully-qualified string (`top-nav.tsx:139-144`). The `label()`/`desc()` helper (`:172-177`) dispatches to `tRoot()` when the key contains a dot. **Note:** `useTranslations()` (root) throws at render time if the key is missing — protected by Plan 01 parity tests, but worth remembering for future edits.

**Reduced-motion:**
- Zero `motion-reduce:` / `motion-safe:` / `prefers-reduced-motion` uses in the entire `src/` tree (grep count = 0).
- Loading spinner in `alerts/page.tsx:117-119` uses unqualified `animate-spin`; banner has `transition-all` on the conflict bar (panel line 83); discipline-donut uses `isAnimationActive={false}` (donut.tsx:49) — good, but the bar variant and the dashboard grid transitions are unconstrained.
- Deferred-motion is a larger app concern than Phase 53 introduced, but the new banner + toggle UI inherits the gap.

**Pillar 2 recommendation summary:** Ship Top Fix #1 + #2 in a follow-up patch. Palette fix (#3) also counts here for color-coding contrast.

### Pillar 3: Consistency (3/4) — PASS

**Notification patterns vs. existing PendingWishChip:**
- Both consume `useFlags()`, `usePersona()`, `useAuth()`, and a TanStack count hook. ✓
- Both use `<Link>` with `aria-label` + `data-testid`. ✓
- **Shape drift:** PendingWishChip is a rounded-full pill with text label (`pending-wish-chip.tsx:49`); NotificationBell is an icon-only button with a corner badge. This is intentional — the chip is an inline PM-only surface (`top-nav.tsx:261`), the bell is the universal right-nav slot. But both render in the same top-nav right cluster, back-to-back, and on PM persona with both flags ON, a PM sees bell + chip side-by-side. Worth verifying manually.
- **Zero-state drift:** PendingWishChip returns null at count 0 (`pending-wish-chip.tsx:39`). NotificationBell renders empty (no badge) at count 0 for non-Staff personas. Align these per Pillar 2 finding.

**Tabbed /alerts vs. other tabbed surfaces:**
- `/pm/wishes?tab=rejected` (Phase 52 PM-02) and `/alerts?tab=conflicts` (Phase 53 POLISH-05) use identical `useSearchParams` + `router.replace(\`${pathname}?${params}\`)` patterns. ✓
- Both use `role="tablist"` + `role="tab"` + `aria-selected`. ✓
- Both are missing `aria-controls` + `tabpanel` (see Top Fix #2 — affects both surfaces, not just Phase 53).
- **Active-tab style drift:** `/alerts` uses `border-primary text-primary border-b-2 pb-2 font-semibold` (page.tsx:87). Verify against the `/pm/wishes` active-tab style — if different, align to one (minor drift, not breaking).

**Swedish copy tone:**
- `v6.polish.bell.*` — "Avvisade önskemål", "Väntande godkännanden", "Nya överbokningar", "Varningar" — consistent noun-phrase style, Swedish-natural.
- `v6.polish.banner.title` — "{count} kritiska varningar" — "kritiska" is a slight escalation from the `/alerts` page H1 "Capacity Alerts" (which is English! — see Pillar 3 subfinding below).
- `v6.polish.discipline.*` — "Stapeldiagram" / "Ringdiagram" — Swedish-natural compound nouns.
- Nav item "Hjälp" + desc "Hjälp och support" — consistent.

**Copy gap:** `/alerts` page H1 is hard-coded English **"Capacity Alerts"** (`alerts/page.tsx:71-75`). Subtitle same: "People with allocation levels outside healthy thresholds." These strings are not in the `v6.polish.*` namespace — they pre-date Phase 53 but Phase 53 rewrote the page without extracting them. Swedish-only users on `sv-SE` will see English page chrome above Swedish tab labels. **Flag for POLISH-05 retrofit.**

### Pillar 4: Responsive (2/4) — FLAG

**Context:** Phase 53 viewport gate is SOFT (D-04) — specs measure scrollHeight at 1440×900 and log without asserting. Test 1 of 53-HUMAN-UAT.md confirms "overflow within acceptable threshold" as of 2026-04-23.

**Findings beyond the SOFT gate scope:**
- **Banner CTA target size** (`strategic-alerts-banner.tsx:41-47`): `<Link>` with `text-sm font-semibold` and no `py-*` — vertical tap area ≈ 20px. Below the 44px WCAG 2.5.5 AAA target (and the 24px AA target with ×1.5 spacing rule is also marginal on mobile). Wrap in a button-like `px-3 py-2 -my-2 -mx-3` to bring the hit area up while keeping visual size.
- **Tab button target size** (`alerts/page.tsx:79-107`): `pb-2` + no horizontal padding — similar issue. `px-4 py-3` would respect touch targets.
- **Banner `justify-between`** is fine at desktop but at <375px the "Se alla →" CTA + count title can wrap awkwardly. No `flex-wrap` — verify mobile.
- **Manager:mobile layout** shrank from 8 → 6 widgets (Plans 04 + 05). Shorter page; that's POLISH-04's whole point. No negative responsive signal.
- **Known [UI Design Gap]** from MEMORY.md: the full app doesn't match Stitch prototypes in `creative-direction/` and is not responsive-first. Phase 53 did not introduce that gap — banner + bell + tabs are new but inherit the gap from parent layouts. Flag here as acknowledged, not scored harshly.

**Pillar 4 recommendation:** Tap-target patch (banner CTA + tab buttons) as a POLISH-05b follow-up. Cheap, high-impact on mobile.

### Pillar 5: Persona clarity (4/4) — PASS

**Each persona lands on the right surface — verified against 53-HUMAN-UAT Test 2:**

| Persona | Bell destination | Nav items visible | Verified |
|---------|-----------------|-------------------|----------|
| Staff | null (hidden) | Help only | ✓ structural + live (2026-04-22) |
| PM | `/pm/wishes?tab=rejected` | Team, PlanHours, Projects, Overview, ProjectDashboard, Help | ✓ live |
| LM | `/line-manager/approval-queue` | Team, PlanHours, Projects, Overview, Warnings, Help | ✓ live |
| R&D | `/alerts` | Team, Projects, Overview, Warnings, Help | ✓ structural + live (DOM) |
| Admin | `/alerts` | all 12 items | ✓ live |

**Code cross-check** (`notification-bell.tsx:77-94` + `top-nav.tsx:51-145`):
- PM `pmRejectedLabel` → `/pm/wishes?tab=rejected` — matches Journey 1C exit target (UX-AUDIT-PERSONAS §Anna 1C "badge click → opens wishes filtered to Rejected").
- LM `lmPendingLabel` → `/line-manager/approval-queue` — matches Journey 2A "Approval queue card" + Journey 2B "click → queue → Approve".
- R&D `rdOvercommitsLabel` → `/alerts` — matches expected R&D escalation path (R&D gets dashboard context; overcommits escalate to alerts triage).
- Staff → no bell, no center-nav except Help — matches D-03 LITERAL (Staff has one job: book their actuals; everything else is noise).
- Admin → `adminAlertsLabel` → `/alerts` — fall-through consumer of `useAlertCount` preserved from Phase 52.

**No persona-ambiguous surface** in Phase 53 scope. Each chrome signal has one click-target; each click-target is the next logical step in that persona's journey per v5.0-USER-JOURNEYS.md.

**Minor signal:** the R&D persona's bell routes to `/alerts` with a count representing distinct overcommitted people, while admin's bell routes to `/alerts` with a count representing active capacity alerts. Same URL, different numeric interpretation. If an admin-becomes-R&D role-switcher flip happens mid-session, the badge number will change without UI warning. The `PERSONA_SCOPED_QUERY_KEYS` invalidation (`persona.context.tsx` per 53-02-SUMMARY) prevents *stale* counts; it does not disambiguate identical URLs. Acceptable — both counts reflect useful truths about capacity stress — but worth knowing.

### Pillar 6: Flag-off parity (4/4) — PASS

**Verified on Vercel prod 2026-04-23** (commit `e0186e1` on `resource-capacity-planner-psi`, see 53-HUMAN-UAT.md §"Live Flag-OFF Parity Sweep"). Recap:

| Surface | Flag-OFF expected | Observed |
|---------|------------------|----------|
| Top-nav bell | Legacy `<Link href="/alerts"><Bell/><AlertBadge/></Link>` | ✓ |
| NotificationBell | Not rendered | ✓ (returns null per `notification-bell.tsx:70`) |
| NAV_ITEMS filter | visibleFor no-op; admin view | ✓ (gated by `flags.uiV6Polish` at `top-nav.tsx:162`) |
| Manager dashboard | LEGACY_LAYOUTS renders bench-report + discipline-chart | ✓ (plan's `getDefaultLayout(useLegacy=true)` path preserved) |
| Manager:mobile | strategic-alerts widget at position 7 | ✓ |
| Project-leader dashboards | resource-conflicts at original positions | ✓ |
| /alerts | No tabs; legacy AlertList only | ✓ (`alerts/page.tsx:78` gates the tablist on `flags.uiV6Polish`) |
| StrategicAlertsBanner | Not rendered | ✓ (gated at `dashboard-content.tsx:20`) |

The `dashboard-content.tsx` mount gate (`{flags.uiV6Polish && <StrategicAlertsBanner />}`) is the tightest possible — one condition, no fall-through. The `/alerts` page additionally *forces* the warnings view even when `?tab=conflicts` is in the URL on flag-off (`alerts/page.tsx:112`) — handles the cross-session deep-link-then-disable case cleanly.

**No visual leak.** No dead code paths. No partial toggles. Strongest pillar.

---

## Registry Safety

No `components.json` at repo root — shadcn not initialized. Registry audit skipped per gsd-ui-auditor contract.

---

## Notes on scope / methodology

- **Screenshots:** None captured. No dev server reachable at :3000/:5173/:8080 during this audit; Playwright-MCP not available in this session. Audit findings are derived from static code review + test-suite cross-reference + 53-HUMAN-UAT.md's documented live verification (prod + structural). Any finding requiring a pixel-level check is explicitly flagged ("Verify against..." / "Worth verifying manually").
- **Responsive scoring** is deliberately honest about the known [UI Design Gap]. Phase 53 did not cause it. A follow-up viewport hard-gate (Phase 54 per D-05 plan) will provide the measurement baseline for a real responsive retrofit.
- **Flag-off parity** was excluded from structural re-audit because it was live-verified on prod on 2026-04-23; re-verifying structurally would not find anything new. Pillar 6 score reflects the prod verification directly.
- This is a retroactive audit — Phase 53 shipped 2026-04-22. All Top 3 Fixes are **non-blocking follow-up patches**; none are regressions. Phase 53's 8 POLISH requirements + POLISH-FLAG all land cleanly.

---

## Files Audited

**Scope (10 files):**
- `src/app/(app)/alerts/page.tsx`
- `src/app/(app)/dashboard/dashboard-content.tsx`
- `src/components/alerts/resource-conflicts-panel.tsx`
- `src/components/alerts/strategic-alerts-banner.tsx`
- `src/components/charts/discipline-donut.tsx`
- `src/components/persona/notification-bell.tsx`
- `src/features/dashboard/default-layouts.ts`
- `src/features/dashboard/widgets/discipline-breakdown-widget.tsx`
- `src/features/dashboard/widgets/resource-conflict-widget.tsx`
- `src/components/layout/top-nav.tsx`

**Cross-referenced:**
- `src/components/charts/chart-colors.ts` (palette audit)
- `src/components/persona/pending-wish-chip.tsx` (consistency baseline)
- `src/messages/sv.json` (i18n copy, lines 931-964)
- `.planning/phases/53-chrome-polish/53-01-PLAN.md` through `53-05-PLAN.md`
- `.planning/phases/53-chrome-polish/53-01-SUMMARY.md` through `53-05-SUMMARY.md`
- `.planning/phases/53-chrome-polish/53-HUMAN-UAT.md` (live verification record)
- `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` (v6.0 source of truth)
- `.planning/v5.0-USER-JOURNEYS.md` (persona click-count targets)
- `.planning/ui-reviews/UX-AUDIT-PERSONAS.md` (baseline persona journey audit)

---

## Priority Fix Count
- **Priority fixes (actionable, non-blocking):** 3
- **Minor recommendations:** 4
  - Discipline toggle visual anchor (Pillar 1)
  - Zero-state NotificationBell null-return (Pillar 2/3 alignment)
  - `/alerts` H1 + subtitle Swedish i18n retrofit (Pillar 3)
  - Tap-target padding on banner CTA + tab buttons (Pillar 4)
