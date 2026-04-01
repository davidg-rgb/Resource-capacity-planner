# V13: What-If Scenario Mode — UX Review

**Date:** 2026-04-01
**Status:** Review Complete — Ready for Build
**Inputs:** Competitive analysis (8 tools), codebase isolation audit (24 files), UX pattern research (enterprise sandbox modes)

---

## Executive Summary

Three parallel research streams converge on a clear design direction. The biggest architectural finding is that the original spec's approach of isolating scenarios to a separate `/scenarios` route **conflicts with competitive best practice** — every successful resource planning tool (Runn, Float, Productive) overlays scenarios on the existing view rather than sending users to a separate page.

However, the codebase audit identified **4 critical isolation risks** that make an overlay approach technically dangerous without significant refactoring. The recommendation below is a **hybrid approach**: scenarios get their own dedicated entry context but reuse the same visual layout as the real dashboards, with comprehensive visual differentiation.

---

## Resolved UX Decisions

### Q1: How should "Promote to Actual" work for partial scenarios?

**Decision: Row-level selective promotion with summary diff + confirmation friction.**

| Option | Verdict | Rationale |
|--------|---------|-----------|
| A) All-or-nothing | Rejected | Anti-pattern confirmed by Productive users — risky when only some changes are ready |
| B) Cherry-pick per row | **Selected** | Matches Runn's per-project toggle pattern. Gives managers granular control. |
| C) Only new project allocations | Rejected | Too limiting — users also adjust existing allocations in scenarios |

**Flow:**
1. Each scenario change row gets a checkbox
2. "Promote Selected" button appears when any are checked
3. Summary diff screen shows exactly what will change (added/modified/removed allocations)
4. Confirmation with friction: user must check "Jag forstar att detta andrar verklig planering" (I understand this changes real planning)
5. After promotion: promoted rows get a "Promoted" badge and become read-only in the scenario. Remaining rows stay editable.
6. 30-second undo toast after promotion (Gmail "undo send" pattern)

**Role gate:** Only `org:admin` and `org:owner` can promote. `org:planner` can create and edit scenarios but not promote.

---

### Q2: Should scenarios be shareable between users in the same org?

**Decision: Private-first with explicit sharing (SAP Analytics Cloud model).**

| Sharing State | Who Sees It | Who Can Edit |
|---------------|------------|-------------|
| Private (default) | Creator only | Creator only |
| Shared (read-only) | Creator + invited users | Creator only |
| Shared (collaborative) | Creator + invited users | All invited users |
| Published | Everyone in org | Creator + admins |

**Rationale:** Swedish engineering orgs have 2-5 managers. Private-first prevents scenario sprawl (Anaplan anti-pattern) while sharing lets a team lead say "look at this option" to their director. Published state enables org-wide visibility for approved plans under evaluation.

**Limits:** Max 10 scenarios per user, max 25 per org. Archival after 90 days of inactivity (with notification).

---

### Q3: How to handle the scenario allocation grid?

**Decision: Hybrid — dedicated route using the same visual components, not an overlay on live data.**

The competitive research says "overlay on same canvas" (Runn/Float pattern). The codebase audit says "24 files need `mode` parameter threading, and React Query cache contamination is a critical risk." The resolution:

