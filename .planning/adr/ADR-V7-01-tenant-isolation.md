# ADR-V7-01 — Tenant scoping via direct `organizationId` predicates; remove the `withTenant()` wrapper

- **Status:** Accepted (2026-05-28)
- **Milestone:** v7.0 Foundation & Quality
- **Phase:** 55 — Tenant-isolation consolidation
- **Requirements:** TENANT-01 (this ADR), TENANT-02 (execution), TENANT-03 (invariant)
- **Supersedes:** the dual-pattern tolerance baked into `tests/invariants/tenant-isolation.static.test.ts` (Phase 44)

## Context

The codebase carried **two** ways to scope a query to the current tenant:

1. **`withTenant(orgId)`** — a hand-written query-builder wrapper in `src/lib/tenant.ts` that
   returned pre-scoped select/insert/update/delete helpers injecting `organizationId` for ~8 of
   the 16 tenant-scoped tables.
2. **Direct predicate** — `requireRole()` resolves `{ orgId, userId, role }`, the route threads
   `orgId` into a service, and the service filters with `eq(schema.X.organizationId, orgId)`
   (and `and(...)` on mutations).

The split was lopsided in practice. A census of the codebase at the start of Phase 55:

| Pattern | Occurrences |
|---------|-------------|
| `withTenant()` call sites | **1** (`organization.service.ts` — 2 seed inserts in `seedDefaults`) |
| Direct `organizationId` predicates in queries | **139** |
| Tenant-scoped tables (have `organization_id`) | 16 |

`withTenant()` was effectively dead. Tenant isolation was *already* enforced at runtime
independent of which pattern a route used:

- `tests/invariants/tenant-isolation.runtime.test.ts` — fires org-A-authenticated requests at
  org-B-owned rows for every mutating `/api/v5/*` route and asserts **404** (never 200/403/500).
- `tests/invariants/tenant-isolation.static.test.ts` — required every mutating route to use
  `withTenant()` **OR** `requireRole()+orgId`. This *OR* is the mixed pattern TENANT-03 must remove.

## Decision

**Remove `withTenant()`. Standardize on `requireRole()` + `orgId` + direct `organizationId`
predicates as the single canonical tenant-scoping pattern.**

- Delete `src/lib/tenant.ts`.
- Migrate the one remaining caller (`seedDefaults` in `organization.service.ts`) to direct
  `db.insert(...).values({ ...data, organizationId: orgId })`.
- Tighten `tenant-isolation.static.test.ts`: drop the `withTenant()` acceptance branch (mutating
  routes must thread `requireRole()+orgId`), and add a **rejected-pattern guard** that scans all of
  `src/` and fails if the token `withTenant(` reappears anywhere. Reintroducing the wrapper now
  breaks CI.

## Alternatives considered

- **(a) Extend `withTenant()` to all 16 tables and rewrite the 139 direct sites to use it.**
  Rejected. This rewrites 139 working, tested call sites to adopt a wrapper the codebase had
  already abandoned (1 usage) — large churn and regression risk on a production multi-tenant app,
  for no isolation gain over what the runtime prober already guarantees. It also re-centralizes
  query construction in a bespoke builder that has to be maintained in lockstep with the schema.
- **(b) Keep both patterns (status quo).** Rejected. The dual-pattern tolerance is exactly the
  "half-and-half" coverage v7.0 set out to close; it leaves a second, barely-used code path that
  future readers must understand and that the static guard must keep special-casing.

## Consequences

- **Tenant scoping is binary and uniform** — every tenant-scoped query is a direct
  `eq(organizationId, orgId)` predicate behind a `requireRole()`-resolved `orgId`. One pattern to
  learn, review, and grep for.
- **Safety is preserved, not weakened.** The wrapper's value was "you can't forget the org
  predicate." That guarantee now comes from enforcement instead of indirection: the runtime
  cross-tenant prober proves isolation behaviorally, and the tightened static invariant fails CI if
  the rejected wrapper returns. A complementary future hardening (out of scope here) could add an
  AST/lint check that every `db.select/update/delete` on a tenant-scoped table carries an
  `organizationId` predicate — the runtime prober already covers the mutating-route surface.
- **`–178` lines of wrapper deleted**; one service simplified to the same primitive everything else uses.
- **No data-layer behavior change.** `seedDefaults` writes the identical rows; the 139 existing
  sites are untouched; the runtime prober and all contract suites stay green.

## Verification (Phase 55)

- `grep -rn "withTenant(" src` → 0 matches (rejected pattern eliminated).
- `tenant-isolation.static.test.ts` (per-route `requireRole()+orgId` + rejected-pattern guard) — green.
- `tenant-isolation.runtime.test.ts` (cross-tenant 404 prober) — green (no leak regression).
- `pnpm typecheck` / `pnpm lint` — green. Full suite: 1094 tests pass (only the pre-existing
  `imports.api` env-harness suite fails — Phase 58 / QUAL-04..06, unrelated).
