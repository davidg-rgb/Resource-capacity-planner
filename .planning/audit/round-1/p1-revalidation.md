# P1 Re-Validation Decisions (Round 1)

**Re-validated at:** 2026-04-27
**Codebase HEAD:** `bb66ae8` (main)
**Method:** Read code at HEAD, traced git log for the relevant feature, cross-checked against doc + phase artifacts (CONTEXT/PLAN/SUMMARY) for the originating phase.

---

## CONS-P1-RV-01: DepartmentPicker (UNBREAK-08)

- **Decision:** code-fix
- **Rationale:** Doc intent is unambiguous — Phase 49 CONTEXT D-02 EXPLICITLY decided "department sub-picker lives inside `persona-switcher.tsx` — NOT a standalone component" because the LM page fallback already pointed users at the persona switcher and adding a standalone component would double the test surface. Phase 49 SUMMARY (Plan 01) records the picker SHIPPED in commit `d78449c` (Apr 20). However at HEAD the picker is **gone**: `persona-switcher.tsx` still has `departmentId: ''` placeholder (line 60), the LM pages still render the `selectDepartment` fallback (line-manager/page.tsx:100-104, line-manager/timeline/page.tsx:125-129), and the test file references `LegacyPersonaSwitcher`/`GroupedPersonaSwitcher` symbols that no longer exist in source. The work was clobbered between Phase 50 and Phase 51-02 — likely a merge regression (commit `27ac599` reverted the docstring back to the Phase 40 wording). This is a regression, not a missing feature.
- **Scope:** Restore the inline department sub-picker in `src/components/persona/persona-switcher.tsx` matching the Phase 49 D-02 contract: (a) extend `buildPersona` to accept a `departmentId` argument; (b) add `lmDeptId` state with localStorage hydration via key `persona.line-manager.departmentId`; (c) auto-select when single department, render `<select>` when >1, disabled `<option>` + tooltip when 0; (d) remove `selectDepartment` fallback from `src/app/(app)/line-manager/page.tsx:100-104` and `src/app/(app)/line-manager/timeline/page.tsx:125-129`. Reference commit `d78449c` for the prior implementation. Also restore the Phase 50 grouped-select code path (`GroupedPersonaSwitcher` / `LegacyPersonaSwitcher` split) gated by `uiV6Landing` since the existing tests assume that split. Treat as a single restoration commit; pull text from `git show d78449c` and `git show aea464f` for the canonical body.
- **Confidence:** high

---

## CONS-P1-RV-02: RBAC drift on POST/PATCH for people, projects (planner vs admin+)

- **Decision:** code-fix
- **Rationale:** The doc (`admin+`) is correct and matches the security model: in v5.0-ARCHITECTURE.md the canonical CRUD path is `/api/v5/admin/registers/[entity]` which already requires `admin+` (verified at `src/app/api/v5/admin/registers/[entity]/route.ts:40,56`). The legacy `/api/people` and `/api/projects` POST/PATCH at `planner+` are vestigial: `useCreatePerson`/`useUpdatePerson`/`useCreateProject`/`useUpdateProject` hooks have **zero consumers** (verified by grep), and the only remaining live caller of legacy `POST /api/people` is the onboarding wizard (`step-people.tsx:42`) which is run by the org's first user (admin/owner). DELETE on the same routes already requires `admin`. Tightening to `admin+` matches doc, aligns with the v5 register routes, removes a defense-in-depth gap, and breaks nothing observable.
- **Scope:** Change `requireRole('planner')` → `requireRole('admin')` at `src/app/api/people/route.ts:35`, `src/app/api/people/[id]/route.ts:23`, `src/app/api/projects/route.ts:28`, `src/app/api/projects/[id]/route.ts:23`. Verify onboarding wizard still works (the first user IS admin in Clerk; should be fine). Add a regression test asserting non-admin gets 403. Optionally delete the dead `useCreatePerson/useUpdatePerson/useCreateProject/useUpdateProject` hooks.
- **Confidence:** high

---

## CONS-P1-RV-03: `bulkCopyForward` + `POST /api/v5/planning/allocations/bulk-copy` missing

- **Decision:** doc-fix
- **Rationale:** v5.0-ARCHITECTURE.md §14 line 1955 explicitly places F-016 (drag-to-copy) in **"Stage 6 — Polish, Phase 6.1 — Drag-to-copy (F-016) — final editing ergonomics."** v5.0 shipped without Stage 6/7 polish (per `MILESTONES.md:60-77`); v6.0 was UI restructure, not feature delivery. The TC-API-005 stub at `src/app/api/v5/__tests__/tc-api-gap-fill.test.ts:20` is an explicit Phase 44-10 deferral marker ("placeholder: endpoint deferred until bulk-copy feature lands"). The `ALLOCATION_BULK_COPIED` enum value in `src/db/schema.ts:79` is harmless forward-compatible scaffolding, not a contract violation. Code-side already acknowledges deferral; doc-side reads as if shipped. The fix is to make the doc match reality: explicitly mark §6.3 lines 710-726, §8.1 line 1366, and TC-PS-009/010/012/013/014/016 as "Deferred to Phase 6.1 polish (post-v5.0, not in v6.0)."
- **Scope:** Edit `.planning/v5.0-ARCHITECTURE.md`: add a `(DEFERRED to Phase 6.1)` annotation at the top of the `bulkCopyForward` block (§6.3 line 710), at the `POST /api/v5/planning/allocations/bulk-copy` route (§8.1 line 1365), and at TC-PS-009/010/012/013/014/016 (§15 lines 2036, 2037, 2252, 2253, 2262, 2277). Also list them in `.planning/test-contract/tc-allowlist.json` (or equivalent deferral list) so the contract gate stays green. No code change.
- **Confidence:** high

