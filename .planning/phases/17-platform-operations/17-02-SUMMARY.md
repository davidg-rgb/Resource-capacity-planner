---
phase: 17-platform-operations
plan: 02
subsystem: platform
tags: [gdpr, data-export, data-purge, tenant-management, platform-admin]

# Dependency graph
requires:
  - phase: 10-platform-admin
    provides: Platform admin auth, tenant management service, audit logging
provides:
  - Tenant data export as JSON download
  - Tenant data purge with name-confirmation safeguard
  - GDPR-compliant data deletion preserving org shell
affects: [platform-operations]

# Tech tracking
tech-stack:
  added: []
  patterns: [parallel-query-export, fk-safe-cascading-delete, type-name-to-confirm-ux]

key-files:
  created:
    - src/features/platform/platform-tenant-data.service.ts
    - src/app/api/platform/tenants/[orgId]/export/route.ts
    - src/app/api/platform/tenants/[orgId]/purge/route.ts
  modified:
    - src/app/(platform)/tenants/[orgId]/page.tsx

key-decisions:
  - "No transaction wrapping for purge -- each delete is independent and idempotent for safe retry"
  - "Export excludes featureFlags (platform config) and large JSONB blobs from importSessions"
  - "Purge preserves organization record shell per GDPR requirements"

patterns-established:
  - "Parallel Promise.all for multi-table export queries"
  - "FK-safe sequential delete order (child-to-parent) for tenant data purge"

requirements-completed: [PLOP-05, PLOP-06]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 17 Plan 02: Tenant Data Export & Purge Summary

**GDPR-compliant tenant data export (JSON download) and purge (type-name-to-confirm deletion) for platform admins on tenant detail page**

## What Was Built

### Tenant Data Service (`platform-tenant-data.service.ts`)
- `exportTenantData(orgId)` -- queries 7 tenant-scoped tables (departments, disciplines, programs, people, projects, allocations, importSessions) in parallel and returns structured `TenantExportData` JSON with ISO timestamps
- `purgeTenantData(orgId)` -- deletes all tenant-scoped data in FK-safe order (allocations -> importSessions -> featureFlags -> people -> projects -> programs -> disciplines -> departments), returns per-table deletion counts
- Organization record preserved after purge (GDPR: purge data, keep account shell)

### Export API Route (`/api/platform/tenants/[orgId]/export`)
- GET handler returns JSON file download with `Content-Disposition: attachment` header
- Platform-admin-only with audit logging (`tenant.export` action)

### Purge API Route (`/api/platform/tenants/[orgId]/purge`)
- POST handler requires `{ confirmName }` body matching exact org name (case-sensitive)
- Returns `{ success: true, deletedCounts }` on success
- Platform-admin-only with audit logging (`tenant.purge` action with deletedCounts in details)

### Tenant Detail Page Updates
- "Export Data" button (blue) triggers JSON download via `window.open`
- "Purge Data" button (outlined red) opens type-name-to-confirm dialog matching existing delete UX pattern
- Success toast shows deleted counts (people, projects, allocations)
- Button order: Suspend | Reactivate | Export Data | Purge Data | Delete

## Task Completion

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Tenant data export and purge service + API routes | dd4e0ff | platform-tenant-data.service.ts, export/route.ts, purge/route.ts |
| 2 | Add Export and Purge buttons to tenant detail page | 633f4aa | tenants/[orgId]/page.tsx |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all functionality is fully wired.
