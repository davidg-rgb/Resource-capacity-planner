# Quality Audit: ARCHITECTURE.md

**Auditor:** Senior Architecture Reviewer (Quality Gate)
**Date:** 2026-03-25
**Document:** `D:\Kod Projekt\Resurs & Projektplanering\ARCHITECTURE.md` (4,157 lines)
**Skill Spec:** `C:\Users\david\.claude\skills\architect\SKILL.md`

---

## 1. Cross-Reference Integrity

### 1.1 Called by / Calls Bidirectional Checks (20 sampled pairs)

| #   | Function A says "Calls"                                                              | Function B says "Called by"                                                                                                               | Match?                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `upsertAllocation` calls `personService.getById`                                     | `getById` lists `upsertAllocation (validation)`                                                                                           | YES                                                                                                                                         |
| 2   | `upsertAllocation` calls `projectService.getById`                                    | `projectService.getById` lists `upsertAllocation (validation)`                                                                            | YES                                                                                                                                         |
| 3   | `upsertAllocation` calls `allocationQueries.upsert`                                  | N/A (query layer, not defined as function)                                                                                                | OK                                                                                                                                          |
| 4   | `batchUpsertAllocations` called by `importExecutor.execute`                          | `execute` calls `allocationService.batchUpsertAllocations`                                                                                | YES                                                                                                                                         |
| 5   | `importService.parseUploadedFile` calls `importParser.parse`                         | `parse` lists `importService.parseUploadedFile` in Called by                                                                              | YES                                                                                                                                         |
| 6   | `importService.parseUploadedFile` calls `importMapper.suggestMappings`               | `suggestMappings` lists `importService.parseUploadedFile` in Called by                                                                    | YES                                                                                                                                         |
| 7   | `importService.validateMappedData` calls `importValidator.validate`                  | `validate` lists `importService.validateMappedData` in Called by                                                                          | YES                                                                                                                                         |
| 8   | `importService.validateMappedData` calls `personService.listPeople`                  | `listPeople` lists `AdminPeoplePage` and route handlers but does NOT list `importService.validateMappedData`                              | **BROKEN**                                                                                                                                  |
| 9   | `importService.validateMappedData` calls `projectService.listProjects`               | `listProjects` lists route handler, ProjectCell, FlatTableFilters, AdminProjectsPage but does NOT list `importService.validateMappedData` | **BROKEN**                                                                                                                                  |
| 10  | `importService.executeImport` calls `importExecutor.execute`                         | `importExecutor.execute` lists `importService.executeImport` in Called by                                                                 | YES                                                                                                                                         |
| 11  | `importExecutor.execute` calls `personService.createPerson`                          | `createPerson` lists `importExecutor.execute` in Called by                                                                                | YES                                                                                                                                         |
| 12  | `importExecutor.execute` calls `projectService.createProject`                        | `createProject` lists `importExecutor.execute` in Called by                                                                               | YES                                                                                                                                         |
| 13  | `deleteProgram` calls `projectQueries.clearProgram`                                  | N/A (query layer)                                                                                                                         | OK                                                                                                                                          |
| 14  | `importParser.detectFormat` calls `dateUtils.isMonthHeader`                          | `isMonthHeader` lists `importParser.detectFormat` in Called by                                                                            | YES                                                                                                                                         |
| 15  | `importParser.unpivot` calls `dateUtils.parseSwedishMonth`                           | `parseSwedishMonth` lists `importParser.unpivot` in Called by                                                                             | YES                                                                                                                                         |
| 16  | `exportService.generateExcel` calls `allocationService.getAllocationsFlat`           | `getAllocationsFlat` lists route handler and FlatTablePage but does NOT list `exportService.generateExcel`                                | **BROKEN**                                                                                                                                  |
| 17  | `dashboardService.getKpis` calls `allocationQueries.dashboardAggregates`             | N/A (query layer)                                                                                                                         | OK                                                                                                                                          |
| 18  | `platformAdminService.exportTenantData` calls `personService.listPeople`             | `listPeople` does NOT list `exportTenantData` in Called by                                                                                | **BROKEN**                                                                                                                                  |
| 19  | `platformAdminService.exportTenantData` calls `allocationService.getAllocationsFlat` | `getAllocationsFlat` does NOT list `exportTenantData` in Called by                                                                        | **BROKEN**                                                                                                                                  |
| 20  | `organizationService.createOrganization` calls `seedDefaults`                        | `seedDefaults` lists `createOrganization` in Called by                                                                                    | YES                                                                                                                                         |
| 21  | `middleware` calls `resolveImpersonation`                                            | `resolveImpersonation` lists `middleware.ts` in Called by                                                                                 | YES                                                                                                                                         |
| 22  | `middleware` calls `verifyPlatformAdminToken`                                        | `verifyPlatformAdminToken` is listed as called by `requirePlatformAdmin`, NOT middleware directly                                         | **MINOR** (middleware calls it "for /api/platform/\* routes" in description but the function signature routes through requirePlatformAdmin) |

