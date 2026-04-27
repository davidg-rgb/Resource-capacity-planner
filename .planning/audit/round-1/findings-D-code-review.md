---
agent: D-code-reviewer
round: 1
scanned_at: 2026-04-27
---

# Round 1 — Agent D: Code Quality / Bugs / Security audit

**Scope:** files touched since v5.0 close (2026-04-13) — v6.0 work (Phases 48–53) plus tests and migrations.

**Headline:** No cross-tenant data leak, SQL injection, AppError swallowing, or auth bypass at runtime-compromise level. Concerns concentrated in (a) correctness gaps where state isn't populated, (b) one quietly broken denominator in the OvercommitDialog, (c) small race / staleness windows in TanStack hooks, (d) defense-in-depth seams.

## P0 — Critical

### D-CR-01 [P0] PM `homeDepartmentId` never populated → every PM edit detours through the proposal flow
- **Location:** `src/components/persona/persona-switcher.tsx:48-66` (`buildPersona`) + `src/features/proposals/edit-gate.ts:34-40`
- **Issue:** `Persona` for `kind: 'pm'` carries optional `homeDepartmentId?: string`. `resolveEditGate` keys the PM's "edit own dept directly" branch off equality with that field. But `buildPersona('pm', ...)` never sets it. Predicate `persona.homeDepartmentId !== undefined` is **always false** — every PM edit takes the `proposal` branch even when the PM is editing a person in their own department.
- **Why it's P0:** code can never reach the documented branch. Tests pass because they construct the persona directly with `homeDepartmentId: 'dept-A'`; production switcher does not. PM-direct-edit journey broken in prod despite green unit tests.
- **Fix:** plumb the target person's `departmentId` through `buildPersona`. Extend `/api/people` payload `PersonRowLite` to include `departmentId`, have `buildPersona` set `homeDepartmentId` when persona kind flips to PM. Add integration test through `<PersonaSwitcher>`.

### D-CR-02 [P0] `getOvercommitBreakdown.pctOfOvercommit` is share-of-total-planned, not share-of-overcommit
- **Location:** `src/features/capacity/capacity.read.ts:333-352`
- **Issue:** Field name and dialog copy say "% of overcommit." Math says "% of total planned hours". With dept capacity 200h and dept planned 240h, a project of 80h is 33% of the planned total, not 50% of the 40h overcommit. The contract test at `breakdown.contract.test.ts:188` codifies the incorrect semantics.
- **Fix:** decide which contract is wanted. If "% of total planned," rename field. If "% of overcommit," compute `dept_capacity_total = sum(targetHoursPerMonth)`, then `p.plannedHours / max(0, totalPlanned - dept_capacity_total)`.

### D-CR-03 [P0] /api/dashboard/layout has multiple authentication / validation gaps
- **Location:** `src/app/api/dashboard/layout/route.ts:62-208`
- **Issue 1:** Auth without role check. Both GET and PUT use `getTenantId()` + bare `auth()` but never call `requireRole('viewer')`. A user with NO Clerk role mapping reaches the handler — `requireRole` would throw.
- **Issue 2:** `dashboardId` not validated. PUT accepts arbitrary `dashboardId` strings. No allowlist (`'manager' | 'project-leader'`).
- **Issue 3:** `version` hardcoded to 1 on conflict update (line 199). TanStack invalidator looking at `personal.version` sees the same number forever.
- **Fix:** wrap both handlers with `requireRole('viewer')`. Validate `dashboardId` against Zod enum. Bump version via `version: sql\`${dashboardLayouts.version} + 1\``.

### D-CR-04 [P0] `getOvercommitBreakdown` queries don't scope `people` / `projects` by `organization_id` in the join
- **Location:** `src/features/capacity/capacity.read.ts:316-331` (projectRows) and `:378-395` (personRows)
- **Issue:** Both queries join `people` (and `projects` for the latter) but only filter `allocations.organizationId = orgId` — no `eq(schema.people.organizationId, args.orgId)` predicate. Today FK constraints prevent literal cross-org rows; defense-in-depth that the rest of the file follows.
- **Fix:** add `eq(schema.people.organizationId, args.orgId)` and `eq(schema.projects.organizationId, args.orgId)` to the `where(and(...))` of both queries.

## P1 — Medium

### D-CR-05 [P1] `notification-bell.test.tsx` mock for `useAlertCount` accepts only 2 args, hiding WR-02 fix coverage
- **Location:** `src/components/persona/__tests__/notification-bell.test.tsx:90-92`
- **Issue:** Real signature is `useAlertCount(monthFrom, monthTo, enabled = true)` (3 args). Test mock only accepts 2. WR-02 production fix has no automated guard.
- **Fix:** make mock a `vi.fn()` and assert calls receive `enabled=false` for non-admin personas

### D-CR-06 [P1] `Breadcrumbs` mishandles duplicate path segments and renders fake-link spans
- **Location:** `src/components/layout/breadcrumbs.tsx:7-32`
- **Issue 1:** Duplicate-segment React key collision (`<span key={segment}>`)
- **Issue 2:** Non-navigable breadcrumbs — non-last segments render as `<span class="cursor-pointer">` with no href/onClick
- **Issue 3:** Empty breadcrumb on `/`
- **Fix:** key by `${i}-${segment}`; render non-last segments as `<Link>` with cumulative paths; add fixed Home anchor

