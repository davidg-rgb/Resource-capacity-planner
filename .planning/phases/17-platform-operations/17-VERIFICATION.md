---
phase: 17-platform-operations
verified: 2026-03-28T15:00:00Z
status: gaps_found
score: 6/8 must-haves verified
re_verification: false
gaps:
  - truth: "Platform admin can view active DB connection count on the platform dashboard"
    status: failed
    reason: "SystemHealthMetrics only has a boolean dbConnected field. A numeric active connection count is not measured or returned by getSystemHealth, and is not displayed on the dashboard."
    artifacts:
      - path: "src/features/platform/platform-health.service.ts"
        issue: "Interface and function contain no active connection pool count field (only dbConnected: boolean)"
      - path: "src/app/(platform)/page.tsx"
        issue: "No active connection count card rendered in System Health section"
    missing:
      - "Add connectionCount or activeConnections numeric field to SystemHealthMetrics interface"
      - "Query connection pool stats (e.g. via pg_stat_activity or pool.totalCount) in getSystemHealth"
      - "Render the active connection count as a metric card on the dashboard"

  - truth: "Platform admin can view error rate proxy (failed health checks) on the platform dashboard"
    status: failed
    reason: "No error rate tracking exists anywhere. The service does not accumulate failed health check counts, and the dashboard renders no error rate metric."
    artifacts:
      - path: "src/features/platform/platform-health.service.ts"
        issue: "No errorRate, failedChecks, or equivalent field in SystemHealthMetrics"
      - path: "src/app/(platform)/page.tsx"
        issue: "No error rate card in the System Health section"
    missing:
      - "Define an error rate proxy metric (e.g. consecutive failed DB pings tracked in module-level state, or a rolling counter)"
      - "Add errorRate or recentFailures field to SystemHealthMetrics"
      - "Render the error rate metric as a card on the platform dashboard"
---

# Phase 17: Platform Operations Verification Report

**Phase Goal:** Platform admin has visibility into system health and can perform tenant data operations for support and GDPR compliance
**Verified:** 2026-03-28T15:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Platform admin can view DB latency (ms) on the platform dashboard | VERIFIED | `dbLatencyMs` in `SystemHealthMetrics`; rendered in DB Latency card at page.tsx line 202 with color coding |
| 2 | Platform admin can view active DB connection count on the platform dashboard | FAILED | Only `dbConnected: boolean` exists — no numeric connection count in service or page |
| 3 | Platform admin can view error rate proxy (failed health checks) on the platform dashboard | FAILED | No error rate field in `SystemHealthMetrics`; not rendered anywhere on dashboard |
| 4 | Platform admin can view app version and memory usage on the platform dashboard | VERIFIED | `version` and `memoryUsageMb` in service; Version/Uptime line at page.tsx line 229; Memory (RSS) and Heap Used cards at lines 216-225 |
| 5 | Platform admin can click Export Data on tenant detail page and download a JSON file containing all tenant data | VERIFIED | `handleExport` at page.tsx line 180 calls `window.open(.../export, '_blank')`; export route returns `Content-Disposition: attachment` header |
| 6 | Platform admin can click Purge Data on tenant detail page, type the org name to confirm, and all tenant data is deleted | VERIFIED | `handlePurge` at page.tsx line 185 POSTs `{confirmName}` to purge route; purge route validates exact name match |
| 7 | After purge, the organization record itself remains but all child data is gone | VERIFIED | `purgeTenantData` deletes 8 child tables in FK-safe order; does not delete from `organizations` table |
| 8 | Export JSON includes departments, disciplines, programs, people, projects, allocations, and import sessions | VERIFIED | `exportTenantData` queries all 7 tables via `Promise.all`; all 7 arrays present in `TenantExportData` return value |

