# Phase 46: Playwright E2E Infra + Widget Rendering Polish — Research

**Researched:** 2026-04-09
**Domain:** Browser E2E test infrastructure (Playwright) + PDF DOM-to-image capture debugging
**Confidence:** HIGH for widget root causes; HIGH for Playwright stack; MEDIUM for CI shape (one variable unverified — see Open Questions)

## Summary

Phase 46 absorbs two independent post-v5.0 deferrals: (1) standing up Playwright for the 12 TC-E2E-* flows deferred from Phase 44-12, and (2) fixing two residual PDF capture bugs deferred from Phase 45 (Department Capacity Gauges empty; Availability Finder shrunken).

Investigation of the widget source code flipped one of the Phase 45 root-cause hypotheses and sharpened the other:

- **Department Capacity Gauges is a trivial fix, not a nested-SVG problem.** The widget renders each gauge inside a `<button type="button">` (`src/components/charts/capacity-gauges.tsx:88`). The `domToImageCapture` filter explicitly drops every `<button>` node (`src/features/dashboard/pdf-export/svg-snapshot.ts:125`). Result: the gauge frame/title survive (they're the outer widget container) but every gauge is stripped. The "nested Recharts SVGs not serializing" hypothesis in `deferred-items.md` is wrong. Fix is 2 lines: narrow the filter so only interactive buttons outside the gauge flow get stripped (e.g., by `data-pdf-exclude` attribute), not all buttons.
- **Availability Finder is NOT virtualized.** It uses a plain `data.results.map(...)` (line 239). The `react-window` / `content-visibility: auto` hypothesis in `deferred-items.md` is wrong — no `react-window` imports, no `content-visibility` usage. The shrunken-20% rendering has a different cause, most likely one of: (a) the widget sits inside a CSS grid / flex parent that drives its layout width, and when html-to-image captures just the inner container the `getBoundingClientRect` reads its natural content width (which is narrower than the parent-stretched width); (b) the `[data-widget-id]` element is not the widest ancestor — the widget registration uses `defaultColSpan: 12` but the capture targets the inner `data-widget-id` div.

For Playwright, the Clerk/Next.js 16 stack has a well-documented testing path (Clerk "testing tokens" + `@clerk/testing` package), persona switching is trivial (it's just `localStorage['nc:persona']`, injectable via `page.addInitScript`), and the Phase 44-14 deterministic `buildSeed()` bundle is ready to reuse as the DB fixture.

**Primary recommendation:** **SPLIT into two phases.** Ship widget polish as Phase 46 (small, 1–2 days, unblocks v5.0 PDF quality) and Playwright infrastructure as Phase 47 (multi-day, new test tier, own review surface). Pairing them helps nothing — Playwright pixel assertions against the gauge/finder widgets are nice-to-have, not required for the fixes themselves, and both widgets are already covered by the Phase 45 manual smoke test procedure.

## User Constraints (from CONTEXT.md)

No CONTEXT.md existed prior to this research pass. Research CONTEXT written in parallel (`46-CONTEXT.md`) reflects the split recommendation; planner should honor it if adopted.

## Phase Requirements

No formal REQ-IDs assigned yet. Working requirement set derived from deferred-items.md:

| Working ID | Description | Research Support |
|----|---|---|
| PLAY-01 | Install Playwright + config + CI | §Playwright Stack below |
| PLAY-02 | Persona switch harness | §Persona Switching below — localStorage injection |
| PLAY-03 | Test DB bootstrap for E2E | §DB Bootstrap below — reuse `buildSeed()` |
| PLAY-04 | Port 12 TC-E2E-* flows | §TC-E2E Per-Flow Inventory |
| PLAY-05 | Remove TC-E2E from `tc-allowlist.json` | trivial edit |
| WIDGET-01 | Fix Department Capacity Gauges capture (empty frame) | §Widget Root-Cause Analysis |
| WIDGET-02 | Fix Availability Finder capture (shrunken) | §Widget Root-Cause Analysis |

If phase split: PLAY-* → Phase 47, WIDGET-* → Phase 46.

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` exists at repo root. No global project directives to honor beyond what's already baked into existing phase conventions.

## Widget Root-Cause Analysis (HIGH confidence — verified by reading source)

### Department Capacity Gauges — empty frame

**File:** `src/components/charts/capacity-gauges.tsx`

Each gauge is rendered as:

```tsx
<button type="button" ... onClick={() => router.push(...)}>
  <div className="relative h-28 w-28">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie ... />
      </PieChart>
    </ResponsiveContainer>
    ...
  </div>
</button>
```

The widget-level container has N `.recharts-wrapper` elements (one per department), so the SVG fast-path correctly returns `null` (line 25 of `svg-snapshot.ts`). Falls through to `domToImageCapture`.

**The bug is line 125 of `svg-snapshot.ts`:**

```ts
filter: (node) => {
  if (!(node instanceof HTMLElement)) return true;
  const tag = node.tagName?.toLowerCase();
  if (tag === 'button' || tag === 'select') return false;   // ← kills all gauges
  if (node.getAttribute('role') === 'button') return false;
  return true;
},
```

Every gauge is a `<button>`, so every gauge gets stripped from the foreignObject clone. The widget outer frame and the `<h4>` title survive because they are not inside a button. Result: empty frame + title — exactly what the smoke test reported.

**Why this filter was added:** To strip interactive chrome (Exportera PDF button itself, filter `<select>`s, etc.) from the exported image. It's too aggressive.

**Fix options, ranked:**

1. **(recommended) Replace the button filter with an opt-in attribute.** Add `data-pdf-exclude` to the actual interactive chrome (export button, persona switcher, etc.) and only strip those. ~10 lines.
2. **Narrow the filter by context.** Keep stripping buttons unless the button has a Recharts descendant (`node.querySelector('.recharts-wrapper')`). Preserves existing exclusion behavior but unblocks the gauges. ~3 lines.
3. **Rewrite gauge to use a `<div role="button">` wrapper.** Still stripped by the `role === 'button'` check on the next line, so this doesn't work without also fixing the filter. Worse than (1).

Option 2 is the smallest diff and the safest — it preserves the original intent of the filter.

### Availability Finder — shrunken ~20%

**File:** `src/features/dashboard/widgets/availability-finder-widget.tsx`

Read end-to-end. **No `react-window` import. No `content-visibility` usage. Not virtualized.** The list is `data.results.map(...)` rendering all rows directly (line 239). The Phase 45 `deferred-items.md` hypothesis is incorrect.

Actual likely cause: the widget registers `defaultColSpan: 12` (full-width) and the outer grid/flex parent stretches the widget. At capture time, `container.getBoundingClientRect()` is called on the `[data-widget-id="availability-finder"]` element. If that element's CSS width is `auto` / `fit-content` (driven by `space-y-4` flex children), then the reported width is the intrinsic content width, not the stretched grid-cell width. html-to-image then renders at the intrinsic width while the PDF tile is allocated at the wider grid width → widget appears shrunken within its PDF tile.

**Unverified pending live DOM inspection:**
- The `data-widget-id` attribute placement in the widget wrapper (is it on the outer grid cell or an inner wrapper?)
- Whether the widget's computed `display` is `block`, `flex`, or `grid`
- Whether `width: 100%` is set on `[data-widget-id]`

**Fix options, ranked:**

1. **(recommended) Force explicit width on the capture container.** Before capture, read the parent element's width (or the widget tile's allocated width from the dashboard grid), set `container.style.width = parentWidth + 'px'`, capture, restore. ~8 lines added to `domToImageCapture`.
2. **Apply `width: 100%` to `[data-widget-id]` in the dashboard widget grid CSS.** One-line CSS fix in the widget grid stylesheet, if that doesn't break other widgets' natural layout.
3. **Add a `prepareForCapture()` hook system as deferred-items.md proposes.** Overkill for this bug — no state needs to be temporarily mutated, only the width needs to be set.

Before implementing, do a 5-minute live inspection: open DevTools on the Availability Finder widget, run `document.querySelector('[data-widget-id="availability-finder"]').getBoundingClientRect()` vs `parentElement.getBoundingClientRect()`. If parent width > element width, hypothesis confirmed, use fix (1).

### New TC-PDF-* test IDs

For both widget fixes, add Vitest unit tests to `svg-snapshot.test.ts`:

- **TC-PDF-004** Gauge button filter — `captureWidgetSnapshot` on a mock widget with a `<button>` containing a Recharts child does not strip the Recharts child.
- **TC-PDF-005** Width override — `captureWidgetSnapshot` on a container whose `getBoundingClientRect` reports narrower than parent uses the parent width for capture.

These are pure DOM-level unit tests runnable in jsdom; they do NOT require Playwright. Phase 46 widget polish can ship without Playwright standing up first.

## Playwright Stack (HIGH confidence — Context7 / official docs)

### Core

| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| `@playwright/test` | `^1.49.x` (verify latest at install time) | Test runner + browser automation | De facto Next.js E2E standard, first-party Next docs reference it |
| `@clerk/testing` | `^1.x` | Clerk testing-tokens integration for Playwright | Official Clerk-supported bypass for real sign-in in E2E |

### Supporting

| Library | Purpose |
|---|---|
| `dotenv` | already installed — load `.env.test` for E2E-only config |
| Reuse `tests/fixtures/seed.ts` | Deterministic DB bundle from Phase 44-14 |

**Browser binaries:** Chromium only for Phase 47 MVP. The 12 TC-E2E flows are UI behavior tests, not cross-browser compatibility tests. Firefox/WebKit can be added later if a bug ever manifests as browser-specific (none known). Installing all 3 ~triples CI cache size and ~doubles wall time for zero marginal coverage given the flows.

**Install:**

```bash
pnpm add -D @playwright/test @clerk/testing
pnpm exec playwright install --with-deps chromium
```

### Architecture Patterns

**Recommended test directory layout:**

```
e2e/
├── playwright.config.ts       # root-level for Playwright auto-discovery
├── fixtures/
│   ├── persona.ts             # page.addInitScript for localStorage['nc:persona']
│   ├── seed-db.ts             # HTTP shim that POSTs buildSeed() bundle to a test-only endpoint
│   └── test-base.ts           # extended test() with persona + db fixtures
├── pm/                        # TC-E2E-1*
│   ├── monday-checkin.spec.ts
│   ├── submit-wish.spec.ts
│   ├── rejected-resubmit.spec.ts
│   └── historic-edit.spec.ts
├── line-manager/              # TC-E2E-2*
│   ├── heatmap.spec.ts
│   ├── approve.spec.ts
│   ├── reject.spec.ts
│   ├── direct-edit.spec.ts
│   └── import.spec.ts
├── staff/                     # TC-E2E-3*
│   └── read-only.spec.ts
└── rd/                        # TC-E2E-4*
    ├── portfolio.spec.ts
    └── overcommit-drill.spec.ts
```

**Flat specs, not Page Object Model.** POM is overkill for 12 flows. Use per-page helper functions co-located in each spec until a second test needs the same helper. Promote to `e2e/helpers/` only when there's a real duplication.

**Naming convention:** `test('TC-E2E-1A: Anna Monday check-in', async ({ page }) => { ... })`. The `TC-E2E-1A` prefix is the canonical ID from `tc-canonical.json` — this is how `scripts/generate-tc-manifest.ts` will pick up the E2E tests and re-verify coverage.

**playwright.config.ts shape:**

```ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,   // serialize E2E — each spec mutates DB
  workers: 1,             // one at a time until per-spec DB isolation lands
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: { NODE_ENV: 'test', ...process.env },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

Personas are NOT Playwright projects — they're per-test fixture state (localStorage), so a single chromium project runs all personas.

### Persona Switching (HIGH confidence — source verified)

**The entire "persona switch harness" is 3 lines.** Personas live in `localStorage['nc:persona']` (see `src/features/personas/persona.context.tsx:34`). The context hydrates from localStorage on mount. Set it before navigation:

```ts
// e2e/fixtures/persona.ts
import type { Page } from '@playwright/test';
import type { PersonaKind } from '@/features/personas/persona.types';

export async function setPersona(page: Page, kind: PersonaKind, extras: Record<string, unknown> = {}) {
  await page.addInitScript(
    ([k, e]) => { localStorage.setItem('nc:persona', JSON.stringify({ kind: k, ...e })); },
    [kind, extras],
  );
}
```

No cookie surgery, no test-only UI, no custom middleware. This is by design — `persona-route-guard.ts:5` explicitly notes persona is a "UX shortcut — NOT a security boundary".

### Auth Bypass — Clerk (HIGH confidence — official)

Clerk's `proxy.ts` (`src/proxy.ts`) wraps every non-public route with `auth.protect()`. Two documented options:

1. **Clerk testing tokens** (preferred — official). Use `@clerk/testing` + set `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` to dev instance keys in `.env.test`, use `clerkSetup()` in `global-setup.ts`, and sign in via `clerk.signIn` helper. Real Clerk flow, no bypass hack. Works against Clerk's dev instance free of charge.
2. **Storage-state fixture.** One-time login through a test user, save `storageState`, reuse across specs. Cheaper but drifts when Clerk rotates session cookies.

**Recommendation:** Testing tokens (option 1). Single dev-instance Clerk user "E2E Bot" created once; all specs reuse. `global-setup.ts` calls `clerkSetup()` and signs in once, storing state. Subsequent specs load the storage state.

Sources: Clerk docs `docs.clerk.com/testing/playwright/overview`; verify current at install time.

### DB Bootstrap (HIGH confidence — existing asset)

**Reuse Phase 44-14's `tests/fixtures/seed.ts`.** `buildSeed()` is pure data and already asserted deterministic by `seed.deterministic.test.ts`. The only new surface is getting the bundle into the dev-server's Postgres at E2E time.

**Recommended approach — test-only seed endpoint:**

Add `src/app/api/test/seed/route.ts`, gated by `process.env.NODE_ENV === 'test'` AND `process.env.E2E_SEED_ENABLED === '1'`, that accepts a POST and loads a fresh seed bundle into the DB (truncate-and-reload within a transaction). Call from Playwright `global-setup.ts`:

```ts
// e2e/global-setup.ts
import { buildSeed } from '../tests/fixtures/seed';
await fetch('http://localhost:3000/api/test/seed', {
  method: 'POST',
  body: JSON.stringify(buildSeed('e2e')),
});
```

**Security gate:** The route MUST return 404 when `NODE_ENV !== 'test'` or `E2E_SEED_ENABLED !== '1'`. Add a static test in `tests/invariants/` asserting this route is unreachable in production builds.

**Per-spec isolation:** Phase 47 MVP uses `fullyParallel: false` + `workers: 1` and re-seeds in `beforeEach` via the same endpoint. This is slow but simple and correct. Parallelism-friendly isolation (per-worker schemas, or transaction-rollback after each test) is a later optimization — document as "Phase 47 follow-up".

**PGlite alternative rejected:** PGlite runs in-process and cannot be shared between the dev server (Node) and the Playwright runner. Reusing the real dev-DB (or a dedicated `nc_e2e` database) is simpler.

### CI Strategy (MEDIUM confidence — unverified whether project has GH Actions)

Grep shows no `.github/workflows/` in the repo (verify during planning). If CI doesn't exist, Phase 47 should stand up a minimal GH Actions workflow alongside Playwright:

- Linux only for the MVP (Windows matrix is overkill for 12 flows and doubles runtime).
- Cache Playwright browser binaries: `~/.cache/ms-playwright`, keyed by `playwright` version in `pnpm-lock.yaml`.
- Upload `playwright-report/` and `test-results/` (traces + screenshots + video) as artifacts on failure.
- Run against a GH-Actions-service `postgres:16` container.

If the project is not currently running CI at all, that's a separate concern — flag for human decision before Phase 47 kickoff.

## TC-E2E Per-Flow Inventory (HIGH confidence — flows quoted from ARCHITECTURE §15.13)

| ID | Persona | Needs | Risk |
|---|---|---|---|
| TC-E2E-1A | PM | project overview + timeline with seed allocations + drill-down drawer | low |
| TC-E2E-1B | PM | proposal submit endpoint + toast | low |
| TC-E2E-1C | PM | pre-seeded rejected wish in DB + My Wishes panel | **requires seed extension** — buildSeed currently doesn't produce rejected-proposal rows; verify and extend |
| TC-E2E-1D | PM | HistoricEditDialog + change_log row assertion | low |
| TC-E2E-2A | LM | heatmap with specific red/yellow cells | **requires seed extension** — need deterministic Erik-March over, Sara-June under |
| TC-E2E-2B-approve | LM | approval queue + proposal status flip | low |
| TC-E2E-2B-reject | LM | required reason dialog | low |
| TC-E2E-2C | LM | direct-edit path + change_log | low |
| TC-E2E-2D | LM | fixture Excel file + import preview + rollback within window | **requires fixture Excel** at `e2e/fixtures/nordlys-import.xlsx`; Phase 44 TC-IMP-* has one — reuse |
| TC-E2E-3A | Staff | read-only schedule assertion (no edit controls in DOM) | low |
| TC-E2E-4A | RD | portfolio grid + groupBy toggle + zoom-to-year | low |
| TC-E2E-4B | RD | drill-down dialog on red cell | low |

**Critical seed gaps:** TC-E2E-1C (rejected proposal row) and TC-E2E-2A (deterministic red/yellow cells) need buildSeed extensions. Budget one plan for this in Phase 47.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Clerk auth bypass | Custom middleware path / cookie mock | `@clerk/testing` testing tokens | Official, maintained, survives Clerk upgrades |
| Test data generator | Per-spec `await db.insert(...)` | `buildSeed()` from Phase 44-14 | Already deterministic, reviewed, asserted |
| Persona state | Test-only middleware / URL param | `page.addInitScript` setting localStorage | Persona is already localStorage-driven in prod |
| PDF capture node filter | Tag-based allow/deny | `data-pdf-exclude` opt-in attribute | Avoids killing whole-widget subtrees by accident (current gauge bug) |
| DB reset between tests | Custom DROP + recreate | Truncate + `buildSeed()` reload via test-only endpoint | Deterministic, fast, survives schema migrations |

## Common Pitfalls

### Pitfall 1: Playwright `webServer` + Next.js 16 turbopack race
**What goes wrong:** `webServer.url` probe resolves before Next has compiled the first route; first test gets 500.
**Prevention:** Set `webServer.timeout: 180000` and use `healthcheck` URL `/api/health` (already public per `src/proxy.ts:8`) instead of `/`.

### Pitfall 2: Persona fixture races hydration
**What goes wrong:** `page.addInitScript` runs before scripts, but React hydrates from localStorage in `useEffect` — a fast assertion can race the default `admin` persona flash documented in `persona.context.tsx:6`.
**Prevention:** After navigation, await a data-testid that is only rendered by the target persona's layout (e.g. `data-testid="pm-home-root"`).

### Pitfall 3: Clerk session drift across spec runs
**What goes wrong:** Storage-state captured in Monday's run expires by Friday; tests start failing with "session expired" on a clean checkout.
**Prevention:** Use testing tokens (freshly minted per run) rather than long-lived storage-state. Only use storage-state within a single Playwright invocation via `globalSetup`.

### Pitfall 4: PDF capture filter is a denylist
**What goes wrong:** Any interactive element inside a widget gets silently dropped. The Capacity Gauges bug IS this pitfall.
**Prevention:** Switch to an `data-pdf-exclude` allowlist. Audit all widgets for existing button-wrapped content before merging the fix.

### Pitfall 5: html-to-image reads `getBoundingClientRect` of the wrong node
**What goes wrong:** Widgets whose `[data-widget-id]` wrapper is not width-stretched capture at intrinsic content width. Availability Finder IS this pitfall.
**Prevention:** In `domToImageCapture`, compute width from `container.parentElement?.getBoundingClientRect()` when the container's own width is narrower than its parent.

## Runtime State Inventory

Not applicable — this phase is a new test tier + two widget capture-layer fixes. No renames, no migrations, no stored state with semantic meaning.

- Stored data: None — reuses existing deterministic seed.
- Live service config: None.
- OS-registered state: None.
- Secrets/env vars: `.env.test` introduces `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `E2E_SEED_ENABLED` (new, test-only). Document in `.env.example`.
- Build artifacts: Playwright browser cache at `~/.cache/ms-playwright` on dev machines — no action required, documented in new `e2e/README.md`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | everything | Y | (already running) | — |
| pnpm | install | Y | 10.33.0 | — |
| Next dev server on :3000 | Playwright `webServer` | Y | 16.2.1 | — |
| Postgres (dev or test DB) | Seed loading at E2E time | Y (Neon or local per existing setup) | — | PGlite ruled out (in-process) |
| `@playwright/test` | all Playwright work | N | — | must install |
| `@clerk/testing` | Clerk auth bypass | N | — | must install |
| GitHub Actions config | CI runner | **unknown — verify during planning** | — | Document gap for human decision |
| Clerk dev instance credentials | testing tokens | **unknown — ask user** | — | Storage-state fallback |

**Missing with fallback:** Clerk dev credentials → storage-state bypass as fallback.
**Missing, blocking verification:** GH Actions presence and Clerk dev-instance access. Resolve during Phase 47 kickoff.

## Validation Architecture

(Included per config default — `workflow.nyquist_validation` assumed enabled.)

### Test Framework

| Property | Value |
|---|---|
| Framework (unit) | Vitest 2.1.9 |
| Framework (E2E new) | Playwright ^1.49.x |
| Config files | `vitest.config.ts` (existing), `e2e/playwright.config.ts` (new) |
| Quick run (widget fixes) | `pnpm vitest run src/features/dashboard/pdf-export` |
| Quick run (E2E single) | `pnpm exec playwright test e2e/pm/submit-wish.spec.ts` |
| Full suite | `pnpm test && pnpm exec playwright test` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Command | File Exists? |
|---|---|---|---|---|
| WIDGET-01 | Gauge `<button>` children survive capture | unit (jsdom) | `pnpm vitest run svg-snapshot` | extend existing |
| WIDGET-02 | Widget capture uses parent width when wider | unit (jsdom) | `pnpm vitest run svg-snapshot` | extend existing |
| WIDGET-01/02 manual | Visual smoke in real browser | manual | Exportera PDF on mixed dashboard | — |
| PLAY-01..04 | 12 TC-E2E-* flows | E2E | `pnpm exec playwright test` | Wave 0 gap |
| PLAY-05 | tc-allowlist no longer contains TC-E2E | invariant | `pnpm vitest run tc-id-coverage` | existing |

### Sampling Rate

- Per task commit (widget): `pnpm vitest run src/features/dashboard/pdf-export`
- Per task commit (E2E): `pnpm exec playwright test <single spec>`
- Per wave merge: full Vitest suite + full Playwright chromium
- Phase gate: Full suite green + `pnpm vitest run tests/invariants/tc-id-coverage.test.ts` green without TC-E2E allowlist entries

### Wave 0 Gaps

- [ ] `e2e/` directory + `playwright.config.ts`
- [ ] `e2e/fixtures/persona.ts`, `seed-db.ts`, `test-base.ts`
- [ ] `e2e/global-setup.ts` (Clerk sign-in + seed load)
- [ ] `src/app/api/test/seed/route.ts` (NODE_ENV-gated)
- [ ] `tests/invariants/test-seed-route-production.test.ts` (route invisible in prod)
- [ ] `.env.example` + `.env.test` entries for Clerk + `E2E_SEED_ENABLED`
- [ ] `e2e/fixtures/nordlys-import.xlsx` — reuse from Phase 44 TC-IMP-* fixtures
- [ ] `buildSeed()` extensions: rejected-proposal row for TC-E2E-1C, deterministic over/under cells for TC-E2E-2A

## Phase Scope Recommendation (OPINIONATED)

**Recommendation: SPLIT.**

- **Phase 46 — PDF Widget Rendering Polish** (this phase). WIDGET-01 + WIDGET-02. ~1–2 days. Two `svg-snapshot.ts` edits, two new Vitest tests, manual smoke re-run on mixed dashboard. Ships immediately after merge.
- **Phase 47 — Playwright E2E Infrastructure + TC-E2E Fill** (new). PLAY-01..05. ~3–5 days. Own review surface. Own CI lift. Own seed extensions.

**Rationale for split:**

1. **Independent value.** Widget fixes improve PDF quality today. Playwright delivers future regression catch but no user-facing value on merge.
2. **Different risk profile.** Widget fixes are 20-line diffs with unit test coverage. Playwright is a multi-day infra lift with unknowns (CI presence, Clerk dev credentials).
3. **Bundling them gives a false synergy.** The `deferred-items.md` argument was "Playwright will gate the widget fixes with pixel assertions." That's backwards — the widget fixes need `svg-snapshot.test.ts` unit tests (jsdom, fast, deterministic), not Playwright pixel diffs (slow, flaky for exact pixels). Pixel assertions are possible later as visual regression, but they are not the right gate for these fixes.
4. **Unblocks v5.0 polish faster.** Ship widget fixes within the week. Playwright can wait for its own phase without holding back PDF quality.
5. **Cleaner review.** Two focused phase reviews beat one 15-plan mega-phase spanning two unrelated tracks.

**Counter-argument (why NOT split):** Phase budget overhead of spinning up two phase folders + two verification passes. Real cost, but smaller than the confusion cost of reviewing a mixed phase.

**If the user rejects the split,** execute as a single Phase 46 with two clear waves — Wave A widget fixes (independent, shippable mid-phase), Wave B Playwright (self-contained). Keep the verification gates independent: widget fixes don't block on Playwright green.

## Code Examples

### Gauge filter fix — narrow the button exclusion

```ts
// src/features/dashboard/pdf-export/svg-snapshot.ts
filter: (node) => {
  if (!(node instanceof HTMLElement)) return true;
  // Respect opt-out attribute (preferred for future chrome exclusions)
  if (node.hasAttribute('data-pdf-exclude')) return false;
  const tag = node.tagName?.toLowerCase();
  // Only strip buttons that are NOT wrapping chart content.
  // Capacity Gauges wrap each gauge in <button> for navigation — preserve them.
  if (tag === 'button' || tag === 'select') {
    if (node.querySelector('.recharts-wrapper, svg')) return true;
    return false;
  }
  if (node.getAttribute('role') === 'button' && !node.querySelector('svg')) return false;
  return true;
},
```

### Width override for shrunken widgets

```ts
// src/features/dashboard/pdf-export/svg-snapshot.ts — inside domToImageCapture
const selfRect = container.getBoundingClientRect();
const parentRect = container.parentElement?.getBoundingClientRect();
const widthPx = Math.max(1, Math.round(
  parentRect && parentRect.width > selfRect.width ? parentRect.width : selfRect.width,
));
const heightPx = Math.max(1, Math.round(selfRect.height));
// Temporarily stretch container to parent width so foreignObject layout
// matches the allocated PDF tile.
const prevWidth = container.style.width;
container.style.width = `${widthPx}px`;
try {
  return await toPng(container, { /* ...existing opts, width/height = widthPx/heightPx */ });
} finally {
  container.style.width = prevWidth;
}
```

### Persona init script

```ts
// e2e/fixtures/persona.ts
import { test as base } from '@playwright/test';

type PersonaKind = 'admin' | 'pm' | 'line-manager' | 'staff' | 'rd';

export const test = base.extend<{ asPersona: (kind: PersonaKind) => Promise<void> }>({
  asPersona: async ({ page }, use) => {
    await use(async (kind) => {
      await page.addInitScript((k) => {
        localStorage.setItem('nc:persona', JSON.stringify({ kind: k }));
      }, kind);
    });
  },
});
```

### Clerk global-setup

```ts
// e2e/global-setup.ts
import { clerkSetup } from '@clerk/testing/playwright';
import { buildSeed } from '../tests/fixtures/seed';

export default async function globalSetup() {
  await clerkSetup();
  const res = await fetch('http://localhost:3000/api/test/seed', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(buildSeed('e2e')),
  });
  if (!res.ok) throw new Error(`Seed load failed: ${res.status}`);
}
```

## Open Questions

1. **Does the repo have GitHub Actions today?** No `.github/workflows/` surfaced in grep — confirm during Phase 47 planning. If absent, scope includes standing up CI from scratch.
2. **Does the team have a Clerk dev instance for E2E?** Needed for testing-tokens path. If not, either create one or fall back to storage-state.
3. **Which DB does E2E run against?** Production Neon is a no-go. Options: (a) separate `nc_e2e` Neon branch, (b) dockerized local Postgres per CI run, (c) dev-developer's local Postgres. Planner should pick one explicitly.
4. **Does `buildSeed()` already contain a rejected proposal row and deterministic heatmap cells?** If not (likely), TC-E2E-1C and TC-E2E-2A require seed extensions — budget a plan for this.
5. **Is the Availability Finder width hypothesis correct?** Requires a 5-minute live DOM inspection before committing to fix (1) vs (2). Plan should include this as a debug task.

## Sources

### Primary (HIGH confidence)
- `src/components/charts/capacity-gauges.tsx` (gauge button structure — root cause evidence)
- `src/features/dashboard/widgets/availability-finder-widget.tsx` (no react-window — disproves deferred-items hypothesis)
- `src/features/dashboard/pdf-export/svg-snapshot.ts` (filter at line 125, capture dimensions at line 110)
- `src/features/personas/persona.context.tsx` (localStorage key `nc:persona`)
- `src/proxy.ts` (Clerk middleware — public routes include `/api/health`)
- `tests/fixtures/seed.ts` (deterministic buildSeed asset)
- `.planning/v5.0-ARCHITECTURE.md` §15.13 (canonical TC-E2E list)
- `.planning/phases/44-api-hardening-and-test-contract-fill/44-12-SUMMARY.md`
- `.planning/phases/45-launch-gate-pdf-export/45-01-SUMMARY.md`

### Secondary (MEDIUM — needs install-time verification)
- Clerk Playwright testing tokens docs (`docs.clerk.com/testing/playwright/overview`) — confirm current API at install
- Playwright current version + Next.js 16 compatibility — verify via `npm view @playwright/test version` at install

### Tertiary (LOW — unverified)
- GitHub Actions presence in repo — not checked directly in this research pass; flagged as Open Question

## Metadata

**Confidence breakdown:**
- Widget root causes: HIGH — verified by reading source
- Playwright stack: HIGH — standard Next+Clerk pattern
- Persona + seed reuse: HIGH — existing assets verified
- CI specifics: MEDIUM — GH Actions presence unverified
- Split recommendation: HIGH — scope and risk profiles clearly different

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days — Playwright/Clerk are stable)
