# Phase 45: Launch gate — PDF export bug fix — Research

**Researched:** 2026-04-09
**Domain:** Client-side DOM-to-image capture for `@react-pdf/renderer` dashboard export
**Confidence:** HIGH

## Summary

Phase 31 (v4.0) shipped client-side dashboard PDF export via `@react-pdf/renderer` with a two-strategy snapshot pipeline: Recharts SVG → PNG for chart widgets, and `html2canvas` fallback for everything else (KPI cards, sparklines, bench report, availability finder). The SVG path works. The `html2canvas` fallback does not — non-SVG widgets render as the "tabelldata, se interaktiv dashboard" placeholder in the exported PDF because `captureWidgetSnapshot()` returns `null` (or a blank PNG that the PDF renderer treats as empty). Commit `9e19794` attempted to fix it by inlining CSS custom properties in an `onclone` hook, which did not resolve the issue.

The fix is mechanically small and scoped: replace the `html2canvasCapture()` function in `src/features/dashboard/pdf-export/svg-snapshot.ts` with `html-to-image`'s `toPng()`, drop the `html2canvas` dependency, and add a regression test that exercises a representative non-SVG widget through the capture path.

**Primary recommendation:** Swap `html2canvas@1.4.1` → `html-to-image@1.11.13`. It is actively maintained, explicitly handles CSS custom properties and web fonts, has a smaller footprint (315 KB unpacked vs. html2canvas ~1.7 MB), and its `toPng(node, options)` API is a near drop-in replacement. `modern-screenshot` is a viable but newer alternative — slightly smaller (185 KB) and a fork of html-to-image with performance fixes, but less battle-tested in Next.js 16 + React 19 environments.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAUNCH-01 | PDF export captures all dashboard widget types (html2canvas currently blank for non-SVG widgets) — swap to `html-to-image` or `modern-screenshot`. Must ship before v5.0 launch. | Current code identified (`svg-snapshot.ts` lines 80–136). Replacement library chosen (§Standard Stack). Regression test approach defined (§Validation Architecture). |

## Current State — Where the Bug Lives

### Files in scope
| File | Role | Change required |
|------|------|-----------------|
| `src/features/dashboard/pdf-export/svg-snapshot.ts` | Capture utility — SVG path + html2canvas fallback | Replace `html2canvasCapture()` function (lines 80–136) |
| `src/features/dashboard/pdf-export/use-pdf-export.ts` | Orchestration hook | No change (calls `captureWidgetSnapshots` — signature unchanged) |
| `src/features/dashboard/pdf-export/dashboard-pdf-document.tsx` | React-PDF template — line 156 branches on `snapshotUri` to placeholder | No change; fix upstream so snapshot is non-null |
| `package.json` | Dependency list | Remove `html2canvas`, add `html-to-image` |

### Exactly what's blank vs. what works
- **Works (Recharts SVG widgets):** capacity gauges, department bar chart, discipline chart, capacity forecast — captured via `extractSvgElement()` → `svgToPngDataUri()` pure-SVG path, never touches html2canvas.
- **Blank (HTML/table widgets):** KPI cards, utilization sparklines, bench report, availability finder, any custom dashboard tile without a Recharts `<svg>`. `extractSvgElement()` returns null → falls through to `html2canvasCapture()` → catch block swallows the error → `captureWidgetSnapshot()` returns `null` → PDF renderer hits the `null` branch at `dashboard-pdf-document.tsx:156` and draws the "tabelldata, se interaktiv dashboard" placeholder box.

### What commit 9e19794 tried
Added an `onclone` hook to `html2canvas` options that walks every element in the cloned document and inlines computed values for `color`, `background-color`, `border-*-color`, `fill`, `stroke`, `box-shadow`, `outline-color`, and `font-family`. Hypothesis: Tailwind CSS v4 tokens (`var(--color-xxx)`) weren't resolving inside html2canvas's isolated iframe. Result: still blank. The memory note (`project_v4_deployment_bug.md`, 6 days old) lists the unfinished debugging checklist — console logging the capture path, trying `html2canvas(document.body)` in devtools, and considering domtoimage. None of those were completed because the decision was made to defer and do a library swap instead.

### Why html2canvas fails here (most likely causes)
1. **Tailwind v4 `@property` + oklch custom properties** — html2canvas 1.4.1 has a known parser that chokes on modern color-space functions (`oklch()`, `color-mix()`). The `onclone` fix inlined the *computed* value, but Tailwind v4 serializes these as `oklch(...)` strings, which html2canvas then fails to paint → blank canvas, no throw.
2. **Shadow DOM / content-visibility** — shadcn card components and some virtualized lists set `content-visibility: auto`, which html2canvas does not respect; offscreen portions render blank.
3. **Throw swallowed** — the current code wraps `html2canvasCapture` in `try { ... } catch { return null; }` with no logging, so we have no telemetry on which of the above is actually firing. Not a root cause, but a contributor to debugging difficulty.

