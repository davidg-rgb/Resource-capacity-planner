# Round 1 Agent A — ARCHITECTURE.md Conformance

**Scanned at:** 2026-04-27
**Target doc:** ARCHITECTURE.md (root, v1.0 blueprint, 4708 lines)
**Codebase HEAD:** `bb66ae8` (main, "docs(53): add operator runbook for v6.0 UAT Test 3 rowcount check")

## Findings

### F-A-001 — `getTenantId` / `requireRole` live in wrong file
- **Severity:** P1 (doc-fix)
- **Location:** `src/lib/auth.ts:55` and `:75` (vs. doc's `src/lib/tenant.ts`)
- **Doc reference:** ARCHITECTURE.md §6.16 "Tenant Context (`src/lib/tenant.ts`)" and §10.1 dependency map
- **Drift:** Doc places `getTenantId(request)` and `requireRole(request, minimumRole)` in `src/lib/tenant.ts`. Actual: `src/lib/tenant.ts` only exports `withTenant(orgId)`. `getTenantId()` and `requireRole(minimumRole)` are in `src/lib/auth.ts` and take **no `request` arg** — they read Clerk's `auth()` helper from AsyncLocalStorage instead.
- **Suggested action:** doc-fix

### F-A-002 — Allocation service function names diverge from spec
- **Severity:** P1 (doc-fix; behavior preserved via v5.0 split)
- **Location:** `src/features/allocations/allocation.service.ts:26,191,240,400,422,460`
- **Doc reference:** ARCHITECTURE.md §6.1 + §15
- **Drift:** Doc specifies `getPersonAllocations`, `getTeamAllocations`, `getProjectAllocations`, `upsertAllocation`, `getAllocationsFlat`, `deleteAllocation`. Code exports `listAllocationsForPerson`, `batchUpsertAllocations`, `patchAllocation`, `listAllocationsFlat`, `countAllocationsFlat`, `sumHoursFlat`, `exportAllocationsFlat`. Team/project views moved to `src/features/analytics/analytics.service.ts` and `src/features/planning/planning.read.ts`. Single-cell upsert collapsed into batch-only.
- **Suggested action:** doc-fix

### F-A-003 — Person/Project service `getById` renamed; `deleteProject`→`archiveProject`
- **Severity:** P1 (doc-fix)
- **Location:** `src/features/people/person.service.ts:44,107`, `src/features/projects/project.service.ts:42,88`
- **Doc reference:** §6.2, §6.3, §15
- **Suggested action:** doc-fix

### F-A-004 — RBAC drift: POST/PATCH for people, projects require `planner`, doc says `admin+`
- **Severity:** P1 (security-relevant decision needed)
- **Location:** `src/app/api/people/route.ts:35` POST `requireRole('planner')`; `src/app/api/people/[id]/route.ts:23` PATCH `planner`; same for projects.
- **Doc reference:** §8.1
- **Drift:** Code accepts `planner` (one tier lower) for create/update, while still requiring `admin` for DELETE. Either spec is too tight or code grants more permission than promised.
- **Suggested action:** re-validate-needed — confirm with product

### F-A-005 — Inconsistent error response shape across routes
- **Severity:** P1 (breaks documented contract)
- **Location:** `src/lib/api-utils.ts:12,22,28` returns nested `{ error: { code, message, details } }`. 11 inline returns across 6 files return flat `{ error: 'ERR_X', message }`.
- **Doc reference:** §11.1 documents flat shape
- **Drift:** Two distinct error shapes depending on path. Both partially fail the spec.
- **Suggested action:** code-fix — consolidate on the flat doc shape

### F-A-006 — Trial enforcement absent (intentionally deferred)
- **Severity:** P1 (doc-fix)
- **Location:** No `checkTrialStatus` function exists. `src/proxy.ts` only calls Clerk `auth.protect()`.
- **Doc reference:** §6.12, §2.5 A13
- **Suggested action:** doc-fix — mark §6.12 trial enforcement as deferred

### F-A-007 — F-018 (Stripe billing) entirely absent (intentionally deferred)
- **Severity:** P1 (doc-fix)
- **Location:** No `src/features/billing/`; no `src/app/api/webhooks/stripe/`; no `stripe` in package.json.
- **Doc reference:** §2.1 F-018, §6.13, §8.1, §10.2, §11.2
- **Suggested action:** doc-fix

### F-A-008 — Platform admin auth uses cookie + Clerk Actor Tokens (intentional supersede)
- **Severity:** P1 (doc-fix)
- **Location:** `src/app/api/platform/auth/login/route.ts:25-32`, `src/lib/platform-auth.ts`
- **Doc reference:** §6.19, §6.20, §11.4, §8.1 (Bearer JWT + custom impersonation header)
- **Drift:** Code uses HttpOnly cookie + Clerk's native Actor Token (`getActorInfo()` reads `session.actor.sub`). No `resolveImpersonation()`, no `X-Impersonation-Token` header.
- **Suggested action:** doc-fix

### F-A-009 — Platform tenant URL prefix is `/api/platform/tenants/*`, doc says `/api/platform/organizations/*`
- **Severity:** P1 (doc internal contradiction)
- **Location:** `src/app/api/platform/tenants/...` (12 routes)
- **Doc reference:** §8.1 lines 2986–3141 (uses `/organizations/`); §5 lines 488–522 matches `/tenants/*`
- **Drift:** §8.1 contradicts §5 of the same doc.
- **Suggested action:** doc-fix — align §8.1 with §5

### F-A-010 — `seedDefaults` creates wrong defaults vs spec
- **Severity:** P2
- **Location:** `src/features/organizations/organization.service.ts:7-16,47-57`
- **Doc reference:** §6.12 (disciplines: SW, Mek, Elnik, HW, Test, PT, Sys)
- **Drift:** Code creates 6 disciplines (Software/SW, Mechanical/ME, Electronics/EL, Test/TE, Systems/SY, Hardware/HW) — missing PT (Production Test); abbreviations differ. Code creates 3 departments (Engineering, Product, Operations) instead of one "General".
- **Suggested action:** re-validate-needed (Swedish UX target — code might need to match doc)

### F-A-011 — Allocation hours validation max is 999 in code, doc says 744 ⚠️ REAL BUG
- **Severity:** P1 (allows invalid values; only Zod schema guards it)
- **Location:** `src/features/allocations/allocation.schema.ts:11` (`hours: z.number().int().min(0).max(999)`); `src/features/import/import.service.ts:163` (`row.hours < 1 || row.hours > 999`)
- **Doc reference:** §7 Allocation entity "min 0, max 744"; §15 line 4151
- **Drift:** Code allows 0–999 hours/month. Physical max is 744 (31×24). DB column is unconstrained `integer`. `person.schema.ts:12` correctly uses 744 for target hours; allocation schema does not.
- **Suggested action:** code-fix — change cap to 744; add regression test

### F-A-012 — `withTenant()` abstraction used in only 7 of ~25 services
- **Severity:** P2 (style/consistency; isolation still enforced)
- **Drift:** Newer services bypass `withTenant` and inline `eq(schema.X.organizationId, orgId)`. All sampled inserts/updates do pass orgId, so isolation is intact.
- **Suggested action:** log-only / future refactor

### F-A-013 — Single-allocation `POST /api/allocations` and `DELETE /api/allocations/[id]` routes missing
- **Severity:** P1 (doc-fix; superseded by v5)
- **Drift:** Single-cell autosave is via `POST /api/allocations/batch` only. `PATCH /api/v5/planning/allocations/[id]` exists. No per-id DELETE.
- **Suggested action:** doc-fix

### F-A-014 — `src/middleware.ts` does not exist (Next.js 16 → `src/proxy.ts`)
- **Severity:** P2 (doc-fix; mechanical Next.js 16 rename)
- **Suggested action:** doc-fix — rename §6.17

### F-A-015 — Migrations split between `drizzle/migrations/` and `src/db/migrations/`
- **Severity:** P3 (location nit / deployment risk)
- **Drift:** Polish migrations live outside the drizzle-kit directory.
- **Suggested action:** code-fix or doc-fix

### F-A-016 — Sentry / Resend declared in arch but not installed
- **Severity:** P2
- **Drift:** No instrumentation. Email-sending uses something else or is stubbed.
- **Suggested action:** doc-fix to mark deferred OR code-fix to wire them up

### F-A-017 — `(platform)` route group nested under `(app)` in §5, but code keeps `/platform` as a sibling route
- **Severity:** P3 (doc internal contradiction)
- **Suggested action:** doc-fix §5

### F-A-018 — `import.service.ts` consolidates parser/mapper/validator/executor
- **Severity:** P2
- **Suggested action:** doc-fix

### F-A-019 — `/api/dashboard` endpoint replaced by 7+ `/api/analytics/*` endpoints
- **Severity:** P2 (doc internal inconsistency)
- **Suggested action:** doc-fix §8.1

### F-A-020 — `createOrganization` signature drift (no `userId` parameter)
- **Severity:** P2
- **Suggested action:** doc-fix

### F-A-021 — `requireRole` returns context without `request` arg
- **Severity:** P3 (signature simplification)
- **Suggested action:** doc-fix

### F-A-022 — `Allocation.month` wire format is `YYYY-MM`, not the `YYYY-MM-01` doc implies
- **Severity:** P3
- **Suggested action:** doc-fix — clarify wire vs storage format in §7

## Summary

- **P0:** 0 findings
- **P1:** 9 findings (F-A-001, 002, 003, 004, 005, 006, 007, 008, 009, 011, 013)
- **P2:** 7 findings (F-A-010, 012, 014, 016, 018, 019, 020)
- **P3:** 4 findings (F-A-015, 017, 021, 022)

## Key call-outs

- **Most findings are doc-drift, not code bugs.** ARCHITECTURE.md is the v1.0 blueprint; codebase has shipped v2.0/v4.0/v5.0/v6.0 with massive evolution. Most P1s should land as a single major rewrite of ARCHITECTURE.md.
- **Two real code bugs worth fixing:**
  - **F-A-011** (hours validation 999 vs 744) — concrete fix; allocation Zod cap should be 744
  - **F-A-005** (mixed error response shapes) — could break clients
- **F-A-004 (RBAC drift)** is a security-relevant decision, not just a doc/code patch
