# Phase 45 — Deferred Items

Items discovered during Phase 45 (LAUNCH-01 PDF export fix) that are out of scope for the launch gate and carried into Phase 46.

## For Phase 46 (Playwright E2E infra + widget rendering polish)

### 1. Department Capacity Gauges render as empty frame in PDF

**Discovered:** 2026-04-09, Phase 45 Plan 01 manual smoke test
**Severity:** Low (visually neutral — strictly better than pre-Phase-45 state)
**Component:** `src/features/dashboard/widgets/department-capacity-gauges/*`

**Symptom:** In PDF export, the widget container frame and the "Avdelningshälsa" heading render correctly, but the gauge SVG bodies (Recharts `RadialBarChart` arcs) render empty.

**Pre-Phase-45 state:** A tiny hijacked arc appeared (the old html2canvas SVG walk picked up an inner `<svg>` from one radial bar and rendered it at container scale). The Phase 45 fix eliminated the hijack, so this widget moved from "visually broken" to "visually blank" — an improvement, not a regression.

**Suspected root cause:** Recharts `RadialBarChart` produces multiple nested `<svg>` elements (one outer chart svg + one svg per radial bar). The Phase 45 SVG fast-path is scoped to a single `.recharts-wrapper` ancestor (commit 115decd), so this widget falls through to the html-to-image DOM path. html-to-image's foreignObject rasterization appears to drop or clip the nested SVGs during serialization.

**Proposed fix:** Either (a) add a gauge-specific capture branch that walks the nested SVGs and composites them into a single flat SVG before rasterization, or (b) rewrite `DepartmentCapacityGauges` as a single flat SVG (no nested svgs per bar). Option (b) is likely cleaner and also improves the on-screen rendering performance.

**Validation gate:** Phase 46 Playwright E2E should include a `TC-PDF-004` assertion: "Department Capacity Gauges widget region in the exported PDF has non-zero pixel variance in the gauge body area."

---

### 2. Availability Finder renders shrunken (~20% size) in PDF

**Discovered:** 2026-04-09, Phase 45 Plan 01 manual smoke test
**Severity:** Low (unchanged pre/post Phase 45 — not introduced here)
**Component:** `src/features/dashboard/widgets/availability-finder/*`

**Symptom:** In PDF export, the widget renders in the expected tile location but at roughly 20% of its natural size, centered within the tile with white space around it.

**Pre-Phase-45 state:** Identical shrunken rendering. This was not introduced by the html2canvas → html-to-image swap.

**Suspected root cause:** `AvailabilityFinder` uses `react-window` virtualization with `content-visibility: auto` on child rows. At capture time, the virtualized viewport reports a small bounding box (the window, not the total content), so `container.getBoundingClientRect()` returns a shrunken size. The Phase 45 post-smoke fix (commit 115decd) passed explicit capture dimensions to html-to-image but read them from the shrunken `getBoundingClientRect()`, so the override had no effect. `scrollIntoView` (commit dda9708) also did not help because the outer container is already in view — the issue is internal virtualization state, not scroll position.

**Proposed fix:** Introduce an optional `prepareForCapture()` hook on widgets. For `AvailabilityFinder`, this hook would:
1. Set `overflow: visible` + `content-visibility: visible` + `contain: none` on the virtualized list
2. Force render all virtualized rows (temporarily disable `react-window`)
3. Capture, then restore original state

Alternative: render a non-virtualized "static" variant of the widget during PDF export mode (gated by a `useIsPdfExporting()` context).

**Validation gate:** Phase 46 Playwright E2E should include a `TC-PDF-005` assertion: "Availability Finder widget region in the exported PDF occupies ≥90% of its allocated tile bounds."

---

## Cross-Reference

- Phase 46 is already scoped for Playwright E2E infrastructure (TC-E2E-* deferred from Phase 44). These two widget rendering fixes pair naturally with Playwright because they need pixel-level automated validation to prevent regression.
- Phase 45 SUMMARY (`45-01-SUMMARY.md`) documents the Rule 4 scope-limiting rationale for deferring these.