**Score:** 6/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/platform/platform-health.service.ts` | Extended health check service exporting `getSystemHealth`, `SystemHealthMetrics` | VERIFIED | 47 lines; real DB latency via `performance.now()`, memory, version, uptime |
| `src/app/api/platform/health/route.ts` | Platform-admin-only health API | VERIFIED | Guards with `requirePlatformAdmin`; calls `getSystemHealth`; `force-dynamic` set |
| `src/app/(platform)/page.tsx` | Platform dashboard with System Health section | PARTIAL | System Health section exists and fetches health data; missing connection count and error rate cards |
| `src/features/platform/platform-tenant-data.service.ts` | Tenant data export and purge service | VERIFIED | 253 lines; full parallel export and FK-safe purge with deletion counts |
| `src/app/api/platform/tenants/[orgId]/export/route.ts` | GET endpoint returning tenant data as JSON download | VERIFIED | `Content-Disposition` header set; audit logged; platform-admin-only |
| `src/app/api/platform/tenants/[orgId]/purge/route.ts` | POST endpoint with name confirmation purge | VERIFIED | Exact name match validation; `purgeTenantData` called; audit logged with `deletedCounts` |
| `src/app/(platform)/tenants/[orgId]/page.tsx` | Tenant detail page with Export and Purge buttons | VERIFIED | Both buttons present; purge dialog with GDPR language and type-name-to-confirm |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/(platform)/page.tsx` | `/api/platform/health` | `fetch` in `useEffect` | WIRED | Line 103: `fetch('/api/platform/health')` with `setHealth(await res.json())` |
| `src/app/api/platform/health/route.ts` | `platform-health.service.ts` | `import { getSystemHealth }` | WIRED | Line 3: `import { getSystemHealth } from '@/features/platform/platform-health.service'` |
| `src/app/(platform)/tenants/[orgId]/page.tsx` | `/api/platform/tenants/{orgId}/export` | `window.open` | WIRED | Line 182: `window.open(\`/api/platform/tenants/${orgId}/export\`, '_blank')` |
| `src/app/(platform)/tenants/[orgId]/page.tsx` | `/api/platform/tenants/{orgId}/purge` | `fetch POST with confirmName body` | WIRED | Line 189: `fetch(\`/api/platform/tenants/${orgId}/purge\`, { method: 'POST', body: JSON.stringify({ confirmName: purgeConfirm }) })` |
| `src/app/api/platform/tenants/[orgId]/purge/route.ts` | `platform-tenant-data.service.ts` | `import { purgeTenantData }` | WIRED | Line 3: `import { purgeTenantData } from '@/features/platform/platform-tenant-data.service'` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `src/app/(platform)/page.tsx` — System Health section | `health` (SystemHealthMetrics) | `GET /api/platform/health` → `getSystemHealth()` → `db.execute(sql\`SELECT 1\`)` + `process.memoryUsage()` | Yes — DB latency is measured live; memory is from process | FLOWING |
| `src/app/(platform)/tenants/[orgId]/page.tsx` — Export | Download response | `GET /api/platform/tenants/[orgId]/export` → `exportTenantData()` → 7 parallel Drizzle queries | Yes — real DB queries for all 7 tables | FLOWING |
| `src/app/(platform)/tenants/[orgId]/page.tsx` — Purge | `deletedCounts` in toast | `POST /api/platform/tenants/[orgId]/purge` → `purgeTenantData()` → 8 sequential Drizzle deletes with `.returning()` | Yes — real FK-safe deletes with row counts | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — requires live Next.js server and authenticated platform admin session. These API routes use `requirePlatformAdmin()` which cannot be tested without server startup and auth context.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PLOP-01 | 17-01-PLAN.md | Platform admin can view system health metrics (DB latency, error rates, active connections) | PARTIAL | DB latency implemented and displayed; error rates and active connection count absent from service and dashboard |
| PLOP-05 | 17-02-PLAN.md | Platform admin can bulk export all data for a tenant as JSON | SATISFIED | Export route returns JSON with `Content-Disposition: attachment`; all 7 tenant tables queried |
| PLOP-06 | 17-02-PLAN.md | Platform admin can purge all data for a tenant (GDPR deletion) | SATISFIED | Purge route validates org name, deletes 8 tables in FK-safe order, preserves org record, audit-logs with counts |

**REQUIREMENTS.md mapping check:** PLOP-01, PLOP-05, PLOP-06 are the only requirements assigned to Phase 17 in the phase tracker. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODO/FIXME/placeholder comments, no empty return stubs, no hardcoded empty arrays in any of the 6 implementation files. All handlers have substantive logic.

---

### Human Verification Required

#### 1. DB Latency Color Coding

**Test:** Log in as platform admin, visit the platform dashboard. Observe the DB Latency metric card value color.
**Expected:** Value is green if <100ms, amber if 100-500ms, red if >500ms (N/A in slate if DB is unreachable).
**Why human:** Tailwind conditional class rendering cannot be verified by static grep.

#### 2. Export Download Behavior

**Test:** On the tenant detail page for any org, click "Export Data".
**Expected:** Browser downloads a `.json` file named `tenant-export-{orgId}.json` containing all 7 data arrays.
**Why human:** Requires live browser session with platform admin auth; `window.open` behavior and file download cannot be verified statically.

#### 3. Purge Dialog Safeguard

**Test:** Click "Purge Data" on a tenant detail page. Observe that the "Confirm Purge" button is disabled until the exact org name is typed. Complete the purge.
**Expected:** Dialog shows GDPR warning text; button is disabled until input exactly matches org name; on success, a toast shows deleted counts and the page refreshes.
**Why human:** Requires live browser interaction and auth context.

---

### Gaps Summary

Phase 17 delivers the core of its goal: export and purge operations (PLOP-05, PLOP-06) are fully and correctly implemented. The platform dashboard System Health section is partially implemented.

The two gaps both relate to PLOP-01. The requirement specifies three metrics: DB latency, error rates, and active connections. The implementation delivers DB latency and a boolean connection status, but omits:

1. **Active connection count** — no numeric pool connection count is measured or displayed. Only a boolean (`dbConnected`) exists.
2. **Error rate proxy** — no mechanism tracks or accumulates failed health checks. The PLAN's must-have described this as "failed health checks" but neither the service nor the dashboard implements it.

These gaps are in `platform-health.service.ts` (missing fields in `SystemHealthMetrics`) and `src/app/(platform)/page.tsx` (missing metric cards). Both are isolated to the health monitoring sub-feature and do not affect the export/purge functionality.

---

_Verified: 2026-03-28T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
