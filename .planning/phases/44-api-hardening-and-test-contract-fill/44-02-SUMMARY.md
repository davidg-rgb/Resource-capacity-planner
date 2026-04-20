---
phase: 44
plan: 02
subsystem: api-errors
tags: [eslint, apperror, taxonomy, hardening]
requires: [44-01]
provides: [API-V5-01-guard]
affects: [src/app/api/v5/**, src/features/**/*.service.ts]
tech-stack:
  added: []
  patterns: [eslint-no-restricted-syntax, typed-app-errors]
key-files:
  created:
    - .planning/phases/44-api-hardening-and-test-contract-fill/deferred-items.md
  modified:
    - eslint.config.mjs
    - src/features/scenarios/scenario.service.ts
    - src/features/admin/register.service.ts
decisions:
  - Use InternalError for post-insert safety nets (unreachable in practice, not user-facing)
  - Do not touch pre-existing react-hooks/immutability lint errors in timeline test (out of scope)
metrics:
  duration: ~5m
  completed: 2026-04-09
  tasks: 2
  files: 4
  commits: 2
---

# Phase 44 Plan 02: API hardening — AppError taxonomy guard + sweep

Enforced the v5 API AppError taxonomy by adding an ESLint `no-restricted-syntax`
guard over `src/app/api/v5/**/*.ts` + `src/features/**/*.service.ts`, and
sweeping the 3 remaining raw `throw new Error(...)` sites in feature services to
typed `InternalError`.

## What Shipped

### Task 1 — ESLint guard (commit 958f9c6)

Appended a new flat-config block to `eslint.config.mjs` with the exact selector
and files glob from the plan:

```js
{
  files: ['src/app/api/v5/**/*.ts', 'src/features/**/*.service.ts'],
  rules: {
    'no-restricted-syntax': ['error', {
      selector: "ThrowStatement[argument.type='NewExpression'][argument.callee.name='Error']",
      message: "Throw AppError subclasses from '@/lib/errors', not raw Error. v5 API contract requires typed error codes.",
    }],
  },
},
```

### Task 2 — Raw-error sweep (commit 999da0d)

Inventory (`rg "throw new Error\\("` over `src/app/api/v5` + `src/features/**/*.service.ts`):

| File                                         | Line | Context                                        | Fix              |
| -------------------------------------------- | ---- | ---------------------------------------------- | ---------------- |
| `src/features/scenarios/scenario.service.ts` | 162  | Post-insert safety net (createScenario)        | `InternalError`  |
| `src/features/scenarios/scenario.service.ts` | 537  | Post-insert safety net (createTempEntity)      | `InternalError`  |
| `src/features/admin/register.service.ts`     | 214  | Post-insert safety net (generic register ins.) | `InternalError`  |

Zero hits found under `src/app/api/v5/**` — all v5 route handlers were already
typed. Zero `NextResponse.json({ error: ... })` bypasses found under
`src/app/api/v5` either.

All three sites are "unreachable in practice" safety nets after
`.returning()`. They are not user-facing validation errors — `InternalError`
(500, `ERR_INTERNAL`) is the appropriate typed subclass.

## Verification

- `rg "throw new Error\\(" src/app/api/v5` -> 0 matches
- `rg "throw new Error\\(" src/features/**/*.service.ts` -> 0 matches
- `rg "NextResponse\\.json\\(\\s*\\{\\s*error" src/app/api/v5` -> 0 matches
- `eslint.config.mjs` contains exactly 1 occurrence of the guard selector
- `pnpm lint` reports 0 new errors from the AppError guard (pre-existing
  `react-hooks/immutability` errors in `line-manager-timeline-grid.test.tsx`
  are unrelated and logged to `deferred-items.md`)

`pnpm test` was not re-run from this plan because plan 44-01 (AppError
subclasses + static taxonomy invariant) is executing in parallel. The static
invariant test belongs to 44-01's verification pass, and running the full
suite before 44-01 commits would race against its file writes.

## Deviations from Plan

### Out-of-scope lint noise

**1. [SCOPE BOUNDARY] Pre-existing `react-hooks/immutability` errors**
- **Found during:** Task 1 `pnpm lint` run
- **Issue:** 7 errors in `src/components/timeline/__tests__/line-manager-timeline-grid.test.tsx` (lines 88-93). Unrelated to AppError taxonomy.
- **Action:** Logged to `.planning/phases/44-api-hardening-and-test-contract-fill/deferred-items.md`. Not fixed.
- **Rule:** Scope boundary — only auto-fix issues caused by current task's changes.

### Coordination with parallel plan 44-01

Plan 44-01 was mid-execution (had written `src/lib/errors/codes.ts` but not
committed) when this plan ran. The guard block selector and the 3 service
edits are independent of 44-01's subclass additions, so no coordination was
required — the guard takes effect immediately, and 44-01's new subclass file
is not touched here.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `eslint.config.mjs` guard block present (1 selector match)
- FOUND: commit 958f9c6 (`chore(44-02): add AppError taxonomy ESLint guard`)
- FOUND: commit 999da0d (`refactor(44-02): replace raw Error throws with InternalError in services`)
- FOUND: `src/features/scenarios/scenario.service.ts` uses `InternalError`
- FOUND: `src/features/admin/register.service.ts` uses `InternalError`
- FOUND: `.planning/phases/44-api-hardening-and-test-contract-fill/deferred-items.md`
- VERIFIED: 0 raw `throw new Error(` under v5 routes or service files