**Summary:** 5 broken cross-references found out of 22 checked. All are "Called by" entries missing from the callee side. The pattern is consistent: cross-module calls from `importService` and `platformAdminService` to other services are not reflected back in the target services' "Called by" fields.

### 1.2 API Endpoint to Handler Function Mapping

All 35+ API endpoints in Section 8 have `Maps to:` fields that reference real functions from Section 6. Checked all of them:

| Issue                                                         | Details                                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PATCH /api/platform/organizations/[orgId]` (line ~2574)      | Maps to `platformAdminQueries.updateOrg` -- this is a query function, not a service function. No `updateOrganization` service function exists in Section 6.18. There is no abstraction layer with audit logging for this mutation. |
| `PATCH /api/platform/announcements/[id]` (line ~2741)         | Maps to `platformAdminQueries.updateAnnouncement` -- same issue. No service function defined for updating announcements.                                                                                                           |
| `DELETE /api/platform/announcements/[id]` (line ~2752)        | Maps to `platformAdminQueries.deleteAnnouncement` -- same issue. No service function defined.                                                                                                                                      |
| `GET /api/platform/organizations/[orgId]/users` (line ~2677)  | Maps to `Clerk organizationMemberships.list` -- no service wrapper function. This bypasses audit logging which every other platform admin action has.                                                                              |
| `GET /api/departments` / `POST /api/departments` (line ~2416) | No `Maps to:` field. No department/discipline service functions defined in Section 6.                                                                                                                                              |
| `GET /api/disciplines` / `POST /api/disciplines` (line ~2426) | Same issue -- no service layer defined for these CRUD operations.                                                                                                                                                                  |

### 1.3 Data Flow Steps to Function References

All 7 data flows (Section 9) reference specific functions. Verified:

- **Flow 1 (Edit Cell):** All steps map to real functions. `allocationSchema.validate` is referenced but no explicit `allocationSchema.validate` function is defined -- it is implied by the Zod schema file. Acceptable.
- **Flow 2 (Bulk Import):** All steps map correctly.
- **Flow 3 (Team Overview):** References `allocationQueries.aggregateByPerson` with actual SQL -- good traceability.
- **Flow 4 (Export):** References `allocationService.getAllocationsFlat` and xlsx utilities -- correct.
- **Flow 5 (Person Nav):** References `personService.getAdjacentPerson` and `personQueries.findAdjacent` -- correct.
- **Flow 6 (Impersonation):** All steps reference real functions from Section 6.18/6.19/6.20.
- **Flow 7 (Resolve Tenant Issue):** References real functions.

No broken references in data flows.

---

## 2. Orphan Detection

### 2.1 Functions That Nothing Calls (and Are Not Entry Points)

| Function                              | Module         | Issue                                                                                                                                             |
| ------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateCsv` (line ~1118)            | Export Service | Called by `GET /api/allocations/export?format=csv` per spec, but no data flow references it. This is an entry point (API-invoked), so acceptable. |
| `generateImportTemplate` (line ~1131) | Export Service | Called by `GET /api/allocations/export?template=true`, entry point. Acceptable.                                                                   |

**No true orphan functions found.** All defined functions are either API entry points or called by other functions. The architecture is clean in this regard.

### 2.2 Data Models That No Function Reads or Writes

All 13 entities have functions that read/write them:

