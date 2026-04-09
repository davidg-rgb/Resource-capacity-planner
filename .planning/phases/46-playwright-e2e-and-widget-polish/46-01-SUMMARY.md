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
    - "Parent-width fallback for intrinsic-width widgets in stretched grid cells"
  affects:
    - "src/features/dashboard/pdf-export/svg-snapshot.ts (domToImageCapture)"
tech_stack:
  added: []
  patterns:
    - "Narrowed denylist filter: strip buttons/selects only when they contain no chart descendants"
    - "Parent-rect width fallback with temporary inline-width stretch inside try/finally"
key_files:
  created: []
  modified:
    - src/features/dashboard/pdf-export/svg-snapshot.ts
    - src/features/dashboard/pdf-export/__tests__/svg-snapshot.test.ts
    - .planning/phases/45-launch-gate-pdf-export/deferred-items.md
decisions:
  - "Kept minimum-viable-fix (narrowed denylist), did NOT introduce data-pdf-exclude attribute system — deferred per 46-CONTEXT §Claude's Discretion"
  - "Used parent-width fallback in domToImageCapture rather than a per-widget prepareForCapture() hook — simpler, covers the actual bug, no new API"
  - "No changes to Recharts SVG fast-path (extractSvgElement) — it already serves the 3 chart widgets correctly"
  - "Public API of captureWidgetSnapshot / captureWidgetSnapshots unchanged — zero caller updates"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-09"
  tasks: 3
  files_modified: 3
  tests_added: 3
  commits: 3
---

# Phase 46 Plan 01: PDF Widget Rendering Polish Summary

Fixed the two residual PDF export bugs deferred from Phase 45 (Department Capacity Gauges empty frame, Availability Finder shrunken ~20%) with minimal, well-tested edits to `svg-snapshot.ts` — narrowed the button/select filter and added a parent-width fallback in `domToImageCapture`.

## What Shipped

- **WIDGET-01 — Department Capacity Gauges render empty frame.** Root cause: `domToImageCapture` filter at `svg-snapshot.ts:125` stripped every `<button>`, `<select>`, and `role="button"` node wholesale. `SingleGauge` (`src/components/charts/capacity-gauges.tsx:88`) wraps each gauge in a `<button>` for click-to-navigate, so every gauge was dropped from the foreignObject clone — the widget outer frame and `<h4>` title survived, every gauge disappeared. The Phase 45 "nested Recharts SVGs don't serialize" hypothesis in `deferred-items.md` was disproved by Phase 46 source inspection.

  **Fix:** Narrowed the filter so `button` / `select` / `role="button"` nodes are preserved when their subtree contains `.recharts-wrapper` or `<svg>`. Plain buttons without chart descendants (Export PDF button, filter controls) still get stripped.

- **WIDGET-02 — Availability Finder renders shrunken.** Root cause: the widget has NO `react-window` and NO `content-visibility` — the Phase 45 virtualization hypothesis was wrong. Actual cause: `container.getBoundingClientRect()` was called on `[data-widget-id="availability-finder"]`, whose CSS width resolves to the intrinsic content width (narrower than the stretched grid-cell parent). html-to-image then captured at the intrinsic width while the PDF tile was allocated wider, appearing "shrunken ~20%" centered in its tile.

  **Fix:** Parent-width fallback in `domToImageCapture`. When `parentElement.getBoundingClientRect().width > selfRect.width`, use the parent width for capture dimensions and temporarily set `container.style.width = ${parentWidth}px` so the foreignObject layout fills the allocated tile. Inline width is restored in a `finally` block. If the parent is not wider, behavior is unchanged (intrinsic/self width).

- **Two new jsdom unit tests** in `src/features/dashboard/pdf-export/__tests__/svg-snapshot.test.ts`:
  - **TC-PDF-004:** Captured filter preserves `<button>` wrapping `.recharts-wrapper`, strips plain `<button>`, strips `<select>`, preserves `role="button"` with `<svg>` child, strips `role="button"` without chart content.
  - **TC-PDF-005:** Two scenarios — (a) parent wider than container → `toPng` called with `width: 800`, `canvasWidth: 800`, and `container.style.width` restored to `''` after capture; (b) parent narrower → self width `600` used, no restoration needed.