`html-to-image` uses `foreignObject`-based SVG serialization instead of parsing CSS manually, which sidesteps all three issues — it lets the browser's own rendering engine rasterize the DOM.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `html-to-image` | 1.11.13 | DOM → PNG/SVG capture for non-Recharts widgets | Active maintenance (latest 2025-04), foreignObject-based rendering handles modern CSS (custom properties, oklch, web fonts, shadow DOM) that html2canvas's legacy parser misses. Drop-in replacement for the single `html2canvasCapture()` function. |
| `@react-pdf/renderer` | 4.3.2 (already installed) | PDF document assembly | Unchanged — accepts PNG data URIs from either capture library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `html-to-image` | `modern-screenshot@4.6.8` | Smaller (185 KB vs 315 KB unpacked), newer (active 2026-01), fork of html-to-image with perf fixes. **Risk:** less battle-tested in production; fewer issues/examples in the wild. Pick this only if `html-to-image` also fails. |
| `html-to-image` | `dom-to-image-more` | Older code path, similar approach but less active |
| `html-to-image` | Rewriting widgets as `@react-pdf/renderer` primitives | Highest fidelity but massive scope — would need to re-render every HTML widget as `<View>`/`<Text>`/`<Table>`. Out of scope for launch gate. |
| `html-to-image` | Server-side Puppeteer/Playwright screenshot | Requires new API route, auth context, DOM state transfer. Massive scope increase. |

### Version verification
```
npm view html-to-image version  → 1.11.13 (published 2025-04-19)
npm view modern-screenshot version → 4.6.8 (published 2026-01-26)
npm view html2canvas version → 1.4.1 (unchanged since ~2022, effectively unmaintained)
```

### Installation
```bash
pnpm remove html2canvas
pnpm add html-to-image@^1.11.13
```

## Architecture Patterns

### Pattern: foreignObject-based DOM rasterization
**What:** `html-to-image` clones the target DOM node, wraps it in an `<svg><foreignObject>` wrapper, serializes to a data URI, loads into an `Image`, then paints to a `<canvas>` and returns a PNG data URI. The browser does the CSS work — not the library.

**Why this fixes our bug:** oklch, CSS custom properties, web fonts, `content-visibility`, shadow DOM — all handled by the real rendering engine.

**Example (direct replacement for `html2canvasCapture`):**
```typescript
// Source: https://github.com/bubkoo/html-to-image#usage
import { toPng } from 'html-to-image';

async function htmlToImageCapture(container: HTMLElement): Promise<string> {
  return await toPng(container, {
    backgroundColor: '#ffffff',
    pixelRatio: 2, // equivalent to html2canvas scale: 2
    cacheBust: true, // prevents stale image caching on re-export
    filter: (node) => {
      // equivalent to html2canvas ignoreElements
      if (!(node instanceof HTMLElement)) return true;
      const tag = node.tagName?.toLowerCase();
      if (tag === 'button' || tag === 'select') return false;
      if (node.getAttribute('role') === 'button') return false;
      return true;
    },
    // Preload web fonts before serialization; the foreignObject approach
    // requires fonts to be in document.fonts or they render as fallback.
    fontEmbedCSS: await (await import('html-to-image')).getFontEmbedCSS(container),
  });
}
```

Note: `getFontEmbedCSS` is optional — the library auto-detects loaded fonts. Only needed if Swedish character rendering fails on first attempt.

### Anti-patterns
- **Don't keep html2canvas as a second fallback** — maintaining two capture libraries doubles bundle size and hides root causes. Fully replace.
- **Don't delete the Recharts SVG fast-path** — it is crisper than any DOM rasterization and is not broken. Keep the `extractSvgElement()` → `svgToPngDataUri()` strategy; only replace the fallback.
- **Don't silently swallow capture errors** — the current `try { ... } catch { return null; }` in `captureWidgetSnapshot` hides failures. Add a `console.warn` with the widget ID and error message at minimum so future regressions surface.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM → PNG capture | Manual canvas drawing from `getComputedStyle` walks | `html-to-image` `toPng()` | Every edge case (text wrapping, box-shadow, gradient backgrounds, flex layout) is a rabbit hole |
| Font embedding for PDFs | Manual `@font-face` inlining | `html-to-image`'s `getFontEmbedCSS()` helper or let `foreignObject` inherit | System fonts "just work" because the browser renders them |
| CSS custom property resolution | Walking the tree to inline every `var()` | `foreignObject` rasterization | The browser already knows — let it do the work |