**Architecture:**
- Scenarios live at `/scenarios/{scenarioId}` — a **dedicated route** (not an overlay on `/dashboard`)
- But the page **renders the same dashboard widget components** (heat map, forecast, gauges, etc.)
- All widgets receive data from `scenario_allocations` table via separate API calls with `mode=scenario` parameter
- The URL isolation prevents accidental cache key collision (the codebase audit's #1 risk)

**Visual treatment of scenario data within the grid:**
- Cells showing scenario-modified values use a **hatched/striped CSS pattern** (45-degree repeating-linear-gradient, amber at 8% opacity)
- Unchanged cells (carried from actual baseline) render normally but with the ambient amber background tint (2% opacity)
- New people/projects added in the scenario get an amber left border accent (4px)
- Removed allocations show as struck-through text in muted gray

**Why not a pure overlay on live data:**
The codebase audit found that all 7 analytics queries, the AG Grid autosave cascade, and the import wizard share a single React Query cache with no namespace. Adding a `mode` parameter to 24 files is the correct long-term fix, but it creates a large blast radius for Phase F. The dedicated route approach achieves full isolation with zero changes to existing live-data code paths — the scenario route simply uses its own hooks that call `/api/scenarios/{id}/analytics/*` endpoints.

---

### Q4: Should the impact preview show all dashboard widgets or a curated subset?

**Decision: Curated fixed set of 4 metrics, with "View Full Impact" expansion.**

**Always visible (summary bar at top of scenario editor):**

```
┌──────────────────────────────────────────────────────────────────┐
│  Impact vs Actual:                                               │
│  Utilization: 84% → 92% (▲+8%)  │  Overloaded: 5 → 7 (▲+2) ⚠  │
│  Bench Hours: 1,840 → 960 (▼-48%) 🟢  │  New Conflicts: +2 ⚠   │
└──────────────────────────────────────────────────────────────────┘
```

**On-demand expansion:**
"View Full Impact" button expands to show:
- Capacity Forecast (V1) with scenario overlay
- Department Gauges (V6) comparing actual vs scenario
- Conflict Matrix (V9) showing new conflicts created by scenario

**Rationale (from Productive's pattern):** The manager's core question is "will this overload anyone?" — utilization % and overloaded count answer that directly. Full widget rendering is available but should not be the default because it creates noise and slows down the experimentation cycle.

---

### Q5: How prominent should the nav entry be?

**Decision: Top-level nav item, styled as secondary.**

The competitive research was split — Runn/Float treat it as a mode toggle, SAP/Anaplan treat it as a section. Our hybrid approach (dedicated route) requires a nav entry.

**Implementation:**
- Nav item: "Scenarios" (or "Scenarier" in Swedish) — placed after "Overview" and before "Warnings" in the nav
- Icon: flask/beaker (🧪) — universally recognized as "experimental" (Chrome Canary, GitHub, LaunchDarkly)
- Styled as a regular nav item but with a subtle amber dot indicator when any active scenarios exist
- Also accessible via a "Vad om...?" (What if...?) button on the heat map toolbar for contextual entry
- Feature-flagged behind `scenarios` flag — not visible until enabled per-org

**Rationale:** Burying it in a submenu (like Excel's Scenario Manager) makes it undiscoverable. Swedish line managers replacing Excel won't dig through menus. A visible nav item with a clear label ensures adoption.

---

### Q6: What happens when a scenario references a person who was archived?

**Decision: Soft-flag with visual warning, block promotion, preserve data.**

No competitor handles this well — this is a differentiation opportunity.

**Behavior:**
- When opening a scenario containing archived people: warning banner at top: "This scenario includes 2 archived team members. Their allocations are shown but cannot be promoted."
- Archived-person rows: muted/grayed treatment with ⚠ icon and tooltip: "[Name] was archived on [date]"
- Promotion checkbox **disabled** for archived-person rows with tooltip: "Un-archive this person before promoting their allocations"
- The scenario is NOT auto-modified — it remains a faithful snapshot of what was planned at creation time
- "Refresh Baseline" button available to re-sync the scenario with current actual state (adds new people, marks newly-archived, updates target hours)

---

## Visual Design Specification

### Color System for Scenario Mode

| Element | Treatment | Value | Rationale |
|---------|-----------|-------|-----------|
| Banner background | Solid amber | `#FEF3C7` (amber-100) | Industry standard for "caution/advisory" without error connotation |
| Banner text | Dark amber | `#92400E` (amber-800) | High contrast on amber background |
| Banner left accent | Solid amber bar | `#F59E0B` (amber-500), 4px | Visual anchor |
| Content area tint | Ambient overlay | `#F59E0B` at 2% opacity | Subconscious "this feels different" signal |
| Modified cell pattern | Hatched stripes | 45-degree repeating-linear-gradient, amber at 8% opacity | Cell-level distinction (Float pattern) |
| New entity border | Left accent | `#F59E0B`, 4px solid | Marks newly added people/projects |
| Removed allocation | Strikethrough | `text-decoration: line-through; color: var(--color-on-surface-variant)` | Clear removal signal |
| Delta positive | Arrow + color | `▲` + `#059669` (emerald-600) | Increase |
| Delta negative | Arrow + color | `▼` + `#DC2626` (red-600) | Decrease |
| Delta neutral | Dash | `—` + `var(--color-on-surface-variant)` | No change |
| Delta new | Star badge | `★` + `#F59E0B` (amber-500) | New in scenario |

### The Non-Dismissible Banner

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▊ 🧪  SCENARIO: "Lagg till Scania Fas 2"                               │
│ ▊     Andringar har paverkar INTE verklig data.                         │
│ ▊     [Jamfor med verklighet]  [Spara]  [Avsluta scenario]              │
└──────────────────────────────────────────────────────────────────────────┘
```

**Rules:**
- Full width, directly below top nav, above all content
- Height: 44px (48px on mobile for touch targets)
- Cannot be dismissed, collapsed, or hidden while on any `/scenarios/*` route
- Includes scenario name, reassurance copy, and three action buttons
- `aria-live="polite"` for screen reader announcement on entry

**Why non-dismissible:** Salesforce learned this the hard way — dismissible sandbox banners led to support tickets about "my data is wrong" until they made the banner permanent. For a tool where managers make staffing decisions based on numbers, showing wrong numbers as real causes actual business harm.

### Print/Export Safety

- Any PDF/Excel exported from scenario mode includes:
  - Header: "SCENARIO — EJ VERKLIG DATA" (SCENARIO — NOT REAL DATA) on every page
  - Diagonal watermark: "SCENARIO" at 5% opacity, repeating
  - Footer: scenario name + creation date + "Generated from scenario, not actual allocations"
- The export modal (§5 of main spec) shows a warning when in scenario mode: "You are exporting scenario data. This export will be clearly marked as non-actual."

---

## Entry/Exit Flow

### Entry: Creating a New Scenario

```
User clicks "Scenarier" in nav (or "Vad om...?" on heat map toolbar)
    ↓
Scenarios list page (/scenarios)
  - Shows saved scenarios as cards
  - [+ Skapa nytt scenario] button
    ↓
Lightweight modal:
  ┌────────────────────────────────────────────────┐
  │  Skapa nytt scenario                    [✕]    │
  │  ──────────────────────────────────────────    │
  │  Namn: [Lagg till Scania Fas 2        ]       │
  │                                                │
  │  Baserat pa: ● Nuvarande planering             │
  │              ○ Befintligt scenario: [___▾]      │
  │                                                │
  │  Andringar du gor har paverkar inte verklig    │
  │  data. Du kan jamfora, spara, eller kassera    │
  │  nar som helst.                                │
  │                                                │
  │  [Avbryt]                   [Skapa scenario]   │
  └────────────────────────────────────────────────┘
    ↓
300ms fade transition → amber-tinted scenario editor
Banner appears, scenario data loaded from snapshot
```

### Exit: Leaving a Scenario

```
User clicks "Avsluta scenario" in banner
  OR navigates away from /scenarios/* route
    ↓
If changes since last save:
  ┌────────────────────────────────────────────────┐
  │  Avsluta scenario                       [✕]    │
  │  ──────────────────────────────────────────    │
  │  Du har osparade andringar.                    │
  │                                                │
  │  [Spara och avsluta]  ← saves, returns to app │
  │  [Kassera andringar]  ← discards, returns     │
  │  [Fortsatt redigera]  ← stays in scenario     │
  └────────────────────────────────────────────────┘

If no unsaved changes:
  Exit silently, 300ms fade back to normal colors
```

### Promote: Applying Scenario to Actual

```
User clicks "Tillampa pa verklig planering" button
    ↓
Step 1: Select changes to promote
  ┌────────────────────────────────────────────────────────────┐
  │  Tillampa andringar pa verklig planering             [✕]   │
  │  ──────────────────────────────────────────────────────    │
  │  Valj vilka andringar som ska tilampas:                    │
  │                                                            │
  │  ☑ A. Svensson — Scania Fas 2: +80h/mo Jun–Dec           │
  │  ☑ A. Svensson — Atlas Copco: -40h/mo Jun–Dec            │
  │  ☑ B. Lindqvist — Scania Fas 2: +120h/mo Jun–Sep         │
  │  ☐ Ny resurs: Extern konsult (ej skapad i systemet)      │
  │                                                            │
  │  3 av 4 andringar valda                                    │
  │  [Avbryt]                              [Granska →]         │
  └────────────────────────────────────────────────────────────┘
    ↓
Step 2: Review summary diff
  ┌────────────────────────────────────────────────────────────┐
  │  Granska andringar                                  [✕]   │
  │  ──────────────────────────────────────────────────────    │
  │                                                            │
  │  Dessa andringar kommer att goras i verklig planering:     │
  │                                                            │
  │  Person            Projekt         Manader    Timmar       │
  │  ──────────────────────────────────────────────────────    │
  │  A. Svensson       Scania Fas 2   Jun–Dec    +80h/mo      │
  │  A. Svensson       Atlas Copco    Jun–Dec    -40h/mo      │
  │  B. Lindqvist      Scania Fas 2   Jun–Sep    +120h/mo     │
  │                                                            │
  │  Paverkan: 3 personer, 7 manader, netto +160h/mo          │
  │                                                            │
  │  ☑ Jag forstar att detta andrar verklig planering          │
  │                                                            │
  │  [← Tillbaka]                         [Tillampa nu]        │
  └────────────────────────────────────────────────────────────┘
    ↓
Step 3: Execution + undo window
  Toast: "3 andringar tillampade pa verklig planering. [Angra] (30 sek)"
  Promoted rows in scenario get "Tillampad" badge, become read-only
  Dashboard cache invalidated → actuals now reflect promoted changes
```

---

## Comparison View

**Primary mode: Side-by-side with inline deltas.**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🧪 SCENARIO: "Lagg till Scania Fas 2" — [Jamfor med verklighet]│
├───────────────────────────┬─────────────────────────────────────┤
│   VERKLIG DATA            │   SCENARIO                          │
│   (skrivskyddad)          │   (redigerbar)                      │
├───────────────────────────┼─────────────────────────────────────┤
│                           │                                     │
│ ▸ Mechanical Eng          │ ▸ Mechanical Eng                    │
│ A. Svensson   140h  87%  │ A. Svensson   180h  112% ▲+40h ⚠  │
│ B. Lindqvist  100h  62%  │ B. Lindqvist  220h   95% ▲+120h   │
│ C. Eriksson   120h  75%  │ C. Eriksson   120h   75% —         │
│                           │                                     │
│ ▸ Software                │ ▸ Software                          │
│ D. Johansson  160h 100%  │ D. Johansson  160h  100% —         │
│                           │                                     │
│                           │ ★ Extern konsult  160h  100% NY    │
│                           │                                     │
├───────────────────────────┴─────────────────────────────────────┤
│ Summering: Verklig 520h (81%) → Scenario 840h (96%)  ▲+320h   │
│ Nya konflikter: A. Svensson overbelagd (+40h over mal)         │
└─────────────────────────────────────────────────────────────────┘
```

**Rules:**
- Left panel: actual data, read-only, normal colors, no interaction
- Right panel: scenario data, editable, amber-tinted, hatched modified cells
- Delta column: between or inline with scenario values showing ▲/▼/—/★
- Summary bar at bottom: aggregate change with key warnings
- Toggle: "Collapse comparison" to hide left panel and work in scenario only
- On mobile: stacked vertically (actual on top, scenario below) or toggle between views

---

## Technical Isolation Requirements

The codebase audit identified 4 critical isolation points. All must be implemented before scenarios can ship:

### 1. Separate React Query Cache Namespace

```typescript
// Scenario hooks use distinct query key prefixes
// NEVER share keys with actual-data hooks

// Actual (existing — DO NOT CHANGE):
queryKey: ['allocations', personId]
queryKey: ['dashboard-kpis', monthFrom, monthTo]

// Scenario (new — completely separate):
queryKey: ['scenario', scenarioId, 'allocations', personId]
queryKey: ['scenario', scenarioId, 'dashboard-kpis', monthFrom, monthTo]
```

**Zero changes to existing hooks.** Scenario hooks are new files that call new API routes.

### 2. Separate API Routes

```
Actual (existing — DO NOT CHANGE):
  GET /api/allocations
  GET /api/analytics/dashboard
  GET /api/analytics/team-heatmap
  POST /api/allocations/batch

Scenario (new — completely separate):
  GET /api/scenarios/:id/allocations
  GET /api/scenarios/:id/analytics/dashboard
  GET /api/scenarios/:id/analytics/team-heatmap
  PUT /api/scenarios/:id/allocations
```

**Zero changes to existing API routes.** Scenario routes are new files that query `scenario_allocations`.

### 3. Separate Service Functions

```typescript
// New file: src/features/scenarios/scenario-analytics.service.ts
// Mirrors analytics.service.ts but reads from scenario_allocations
// Does NOT modify analytics.service.ts

export async function getScenarioTeamHeatMap(
  orgId: string,
  scenarioId: string,
  monthFrom: string,
  monthTo: string,
) {
  // Same CTE logic, but FROM scenario_allocations WHERE scenario_id = $scenarioId
  // Returns same HeatMapResponse shape — widgets don't know the difference
}
```

### 4. Grid Autosave Isolation

```typescript
// Scenario editor uses a SEPARATE autosave hook
// that invalidates ONLY scenario query keys
// and writes to PUT /api/scenarios/:id/allocations
// NEVER calls POST /api/allocations/batch

// New file: src/hooks/use-scenario-grid-autosave.ts
// Does NOT modify use-grid-autosave.ts
```

**Design principle: The scenario feature adds ~15 new files and modifies 0 existing files.** This is the safest integration path identified by the codebase audit. The original spec's approach of threading a `mode` parameter through 24 existing files is the correct long-term architecture but is not required for initial launch — it can be a later refactor once scenarios are validated with users.

---

## Scope Summary for Build

### New Files (estimated)

| Category | Files | Purpose |
|----------|-------|---------|
| DB Schema | 1 | Add `scenarios`, `scenario_allocations`, `scenario_temp_entities` tables to schema.ts migration |
| API Routes | ~10 | `/api/scenarios/*` CRUD + analytics mirror endpoints |
| Service Layer | 2 | `scenario.service.ts` + `scenario-analytics.service.ts` |
| Hooks | ~6 | `use-scenarios.ts`, `use-scenario-allocations.ts`, `use-scenario-analytics.ts`, `use-scenario-grid-autosave.ts`, etc. |
| Pages | 3 | `/scenarios` (list), `/scenarios/[id]` (editor), `/scenarios/[id]/compare` (side-by-side) |
| Components | ~8 | Scenario banner, scenario editor, promote modal, comparison view, scenario card, impact bar, etc. |
| Feature Flag | 1 | Add `scenarios` to `FLAG_NAMES` |
| **Total** | **~31** | **Zero modifications to existing files** (except schema.ts migration + flag type) |

### Feature Flag Gating

- Flag: `scenarios` (default: disabled)
- Gates: `/scenarios` route, "Scenarier" nav item, "Vad om...?" button on heat map
- Enable per-org after user testing confirms the UX works

---

## Acceptance Criteria (Updated)

| Test | Expected Result |
|------|----------------|
| Create scenario | Snapshot of current allocations stored in `scenario_allocations`. User lands on amber-tinted editor. |
| Edit in scenario | Changes write to `scenario_allocations` only. Actual dashboard shows no change. |
| Banner persistence | Banner visible on every page under `/scenarios/*`. Cannot be dismissed. |
| Comparison view | Side-by-side shows actual (read-only, left) vs scenario (editable, right) with inline deltas. |
| Promote selected | User checks 3 of 5 changes, confirms, actuals updated for those 3 only. Undo toast appears for 30s. |
| Promote role gate | `org:planner` cannot see "Promote" button. `org:admin` and `org:owner` can. |
| Archived person | Warning badge on archived people. Promote checkbox disabled for their rows. |
| Cache isolation | Open actual dashboard in tab A, scenario in tab B. Edit in B. Refresh tab A — no change visible. |
| Export from scenario | PDF includes "SCENARIO — EJ VERKLIG DATA" header, watermark, and scenario name. |
| Stale scenario | Actual allocations changed after scenario created → "Scenario may be outdated" notice with "Refresh baseline" button. |
| Sharing | Creator shares scenario read-only with colleague. Colleague can view but not edit or promote. |
| Limits | 11th scenario creation blocked with message: "Maximum 10 scenarios. Archive or delete one to create a new one." |