| Entity               | Read by                                               | Written by                                                                           |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Organization         | orgService, platformAdminService, tenant.ts           | orgService.createOrganization, billingService.handleWebhook, platformAdminService.\* |
| Person               | personService.\*, importValidator                     | personService.createPerson, importExecutor                                           |
| Project              | projectService.\*, importValidator                    | projectService.createProject, importExecutor                                         |
| Program              | programService.\*                                     | programService.createProgram                                                         |
| Department           | seedDefaults, personService (via joins)               | seedDefaults                                                                         |
| Discipline           | seedDefaults, personService (via joins)               | seedDefaults                                                                         |
| Allocation           | allocationService.\*, exportService, dashboardService | allocationService.upsertAllocation, batchUpsert                                      |
| ImportSession        | importService.\*                                      | importService.parseUploadedFile                                                      |
| PlatformAdmin        | platformAdminAuth.\*                                  | No creation function defined                                                         |
| PlatformAuditLog     | platformAdminService.getPlatformAuditLog              | platformAdminQueries.insertAuditLog (via many functions)                             |
| ImpersonationSession | resolveImpersonation                                  | impersonateUser, endImpersonation                                                    |
| FeatureFlag          | getFeatureFlags                                       | setFeatureFlags                                                                      |
| SystemAnnouncement   | listAnnouncements                                     | createAnnouncement                                                                   |

**Issue found:** `PlatformAdmin` entity has no creation function. There is `authenticatePlatformAdmin` (login) and `verifyPlatformAdminToken` (verify), but no `createPlatformAdmin` function. How does the first platform admin get created? This is a gap -- likely needs a seed script or CLI command, but it is not documented.

### 2.3 API Endpoints with No Corresponding Service Function

| Endpoint                                    | Issue                                         |
| ------------------------------------------- | --------------------------------------------- |
| `POST /api/departments`                     | No department service defined in Section 6    |
| `POST /api/disciplines`                     | No discipline service defined in Section 6    |
| `PATCH /api/platform/organizations/[orgId]` | No service function -- maps directly to query |
| `PATCH /api/platform/announcements/[id]`    | No service function                           |
| `DELETE /api/platform/announcements/[id]`   | No service function                           |

---

## 3. Checklist Coverage

### 3.1 Function-to-Checklist Mapping (20 sampled from Section 6)

| Function                    | Section 6 | Checklist in Section 15? |
| --------------------------- | --------- | ------------------------ |
| `getPersonAllocations`      | 6.1       | YES -- 5 items           |
| `batchUpsertAllocations`    | 6.1       | YES -- 4 items           |
| `getAllocationsFlat`        | 6.1       | YES -- 4 items           |
| `deleteAllocation`          | 6.1       | YES -- 2 items           |
| `listPeople`                | 6.2       | YES -- 6 items           |
| `getAdjacentPerson`         | 6.2       | YES -- 2 items           |
| `parseUploadedFile`         | 6.5       | YES -- 7 items           |
| `suggestMappings`           | 6.7       | YES -- 3 items           |
| `findClosestMatch`          | 6.8       | YES -- 2 items           |
| `generateExcel`             | 6.10      | YES -- 4 items           |
| `generateImportTemplate`    | 6.10      | YES -- 2 items           |
| `getKpis`                   | 6.11      | YES -- 2 items           |
| `getCapacityAlerts`         | 6.11      | YES -- 3 items           |
| `calculateStatus`           | 6.14      | YES -- 5 items           |
| `isMonthHeader`             | 6.15      | YES -- 1 item            |
| `impersonateUser`           | 6.18      | YES -- 4 items           |
| `suspendOrganization`       | 6.18      | YES -- 4 items           |
| `authenticatePlatformAdmin` | 6.19      | YES -- 5 items           |
| `resolveImpersonation`      | 6.20      | YES -- 4 items           |
| `logImpersonatedAction`     | 6.20      | YES -- 3 items           |

**Result: 20/20 functions have corresponding checklist items.** Excellent coverage.

### 3.2 API Endpoint-to-Checklist Mapping (10 sampled from Section 8)