- **Phase 45 `deferred-items.md` updated** with a Resolution section at the top pointing to Phase 46-01 commits and tests, noting the original hypotheses were disproved.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | WIDGET-01 — preserve gauge buttons in pdf capture filter (TDD) | `1ed32a2` | `svg-snapshot.ts`, `svg-snapshot.test.ts` |
| 2 | WIDGET-02 — parent-width fallback in domToImageCapture (TDD) | `535526f` | `svg-snapshot.ts`, `svg-snapshot.test.ts` |
| 3 | Build verification + Phase 45 deferred-items resolution pointer | `ddbd9c3` | `deferred-items.md` |

## Verification

| Gate | Command | Result |
|------|---------|--------|
| PDF-export unit tests | `pnpm vitest run src/features/dashboard/pdf-export` | **11/11 green** (8 prior + TC-PDF-004 + TC-PDF-005-a + TC-PDF-005-b) |
| Typecheck | `pnpm typecheck` | Clean |
| Build | `pnpm build` | Success |
| Full Vitest suite | `pnpm vitest run` | **707/707 green** (105 test files) |

## Widget Smoke Test Result Table (9 families)

The plan spec (`<verification>` step 5) calls for the orchestrator to run a manual/automated browser smoke test on a mixed-widget dashboard and record the 9/9 result here. That step is **performed post-plan by the orchestrator** — it is not one of the three autonomous tasks. The table below is the target shape the orchestrator should fill in.

| # | Widget Family | Pre-Phase-45 | Post-Phase-45 (shipped) | Post-Phase-46 (this plan) |
|---|---|---|---|---|
| 1 | KPI Cards | broken | ✅ fixed | ✅ unchanged |
| 2 | Heat Map | broken | ✅ fixed | ✅ unchanged |
| 3 | Sparklines | broken | ✅ fixed | ✅ unchanged |
| 4 | Bench Report | broken | ✅ fixed | ✅ unchanged |
| 5 | Department Bar Chart (Recharts fast-path) | ✅ working | ✅ working | ✅ working |
| 6 | Discipline Chart (Recharts fast-path) | ✅ working | ✅ working | ✅ working |
| 7 | Capacity Forecast (Recharts fast-path) | ✅ working | ✅ working | ✅ working |
| 8 | Department Capacity Gauges | hijacked-arc | empty-frame (deferred) | **expected ✅ (WIDGET-01)** |
| 9 | Availability Finder | shrunken ~20% | shrunken ~20% (deferred) | **expected ✅ (WIDGET-02)** |

Orchestrator: replace the two "expected ✅" cells with the observed smoke-test result after running Exportera PDF against a mixed dashboard.

## Deviations from Plan

None of the auto-fix rules fired. Plan executed exactly as written:

- Task 1 followed the specified filter shape verbatim.
- Task 2 followed the specified width-fallback block verbatim, including the `try/finally` restore.
- Task 3 built cleanly, full suite stayed green, deferred-items.md got a Resolution section pointing at this plan.

One minor test authoring note (not a deviation from the plan's intent): TC-PDF-004 needs TWO `<button>`-wrapped `.recharts-wrapper` children in the fixture, not one, because the SVG fast-path (`extractSvgElement`) activates when exactly one `.recharts-wrapper` is present and bypasses `domToImageCapture` (and therefore the `filter` callback). Adding a second `.recharts-wrapper` forces the fallback path where the filter is invoked — consistent with production behavior on the real Capacity Gauges widget which has N gauges.

## Known Stubs

None. Both fixes are real, wired, and unit-tested. No placeholder data, no "coming soon" text.

## Self-Check: PASSED

- Created/modified files exist: `svg-snapshot.ts`, `svg-snapshot.test.ts`, `deferred-items.md` ✅
- Commits exist: `1ed32a2`, `535526f`, `ddbd9c3` ✅
- `pnpm vitest run src/features/dashboard/pdf-export` green (11/11) ✅
- `pnpm vitest run` full suite green (707/707) ✅
- `pnpm typecheck` clean ✅
- `pnpm build` success ✅
- Public API unchanged, no new dependencies, Recharts fast-path untouched ✅
