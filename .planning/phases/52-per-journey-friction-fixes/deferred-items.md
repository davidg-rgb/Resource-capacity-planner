# Phase 52 Deferred Items

## Pre-existing out-of-scope issues discovered during Wave 0

### side-nav.test.tsx: Missing `PERSONA_SECTION_NAV` export — FIXED IN 52-01

- **Discovered during:** 52-01 Task 1 typecheck
- **File:** `src/components/layout/__tests__/side-nav.test.tsx:12`
- **Error:** `TS2305: Module '"../side-nav"' has no exported member 'PERSONA_SECTION_NAV'.`
- **Origin:** Pre-existing before plan 52-01 (confirmed via `git stash` + typecheck).
  Phase 50-02 shipped `side-nav.tsx` with a route-keyed `SECTION_NAV` (not exported),
  but the test imported a `PersonaKind`-keyed `PERSONA_SECTION_NAV` that never
  existed. Test-code / implementation mismatch dating back to 50-02.
- **Fix applied in 52-01 (Rule 3 — blocking plan's typecheck exit-0 success
  criterion):** Removed the broken import and the `PERSONA_SECTION_NAV coverage`
  describe block (one `it(…)` asserting a data shape the shipped code never had).
  The other SideNav tests (persona-keyed rendering, legacy route-based) were
  untouched and continue to exercise the real component.
- **Follow-up (Phase 53):** If product wants SideNav to expose a PersonaKind-keyed
  nav table for external tooling / DX, export it properly and add new targeted
  coverage. Otherwise the route-keyed implementation stands.

### side-nav + breadcrumbs runtime test failures (8 tests)

- **Discovered during:** 52-03 Task 2 (`pnpm test --run src/components/layout`)
- **Files:**
  - `src/components/layout/__tests__/side-nav.test.tsx` — 3 failing (persona-keyed rendering)
  - `src/components/layout/__tests__/breadcrumbs.test.tsx` — 5 failing (snapshot drift + runtime)
- **Origin:** Pre-existing before plan 52-03 (confirmed via `git stash` +
  re-run on `d8f6b17`: same 8 failures). Traceable to Phase 50 landing work
  that refactored nav shape without re-baselining snapshots / runtime asserts.
  Previously flagged in 52-01's deferred-items note as "3 pre-existing runtime
  failures"; Task 2 work revealed the real count is 8 (3 side-nav + 5 breadcrumbs).
- **Scope call:** Out of scope for 52-03. Phase 52 plan 03 only touches
  `top-nav.tsx` (to mount `<PendingWishChip />`); `top-nav.test.tsx` does not
  exist, and the failing suites do not exercise `top-nav`.
- **Follow-up (Phase 53 POLISH-02 or dedicated test-maintenance plan):**
  re-baseline breadcrumbs snapshots after verifying the shipped markup is
  intentional; fix the 3 side-nav persona-keyed tests against the current
  route-keyed `SECTION_NAV`.