| Endpoint                                               | Checklist in Section 15?                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `GET /api/allocations`                                 | YES -- 6 items                                                   |
| `POST /api/allocations`                                | YES -- 3 items                                                   |
| `POST /api/allocations/batch`                          | YES -- 2 items                                                   |
| `GET /api/allocations/export`                          | YES -- 3 items                                                   |
| `POST /api/import/upload`                              | YES (under "API: Import")                                        |
| `POST /api/import/execute`                             | YES                                                              |
| `GET /api/dashboard`                                   | YES -- 2 items                                                   |
| `POST /api/platform/auth`                              | YES -- 2 items                                                   |
| `POST /api/platform/organizations/[orgId]/impersonate` | YES                                                              |
| `GET /api/departments`                                 | **NO** -- no checklist items for department/discipline endpoints |

**Result: 9/10 have checklist items.** Department/discipline reference data endpoints are missing from the checklist entirely.

### 3.3 Data Model-to-Checklist Mapping (5 sampled from Section 7)

| Entity        | Checklist in Section 15? |
| ------------- | ------------------------ |
| Organization  | YES -- 2 items           |
| Person        | YES -- 3 items           |
| Allocation    | YES -- 3 items           |
| PlatformAdmin | YES -- 2 items           |
| FeatureFlag   | YES -- 2 items           |

**Result: 5/5 have checklist items.**

---

## 4. Section Completeness

### 4.1 All 15 Sections Present and Populated?

| Section                          | Present | Populated | Notes                                                                       |
| -------------------------------- | ------- | --------- | --------------------------------------------------------------------------- |
| 1. Executive Summary             | YES     | YES       | Clear, includes scale targets                                               |
| 2. Requirements Analysis         | YES     | YES       | 38 features, 6 journeys, constraints, integrations, 12 resolved ambiguities |
| 3. Architecture Decision Records | YES     | YES       | 7 ADRs with alternatives and rationale                                      |
| 4. Tech Stack                    | YES     | YES       | Full table with versions and licenses                                       |
| 5. Project Structure             | YES     | YES       | Complete ASCII tree ~260 lines                                              |
| 6. Module & Function Definitions | YES     | YES       | 20 modules, ~55 functions with full signatures                              |
| 7. Data Models                   | YES     | YES       | 13 entities with fields, relationships, indexes, queries                    |
| 8. Interface Contracts           | YES     | YES       | 35+ endpoints with full request/response shapes                             |
| 9. Data Flow Diagrams            | YES     | YES       | 7 flows including error branches                                            |
| 10. Dependency Map               | YES     | YES       | Both internal and external                                                  |
| 11. Cross-Cutting Concerns       | YES     | YES       | Error taxonomy, env config, naming, platform auth                           |
| 12. Extensibility Guide          | YES     | YES       | 7 concrete extension scenarios                                              |
| 13. Risk Register                | YES     | YES       | 11 risks with mitigations                                                   |
| 14. Implementation Roadmap       | YES     | YES       | 7 phases with definitions of done                                           |
| 15. Build Verification Checklist | YES     | YES       | ~230 checklist items                                                        |

**Result: All 15 sections present and substantively populated.**

### 4.2 Section 11 (Cross-Cutting) Sub-sections

- **Error Taxonomy (11.1):** Present with full hierarchy, HTTP codes, machine-readable codes, examples, and response format. Includes `PayloadTooLargeError (413)` which goes beyond the standard template. Excellent.
- **Environment & Configuration (11.2):** 21 variables listed with Required/Env/Description/Example. Includes platform admin-specific variables (`PLATFORM_ADMIN_SECRET`, `IMPERSONATION_MAX_DURATION_MINUTES`). Complete.
- **Naming Conventions (11.3):** Covers files, functions, database, API routes, types, CSS, Zod schemas. Very thorough.
- **Bonus: 11.4 Platform Admin Authentication:** An extra sub-section documenting the separate auth system. Not required by the template but valuable.

### 4.3 Section 12 (Extensibility) -- Concrete or Generic?

Seven concrete scenarios are documented with step-by-step instructions:

1. Adding a new feature module (Milestones example)
2. Adding a new API endpoint to existing module
3. Adding a new import field
4. Adding a new discipline/department (no code change)
5. Adding a new platform admin capability (with pattern)
6. Adding a new feature flag
7. Adding dark mode