## Common Pitfalls

### Pitfall 1: Fonts render as fallback (affects åäö but usually not)
**What goes wrong:** Web fonts loaded via `next/font` may not be in `document.fonts.ready` at capture time → Swedish characters render in a fallback font.
**How to avoid:** `await document.fonts.ready` before calling `captureWidgetSnapshots()`. Add one line in `usePdfExport.exportDashboard()` right before the capture call.
**Warning signs:** Exported PDF has correct content but wrong typography; åäö visible but in Times/Arial.

### Pitfall 2: Images and SVGs with cross-origin URLs taint the canvas
**What goes wrong:** An `<img>` inside a widget from a third-party origin causes `toPng` to throw `SecurityError: Tainted canvases may not be exported.`
**How to avoid:** Pass `cacheBust: true` and `skipFonts: false`. For any `<img>` tag inside widgets (logos, avatars), ensure `crossOrigin="anonymous"` is set or proxy through our own origin.
**Warning signs:** Works in dev, fails in production where CDN assets live on a different origin.

### Pitfall 3: Animated transitions captured mid-animation
**What goes wrong:** Recharts has a 400 ms entry animation; `framer-motion` cards have their own. Capturing during animation produces half-rendered widgets.
**How to avoid:** Export modal already opens after the dashboard has been sitting idle — the Phase 31 flow doesn't animate widgets at export time. If the regression test uses a freshly mounted dashboard, add `await new Promise(r => setTimeout(r, 500))` before capture.
**Warning signs:** Intermittent blank regions in a subset of widgets, worse on slow machines.

### Pitfall 4: `foreignObject` serializer chokes on unclosed tags
**What goes wrong:** React 19 sometimes leaves self-closing `<br>` or `<img>` tags that break strict XML serialization used by `toPng`.
**How to avoid:** `html-to-image` handles this correctly out of the box as of 1.11.x. If it surfaces, use `toCanvas()` → `.toDataURL()` instead.
**Warning signs:** `toPng` throws `Invalid XML` or returns an empty data URI.

### Pitfall 5: Memory spike on multi-widget exports
**What goes wrong:** Capturing 10 widgets sequentially allocates ~10 × (width × height × 4 bytes × 2² pixelRatio) of canvas memory; on low-memory devices the last few come back blank.
**How to avoid:** The current code already serializes `captureWidgetSnapshots` in a `for` loop (not `Promise.all`) — keep it that way. Revoke object URLs if any are created.
**Warning signs:** First 3–4 widgets capture fine, later ones are blank.

## Runtime State Inventory

*(Omitted — this is a library swap, not a rename/refactor. No stored data, live service config, OS-registered state, secrets, or build artifacts carry the old library name at runtime.)*

## Code Examples

