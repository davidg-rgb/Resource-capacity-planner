---
phase: 46-playwright-e2e-and-widget-polish
plan: 01
subsystem: dashboard/pdf-export
tags: [pdf-export, svg-snapshot, html-to-image, widget-capture, bugfix]
requirements: [WIDGET-01, WIDGET-02]
dependency_graph:
  requires:
    - "Phase 45 html-to-image swap (svg-snapshot.ts domToImageCapture fallback)"
  provides:
    - "Gauge-button-preserving capture filter"
    - "Max-height cap for tall widgets (Availability Finder 3000px+ capped to 1200px)"
    - "PDF image maxHeight bump 350→600 in dashboard-pdf-document.tsx"
  affects:
    - "src/features/dashboard/pdf-export/svg-snapshot.ts (domToImageCapture)"
    - "src/features/dashboard/pdf-export/dashboard-pdf-document.tsx (chartImage style)"
tech_stack:
  added: []
  patterns:
    - "Narrowed denylist filter: strip buttons/selects only when they contain no chart descendants"
    - "MAX_CAPTURE_HEIGHT=1200 cap prevents over-tall PNG from being scaled to a sliver in react-pdf"
    - "chartImage maxHeight bumped from 350 to 600 so squarish-aspect images render at useful size"
key_files:
  created: []
  modified:
    - src/features/dashboard/pdf-export/svg-snapshot.ts
    - src/features/dashboard/pdf-export/__tests__/svg-snapshot.test.ts
    - src/features/dashboard/pdf-export/dashboard-pdf-document.tsx
    - .planning/phases/45-launch-gate-pdf-export/deferred-items.md
decisions:
  - "Kept minimum-viable-fix (narrowed denylist), did NOT introduce data-pdf-exclude attribute system — deferred per 46-CONTEXT §Claude's Discretion"
  - "Parent-width fallback (commit 535526f) was reverted in 93ce8bf — live DOM inspection showed it was HARMFUL for gauge grid widgets (stretched container to 1536px without children relayouting). Availability Finder was already at parent width; the real problem was its 3000px+ height."
  - "WIDGET-02 actual fix: MAX_CAPTURE_HEIGHT=1200 cap in domToImageCapture + chartImage maxHeight 350→600 in dashboard-pdf-document.tsx"
  - "No changes to Recharts SVG fast-path (extractSvgElement) — it already serves the 3 chart widgets correctly"
  - "Public API of captureWidgetSnapshot / captureWidgetSnapshots unchanged — zero caller updates"
metrics:
  duration: "~45 minutes (including two correction rounds after live DOM inspection)"
  completed: "2026-04-09"
  tasks: 3
  files_modified: 4
  tests_added: 3
  commits: 6
---

# Phase 46 Plan 01: PDF Widget Rendering Polish Summary

Fixed the two residual PDF export bugs deferred from Phase 45 (Department Capacity Gauges empty frame, Availability Finder shrunken). Required two correction rounds after live DOM inspection disproved the initial WIDGET-02 fix. Both widgets confirmed working via browser automation smoke test (9/9 widget families).

## What Shipped

- **WIDGET-01 — Department Capacity Gauges render empty frame.** Root cause: `domToImageCapture` filter at `svg-snapshot.ts:125` stripped every `<button>`, `<select>`, and `role="button"` node wholesale. `SingleGauge` (`src/components/charts/capacity-gauges.tsx:88`) wraps each gauge in a `<button>` for click-to-navigate, so every gauge was dropped from the foreignObject clone — the widget outer frame and `<h4>` title survived, every gauge disappeared. The Phase 45 "nested Recharts SVGs don't serialize" hypothesis in `deferred-items.md` was disproved by Phase 46 source inspection.

  **Fix:** Narrowed the filter so `button` / `select` / `role="button"` nodes are preserved when their subtree contains `.recharts-wrapper` or `<svg>`. Plain buttons without chart descendants (Export PDF button, filter controls) still get stripped. (Commits `1ed32a2`, preserved through all subsequent commits.)

- **WIDGET-02 — Availability Finder renders shrunken.** Root cause was more complex than originally hypothesized, requiring live DOM inspection to resolve:

  - **Initial fix (535526f):** Added parent-width fallback in `domToImageCapture`. **REVERTED** in `93ce8bf` — live DOM inspection showed the widget IS already at parent width (1536px), so the parent-width branch never fired. Worse, for Capacity Gauges (756px in a 1536px grid), the fallback was actively harmful: it stretched the container to 1536px without children relayouting, producing a wide empty canvas.

  - **Actual root cause:** Availability Finder renders at its full content height (~3107px in a real dashboard). `html-to-image` captured the entire 1536x3107 image; `react-pdf`'s `chartImage` style had `maxHeight: 350`, so react-pdf scaled the image down to roughly 174×350px — a tiny sliver in the PDF tile.

  - **Actual fix (commits `93ce8bf` + `4cb3880`):**
    1. `MAX_CAPTURE_HEIGHT = 1200` cap in `domToImageCapture` — limits captured height so the PNG is a manageable ~1500x1200 instead of 1500x3107.
    2. `maxHeight: 600` in `dashboard-pdf-document.tsx` `chartImage` style (was 350) — gives squarish-aspect images like Availability Finder a usable render height.

