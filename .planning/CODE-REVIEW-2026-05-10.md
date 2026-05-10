# Codebase Review — 2026-05-10

**Type:** Holistic 4-agent parallel audit against project goals, architecture, and code quality.
**Scope:** Full `src/` tree (~587 TS/TSX files) + planning artifacts + CI config.
**Baseline:** v6.0 shipped 2026-04-27, archived. POLISH-03/04/05/06 prod migrations applied 2026-05-10. Between milestones.
**Reviewers:** 4 parallel agents covering (A) goals/architecture compliance, (B) bugs/errors/edge cases, (C) dead code & cruft, (D) quality/security/type-safety.

## Bottom line

The codebase is **healthy for a solo-dev SaaS at this size** — strict TS, parameterized SQL, AppError taxonomy on v5 routes, centralized ISO calendar, change_log enforced via 3 mechanisms. **Zero CRITICAL items in dead-code or quality scopes.**

However, **4 CRITICAL security/data findings** surfaced from the bug-hunt agent that should be triaged immediately, all in the proposal/server-action surface. The largest architectural drift class is the **dual write-path problem**: legacy services (people/projects/import-execute/scenarios) coexist with v5 services that audit properly, creating one-logged-one-silent pairs.

Findings are **deduplicated**, severity-classified, and grouped by remediation theme. Each finding lists evidence path:line and a concrete fix.

---

## Severity legend

- **CRITICAL** — Security boundary violation, data corruption, or prod-impacting. Triage this week.
- **HIGH** — Architectural drift that will compound, OR likely to fire under realistic load.
- **MEDIUM** — Latent bug, correctness issue, or debt that will surface within a sprint.
- **LOW** — Defensive improvement or stylistic consistency.
- **NIT** — Cosmetic / informational.

---

## CRITICAL — Triage immediately (4)

### CR-01 — Server actions accept `orgId` from client; cross-tenant data exfiltration

- **Where:** `src/features/actuals/actuals.cell.actions.ts:28-159` (`getCellData`, `getDailyCellBreakdown`, `getProjectPersonBreakdownAction`)
- **Source:** B-01
- **Evidence:** All three exported server actions take `orgId: string` as the first parameter. No `auth()` or `requireRole()` inside them. Caller (`use-actuals-cell.ts:65`) passes whatever `orgId` is in props.
- **Impact:** Server actions compile to HTTP POST endpoints reachable from any authenticated browser. A user in tenant A can call `getCellData('<tenantB-orgId>', '<tenantB-personId>', ...)` and read tenant B's planned/actual hours.
- **Fix:** Replace the `orgId` parameter with `await getTenantId()` inside each action. Add `auth()` check first. Never accept org/tenant identifiers as input from a server action.

### CR-02 — `approveProposal` silently rounds fractional hours to integer

- **Where:** `src/features/proposals/proposal.service.ts:551`
- **Source:** B-02
- **Evidence:** `proposedHours` is `numeric(5,2)` in schema; approve does `Math.round(Number(winner.proposedHours))` and writes to `allocations.hours` which is `integer`. A proposal for `7.50` hours approves as `8`. A proposal for `0.30` becomes `0`.
- **Impact:** Any non-integer proposed_hours value silently mutates on approval. Approve-queue numbers no longer match planning-grid.
- **Fix:** Tighten `proposedHours` schema to `z.number().int()` at create time (smaller surface), OR change `allocations.hours` to `numeric(5,2)` (larger but cleaner).

### CR-03 — `createProposal` doesn't verify `projectId` belongs to caller's org

- **Where:** `src/features/proposals/proposal.service.ts:67-126`
- **Source:** B-03
- **Evidence:** Service verifies `personId` is in `input.orgId` (lines 72-82) but inserts using `input.projectId` without verifying project ownership. Schema FK only enforces `projects.id` existence (global, unique across all tenants).
- **Impact:** A planner in tenant A can submit a proposal whose `projectId` is from tenant B (if UUID known/guessed). Row appears in tenant A's queue but joins to a foreign project, leaking project name via `listProposals` UI.
- **Fix:** Add a parallel tenant-scoped existence check on `projectId` inside the tx, mirroring lines 72-82.

### CR-04 — `createPerson` doesn't verify `disciplineId` / `departmentId` belong to caller's org

