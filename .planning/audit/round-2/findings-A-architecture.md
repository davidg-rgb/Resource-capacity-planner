# Round 2 Agent A — ARCHITECTURE.md Conformance (post-fix re-scan)

**Scanned at:** 2026-04-27
**Target doc:** ARCHITECTURE.md (root, v1.0 blueprint, 4708 lines)
**Codebase HEAD:** `d3c3212` (post Round-1 fixes)
**Mode:** Read-only audit

## Round 1 verification

| ID | Round-1 issue | Round-2 status |
|---|---|---|
| F-A-001 | `getTenantId` / `requireRole` location | STILL-DRIFTED (doc, bulk) |
| F-A-002 | Allocation service function names diverge | STILL-DRIFTED (doc, bulk) |
| F-A-003 | `getById` / `archiveProject` rename | STILL-DRIFTED (doc, bulk) |
| F-A-004 | RBAC drift on people/projects POST/PATCH | **PASS** ✓ |
| F-A-005 | Mixed error response shapes | **STILL-DRIFTED (code)** → F-A-100 |
| F-A-006 | Trial enforcement absent | STILL-DRIFTED (doc; intentional defer) |
| F-A-007 | Stripe billing absent | STILL-DRIFTED (doc; intentional defer) |
| F-A-008 | Platform admin auth uses cookie + Clerk Actor Tokens | STILL-DRIFTED (doc; intentional supersede) |
| F-A-009 | `/api/platform/tenants/*` vs `/organizations/*` | STILL-DRIFTED (doc internal) |
| F-A-010 | `seedDefaults` discipline list | NOT VERIFIED IN R2 |
| F-A-011 | Allocation hours 999 → 744 | **PASS** ✓ (with regression suite) |
| F-A-012 | `withTenant()` adoption inconsistent | STILL-DRIFTED (style) |
| F-A-013 | Single-allocation `POST` / `DELETE [id]` routes missing | STILL-DRIFTED (doc) |
| F-A-014 | `src/middleware.ts` → `src/proxy.ts` (Next 16) | STILL-DRIFTED (doc) |
| F-A-015 | Migrations split | STILL-DRIFTED |
| F-A-016 | Sentry/Resend not installed | STILL-DRIFTED |
| F-A-017 | `(platform)` route group nesting | STILL-DRIFTED (doc internal) |
| F-A-018 | `import.service.ts` consolidation | STILL-DRIFTED (doc) |
| F-A-019 | `/api/dashboard` → 7+ analytics endpoints | STILL-DRIFTED (doc) |
| F-A-020 | `createOrganization` signature | STILL-DRIFTED (doc) |
| F-A-021 | `requireRole` no `request` arg | STILL-DRIFTED (doc) |
| F-A-022 | `Allocation.month` wire format | STILL-DRIFTED (doc) |

**R1→R2 verification summary:** 2 PASS (F-A-004 RBAC, F-A-011 hours cap). 1 STILL-DRIFTED-as-code-bug (F-A-005 → F-A-100). 18 STILL-DRIFTED-as-doc (slated for the deferred ARCHITECTURE.md modernization pass).

## New findings (Round 2)

### F-A-100 — Error response shape: now THREE shapes coexist
- **Severity:** P1
- **Locations:**
  - Doc-spec flat shape: `ARCHITECTURE.md:3683-3693` documents `{ error: "ERR_X", message, details }` with `error` as STRING
  - Nested shape (canonical class): `src/lib/errors.ts:12-20` `AppError.toJSON()` returns `{ error: { code, message, details } }` — `error` is OBJECT
  - Inline string-only shape: 11 routes return `{ error: 'human readable message' }` — no `code`, no `message` key
- **Affected routes:** `src/app/api/import/upload/route.ts:23,28`; `src/app/api/reports/team-heatmap/route.tsx:33`; `src/app/api/analytics/alerts/route.ts:14`; `src/app/api/analytics/alerts/count/route.ts:14`; `src/app/api/platform/tenants/[orgId]/purge/route.ts:21,27`; `src/app/api/scenarios/route.ts:24,38`; `src/app/api/scenarios/[id]/route.ts:41,57`
- **Drift:** R1 noted two shapes; the third (string-only) is strict-subset incompatibility — clients switching on `body.error.code` or `body.error` will break
- **Suggested action:** code-fix. Pick canonical shape (recommend nested matching `AppError.toJSON()`). Migrate the 11 inline returns to throw typed AppError. Update doc §11.1. Extend `tests/invariants/error-wire-format.test.ts`.

