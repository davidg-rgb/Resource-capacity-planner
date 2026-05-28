---
phase: 55-tenant-isolation-consolidation
plan: standalone
subsystem: data-layer / security
tags: [tenant-isolation, multi-tenant, withTenant, direct-predicate, invariant-test, ADR]

requires:
  - phase: 44-api-hardening-and-test-contract-fill
    provides: tenant-isolation.runtime.test.ts (cross-tenant 404 prober) + tenant-isolation.static.test.ts (dual-pattern guard)
provides:
  - single canonical tenant-scoping pattern (requireRole+orgId+direct organizationId predicate)
  - rejected-pattern guard that fails CI if withTenant() is reintroduced
  - ADR-V7-01 (first v7.0 ADR)
affects: [all future tenant-scoped query work — one pattern only]

tech-stack:
  added: []
  removed: ["src/lib/tenant.ts (withTenant wrapper, ~178 lines)"]
  patterns:
    - "Tenant scoping = requireRole() resolves orgId -> service filters eq(table.organizationId, orgId); no query-builder wrapper"

key-files:
  created:
    - .planning/adr/ADR-V7-01-tenant-isolation.md
  modified:
    - src/features/organizations/organization.service.ts (seedDefaults -> direct db.insert)
    - tests/invariants/tenant-isolation.static.test.ts (requireRole+orgId only + rejected-pattern guard)
  deleted:
    - src/lib/tenant.ts

key-decisions:
  - "ADR-V7-01: REMOVE withTenant, standardize on direct predicates — chosen over extending the wrapper to 16 tables because the census was 139 direct sites vs 1 vestigial wrapper usage, and the runtime prober already enforces isolation regardless of pattern"
  - "Safety preserved by enforcement, not indirection: runtime cross-tenant 404 prober + tightened static invariant (rejected-pattern guard) replace the wrapper's can't-forget-the-predicate guarantee"

requirements-completed: [TENANT-01, TENANT-02, TENANT-03]

duration: ~25min
completed: 2026-05-28
---

# Phase 55: Tenant-isolation consolidation

**Collapsed two tenant-scoping patterns into one. Removed the vestigial `withTenant()` wrapper (1 usage) and standardized on the de-facto pattern (`requireRole()`+`orgId`+direct `organizationId` predicate, 139 sites), recorded the choice as the first v7.0 ADR, and added a rejected-pattern guard so the wrapper can't creep back.**

## Why
v7.0's mandate is "close architectural debt so v8.0 lands on a clean foundation." The
`withTenant()`/direct-predicate split was textbook half-and-half debt: a hand-written query
wrapper covering ~8 of 16 tables, used in exactly one place, alongside 139 direct-predicate
query sites. Tenant isolation was already enforced behaviorally by the Phase 44 runtime
cross-tenant prober, so the wrapper added a second code path without adding safety.

## What changed (TENANT-01..03)
- **TENANT-01 — ADR.** `.planning/adr/ADR-V7-01-tenant-isolation.md` (first v7.0 ADR): documents
  the census (139 vs 1), the decision (remove wrapper), alternatives (extend to 16 tables —
  rejected for churn/risk), and consequences. Decision authorized by David.
- **TENANT-02 — execution.** Migrated `seedDefaults` (the only `withTenant()` caller — 2 seed
  inserts) to direct `db.insert(...).values({ ...data, organizationId: orgId })`. Deleted
  `src/lib/tenant.ts`. `grep withTenant( src` → 0.
- **TENANT-03 — invariant.** Tightened `tenant-isolation.static.test.ts`: every mutating
  `/api/v5/*` route must thread `requireRole()+orgId` (dropped the `withTenant()` OR-branch), and
  a new `TC-API-TENANT-REJECTED` block scans all of `src/` and fails CI if `withTenant(` reappears.

## Verification
- `pnpm typecheck` — green
- `pnpm lint` — green
- tenant-isolation.static.test.ts (per-route requireRole+orgId + rejected-pattern guard) — green
- tenant-isolation.runtime.test.ts (cross-tenant 404 prober, 11 routes) — green (no leak regression)
- full suite — 1094 passing (only the pre-existing imports.api env-harness suite fails — Phase 58)
- `pnpm audit` — still clean (0/0/0/0); no dependency change
- success criteria 1-4 (ROADMAP §Phase 55): ADR exists ✓; zero violations of rejected pattern ✓;
  runtime invariant fails on mixed-pattern reintroduction ✓; existing isolation contract tests pass ✓

## Deviations from the requirement wording
- The requirement framed TENANT-02 as "touch every tenant-scoped query so coverage is binary."
  In reality coverage was already ~binary on direct predicates (139 sites); the wrapper was the
  outlier. So execution was *removing* the outlier (1 call site + 1 file), not rewriting 139 sites.
  The runtime prober + tightened static guard make the "binary" property enforceable.

## Known follow-ups (non-blocking)
- An AST/lint rule asserting every `db.select/update/delete` on a tenant-scoped table carries an
  `organizationId` predicate would harden the *read* surface too (the runtime prober covers
  mutating routes). Noted in the ADR consequences; not required by Phase 55.
- `environmentMatchGlobs` deprecation (vitest 3 -> removed in v4) — carried over from Phase 54.5.

## Next phase readiness
TENANT-01..03 closed. Next: **Phase 56** — Change-log enum expansion (CHLOG-01..03).

---
*Phase: 55-tenant-isolation-consolidation*
*Completed: 2026-05-28*