- **Where:** `src/features/people/person.service.ts:75-86`
- **Source:** B-04
- **Evidence:** Zod validates UUID format only. `withTenant(orgId).insertPerson(...)` injects `organizationId` on the person row but doesn't validate the FK targets.
- **Impact:** Admin in tenant A creates a person with `departmentId` pointing to tenant B's department. Joins (e.g., flat allocations export) cross the tenant boundary.
- **Fix:** Verify departmentId + disciplineId against org membership inside `createPerson` (one COUNT query, or two tenant-scoped SELECTs).

---

## HIGH — Architectural drift & likely-firing bugs (10)

### HI-01 — Dual write-path: scenario `promoteAllocations` bypasses change_log

- **Where:** `src/features/scenarios/scenario.service.ts:465-495` (`promoteAllocations` tx body); route `POST /api/scenarios/[id]/promote`
- **Sources:** A-01 + B-06 (related — also missing `organizationId` predicate on `scenarioAllocations` query at `scenario.service.ts:414-422`)
- **Drift from:** Universal `change_log` invariant + tenant-isolation defense-in-depth.
- **Evidence:** `tx.delete(schema.allocations)` + `tx.insert(schema.allocations).onConflictDoUpdate(...)` mutate the `allocations` domain table without `recordChange`. eslint guard scope (`src/features/admin/**`, `src/features/proposals/**`, etc.) doesn't cover `src/features/scenarios/`. Separately, the scenarioAllocations fetch at line 418-421 filters on `scenarioId` only, not `organizationId`.
- **Impact:** Promoted allocations skip the audit spine; UX-V5-10 / D-16 (change-log feed) under-reports a class of writes.
- **Fix:**
  1. Add `src/features/scenarios/**/*.service.ts` to `eslint.config.mjs:20-30` `nordic/require-change-log` include list.
  2. Wrap the delete/insert in a `recordChange(input, tx)` call inside the same transaction (mirror `actuals.service.ts`).
  3. Add `eq(schema.scenarioAllocations.organizationId, orgId)` to the WHERE clause at line 418-421.

### HI-02 — Dual write-path: legacy `executeImport` bypasses change_log + accepts unverified person/project IDs

- **Where:** `src/features/import/import.service.ts:229-273`; route `POST /api/import/execute`
- **Sources:** A-02 + B-07
- **Drift from:** Universal change_log + tenant FK validation.
- **Evidence:** `tx.insert(schema.allocations).values(...).onConflictDoUpdate(...)` for up to 5,000 rows; no `recordChange` call. eslint rule's `MUTATION_PREFIX_REGEX` (`create|update|delete|edit|submit|...`) doesn't match `execute…`, so the rule silently skips. Function also accepts `{personId, projectId, ...}` from client without per-row tenant FK verification.
- **Impact:** v4 bulk-import path mutates the same `allocations` table the v5 pipeline carefully audits. Two parallel write paths, one logged, one silent. Cross-tenant FK pollution risk.
- **Fix:** Either deprecate the v4 route (preferred — `/api/v5/imports/*` covers it), or (a) add `execute` to `eslint-rules/_mutation-prefix-regex.js`, (b) add `recordChange` calls inside the tx, (c) pre-validate `personId`/`projectId` belong to org via two batched SELECTs.

### HI-03 — Dual write-path: legacy register mutations on people/projects/programs/depts/disciplines bypass change_log

- **Where:** `src/features/people/person.service.ts:75-110`, `src/features/projects/project.service.ts`, same pattern in `programs/`, `departments/`, `disciplines/`. Routes: `/api/people/*`, `/api/projects/*`, `/api/departments/*`, `/api/disciplines/*`, `/api/programs/*`.
- **Source:** A-03
- **Drift from:** Universal change_log.
- **Evidence:** `changeLogEntityEnum` includes `'person'`, `'project'`, `'department'`, `'discipline'`, `'program'` and `REGISTER_ROW_*` actions exist. The new v5 path `src/features/admin/register.service.ts` correctly calls `recordChange`. The legacy services do NOT and aren't in the eslint include list. Both routes are wired and live.
- **Impact:** Any admin doing CRUD via the legacy register UI escapes the audit trail.
- **Fix:** Route all five legacy services through `register.service.ts` (preferred — single canonical writer per ADR-003). Cannot stay split.

### HI-04 — Scenarios endpoints have no role check; any signed-in user can CRUD