---

## CONS-P1-RV-04: `/api/v5/actuals` and `/api/v5/actuals/daily` routes missing

- **Decision:** doc-fix
- **Rationale:** No client in `src/` consumes `/api/v5/actuals` or `/api/v5/actuals/daily`. Plan-vs-actual cells get their data via `/api/v5/planning/allocations` server-side (verified at `src/features/planning/planning.read.ts:15,106,351,513` — `aggregateByMonth` is composed into `planning.read` rather than exposed via REST). The drill-down drawer (`src/components/drawer/PlanVsActualDrawer.tsx`) consumes `getDailyCellBreakdown`, a Next.js **server action** wrapping `getDailyRows`, NOT the REST endpoint. The doc was written before the server-action pattern was adopted. TC-API-020/021 stubs at `tc-api-gap-fill.test.ts:30-45` already mark these as deferred. Same pattern as RV-03: the code is correct (server-action is the modern Next.js 16 pattern); the doc just lags. Building thin REST wrappers would create a second un-used surface to test.
- **Scope:** Edit `.planning/v5.0-ARCHITECTURE.md` §8.1 lines 1418-1428: replace `GET /api/v5/actuals` and `GET /api/v5/actuals/daily` blocks with a note that aggregation is composed via `planning.read.ts` and the drilldown drawer consumes the `getDailyCellBreakdown` server action (`src/features/actuals/actuals.cell.actions.ts`). If the user wants to keep the REST surface contract for a future rework, mark both as `(DEFERRED — currently consumed via server actions)`. Update TC-API-020/021 + TC-UI-050 contract description to point at the server-action surface.
- **Confidence:** high

---

## CONS-P1-RV-05: Capacity GET `/api/v5/capacity` requires `departmentId`; doc says optional

- **Decision:** doc-fix
- **Rationale:** R&D portfolio (`src/app/(app)/rd/page.tsx:46`) fetches `/api/v5/planning/allocations?scope=rd`, NOT `/api/v5/capacity`. The capacity endpoint's only consumer is the LM home page (`src/app/(app)/line-manager/page.tsx:30`), which always passes `departmentId`. R&D's "un-scoped capacity" need is satisfied through the planning/allocations route, not via the capacity heatmap surface. The route's `requireRole('planner')` + `departmentId` mandatory schema is the simpler, safer stance for the LM use case (no tenant-wide heatmap with no scope). The service layer (`getPersonMonthUtilization`) already accepts `departmentId?` so a future un-scoped consumer wouldn't need a service change — only a route relaxation, which can land then.
- **Scope:** Edit `.planning/v5.0-ARCHITECTURE.md` §8.1 line 1489: change `Query: { departmentId?, startMonth, endMonth }` → `Query: { departmentId, startMonth, endMonth }`. Optionally add a note: "departmentId is currently mandatory at the route layer; the underlying `getPersonMonthUtilization(args.departmentId?)` is already optional, so future un-scoped consumers can relax the Zod check without a service change." No code change.
- **Confidence:** high

---

## Summary table

| ID | Decision | Confidence |
|---|---|---|
| RV-01 | code-fix (regression — restore Phase 49 + Phase 50 picker work) | high |
| RV-02 | code-fix (tighten POST/PATCH to admin+ to match doc + v5 admin routes) | high |
| RV-03 | doc-fix (annotate as deferred to Phase 6.1 polish) | high |
| RV-04 | doc-fix (replace REST contract with server-action note) | high |
| RV-05 | doc-fix (drop the `?` — endpoint is mandatorily department-scoped) | high |

## Net effect on bucket counts

Round 1 consolidated had 5 RV items pending. Re-validated split:
- Code-fix: 2 (RV-01, RV-02) — adds to the P1 code-fix bucket (now 14 items)
- Doc-fix: 3 (RV-03, RV-04, RV-05) — adds to the v5.0-ARCHITECTURE.md doc-fix bucket; v5.0 doc already had no formal modernization pass scheduled, so this is the first edit batch on it. Recommend bundling with the existing v1.0 ARCHITECTURE.md modernization pass (one consolidated commit per doc).

## Notable cross-finding

RV-01 surfaces a real **regression chain**: Phase 49 shipped the inline picker (commit `d78449c`), Phase 50 ran a major refactor on the same file (commit `aea464f` introducing `GroupedPersonaSwitcher`/`LegacyPersonaSwitcher`), then commit `27ac599` ("feat(51-02): dashboard_layouts JSONB migration ...") accidentally clobbered `persona-switcher.tsx` back to the Phase 40 docstring + state shape. Tests at `src/components/persona/__tests__/persona-switcher.test.tsx` still reference the post-Phase-50 symbols and would currently fail typecheck against the source. Recommend running the persona-switcher test suite before/after the RV-01 restoration commit to confirm the regression scope and that the restored code makes them green again.
