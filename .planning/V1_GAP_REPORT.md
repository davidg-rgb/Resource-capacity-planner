# V1.0 Gap Report — Round 1

> Generated: 2026-03-27
> Source: 5 parallel code review agents validating 187 test cases from V1_FUNCTIONAL_TEST_SPEC.md
> Result: 135 PASS, 31 PARTIAL, 6 FAIL — **33 gaps identified**

---

## Critical Gaps (Breaks core functionality)

| # | ID | Area | Description | File(s) |
|---|-----|------|-------------|---------|
| 1 | GAP-IMPEX-001 | Import | `allRows` not sent from server to client — mapping/validation gets zero rows | `src/app/api/import/upload/route.ts` |
| 2 | GAP-PROXY-001 | Auth | Webhook route not excluded from Clerk auth — org creation webhook rejected | `src/proxy.ts` |
| 3 | GAP-CONF-001 | Grid | Conflict detection `updatedAtMap` never seeded from initial fetch | `src/app/(app)/input/[personId]/page.tsx` |

## Functional Gaps (Feature missing or incomplete)

| # | ID | Area | Description | File(s) |
|---|-----|------|-------------|---------|
| 4 | GAP-AUTH-003 | Auth | Onboarding page is static placeholder — no org creation step | `src/app/onboarding/page.tsx` |
| 5 | GAP-AUTH-007 | Auth | No invite-users UI (no OrganizationProfile rendered) | Missing page |
| 6 | GAP-PLAT-008 | Platform | No "Create Organization" from platform admin panel | `src/app/api/platform/tenants/route.ts` |
| 7 | GAP-PLAT-022 | Platform | Actions during impersonation not attributed to platform admin | `src/lib/auth.ts` |
| 8 | GAP-PLAT-024 | Platform | No prevention of overlapping impersonation sessions | `src/features/platform/platform-impersonation.service.ts` |
| 9 | GAP-PLAT-019 | Platform | End impersonation doesn't call platform API or redirect | `src/components/platform/impersonation-banner.tsx` |
| 10 | GAP-PLAT-030 | Platform | Password reset sets password directly instead of sending email | `src/features/platform/platform-user.service.ts` |
| 11 | GAP-ERR-001 | Error | No custom 404 page | Missing `src/app/not-found.tsx` |
| 12 | GAP-GRID-002 | Grid | Month range only 5 future months instead of 12+ | `src/components/grid/allocation-grid.tsx` |

## UX/Polish Gaps (Implemented but incomplete)

| # | ID | Area | Description | File(s) |
|---|-----|------|-------------|---------|
| 13 | GAP-CRUD-001 | CRUD | No success toast on Person create/update/delete | `src/app/(app)/team/page.tsx` |
| 14 | GAP-CRUD-002 | CRUD | No success toast on Project create/update/archive | `src/app/(app)/projects/page.tsx` |
| 15 | GAP-CRUD-003 | CRUD | Team page doesn't hide controls for Viewer role | `src/app/(app)/team/page.tsx` |
| 16 | GAP-CRUD-004 | CRUD | Projects page doesn't hide controls for Viewer role | `src/app/(app)/projects/page.tsx` |
| 17 | GAP-CRUD-005 | CRUD | No inline validation error for empty Person name | `src/app/(app)/team/page.tsx` |
| 18 | GAP-CRUD-006 | CRUD | No inline validation error for empty Project name | `src/app/(app)/projects/page.tsx` |
| 19 | GAP-KB-006 | Grid | Tab navigation doesn't wrap rows or skip read-only cells | `src/hooks/use-keyboard-nav.ts` |
| 20 | GAP-SHELL-001 | Shell | SideNav component defined but never rendered | `src/components/layout/app-shell.tsx` |
| 21 | GAP-SHELL-004 | Shell | No responsive handling at 1024px | `src/components/layout/top-nav.tsx` |
| 22 | GAP-IMPEX-002 | Import | No fuzzy/best-guess header matching for non-standard columns | `src/features/import/import.utils.ts` |
| 23 | GAP-IMPEX-003 | Import | Hidden rows silently skipped without warning | `src/features/import/import.utils.ts` |
| 24 | GAP-IMPEX-004 | Import | Person filter uses dropdown instead of searchable text input | `src/components/flat-table/flat-table-filters.tsx` |
| 25 | GAP-IMPEX-006 | Import | Upload error response field mismatch (err.message vs err.error) | `src/hooks/use-import.ts` |
| 26 | GAP-PLAT-006 | Platform | Dashboard missing data size and real user count metrics | `src/features/platform/platform-dashboard.service.ts` |
| 27 | GAP-PLAT-016 | Platform | Subscription audit log doesn't capture old values | `src/app/api/platform/subscriptions/[orgId]/route.ts` |
| 28 | GAP-PLAT-017 | Platform | Impersonation banner lacks user/org name | `src/components/platform/impersonation-banner.tsx` |
| 29 | GAP-PLAT-023 | Platform | No client-side impersonation expiry notice | `src/components/platform/impersonation-banner.tsx` |
| 30 | GAP-PLAT-029 | Platform | Users page missing org and role columns | `src/app/(platform)/users/page.tsx` |

## Code Quality (Not blocking but should fix)

| # | ID | Area | Description | File(s) |
|---|-----|------|-------------|---------|
| 31 | GAP-IMPEX-005 | Import | Viewer role access implicit, no explicit requireRole('viewer') | `src/app/api/allocations/flat/route.ts` |
| 32 | GAP-AUTH-008 | Auth | Invite-accept flow depends on GAP-AUTH-007 | N/A |
| 33 | GAP-SHELL-003 | Shell | Contextual side nav missing (same root as GAP-SHELL-001) | N/A |