- **Where:** `src/app/api/scenarios/route.ts:21-51`, `src/app/api/scenarios/[id]/route.ts:26-66`
- **Source:** B-05
- **Drift from:** Standard authz pattern (every other v5 route uses `requireRole`).
- **Evidence:** All five handlers use `getTenantId()` + `auth()` only — no `requireRole()`. A user with `org:viewer` (or no role) can create/update/delete scenarios.
- **Impact:** Viewers can manipulate scenarios (planning inputs for other roles). Per `MAX_SCENARIOS_PER_ORG=25`, a malicious viewer can also exhaust the quota.
- **Fix:** Gate POST/PATCH/DELETE with `requireRole('planner')` (read remains `viewer`).

### HI-05 — `unpivotData` accepts negative hours

- **Where:** `src/features/import/import.utils.ts:296-313`
- **Source:** B-08
- **Evidence:** `if (!rawValue || isNaN(hours) || hours === 0) continue;` guards zero/NaN/empty but not negative. `validateImportRows` later catches `< 1` for the legacy flow, but the actuals parser tree may have a similar hole.
- **Impact:** Negative hours could leak to allocations through paths that bypass legacy validate.
- **Fix:** Add `hours < 0` rejection in `unpivotData`; assert non-negative in `validateStagedRows`.

### HI-06 — `parseExcelBuffer` throws raw `Error` for row-limit overflow