**Verdict: Concrete and actionable.** Each scenario names specific files to create/modify. The "no existing files need modification except schema.ts and side-nav.tsx" statement on line 3383 is a strong design principle made explicit.

### 4.4 Section 13 (Risk Register) -- Actionable Mitigations?

| Risk                         | Mitigation Actionable?                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| R1: AG Grid drag-to-fill     | YES -- "mousedown on corner handle -> mousemove -> mouseup, ~2-3 days"                  |
| R2: Excel clipboard          | YES -- "test with Excel 2019+, Google Sheets, LibreOffice. Handle \\t and , delimiters" |
| R3: Neon cold starts         | YES -- "connection pooling, health check ping, staleTime 5 min"                         |
| R4: Import timeout           | YES -- "chunks of 200 rows validate, 100 rows insert, <30s total"                       |
| R5: Concurrent editing       | YES -- "optimistic locking via updated_at, toast + refetch"                             |
| R6: Swedish encoding         | YES -- "detect UTF-8/ISO-8859-1/Windows-1252, test with real files"                     |
| R7: GDPR                     | YES -- "data export/deletion endpoints, ToS, EU region"                                 |
| R8: Clerk org model          | PARTIAL -- "sync to internal table" but no specific fallback plan                       |
| R9: Grid performance         | YES -- "AG Grid virtualizes, TanStack Virtual for 500 rows"                             |
| R10: Stripe billing          | YES -- "flat-tier pricing, resource count in metadata"                                  |
| R11: Platform admin security | YES -- 9 specific mitigations listed, very thorough                                     |

**Verdict: 10/11 fully actionable, 1 partially.**

---

## 5. Architectural Consistency

### 5.1 "Flat Table is Truth" Principle

The Executive Summary (line 33) states: _"The system's central data structure is a flat allocation table -- one row per person/project/month -- from which all views derive."_

Verification across the document:

- **Section 6.1 (Allocation Service):** All view functions (`getPersonAllocations`, `getTeamAllocations`, `getProjectAllocations`, `getAllocationsFlat`) derive from the flat allocation table. CONSISTENT.
- **Section 6.11 (Dashboard Service):** KPIs, heat maps, alerts, and discipline breakdown all aggregate from `allocationQueries.*`. CONSISTENT.
- **Section 7 (Allocation entity):** Defined as the central table with 8 named query patterns. CONSISTENT.
- **Section 9 (Data Flows):** All flows read/write through the allocation table. CONSISTENT.
- **Import flow:** Writes directly to the allocation table via `batchUpsertAllocations`. CONSISTENT.
- **Export flow:** Reads from `getAllocationsFlat`. CONSISTENT.

**Verdict: Principle is consistently applied across all modules.**

### 5.2 Person != User Distinction

The architecture maintains a clear conceptual separation:

- **Person** = a managed resource (e.g., an engineer whose capacity is being planned). Stored in the `people` table. Has `first_name`, `last_name`, `discipline_id`, `department_id`, `target_hours_per_month`. Has NO auth credentials.
- **User** = someone who logs into the application (via Clerk). Has roles (owner, admin, planner, viewer). Identified by Clerk user ID.

Verification:

- Section 2.2 roles table (line 90): Roles are assigned to Users, not Persons.
- Section 6.2 (Person Service): CRUD operations manage Person entities with no auth fields.
- Section 6.16 (Tenant Context): `getTenantId` and `requireRole` operate on the authenticated User (Clerk session), not Persons.
- Section 7 (Person entity): No email, no password, no Clerk reference. Clean separation.
- Import flow: Creates Persons (resources), not Users.

**One minor inconsistency:** `PlatformAdmin.resetUserPassword` (line 1624) parameter is `userId: String` (Clerk user ID). This is fine -- it operates on Users (Clerk), not Persons. But the function is nested under `organizations/[orgId]/users` endpoint, and the naming could confuse "users" with "people" for someone unfamiliar with the distinction. The distinction IS maintained in the data model, however.

**Verdict: Distinction is consistently maintained throughout.**

### 5.3 Tenant Isolation (org_id) Enforcement

Every function that touches tenant data takes `orgId: String` as its first parameter. Verified systematically:

