# Phase 44 — Deferred Items

## Pre-existing lint errors (out of scope for 44-02)

`src/components/timeline/__tests__/line-manager-timeline-grid.test.tsx` has 7
`react-hooks/immutability` errors (lines 88-93) from a Next.js lint rule
upgrade. Unrelated to AppError taxonomy sweep. Pre-dates Phase 44.

- Discovered during: 44-02 `pnpm lint` run
- Recommended owner: whoever shepherds the next timeline-grid refactor
- Impact: `pnpm lint` exits non-zero until fixed, but CI test suite still runs
