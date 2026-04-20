# Phase 45: Launch gate — PDF export bug fix — Context

**Created:** 2026-04-09
**Requirement:** LAUNCH-01
**Blocks:** v5.0 launch
**Scope:** Single bug fix. One plan file downstream.

## Goal

Exported dashboard PDFs render **every** widget type correctly — chart, table, KPI card, sparkline, bench report, availability finder — with no blank tiles and no "tabelldata, se interaktiv dashboard" placeholders.

Achieved by replacing the `html2canvas` fallback in `src/features/dashboard/pdf-export/svg-snapshot.ts` with `html-to-image`.

## Success Criteria (ONE clear thing)

**A user clicks "Exportera PDF" on a dashboard containing mixed widget types (Recharts chart + KPI card + sparkline + table), and the resulting PDF displays all widgets as rendered images. No placeholders. No blank regions.**

Measurable acceptance:
1. Unit tests in `src/features/dashboard/pdf-export/svg-snapshot.test.ts` pass, covering both the SVG fast-path and the new `html-to-image` fallback path (mocked).
2. A static dependencies test asserts `html2canvas` is no longer in `package.json`.
3. Manual smoke test: export a dashboard with ≥1 of each widget family (Recharts, HTML KPI, HTML sparkline, HTML table). Open the PDF. Zero placeholder boxes.
4. Swedish characters (åäö) render in the correct typeface (not fallback).

## Decisions

- **Library:** `html-to-image@^1.11.13`. Not `modern-screenshot` (less battle-tested).
- **Scope:** Replace the `html2canvasCapture()` function only. Keep the Recharts SVG fast-path (`extractSvgElement()` → `svgToPngDataUri()`) unchanged — it works and is crisper.
- **No feature flag.** This is a bug fix; the old path is unusable. Ship directly to main.
- **Error surfacing:** Replace the silent `catch { return null; }` in `captureWidgetSnapshot` with `console.warn` that logs widget ID + error. Aids future debugging without changing behavior.
- **Package manager:** `pnpm` (already in use). Commands: `pnpm remove html2canvas && pnpm add html-to-image@^1.11.13`.
- **Single plan file downstream.** This phase is one wave, one plan. The planner should not split.

## Non-Goals (OUT OF SCOPE)

- Rewriting widgets as native `@react-pdf/renderer` primitives (deferred to v6.0 if ever)
- Server-side PDF generation via Puppeteer/Playwright (massive scope increase)
- Visual regression testing with pixel diffs (launch gate is about non-blank, not pixel-perfect)
- Vitest browser mode setup (covered by manual smoke test + mocked unit tests instead)
- Removing or changing `@react-pdf/renderer`
- Touching the cover page, export modal UI, or `use-pdf-export.ts` orchestration
- Font embedding tuning beyond `await document.fonts.ready`
- Fixing the hardcoded `orgName = "Nordic Capacity"` stub flagged in Phase 31 (separate concern)

## Deferred Ideas

- Render text-heavy widgets (tables, KPI cards) as native React-PDF components for higher fidelity
- Add vitest browser-mode coverage for real-pixel capture assertions
- Replace manual smoke test with Playwright e2e in Phase 46 (alongside TC-E2E-* deferred from Phase 44)

## Constraints

- **Do not break the Recharts SVG fast-path.** It is not part of this bug and regressing it would break the chart widgets that currently work.
- **Keep the existing public API of `captureWidgetSnapshot` and `captureWidgetSnapshots` unchanged.** `use-pdf-export.ts` must not need modification.
- **No changes to `dashboard-pdf-document.tsx`** — the placeholder branch stays as-is, it just shouldn't fire.
- **Follow CLAUDE.md project conventions.** (No CLAUDE.md present at repo root; defer to v5.0 architecture and the `.planning/research/STACK.md` / `PITFALLS.md` conventions already in use.)
- **Commit style:** existing repo uses conventional commits with `Co-Authored-By: Claude Opus 4.6 (1M context)` footer.

## Verification Approach

### Automated (CI)
1. **Unit test — capture paths:**
   `src/features/dashboard/pdf-export/svg-snapshot.test.ts`
   - SVG path: given a container with a Recharts `<svg>`, `captureWidgetSnapshot` returns a `data:image/png;base64,...` string
   - HTML path: mocking `html-to-image.toPng`, given a container without SVG, `captureWidgetSnapshot` returns the mocked data URI
   - Error path: when `toPng` throws, returns `null` AND `console.warn` was called with the widget ID
2. **Static dependency test:**
   `src/features/dashboard/pdf-export/dependencies.test.ts`
   - Reads `package.json` and asserts `html2canvas` is not present in `dependencies` or `devDependencies`
3. **Integration test (mocked):**
   `src/features/dashboard/pdf-export/use-pdf-export.test.ts`
   - With `html-to-image.toPng` and `@react-pdf/renderer.pdf` both mocked, `exportDashboard()` assembles a widget list where every `snapshotUri` is non-null

### Manual smoke test (launch gate)
1. Run `pnpm dev`, log in, navigate to a dashboard containing: ≥1 Recharts widget, ≥1 KPI card, ≥1 sparkline, ≥1 table widget
2. Click "Exportera PDF", accept defaults, export
3. Open the downloaded PDF
4. Verify: no placeholder boxes reading "— tabelldata, se interaktiv dashboard"
5. Verify: Swedish characters (åäö) render in the app's sans-serif font
6. Capture screenshot of the PDF and attach to the phase SUMMARY.md

## Test Contract IDs to Satisfy

This phase does **not** introduce new TC-* IDs in §15 of the v5.0 ARCHITECTURE. LAUNCH-01 is a v4.0 bug gate. The verification above is the contract for this phase.

If the planner wants to formalize the regression tests under a TC-ID for traceability, suggested: **TC-PDF-001** (SVG path returns PNG data URI), **TC-PDF-002** (HTML path via html-to-image returns PNG data URI), **TC-PDF-003** (`html2canvas` not in dependencies). These would be net-new and would need a one-line addition to ARCHITECTURE §15 — optional, not required by LAUNCH-01 itself.

## Files Expected to Change

| File | Change |
|------|--------|
| `src/features/dashboard/pdf-export/svg-snapshot.ts` | Replace `html2canvasCapture` function + import; add `console.warn` in error path |
| `package.json` | Remove `html2canvas`, add `html-to-image` |
| `pnpm-lock.yaml` | Regenerated |
| `src/features/dashboard/pdf-export/svg-snapshot.test.ts` | NEW |
| `src/features/dashboard/pdf-export/dependencies.test.ts` | NEW |
| `src/features/dashboard/pdf-export/use-pdf-export.test.ts` | NEW (optional — integration wiring) |

**Expected diff size:** < 200 lines total, dominated by new test files. The production change is a single function replacement (~30 lines).

## Done Definition

- [ ] `pnpm test` green
- [ ] `pnpm build` green
- [ ] Manual smoke test passed with screenshot attached to SUMMARY
- [ ] `html2canvas` removed from `package.json` and `pnpm-lock.yaml`
- [ ] `html-to-image` at `^1.11.13` present in `package.json`
- [ ] Phase 45 SUMMARY.md written
- [ ] ROADMAP.md + STATE.md updated to mark Phase 45 complete
- [ ] Ready for v5.0 launch
