# Round 3 Agent A — ARCHITECTURE.md verification

**Scanned at:** 2026-04-27
**Codebase HEAD:** `09da8fc`
**Doc:** `D:\Kod Projekt\Resurs & Projektplanering\ARCHITECTURE.md` (4775 lines)

## Round 2 fix verification

| Item | Status |
|---|---|
| ed768b3 v1.0 baseline header + drift notes | **PASS** ✓ |
| F-A-100 error response shape | **PASS** ✓ (for the 12 cited sites) |
| F-A-105 DB CHECK on hours | **PASS** ✓ |

### ed768b3 — header + drift notes — PASS

- **v1.0 BASELINE header** sits at lines 7-35, immediately after the header frontmatter and BEFORE the TOC (line 39). Reads cleanly as a standalone callout.
- **All 13 drift notes verified at the right anchor lines:**
  - §6.12 Organization Service `checkTrialStatus` deferred — line 1329
  - §6.13 Billing Service deferred (No Stripe MVP) — line 1380
  - §6.16 `tenant.ts` → split with `auth.ts` — line 1515
  - §6.17 `middleware.ts` → `proxy.ts` (Next.js 16) — line 1550
  - §7 entity preamble — line 2202
  - §7 Organization `onboardingCompletedAt` — line 2206
  - §7 Project `leadPmPersonId` — line 2291
  - §7 Department/Discipline/Program `archivedAt` — lines 2326, 2355, 2377
  - §7 Allocation DB-level CHECK — line 2400
  - §8.1 path prefix `/organizations/*` → `/api/platform/tenants/*` — line 2643
  - §8.1 single POST/DELETE `/api/allocations` superseded — line 2677
  - §8.1 `/api/dashboard` split — line 2980
  - §11.1 canonical taxonomy in `errors/codes.ts`, `HISTORIC_CONFIRM_REQUIRED` is 409 — line 3701

### F-A-100 — error response shape — PASS

Round 2 commit `b4640bc` migrated all 12 cited sites across 7 routes from flat `{ error: 'string' }` to `throw new AppError(...)` + `handleApiError(error)`. 10 new `TC-INV-ERRWIRE-R2-*` invariant tests added, all passing. The user-visible breakage at `(platform)/tenants/[orgId]/page.tsx:255` (`[object Object]`) is fixed.

### F-A-105 — DB CHECK constraint on hours — PASS

Migration `src/db/migrations/20260427_audit_allocation_hours_check.sql` adds `CHECK (hours >= 0 AND hours <= 744)`. Idempotent. Operator-applied. Runbook at `.planning/runbooks/r2-allocation-hours-check.md`.

## New findings

### F-A-200 (P3) — Residual flat-error sites outside R2-P0-01 scope

14 inline `return NextResponse.json({ error: '...' }, ...)` sites still exist outside the 7 routes Round 2 fixed. Most emit *partially-flat* shape `{ error: 'ERR_CODE', message: '...' }` — closer to canonical than Round 2 sites (which used pure `{ error: 'string' }`). NOT user-visible breakage.

**Locations:** `src/app/api/allocations/route.ts:13`, `src/app/api/organizations/invite/route.ts:54`, `src/app/api/import/execute/route.ts:23`, `src/app/api/import/validate/route.ts:23`, `src/app/api/people/[id]/adjacent/route.ts:17`, `src/app/api/analytics/person-summary/route.ts:16,36`, `src/app/api/platform/tenants/[orgId]/route.ts:35`, `src/app/api/scenarios/[id]/temp-entities/route.ts:59`, `src/app/api/scenarios/[id]/analytics/{dashboard,impact,team-heatmap,comparison}/route.ts:18`, `src/app/api/test/flags/route.ts:64,80`

**Severity:** P3 (no UX breakage). Log and defer unless strict §11.1 conformance is wanted.

### F-A-201 (P3) — D-CR-107 follow-up alignment

`src/app/api/people/route.ts:11` swapped `getTenantId()` → `requireRole('viewer')` in commit `0611c25`. §8.1 already says `Auth: viewer+` — code now matches doc. No drift introduced. Non-actionable.

## Summary

- **NEW P0:** 0
- **NEW P1:** 0
- **NEW P2:** 0
- **NEW P3:** 2 (both non-actionable)

The v1.0-baseline header collapsed ~22 P1 findings to zero new doc-fix work. ARCHITECTURE.md is in a stable, auditable state.
