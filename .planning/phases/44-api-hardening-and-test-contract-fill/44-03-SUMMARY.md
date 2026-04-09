---
phase: 44
plan: "03"
subsystem: test-invariants
tags: [tenancy, static-audit, invariants, api-v5]
requires:
  - src/app/api/v5/**/route.ts (existing)
  - tests/invariants/ pattern (change-log.coverage.test.ts)
provides:
  - TC-API-TENANT-STATIC static audit
  - tests/invariants/tenant-exceptions.json manifest schema
affects:
  - CI (any new mutating v5 route must use withTenant() or requireRole+orgId)
tech-stack:
  added: []
  patterns:
    - Static fs-walk invariant test (Vitest)
key-files:
  created:
    - tests/invariants/tenant-exceptions.json
    - tests/invariants/tenant-isolation.static.test.ts
  modified: []
decisions:
  - Regex accepts BOTH Pattern A (withTenant() — future-preferred) and Pattern B (requireRole()+orgId — current reality, all 17 v5 routes) per RESEARCH risk R1.
  - Exceptions manifest starts empty; no v5 route currently needs a waiver.
metrics:
  duration: ~6min
  completed: 2026-04-09
  tasks: 2
  files: 2
---

# Phase 44 Plan 03: Static tenant-isolation audit Summary

Static Vitest invariant walks `src/app/api/v5/**/route.ts`, detects mutating handler exports (POST/PUT/PATCH/DELETE), and asserts each file matches `withTenant(` OR (`requireRole(` ... `orgId`). An empty whitelist manifest at `tests/invariants/tenant-exceptions.json` lets future non-tenant routes opt out with a reason string.

## What Shipped

- `tests/invariants/tenant-exceptions.json` — `{ "routes": [] }`. Schema: `{ file, verbs?, reason }`.
- `tests/invariants/tenant-isolation.static.test.ts` — fs-walk + regex invariant, generates one `it("TC-API-TENANT-STATIC ...")` per mutating route file. Green against current codebase (11 generated sub-tests, all pass under Pattern B).

## Verification

- `pnpm test -- tests/invariants/tenant-isolation.static.test.ts` → **11 tests passed** (1 describe, 11 per-route `it()` blocks, zero failures).
- Test title uses `TC-API-TENANT-STATIC` token as first token after describe, so the forthcoming TC-ID manifest generator (Wave C) will pick it up.

## Deviations from Plan

None — plan executed exactly as written.

### Out-of-scope observation (NOT fixed this plan)

`tests/invariants/change-log.coverage.test.ts` has 6 failing TC-CL-005 sub-tests because the `@/db` stub lacks a `transaction(fn)` method. This is the pre-diagnosed TC-CL-005 failure explicitly scheduled for a later Phase 44 plan (Wave D per CONTEXT §6 and decision §5). Untouched per scope boundary rule — tracked by existing phase plan, not added to deferred-items.md.

## Commits

- `6f6a748` chore(44-03): add empty tenant-exceptions.json manifest
- `97bd7ce` test(44-03): add TC-API-TENANT-STATIC audit accepting withTenant or requireRole+orgId

## Self-Check: PASSED

- FOUND: tests/invariants/tenant-exceptions.json
- FOUND: tests/invariants/tenant-isolation.static.test.ts
- FOUND: 6f6a748
- FOUND: 97bd7ce