### Replacement `svg-snapshot.ts` fallback function
```typescript
// Source: adapted from https://github.com/bubkoo/html-to-image#usage
import { toPng } from 'html-to-image';

async function domToImageCapture(container: HTMLElement): Promise<string> {
  // Ensure fonts are loaded so åäö render in the correct typeface
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  return await toPng(container, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    cacheBust: true,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      const tag = node.tagName?.toLowerCase();
      if (tag === 'button' || tag === 'select') return false;
      if (node.getAttribute('role') === 'button') return false;
      return true;
    },
  });
}

// In captureWidgetSnapshot, replace html2canvasCapture(container) with:
try {
  return await domToImageCapture(container);
} catch (err) {
  console.warn(`[pdf-export] DOM capture failed for widget ${widgetId}:`, err);
  return null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas (CSS parser reimplementation) | html-to-image (foreignObject delegation to browser) | ~2020 onward | Modern CSS features (custom properties, oklch, content-visibility, web fonts) "just work" |
| Client-side capture + server PDF generation | Fully client-side with `@react-pdf/renderer` | Phase 31 (2026-04-01) | Already in place; no server changes needed |

**Deprecated/outdated:**
- `html2canvas` itself is not officially deprecated but has had no meaningful release since 2022 and maintainers acknowledge modern CSS gaps. Treat as legacy.
- `dom-to-image` (the original) is abandoned. `html-to-image` is the active fork.

## Open Questions

1. **Do we keep the Recharts SVG fast-path, or let html-to-image handle everything?**
   - What we know: SVG fast-path is crisper and ~3× faster for Recharts widgets.
   - What's unclear: Whether html-to-image also renders Recharts SVG correctly (it should, via foreignObject).
   - Recommendation: **Keep the SVG fast-path.** It is not broken and is measurably better for chart output. Only the fallback changes.

2. **Do we need a feature flag for the swap?**
   - Recommendation: **No.** This is a bug fix — the old path is unusable. A flag that defaults off is the fix; a flag that defaults on is dead code. Ship directly.

3. **Should we render text-heavy widgets (tables, KPI cards) as native `@react-pdf/renderer` primitives instead of images?**
   - Recommendation: **Out of scope for launch gate.** Captured as a v6.0 improvement idea. The launch gate asks only for "no blank tiles," which the library swap achieves.

## Environment Availability

*(No external tools/services/runtimes required. All work is inside the existing Next.js + React + pnpm toolchain. Skipped.)*

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^2.1.9 + @testing-library/react (already installed) |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `pnpm vitest run src/features/dashboard/pdf-export` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| LAUNCH-01 | `captureWidgetSnapshot` returns a non-null PNG data URI for an HTML-only widget (KPI card fixture) | unit (jsdom) | `pnpm vitest run src/features/dashboard/pdf-export/svg-snapshot.test.ts` | ❌ Wave 0 |
| LAUNCH-01 | Returned data URI decodes to a PNG with non-zero pixel content (not all-white) for each widget region | unit | same | ❌ Wave 0 |
| LAUNCH-01 | Multi-widget export via `exportDashboard()` produces a PDF blob > N bytes where N = empirical floor | integration (jsdom) | `pnpm vitest run src/features/dashboard/pdf-export/use-pdf-export.test.ts` | ❌ Wave 0 |
| LAUNCH-01 | `package.json` no longer lists `html2canvas` (prevents regression via import) | static | `pnpm vitest run src/features/dashboard/pdf-export/dependencies.test.ts` | ❌ Wave 0 |

**Note on jsdom limitations:** `html-to-image` requires a real browser `foreignObject` + `Image` pipeline. In jsdom, it will not produce real pixels. For the "non-zero pixel content" assertion, use a vitest browser-mode test (vitest has experimental browser mode via Playwright) OR mock `toPng` to return a known fixture and assert the *integration wiring* in unit tests, then cover pixel-level behavior in a single manual smoke test captured as an acceptance checklist. The planner should choose: mocked-unit + manual-smoke (fast, pragmatic) OR vitest browser mode (slower, fully automated). Recommendation: **mocked-unit + manual-smoke** for the launch gate.

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/features/dashboard/pdf-export`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + one manual smoke test: export a dashboard with at least one KPI card, one Recharts chart, one sparkline, and one table widget; open the PDF and visually verify no "tabelldata, se interaktiv dashboard" placeholders appear.

### Wave 0 Gaps
- [ ] `src/features/dashboard/pdf-export/svg-snapshot.test.ts` — unit test with mocked `html-to-image` asserting `captureWidgetSnapshot` returns the mocked data URI for an HTML container and the SVG path for an SVG container
- [ ] `src/features/dashboard/pdf-export/dependencies.test.ts` — static assertion that `html2canvas` is not in `package.json` dependencies
- [ ] Manual smoke test checklist entry in `45-CONTEXT.md` acceptance section

## Sources

### Primary (HIGH confidence)
- `src/features/dashboard/pdf-export/svg-snapshot.ts` (current code, lines 80–136 for html2canvas path)
- `src/features/dashboard/pdf-export/use-pdf-export.ts` (orchestration, unchanged)
- `src/features/dashboard/pdf-export/dashboard-pdf-document.tsx` (line 156 placeholder branch)
- `git show 9e19794` (last attempted fix, 41-line diff on one file)
- `package.json` (`html2canvas@^1.4.1`, `@react-pdf/renderer@^4.3.2`, `next@16.2.1`, `react@19.2.4`)
- npm registry: `html-to-image@1.11.13` (2025-04-19), `modern-screenshot@4.6.8` (2026-01-26)
- `.planning/phases/31-pdf-export-enhancement/31-01-SUMMARY.md` (original Phase 31 design rationale)
- `.planning/REQUIREMENTS.md` (LAUNCH-01 definition)

### Secondary (MEDIUM confidence)
- Memory file `project_v4_deployment_bug.md` (6 days old, documents symptoms and unfinished debug steps — symptoms confirmed against current code)

### Tertiary (LOW confidence)
- Root-cause hypotheses (oklch parsing, content-visibility, shadow DOM) — plausible given library behavior but not directly verified. The fix does not depend on the root cause being correct; the library swap bypasses all three.

## Metadata

**Confidence breakdown:**
- Current code state: HIGH — read directly
- Library recommendation: HIGH — verified versions and publish dates on npm
- Root cause: MEDIUM — hypotheses not confirmed, but fix is cause-agnostic
- Test approach: MEDIUM — jsdom limitation noted, manual smoke documented as mitigation

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable libraries, narrow scope)