### D-CR-07 [P1] `ResourceConflictsPanel` localStorage initializer + writer have no `typeof window` guard
- **Location:** `src/components/alerts/resource-conflicts-panel.tsx:46-62, 302`
- **Issue:** `useState<Set<string>>(getDismissed)` calls `getDismissed()` on first render. `localStorage.getItem(...)` runs without guard. Component is `'use client'` but during streaming-SSR or test rendering, lazy initializer can run server-side
- **Fix:** `if (typeof window === 'undefined') return new Set();` at the top of `getDismissed`

### D-CR-08 [P1] `OvercommitDialog` deep-link target leaks raw `monthKey` into URL
- **Location:** `src/components/dialogs/overcommit-dialog.tsx:159`
- **Issue:** `<Link href={`/staff/${p.id}?month=${monthKey}`}>` uses naked interpolation. Same component DOES use `encodeURIComponent(monthKey)` for `fetchBreakdown`. Inconsistency is the smell.
- **Fix:** `href={`/staff/${p.id}?month=${encodeURIComponent(monthKey)}`}`

### D-CR-09 [P1] `LmTimelineCell` silently no-ops when no project has an `allocationId` for the target month
- **Location:** `src/components/timeline/lm-timeline-cell.tsx:114-138`
- **Issue:** Edit silently fails when person has no allocations in `monthKey`. User types in cell, debounced commit fires, nothing happens
- **Fix:** pass `editable={!!editAllocationId}` to `<PlanVsActualCell>`

### D-CR-10 [P1] Platform tenant-detail impersonate-search has stale-state race
- **Location:** `src/app/(platform)/tenants/[orgId]/page.tsx:218-242`
- **Issue:** Standard unmounted-fetch / stale-state race. UI briefly shows loading after results landed
- **Fix:** TanStack the search — `useQuery({ queryKey: ['platform-impersonate-search', q], enabled: q.trim().length > 0, staleTime: 5_000 })`

## P2 — Low / Quality

### D-CR-11 [P2] `notification-bell` t() calls have no `safeT` fallback
- **Location:** `src/components/persona/notification-bell.tsx:74-95`
- **Fix:** wrap label assignments in `safeT`. Move `safeT` to shared `src/lib/i18n-utils.ts`

### D-CR-12 [P2] `polish-discipline-rename.sql` uses `~*` regex on jsonb-as-text — false-positive triggers
- **Location:** `src/db/migrations/20260422_polish_discipline_rename.sql:35` and `:58-62`
- **Fix:** replace both `WHERE layout::text ~* '...'` with `WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(layout) p WHERE p->>'widgetId' IN (...))`

### D-CR-13 [P2] `getDefaultLayout` falls back to `manager:desktop` for unknown `dashboardId` — silent
- **Location:** `src/features/dashboard/default-layouts.ts:164-172`
- **Fix:** narrow `dashboardId` to discriminated literal, return `null` for unknown keys

### D-CR-14 [P2] `RdPortfolioCell` testid collides if two rows share `rowId`
- **Location:** `src/components/timeline/rd-portfolio-cell.tsx:46`
- **Fix:** include row index in testid OR have planning.read assert uniqueness

### D-CR-15 [P2] `discipline-breakdown-widget` casts `config.chartType` through `unknown` without validation
- **Location:** `src/features/dashboard/widgets/discipline-breakdown-widget.tsx:80-82`
- **Fix:** `z.enum(['bar', 'donut']).default(defaultChartType).parse(config?.chartType)`

### D-CR-16 [P2] `next.config.ts` redirects use `permanent: true` (308) — caches aggressively, hard to revert
- **Location:** `next.config.ts:8-15`
- **Fix:** `permanent: false` for `/team*` and `/projects*`. `/wishes` stable enough to keep 308

## P3 — Info / Nit

### D-CR-17 [P3] Three duplicate `monthRangeToDateRange` helpers across feature modules
### D-CR-18 [P3] `RedistributeModal.useMutation` re-allocates per modal mount
### D-CR-19 [P3] Three count hooks have `refetchInterval: 60_000` but no `staleTime`
### D-CR-20 [P3] `ClickTrackerProvider` reads NEXT_PUBLIC env inside `useEffect` instead of at module top-level
### D-CR-21 [P3] `home/page.tsx` useEffect deps include the whole `flags` object
### D-CR-22 [P3] `proposal.service` casts `tx as unknown as Parameters<typeof recordChange>[1]` 8 times
### D-CR-23 [P3] `Breadcrumbs` `.capitalize` mangles persona acronyms (`/rd/portfolio` → "Rd / Portfolio")
### D-CR-24 [P3] `getOvercommitCount` loads every person row in the org just to find target hours

## Summary

| Severity | Count |
|---|---|
| P0 | 4 (D-CR-01, 02, 03, 04) |
| P1 | 6 (D-CR-05, 06, 07, 08, 09, 10) |
| P2 | 6 (D-CR-11, 12, 13, 14, 15, 16) |
| P3 | 8 (D-CR-17 to 24) |
| **Total** | **24** |

## Out-of-scope notes (forwarded to Agents A/B/C)
- `notification-bell.tsx` Staff branch returns `null` BEFORE count gating check — same outcome, different ordering
- `OvercommitDialog.scope === 'project'` permitted by type but no rendering path
- `getCapacityBreakdown.scope='person'` returns zero rows for cross-org IDs but no 404