### F-A-101 — `Project.leadPmPersonId` column not in v1.0 doc entity
- **Severity:** P1 (doc-fix — bulk modernization)
- **Location:** `src/db/schema.ts:238`; index at `:252-254`
- **Suggested action:** doc-fix (bulk)

### F-A-102 — Soft-delete `archivedAt` on Department / Discipline / Program not in v1.0 doc
- **Severity:** P2 (doc-fix)
- **Location:** `src/db/schema.ts:140,160,180`
- **Suggested action:** doc-fix

### F-A-103 — `Organization.onboardingCompletedAt` column not in v1.0 doc
- **Severity:** P2 (doc-fix)
- **Location:** `src/db/schema.ts:122`
- **Suggested action:** doc-fix

### F-A-105 — Allocation `hours` column lacks DB-level CHECK constraint ⚠ NEW DEFENSE-IN-DEPTH
- **Severity:** P2 (defense-in-depth gap)
- **Location:** `src/db/schema.ts:273` `hours: integer('hours').notNull()` — no CHECK clause
- **Doc reference:** ARCHITECTURE.md §7 line 2357 ("Allocation.hours: required, min 0, max 744")
- **Drift:** Zod schema is now correct (R1 F-A-011 fix), but DB will accept arbitrary integers if any code path bypasses the schema (seed scripts, raw SQL, future codegen drift)
- **Suggested action:** code-fix — add `CHECK (hours >= 0 AND hours <= 744)` migration. Pairs with R1 F-A-011 to make the contract end-to-end

### F-A-106 — Tech-stack version table outdated
- **Severity:** P2 (doc-fix; bulk modernization)
- **Location:** ARCHITECTURE.md §4 Tech Stack (lines 326-348)
- **Drift:** Next.js `16.2.1` (doc: 15.x), React `19.2.4`, Zod `^4.3.6` (doc: 3.x), AG Grid `^35.2.0` (doc: 32.x)
- **Suggested action:** doc-fix (bulk)

### F-A-107 — Drizzle `month` column is `date` (mode: string), doc says `Date`
- **Severity:** P3 (doc nit)
- **Location:** `src/db/schema.ts:272`
- **Suggested action:** doc-fix

### F-A-108 — `change_log` table and enums not in v1.0 doc
- **Severity:** P2 (doc-fix)
- **Location:** `src/db/schema.ts:62-89`
- **Suggested action:** doc-fix — add Entity: ChangeLog to §7 (or reference v5.0-ARCHITECTURE §7.4)

### F-A-109 — v5.0 / v6.0 features not represented in §7 / §8.1
- **Severity:** P2 (doc-fix; bulk modernization)
- **Location:** Code `src/features/{proposals,scenarios,alerts,dashboard,planning,actuals}/` + 30+ `/api/v5/*` routes
- **Suggested action:** doc-fix — single bulk pass

### F-A-110 — `lucide-react` package version pin looks suspicious
- **Severity:** P3 (cosmetic / sanity check)
- **Location:** `package.json` declares `lucide-react: ^1.7.0`; public majors are 0.x — could be misrouted or private fork
- **Suggested action:** re-validate-needed (code-side)

## Summary

- **P0:** 0
- **P1:** 2 (F-A-100 error shape, F-A-101 leadPmPersonId)
- **P2:** 6 (F-A-102, 103, 105, 106, 108, 109)
- **P3:** 2 (F-A-107, F-A-110)

## Key call-outs

- **Round 1 fixes hold strongly.** F-A-004 + F-A-011 verified end-to-end with passing regression tests.
- **F-A-005 → F-A-100 is the one carry-over P1.** Discovered a third error-shape variant (string-only, no `code`) in 11 inline returns. Highest-priority code-fix for Round 3.
- **F-A-105 (DB CHECK on hours)** is a cheap, durable defense-in-depth pairing with R1 F-A-011 — ~10 lines of SQL.
- **All other items are doc-modernization scope.** Recommend a single ARCHITECTURE.md commit with v1.0-baseline header + patches.