- **Allocation Service:** All 6 functions take `orgId` as first param. YES.
- **Person Service:** All 6 functions take `orgId`. YES.
- **Project Service:** All 5 functions take `orgId`. YES.
- **Program Service:** All 4 functions take `orgId`. YES.
- **Import Service:** All 3 functions take `orgId`. YES.
- **Export Service:** `generateExcel` and `generateCsv` take `orgId`. YES. `generateImportTemplate` does NOT -- but this is correct since templates are org-agnostic.
- **Dashboard Service:** All 4 functions take `orgId`. YES.
- **Organization Service:** `createOrganization` takes `userId` (creates the org), `seedDefaults` takes `orgId`. YES.

**Data model verification:**

- `people` table: has `organization_id` FK. YES.
- `projects` table: has `organization_id` FK. YES.
- `programs` table: has `organization_id` FK. YES.
- `departments` table: has `organization_id` FK. YES.
- `disciplines` table: has `organization_id` FK. YES.
- `allocations` table: has `organization_id` FK. YES.
- `import_sessions` table: has `organization_id` FK. YES.

**Allocation unique constraint:** `UNIQUE(organization_id, person_id, project_id, month)` -- includes `organization_id`. YES.

**SQL in data flows:** The SQL in Flow 3 (line 2938) includes `WHERE a.organization_id = $orgId`. YES.

**Checklist verification:** Line 3957: _"All tables have organization_id for tenant isolation"_. YES.

**Verdict: Tenant isolation is rigorously enforced everywhere.**

### 5.4 Platform Admin Auth Separation from Tenant Auth

- **Section 2.2 (line 97):** Explicitly states "NOT a tenant role -- separate auth system."
- **Section 6.19 (Platform Admin Auth):** Own login flow, own JWT, own secret (`PLATFORM_ADMIN_SECRET`).
- **Section 7 (PlatformAdmin entity, line 2029):** "This table is completely separate from Clerk users."
- **Section 11.4:** Dedicated sub-section explaining the separation with security rules.
- **Section 15 (line 4117-4118):** Two explicit checklist items verifying cross-rejection.
- **Middleware (6.17):** Routes `/api/platform/*` through platform admin auth, not Clerk.

**Verdict: Separation is consistently documented and enforced at every layer.**

---

## 6. Improvement Opportunities

Ranked by impact (highest first):

### P1 (High Impact) -- Fix Now

**6.1. Five broken cross-references in "Called by" fields.**
`personService.listPeople`, `projectService.listProjects`, and `allocationService.getAllocationsFlat` are missing callers from `importService.validateMappedData`, `exportService.generateExcel`, and `platformAdminService.exportTenantData`. Update the "Called by" fields of these three functions to include their additional callers.

**6.2. Missing service functions for 5 API endpoints.**
The following endpoints bypass the service layer and map directly to query functions or Clerk SDK calls, which means they skip audit logging and validation patterns established for every other platform admin action:

- `PATCH /api/platform/organizations/[orgId]` -- needs `updateOrganizationMetadata` service function
- `PATCH /api/platform/announcements/[id]` -- needs `updateAnnouncement` service function
- `DELETE /api/platform/announcements/[id]` -- needs `deleteAnnouncement` service function
- `GET /api/platform/organizations/[orgId]/users` -- needs a service wrapper that logs access to the audit trail
  All platform admin mutations should follow the established pattern: validate -> act -> log to audit trail.

**6.3. No department/discipline service layer or checklist items.**
Reference data CRUD endpoints (`GET/POST /api/departments`, `GET/POST /api/disciplines`) have no service functions defined in Section 6, no functions defined anywhere, and no checklist items in Section 15. These are Phase 1 features (F-010). Add `departmentService` and `disciplineService` modules to Section 6, or document them as thin CRUD wrappers with explicit function signatures.

### P2 (Medium Impact) -- Fix Before Build Starts

**6.4. No `createPlatformAdmin` function or seeding procedure.**
The `PlatformAdmin` entity exists (Section 7), `authenticatePlatformAdmin` verifies credentials against it, but no function creates platform admin records. Document a seed script, CLI command, or migration that creates the initial platform admin account. This is a bootstrap problem that will block Phase 1E testing.

