# Phase 44 — Deferred Items

## Pre-existing lint errors (out of scope for 44-02)

`src/components/timeline/__tests__/line-manager-timeline-grid.test.tsx` has 7
`react-hooks/immutability` errors (lines 88-93) from a Next.js lint rule
upgrade. Unrelated to AppError taxonomy sweep. Pre-dates Phase 44.

- Discovered during: 44-02 `pnpm lint` run
- Recommended owner: whoever shepherds the next timeline-grid refactor
- Impact: `pnpm lint` exits non-zero until fixed, but CI test suite still runs

## Playwright E2E tier — deferred from 44-12 (Option A)

Plan 44-12 was scoped to fill the TC-E2E-* gap (12 browser flows from
ARCHITECTURE §15.13) using Playwright. At kickoff, investigation showed
Wave-C foundation 44-06 had not actually stood up Playwright — no
install, no config, no persona harness, no CI runner. Standing that up
is a multi-day effort with its own review surface, orthogonal to Phase
44's stated goal.

**Resolution:** Allow-list the 12 TC-E2E-* IDs with a structured
`reasons.TC-E2E` block in `tc-allowlist.json` and create a dedicated
follow-up phase.

**Suggested follow-up:** Phase 46 — "Playwright E2E Infrastructure +
TC-E2E Fill". Scope:

1. Install `@playwright/test`, add `playwright.config.ts` with the four
   personas as projects.
2. Stand up persistent test-DB bootstrap (reuse PGlite fixture via HTTP
   or dedicated docker pg).
3. Build persona-switch helper (sets dev auth cookie, no UI login).
4. Port 12 TC-E2E flows from ARCHITECTURE §15.13 into
   `e2e/**/*.spec.ts` — one `test('TC-E2E-XXX ...')` per canonical ID.
5. Wire CI (Windows + Linux).
6. Remove `TC-E2E` entries from `stillMissing`, `groups.TC-E2E`, and
   delete the `reasons.TC-E2E` block in `tc-allowlist.json` — the
   invariant gate will re-verify coverage automatically.

**Mitigating coverage already present:** TC-PR-*, TC-IMP-*, TC-CL-*,
TC-REG-* groups (service-layer tests landed earlier in Phase 44) cover
the underlying business logic of every TC-E2E flow. What the E2E tier
specifically adds is browser-level integration (routing, cookie, DOM,
toast/drawer UX) that service tests legitimately cannot assert.

- Discovered during: 44-12 kickoff investigation
- Decided in: 44-12 (Option A, orchestrator selection, 2026-04-09)
- Summary: `.planning/phases/44-api-hardening-and-test-contract-fill/44-12-SUMMARY.md`