- **Where:** `src/features/import/import.utils.ts:497-500`
- **Source:** B-09
- **Drift from:** AppError taxonomy invariant (#5).
- **Evidence:** `throw new Error('File exceeds ${MAX_ROWS}…')` falls through to generic 500 in `handleApiError`.
- **Impact:** Legitimate 400-class client error returned as 500 + Sentry false-positive.
- **Fix:** Replace with `throw new PayloadTooLargeError(...)`.

### HI-07 — `requirePlatformAdmin` doesn't verify admin row still active

- **Where:** `src/lib/platform-auth.ts:31-52`
- **Source:** B-10
- **Evidence:** JWT-only check. Deactivated admins keep working until token expiry (default 8h).
- **Impact:** Off-boarded admins retain access for hours.
- **Fix:** Add `SELECT id, isActive FROM platform_admins WHERE id = $1 LIMIT 1` after JWT verify; throw `AuthError` if not active.

### HI-08 — Orphaned hook + API route + service function for `discipline-demand` widget (deleted in Phase 51)

- **Where:** `src/hooks/use-discipline-demand.ts`, `src/app/api/analytics/discipline-demand/route.ts`, `getDisciplineDemand` in `src/features/analytics/analytics.service.ts:~1080`
- **Source:** C-03
- **Evidence:** `useDisciplineDemand` has 0 references outside its own definition. The widget was deleted by LEAN-06 in Phase 51 but the hook + route + service function remained.
- **Impact:** Live API endpoint serving dead code; ~50 LoC of dead production code.
- **Fix:** Delete the hook file, the API route directory, the service function, and `DisciplineDemandResponse` type. Conservative: archive in one commit and watch for runtime 404s for 1 sprint.

### HI-09 — Two unused exports in widget registry

- **Where:** `src/features/dashboard/widget-registry.ts:31-33` (`getAllWidgets`) and `47-49` (`getWidgetsByCategory`)
- **Source:** C-04
- **Evidence:** 0 references outside the file.
- **Impact:** ~5 LoC dead.
- **Fix:** Delete both exports.

### HI-10 — `LEGACY_SECTION_NAV` `/team` and `/projects` entries unreachable post-v6.0

- **Where:** `src/components/layout/side-nav.tsx:35-46`
- **Source:** C-06
- **Evidence:** Hit only when `flags.uiV6Landing === false`. Prod flag is ON. Even if flag-off + navigation occurred, `next.config.ts:13` redirects handle the routes.
- **Fix:** Pair with the LEGACY_LAYOUTS retirement bundle (see MED-09 below).

---

## MEDIUM — Latent bugs & accumulated debt (12)

### MED-01 — `change-log.read.ts` throws raw `Error` on bad cursor → 500 not 400

- **Where:** `src/features/change-log/change-log.read.ts:34, 38`; route `src/app/api/v5/change-log/route.ts:59`
- **Source:** A-04
- **Fix:** Throw `ValidationError('invalid cursor', 'ERR_VALIDATION')`. Extend eslint guard to `src/features/**/*.read.ts` so this can't recur.

### MED-02 — `withTenant()` covers only half the tenant-scoped tables

- **Where:** `src/lib/tenant.ts`
- **Source:** A-05
- **Evidence:** `withTenant()` exposes builders for 8 tables. Schema has 8 more tenant-scoped tables (`dashboardLayouts`, `scenarios`, `scenarioAllocations`, `scenarioTempEntities`, `changeLog`, `importBatches`, `actualEntries`, `allocationProposals`) accessed via direct `db.select/insert/update/delete` with manual `eq(organizationId, orgId)`. A forgotten predicate is a cross-tenant leak — exactly what `withTenant()` exists to prevent.
- **Impact:** Defense-in-depth gap. Half-and-half pattern is worst-of-both.
- **Fix:** Pick one — extend `withTenant()` to cover all 16 tables OR document direct-query+manual-org-clause as the canonical pattern and delete `withTenant()`.

### MED-03 — `MUTATION_PREFIX_REGEX` doesn't cover all real mutating verbs

- **Where:** `eslint-rules/_mutation-prefix-regex.js:18`
- **Source:** A-06
- **Evidence:** Real mutating exports that don't match: `executeImport`, `promoteAllocations`, `parseAndStageActuals`, `cancelStaged`, `applyAllocationUpserts`. Universal change_log relies on this rule.
- **Fix:** Add `execute|promote|apply|cancel|parseAndStage|stage`. Add a unit test asserting the regex catches every export found in the manifest.

### MED-04 — `rollbackBatch` reads batch state outside the tx → double-rollback race

- **Where:** `src/features/import/actuals-import.service.ts:431-462`
- **Source:** B-11
- **Evidence:** `rolledBackAt`/`supersededAt`/age checks run on a SELECT outside the tx. Two concurrent calls both pass the `rolledBackAt === null` check.
- **Impact:** Both reach the DELETE/UPDATE loop; second writes a duplicate `ACTUALS_BATCH_ROLLED_BACK` change_log row.
- **Fix:** Move SELECT + state checks inside `db.transaction(async (tx) => { ... })`, ideally with `SELECT ... FOR UPDATE`.

### MED-05 — `_applyAllocationUpsertsInTx` partial-commit on conflict

- **Where:** `src/features/allocations/allocation.service.ts:62-176`
- **Source:** B-12
- **Evidence:** Loop `continue;` on conflict (line 126); rows BEFORE the conflict are already in the tx and get committed. Response returns mixed success+conflict.
- **Impact:** Two browser tabs auto-saving simultaneously: first batch lands, second hits conflicts for some cells AND silently overwrites others. Frontend conflict modal only knows about the conflict subset.
- **Fix:** If ANY conflict, roll back the entire tx and return 409 with the conflict list. Or document partial-success explicitly.

### MED-06 — `getCurrentMonth` uses local-time clock; contradicts iso-calendar UTC contract

- **Where:** `src/lib/date-utils.ts:45-48`
- **Source:** B-17
- **Evidence:** `now.getFullYear()`, `now.getMonth()` read server local TZ. Many widgets call `getCurrentMonth()` to derive the 4-month window.
- **Impact:** Off-by-one month at boundary day in non-UTC TZ (CET deployments).
- **Fix:** Use `now.getUTCFullYear()`, `now.getUTCMonth()`, OR replace with `currentMonthKey()` from `iso-calendar.ts` (already UTC-correct + supports `NC_TEST_NOW`).

### MED-07 — `parseExcelBuffer` File-instance check missing + double-parse on encoding heuristic

- **Where:** `src/features/import/import.utils.ts:455-489`, `src/app/api/import/upload/route.ts` (form parse)
- **Source:** B-18
- **Evidence:** `formData.get('file') as File` cast — if field is a string, `file.size` returns undefined and the bounds check passes, then `file.arrayBuffer()` throws TypeError → 500. Also: garbled-encoding detection re-parses the entire workbook.
- **Fix:** Validate `file instanceof File` before reading. Cap re-parse at row scan rather than full workbook.

### MED-08 — `actuals-import` rollback loop is N+1

- **Where:** `src/features/import/actuals-import.service.ts:466-501`
- **Source:** B-19
- **Evidence:** One DELETE or UPDATE per entry. 5,000-row batch = 5,000 queries inside one tx.
- **Impact:** Lock window scales with batch size.
- **Fix:** Batch by action: `DELETE ... WHERE (person,proj,date) IN (...)` and `UPDATE ... FROM (VALUES ...) AS upd(...)`.

### MED-09 — LEGACY_LAYOUTS retirement bundle (paired post-v6.0 cleanup)

- **Where:** `src/features/dashboard/default-layouts.ts:32-90` (LEGACY_LAYOUTS), `dashboard-layout-engine.tsx`, 5 legacy widget files (`utilization-heatmap-widget.tsx`, `bench-report-widget.tsx`, `strategic-alerts-widget.tsx`, `resource-conflict-widget.tsx`, `discipline-chart-widget.tsx`, `discipline-distribution-widget.tsx`), 4 stale i18n keys, `LEGACY_SECTION_NAV`, 2 chart components in `src/components/charts/`
- **Sources:** C-01 + C-02 + C-05 + C-06 + C-08
- **Evidence:** `default-layouts.ts:6-7` comment: "Per D-06 the legacy widget files remain registered; physical deletion is deferred to a post-rollout cleanup phase." Prod migrations ran today (2026-05-10). With `uiV6LeanTrim=true` in prod, the rollback path is dead at runtime.
- **Total LoC at stake:** ~720 prod LoC across 6+ files.
- **Caveat:** `resource-conflict-widget.tsx` cannot be deleted yet — its `useConflicts` hook is still used by `src/components/alerts/resource-conflicts-panel.tsx`. Only the widget shell is dead.
- **Fix:** Plan a v7.0 sub-phase. Confirm via flag-state audit that no tenant has both `uiV6LeanTrim` AND `uiV6Polish` still OFF (add a recurring audit query to STATE.md). Then delete in one commit per widget for clean revert points.

### MED-10 — Platform-admin login email-enumeration via timing

- **Where:** `src/features/platform/platform-auth.service.ts:8-38`
- **Source:** D-02
- **Evidence:** Unknown email returns immediately; known email runs `bcrypt.compare()` (~100-300ms). Same error message, different timing.
- **Impact:** Enumerable platform-admin set. Low absolute impact (small set, not user-facing) but the platform surface is the highest-privilege boundary in the system.
- **Fix:** Always run `bcrypt.compare(password, DUMMY_HASH)` when admin is missing/inactive so timing is uniform.

### MED-11 — `IMPORT_MAX_FILE_SIZE_MB` env var defined but unused; hardcoded duplicate

- **Where:** `src/lib/env.ts:24` (defines), `src/app/api/import/upload/route.ts:27` and `src/app/api/v5/imports/parse/route.ts:31` (hardcode `10 * 1024 * 1024`)
- **Source:** D-03
- **Impact:** Operator surprise: setting `IMPORT_MAX_FILE_SIZE_MB=25` in Vercel silently doesn't raise the limit.
- **Fix:** Replace both hardcodes with `env.IMPORT_MAX_FILE_SIZE_MB * 1024 * 1024`. Add a test that the env var is read.

### MED-12 — AppError shape divergence in v4 routes (covers B-16, D-04, A-04 partially)

- **Where:**
  - `src/app/api/import/execute/route.ts:22-32`
  - `src/app/api/import/validate/route.ts:22-26`
  - `src/app/api/organizations/invite/route.ts:54-57` (also no Zod validation per D-05)
  - `src/app/api/allocations/route.ts:12-17` (returns `{error: 'ERR_VALIDATION', message: '...'}` directly)
- **Sources:** B-16 + D-04 + D-05
- **Evidence:** Each manually returns `{error: 'CODE', message: '...'}` — flat shape. AppError canonical shape is `{error: {code, message, details?}}` — nested.
- **Impact:** Clients depending on `body.error.code` get `body.error: string`. Plus `organizations/invite` uses `body as { ... }` cast — ad-hoc, no Zod.
- **Fix:** Let `handleApiError` handle ZodError (already does at `api-utils.ts:15-23`). Replace `safeParse + custom 400` branches with `parse + throw`. Add `inviteSchema = z.object({...})` for `organizations/invite`.

---

## LOW — Defensive improvements (10)

### LO-01 — `created` vs `updated` detection uses 1-second clock-skew heuristic

- **Where:** `src/features/allocations/allocation.service.ts:161-166`
- **Source:** B-13
- **Fix:** Use `RETURNING xmax = 0` (Postgres trick — `xmax = 0` indicates INSERT, non-zero indicates UPDATE).

### LO-02 — Date-range filter in change_log feed doesn't validate input format

- **Where:** `src/app/api/v5/change-log/route.ts:51-53`
- **Source:** B-14
- **Fix:** Add `z.string().datetime()` (or YYYY-MM-DD regex) to listQuerySchema.

### LO-03 — `/api/projects` and `/api/departments` GET have no role check

- **Where:** `src/app/api/projects/route.ts:8-24`, `src/app/api/departments/route.ts:8-16`
- **Source:** B-15
- **Fix:** Add `requireRole('viewer')` to both (matches the comment in `people/route.ts:15`).

### LO-04 — `dashboard/layout` widget filter has brittle two-prong "is server" heuristic

- **Where:** `src/app/api/dashboard/layout/route.ts:52-60` (`filterValidWidgets`)
- **Source:** D-08
- **Evidence:** Detects "server-side empty registry" by checking `getWidget('kpi-cards') === undefined`. Hardcoded magic string.
- **Fix:** Use `getRegistryLength() === 0` instead.

### LO-05 — `register.service.ts` 11 `as any` casts intentional but lose type safety on a tenant-mutation surface

- **Where:** `src/features/admin/register.service.ts:93, 198, 275, 277, 313, 321, 375, 400, 436`
- **Source:** D-06
- **Fix:** Add `tests/invariants/register-tables.test.ts` that walks `REGISTER_ENTITIES` and asserts each table has `organizationId` and `archivedAt` columns (already partially covered).

### LO-06 — `validateStagedRows` takes `db: any`

- **Where:** `src/features/import/validate-staged-rows.ts:60-66`
- **Source:** D-07
- **Fix:** Replace with `db: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]` or define a `DbLike` interface.

### LO-07 — `console.error('Unhandled API error:', error)` may leak secrets

- **Where:** `src/lib/api-utils.ts:25`
- **Source:** B-22
- **Evidence:** Bare `console.error` with full error object. `Error: connect ECONNREFUSED postgres://user:password@host` would log the password.
- **Fix:** Route through Sentry capture + scrubbing rules; or stringify `error.message`/`error.stack` only.

### LO-08 — `monthsBetween` duplicated in 3 routes

- **Where:** `src/app/api/v5/capacity/route.ts:22`, `src/app/api/v5/planning/allocations/route.ts`, `src/features/planning/planning.read.ts:69`
- **Source:** B-21
- **Fix:** Move to `iso-calendar.ts`.

### LO-09 — `analytics.service.ts` is 2,994 LOC — 4× the codebase ceiling

- **Where:** `src/features/analytics/analytics.service.ts`
- **Source:** D-09
- **Fix:** Split into `analytics/heatmap.service.ts`, `analytics/forecast.service.ts`, `analytics/conflicts.service.ts`, `analytics/period.service.ts`. One file per response type.

### LO-10 — Stale TODO + i18n typo

- **Where:** `src/app/(app)/staff/page.tsx:10` (Phase 42 ZoomControls TODO never wired); `src/features/dashboard/dashboard-layout-engine.tsx:259` (`Widget ej tillganglig` missing `ä`)
- **Sources:** C-09 + D-11 (TODO) + A-07 (typo)
- **Fix:** Verify zoom controls or delete the line; replace literal with i18n key OR fix the diacritic.

---

## NIT — Informational (3)

- **NIT-01** — `requireRole()` returns `ForbiddenError('Unknown role')` rather than generic `Forbidden` for unmapped Clerk roles. Minor info leak. (`src/lib/auth.ts:75-98` — D-01)
- **NIT-02** — `proxy.ts` E2E bypass relies on env-var trust. Could be tightened to a build-time constant. (`src/proxy.ts:21-23` — B-23)
- **NIT-03** — Two recharts callback `any` casts in `stacked-area-chart.tsx:191`, `capacity-forecast-chart.tsx:173` could use `LegendProps['onClick']`. (D-10)

---

## Aggregate metrics

| Metric | Value |
|---|---|
| Files scanned | ~587 TS/TSX in `src/` |
| Findings (deduplicated) | **39** (4 CRITICAL, 10 HIGH, 12 MEDIUM, 10 LOW, 3 NIT) |
| `any` / `as any` (production code) | 17 occurrences across 8 files |
| `@ts-ignore` | 0 |
| `@ts-expect-error` | 2 (test-only, jsdom polyfill) |
| `// eslint-disable…` lines | 18 across 14 files (each with justification comment) |
| `TODO`/`FIXME`/`HACK` (non-test) | 1 |
| `dangerouslySetInnerHTML` | 0 |
| `sql.raw(` with caller-provided string | 0 |
| Files >500 LOC | 10 (top: `analytics.service.ts` 2994, `db/schema.ts` 977, `planning/planning.read.ts` 865) |
| Estimated dead code (HIGH confidence) | ~70 LoC immediately deletable |
| Estimated dead code (HIGH+MEDIUM, post-v7.0 flag-stability check) | ~790 LoC |

---

## Recommended remediation plan

### Immediate (this week — separate hotfix branch)

1. **CR-01**: Refactor 3 server actions in `actuals.cell.actions.ts` to use `getTenantId()` + `auth()`.
2. **CR-02**: Tighten `proposedHours` Zod to `z.number().int()` at proposal-create.
3. **CR-03 + CR-04**: Add tenant-scoped FK validation in `proposal.service.ts` and `person.service.ts`.
4. **HI-04**: Add `requireRole('planner')` to scenarios POST/PATCH/DELETE.

### Short-term (next sprint or v7.0 Wave 1)

5. **HI-01 + HI-02 + HI-03**: Resolve dual-write paths. Either deprecate legacy services or extend eslint coverage + add `recordChange` calls.
6. **MED-03**: Tighten `MUTATION_PREFIX_REGEX` + manifest-walking unit test.
7. **MED-12**: AppError shape sweep across v4 routes.
8. **HI-05 + HI-06 + HI-07**: Import + platform-auth fixes.
9. **HI-08 + HI-09**: Delete orphan hooks + unused exports.

### Medium-term (v7.0 sub-phases)

10. **MED-09**: LEGACY_LAYOUTS retirement bundle (gated on flag-state audit).
11. **MED-02**: Decide on `withTenant()` coverage policy (extend or remove).
12. **LO-09**: Split `analytics.service.ts`.
13. **MED-04 + MED-05 + MED-08**: Allocation/import race + atomicity fixes.
14. **MED-06**: Replace `getCurrentMonth` with UTC-correct `currentMonthKey`.

### Long-term (track in PROJECT.md)

15. Carry-forward open items from v6.0 close (counter-proposal, mobile responsive, real role-based perms, notification channels, E2E rehab) — already tracked.

---

## Coverage statement

**Sampled in depth across all 4 agents:**
- `src/lib/{tenant,auth,errors,api-utils,env,date-utils,platform-auth}.ts`
- `src/lib/time/iso-calendar.ts`
- `src/proxy.ts`
- All v5 mutation services and most route handlers
- Server actions (`actuals.cell.actions.ts`)
- Excel parser + import/actuals pipelines
- Widget registry + dashboard layout engine
- Sidebar/topnav i18n surface
- `eslint.config.mjs` + custom rules
- Schema (`src/db/schema.ts`)
- Drizzle migrations (both directories)

**Not exhaustively covered:**
- All ~90 API route files (sampled ~30 representative; pattern-conformance assumed for remainder).
- `analytics.service.ts` past line 1080 (large file, likely additional orphan candidates).
- `src/components/charts/*` orphan sweep beyond legacy widgets.
- E2E spec fixtures for stale references.
- Full per-export unused-symbol sweep (used targeted grep).
- Test fixtures (`tests/perf/`, `tests/invariants/`) for stale assertions.
- Performance: no profiling, no load testing.

**Bug classes that came up empty (good news):**
- DST shift bugs in `iso-calendar.ts` — module is correctly UTC-only.
- 53-week year handling — explicitly tested; algorithm correct.
- Webhook signature verification — SDK call, well-tested upstream.
- SQL injection — Drizzle parameterized; sole `sql.raw` helper carefully scoped.
- XSS via `dangerouslySetInnerHTML` — zero occurrences.

---

_Generated 2026-05-10 by 4-agent parallel codebase audit. Pair this doc with PR per remediation theme. The CRITICAL findings (CR-01..CR-04) should land before next prod deploy._
