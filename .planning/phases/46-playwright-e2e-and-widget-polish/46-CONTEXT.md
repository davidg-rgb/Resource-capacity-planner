# Phase 46: PDF Widget Rendering Polish — Context

**Status:** Research-derived scoping (no user discussion yet — this is Claude's recommendation; user may adjust)
**Date:** 2026-04-09

## Scope Recommendation: SPLIT

Research (see `46-RESEARCH.md` §"Phase Scope Recommendation") recommends splitting the originally-scoped phase into two:

- **Phase 46 (this phase): PDF Widget Rendering Polish** — fix the two residual widgets from Phase 45.
- **Phase 47 (new): Playwright E2E Infrastructure + TC-E2E Fill** — stand up the Playwright tier and port the 12 TC-E2E flows deferred from Phase 44-12.

Rationale (full version in RESEARCH): widget fixes are ~20-line diffs with unit-test coverage, shippable in 1–2 days. Playwright is a multi-day infra lift with unknowns (CI presence, Clerk dev credentials, seed extensions). Bundling them gives a false synergy — the widget fixes want Vitest jsdom tests, not Playwright pixel diffs.

**If the user rejects the split**, execute as a single Phase 46 with two independent waves (Wave A widget, Wave B Playwright) whose verification gates do NOT cross-block.

The CONTEXT below is written assuming the split is accepted. If not, fold §"Phase 47 Scope (Deferred)" back into Decisions.

## Goal

Fix the two residual PDF export bugs deferred from Phase 45 so that all 9 dashboard widget families render correctly in Exportera PDF.

## Decisions

1. **Two fixes, two files, one commit per fix.**
   - Fix 1: Department Capacity Gauges — the `domToImageCapture` filter in `svg-snapshot.ts:125` strips every `<button>` element, which kills every gauge (each gauge is a `<button>` wrapping a Recharts `PieChart`). Narrow the filter to preserve buttons that contain chart content.
   - Fix 2: Availability Finder — the widget captures at intrinsic content width because `getBoundingClientRect()` reads the `[data-widget-id]` element, which is narrower than its parent grid cell. Add a parent-width fallback in `domToImageCapture`.

2. **Root causes from RESEARCH override the deferred-items.md hypotheses.**
   - "Nested Recharts SVGs don't serialize" — WRONG. It's the button filter.
   - "react-window virtualization reports shrunken rect" — WRONG. Availability Finder has no react-window. It's a width-resolution issue.

3. **Fix via opt-in attribute, not denylist tweaks.** Add `data-pdf-exclude` to interactive chrome that should be stripped (persona switcher, export button itself). Remove the blanket `tag === 'button'` denylist. This prevents future regressions of the same shape.

4. **Add Vitest jsdom tests, not Playwright.** The fixes are capture-layer DOM logic — unit-testable at millisecond speed in jsdom. Add TC-PDF-004 (button-wrapping-Recharts preserved) and TC-PDF-005 (parent-width fallback). No Playwright dependency.

5. **Manual smoke re-run on the same mixed-widget dashboard from Phase 45**, documented in the phase SUMMARY with the same 9-row result table.

6. **No new dependencies.** Both fixes live in the existing `svg-snapshot.ts`.

7. **Before committing the Availability Finder fix, do a 5-minute live DOM inspection** to verify the parent-width hypothesis (RESEARCH §"Availability Finder — shrunken ~20%"). If wrong, re-plan the fix.

## Claude's Discretion

- Exact shape of the filter fix — opt-in attribute vs. narrowed denylist. Default to narrowed denylist (smaller diff) as the minimum viable fix, then add `data-pdf-exclude` support as a separate commit if the planner deems it worth the scope.
- Whether to refactor the Capacity Gauges widget to not use `<button>` as the outer wrapper. Default: no — the button is semantically correct (it navigates on click); fix the filter instead.
- Wave/task breakdown — likely 2 tasks (one per fix) + 1 manual smoke verification task. Planner decides.
- Whether to add an invariant test that exercises the full widget registry through the capture path in jsdom. Nice-to-have, not required.

## Success Criteria

1. Exporting a mixed-widget dashboard to PDF renders all 9 widget families correctly — including Department Capacity Gauges (gauges visible, not empty frame) and Availability Finder (full width, not shrunken).
2. `pnpm vitest run src/features/dashboard/pdf-export` green, with at least 2 new tests (TC-PDF-004, TC-PDF-005).
3. `pnpm typecheck` clean.
4. `pnpm build` succeeds.
5. Manual smoke test result table updated in 46 SUMMARY showing 9/9 PASS (previously 7/9 PASS + 2 deferred).
6. Phase 45 `deferred-items.md` cross-referenced as resolved.
7. No regressions in the 7 already-passing widget families.

## Non-Goals

- **Playwright E2E infrastructure.** Moved to Phase 47. No Playwright install, no `e2e/` directory, no CI runner changes in this phase.
- **TC-E2E-* coverage fill.** Stays allowlisted with the existing `reasons.TC-E2E` block until Phase 47.
- **Pixel-diff visual regression.** Not set up in this repo yet; defer until Playwright lands.
- **Rewriting the widget capture pipeline.** Scope-limited to the two diagnosed bugs. No library swap, no architecture change.
- **Per-widget `prepareForCapture()` hook.** Over-engineered for two bugs with simpler fixes.
- **Cross-browser PDF testing.** Chromium-only, as Phase 45 shipped.

## Constraints

- Must not regress the Recharts SVG fast-path (the 3 widgets that use it — Department Bar Chart, Discipline Chart, Capacity Forecast — stay crisp).
- Must not regress the 4 widgets fixed in Phase 45 (KPI Cards, Heat Map, Sparklines, Bench Report).
- Public API of `captureWidgetSnapshot` / `captureWidgetSnapshots` stays unchanged — `use-pdf-export.ts` and `dashboard-pdf-document.tsx` should need zero edits.
- Fix must be browser-deterministic — no reliance on timing hacks beyond the existing 2-RAF wait.
- All work lands on `main` via commits following existing `fix(46-NN): ...` convention from Phase 45.

## Deferred Ideas (OUT OF SCOPE)

- `data-pdf-exclude` attribute system widely applied across the dashboard chrome. Minimal version only in this phase.
- Visual regression baseline via Playwright screenshot-diffs.
- Refactoring Capacity Gauges into a single flat SVG.
- Refactoring Availability Finder with explicit width props from the grid layout.
- Auto-detection of "shrunken container" pattern across all widgets.

## Phase 47 Scope (Deferred — Playwright)

For planner reference if the split is accepted. Full details in `46-RESEARCH.md` §"Playwright Stack" and §"TC-E2E Per-Flow Inventory".

**Goal:** Stand up Playwright, port the 12 TC-E2E flows from ARCHITECTURE §15.13, remove the TC-E2E allowlist block.

**Working requirements:**
- PLAY-01 Install `@playwright/test` + `@clerk/testing`, add `e2e/playwright.config.ts`.
- PLAY-02 Persona fixture (`page.addInitScript` → `localStorage['nc:persona']`).
- PLAY-03 Test DB bootstrap: `src/app/api/test/seed/route.ts` (NODE_ENV-gated) + `e2e/global-setup.ts` loading `buildSeed('e2e')`.
- PLAY-04 Port 12 TC-E2E-* specs, one per canonical ID.
- PLAY-05 Extend `buildSeed()` for rejected-proposal row (TC-E2E-1C) and deterministic heatmap cells (TC-E2E-2A).
- PLAY-06 Remove TC-E2E entries from `tc-allowlist.json`; delete `reasons.TC-E2E` block; regenerate manifest.
- PLAY-07 CI wiring (GH Actions Linux chromium, cache browser binaries, upload traces on failure) — **only if CI already exists in the repo; otherwise flag as separate decision.**

**Open questions for Phase 47 planning:**
- Is there existing GitHub Actions config? (research pass didn't verify)
- Does the team have a Clerk dev instance? (required for testing-tokens path)
- Which DB runs E2E — branched Neon, dockerized Postgres, or dev-local? (planner picks)

## References

- `46-RESEARCH.md` — root-cause analysis, Playwright stack details, TC-E2E flow inventory, code examples
- `.planning/phases/45-launch-gate-pdf-export/45-01-SUMMARY.md` — what shipped vs deferred in Phase 45
- `.planning/phases/45-launch-gate-pdf-export/deferred-items.md` — original deferred hypotheses (now disproven by source inspection)
- `.planning/phases/44-api-hardening-and-test-contract-fill/44-12-SUMMARY.md` — Playwright deferral rationale
- `.planning/v5.0-ARCHITECTURE.md` §15.13 — canonical TC-E2E-* list
- `.planning/test-contract/tc-allowlist.json` — `reasons.TC-E2E` block to remove in Phase 47