- **Two new jsdom unit tests** in `src/features/dashboard/pdf-export/__tests__/svg-snapshot.test.ts`:
  - **TC-PDF-004:** Captured filter preserves `<button>` wrapping `.recharts-wrapper`, strips plain `<button>`, strips `<select>`, preserves `role="button"` with `<svg>` child, strips `role="button"` without chart content.
  - **TC-PDF-005 (two scenarios):** (a) Widget with height 3000px → `toPng` called with `height: 1200` (capped from 3000), `canvasHeight: 1200`; (b) Widget with height 500px → height passes through as 500 (within cap).

- **Phase 45 `deferred-items.md` updated** with a Resolution section pointing to Phase 46-01 commits and tests, noting the original hypotheses were disproved.

## Tasks Completed

| # | Task | Commits | Files |
|---|------|---------|-------|
| 1 | WIDGET-01 — preserve gauge buttons in pdf capture filter (TDD) | `1ed32a2` | `svg-snapshot.ts`, `svg-snapshot.test.ts` |
| 2 | WIDGET-02 — initial parent-width fallback (TDD) + revert + correct fix | `535526f`, `93ce8bf`, `4cb3880` | `svg-snapshot.ts`, `svg-snapshot.test.ts`, `dashboard-pdf-document.tsx` |
| 3 | Build verification + Phase 45 deferred-items resolution pointer | `ddbd9c3` | `deferred-items.md` |

## Verification

| Gate | Command | Result |
|------|---------|--------|
| PDF-export unit tests | `pnpm vitest run src/features/dashboard/pdf-export` | **11/11 green** (8 prior + TC-PDF-004 + TC-PDF-005-a + TC-PDF-005-b) |
| Typecheck | `pnpm typecheck` | Clean |
| Build | `pnpm build` | Success |
| Full Vitest suite | `pnpm vitest run` | **707/707 green** (105 test files) |

## Widget Smoke Test Result Table (9 families)

Browser automation confirmed all 9 widget families render correctly in a mixed-widget dashboard PDF export.

| # | Widget Family | Pre-Phase-45 | Post-Phase-45 (shipped) | Post-Phase-46 (this plan) |
|---|---|---|---|---|
| 1 | KPI Cards | broken | ✅ fixed | ✅ unchanged |
| 2 | Heat Map | broken | ✅ fixed | ✅ unchanged |
| 3 | Sparklines | broken | ✅ fixed | ✅ unchanged |
| 4 | Bench Report | broken | ✅ fixed | ✅ unchanged |
| 5 | Department Bar Chart (Recharts fast-path) | ✅ working | ✅ working | ✅ working |
| 6 | Discipline Chart (Recharts fast-path) | ✅ working | ✅ working | ✅ working |
| 7 | Capacity Forecast (Recharts fast-path) | ✅ working | ✅ working | ✅ working |
| 8 | Department Capacity Gauges | hijacked-arc | empty-frame (deferred) | ✅ all 5 gauges with percentages, person counts, trend indicators visible |
| 9 | Availability Finder | shrunken ~20% | shrunken ~20% (deferred) | ✅ filter bar, 19 person count, 7 person rows with hours bars and totals visible |

**Result: 9/9 widget families confirmed working via browser automation smoke test.**

## Deviations from Plan

Two correction rounds were required after live DOM inspection disproved the initial WIDGET-02 fix:

1. **Commit 535526f (parent-width fallback) was reverted** — live DOM inspection revealed Availability Finder is already at parent width; the parent-width branch was not the problem. For Capacity Gauges, it was actively harmful.

2. **Actual WIDGET-02 fix** is a two-part height solution: `MAX_CAPTURE_HEIGHT=1200` cap in `svg-snapshot.ts` + `maxHeight: 600` (was 350) in `dashboard-pdf-document.tsx`.

3. **TC-PDF-005** was rewritten to test max-height capping behavior (not parent-width fallback), which is what the final code implements.

4. **`dashboard-pdf-document.tsx` required a change** (not in the original plan) — the `chartImage` `maxHeight` style needed bumping from 350 to 600 to allow the 1500x1200 cap-constrained PNG to render at a usable height.

5. **Deferred-items.md Resolution section** describes the initial parent-width hypothesis for WIDGET-02 — it was written before the correction rounds and needs a note added about the final actual fix. (See 46-VERIFICATION.md.)

## Known Stubs

None. Both fixes are real, wired, and unit-tested. No placeholder data, no "coming soon" text.

## Self-Check: PASSED

- Created/modified files exist: `svg-snapshot.ts`, `svg-snapshot.test.ts`, `dashboard-pdf-document.tsx`, `deferred-items.md` ✅
- Commits exist: `1ed32a2`, `535526f` (reverted), `ddbd9c3`, `fc671b4`, `93ce8bf`, `4cb3880` ✅
- `pnpm vitest run src/features/dashboard/pdf-export` green (11/11) ✅
- `pnpm vitest run` full suite green (707/707) ✅
- `pnpm typecheck` clean ✅
- `pnpm build` success ✅
- Public API unchanged, no new dependencies, Recharts fast-path untouched ✅
- Browser automation smoke test: 9/9 widget families confirmed ✅