**6.5. Duplicate Organization fields defined twice.**
Lines 1773-1789 define the Organization entity with `suspended_at`, `suspended_reason`, `trial_ends_at`, `credit_balance_cents`, `platform_notes`. Then lines 2153-2163 define "Updates to Entity: Organization" repeating the exact same 5 fields. This is confusing -- the reader doesn't know if these are additions or replacements. Consolidate into one entity definition.

**6.6. Missing `PATCH /api/allocations/[id]` endpoint.**
`DELETE /api/allocations/[id]` exists, but there is no `PATCH /api/allocations/[id]` for updating a single allocation by ID. The system uses `POST /api/allocations` (upsert by person+project+month) instead, which is fine functionally, but the route file `src/api/allocations/[id]/route.ts` (line 404) implies a PATCH handler exists. Clarify whether this route file handles PATCH or only DELETE.

**6.7. `PATCH /api/departments` and `DELETE /api/departments` not separated.**
Line 422 shows `route.ts` handling "GET (list), POST, PATCH, DELETE" in a single file. Section 8 only defines `GET` and `POST` for departments. The PATCH and DELETE operations are not specified as API contracts. Either add them to Section 8 or remove from the project structure.

### P3 (Low Impact) -- Nice to Have

**6.8. No explicit `unlockAccount` service function.**
`POST /api/platform/organizations/[orgId]/users` (line 2690) accepts `action: "unlock_account"` but the `Maps to:` field only references `resetUserPassword | forceLogoutUser`. No `unlockAccount` function is defined in Section 6.18.

**6.9. Query layer functions not formally defined.**
Functions like `allocationQueries.findByPersonAndRange`, `personQueries.findAll`, `platformAdminQueries.insertAuditLog`, etc. are referenced extensively in "Calls" fields but never defined with signatures. While treating the query layer as implementation detail is defensible, it creates a gap where ~30+ referenced functions are implicit. Consider adding a brief note that query layer functions are 1:1 wrappers around Drizzle queries and intentionally not specified.

**6.10. No rate limiting defined for API endpoints.**
The SKILL.md template includes `Rate limit: if applicable` in the endpoint contract format (line 165). No endpoint in Section 8 specifies rate limits. At minimum, `POST /api/platform/auth` (login) should have rate limiting to prevent brute-force attacks on platform admin credentials.

**6.11. No mention of bcrypt library in external dependencies.**
Section 10.2 lists all npm packages, but `bcrypt` (or `bcryptjs`) is not listed despite being required for platform admin password hashing (referenced in `authenticatePlatformAdmin` and the PlatformAdmin entity).

**6.12. No `jsonwebtoken` library in external dependencies.**
`jwt.sign` and `jwt.verify` are called by `authenticatePlatformAdmin` and `verifyPlatformAdminToken`, but no JWT library (e.g., `jsonwebtoken` or `jose`) is listed in Section 10.2.

---

## Summary

**Overall Quality Score: 8.5 / 10**

This is a high-quality architecture document. At 4,157 lines it is thorough and appropriately scaled for the system complexity (multi-tenant SaaS with platform admin, impersonation, import/export, spreadsheet grid). The core architectural principles (flat table as truth, Person != User, tenant isolation via org_id, platform admin auth separation) are consistently applied across all 15 sections. The build verification checklist is comprehensive with ~230 items that trace back to specific definitions. The extensibility guide is concrete rather than generic. The risk register has actionable mitigations.

### Top 3 Issues to Fix

1. **Five broken cross-references** (Section 1.1): `personService.listPeople`, `projectService.listProjects`, and `allocationService.getAllocationsFlat` are missing callers in their "Called by" fields. This undermines the dependency web that makes the blueprint verifiable. Fix: add the missing callers.

2. **Missing service functions for 5 API endpoints** (Section 6.2): Three platform admin mutation endpoints and two reference data endpoint groups bypass the service layer entirely. This breaks the audit trail pattern and leaves gaps in the function registry. Fix: add the missing service functions with full signatures.

3. **No platform admin bootstrap procedure** (Section 6.4): The system cannot start without at least one platform admin record, but no creation mechanism is documented. Fix: add a `createPlatformAdmin` function or document a seed/migration procedure in the implementation roadmap.
