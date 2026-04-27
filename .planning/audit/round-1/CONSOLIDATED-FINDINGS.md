# Round 1 Consolidated Findings

**Scanned at:** 2026-04-27
**Codebase HEAD:** `bb66ae8` (main)
**Scanners:** 4 (A=ARCHITECTURE.md, B=v5.0-ARCHITECTURE.md, C=UI-RESTRUCTURE-PLAN-v2.md, D=code-reviewer)

## Summary

| Severity | Total | Code-fix | Doc-fix | Re-validate | Log-only |
|---|---|---|---|---|---|
| P0 | 9 | 8 | 0 | 1 | 0 |
| P1 | 25 | 12 | 11 | 5 | 0 |
| P2 | 27 | ~10 | ~12 | 1 | ~4 |
| P3 | 25 | 0 | ~5 | 0 | ~20 |

## Cross-agent overlaps (deduped)

- **Breadcrumbs:** C-P0-3 (parser-only, plan §1.3 EXPANDED contract not met) + D-CR-06 (key collisions, fake-link spans, no Home anchor) → merged as **CONS-P0-03** (single rebuild)
- **PM persona / homeDepartmentId:** D-CR-01 (state never populated) is the same plumbing problem as Agent C's PersonaGate analysis (P1-5 hardcoded namespace) — different symptoms, related root cause; tracked separately

---

## P0 — fix immediately (9 items)

### CONS-P0-01 — Root `/page.tsx` ignores `uiV6Landing` flag
- **Source:** Agent C P0-1
- **Location:** `src/app/page.tsx:1-24`
- **Action:** **code-fix.** `(app)/page.tsx` should be created as a client component running `PersonaRedirect` chain when `uiV6Landing=true`. Existing `/home` route stays for direct nav (P3-3).
- **Why P0:** v6.0 marquee feature unreachable; flag has no observable effect.

### CONS-P0-02 — `SECTION_NAV` has zero persona-keyed sections (NAV-02)
- **Source:** Agent C P0-2
- **Location:** `src/components/layout/side-nav.tsx:22-73`
- **Action:** **code-fix.** Build `PERSONA_SECTION_NAV` per plan §6 consuming the 18 already-shipped `sidebar.personaSections.*` i18n keys. Tests at `side-nav.test.tsx` are already failing 3/5 — they specify the contract.
- **Auto-resolves:** Agent C P1-2 (i18n keys are dead code until this lands).

### CONS-P0-03 — `Breadcrumbs` is parser-only + structural bugs (NAV-03)
- **Sources:** Agent C P0-3 + Agent D D-CR-06
- **Location:** `src/components/layout/breadcrumbs.tsx:1-33`
- **Action:** **code-fix.** Rebuild per plan §1.3 EXPANDED: persona-aware labels, Home link to `getLandingRoute(persona)`, fix duplicate-segment React key, render non-last segments as proper `<Link>`, label-map for acronyms (PM, R&D, LM). Tests at `breadcrumbs.test.tsx` failing 5/9 — they specify the contract.

### CONS-P0-04 — `DepartmentPicker` component never built (UNBREAK-08)
- **Source:** Agent C P0-4
- **Location:** `src/app/(app)/line-manager/page.tsx:100-104`, `src/app/(app)/line-manager/timeline/page.tsx:125-129`
- **Action:** **re-validate-needed.** Possible the persona-switcher already provides this functionality and the dedicated picker isn't required. Re-val before building.

### CONS-P0-05 — PM `homeDepartmentId` never populated → all PM edits go through proposal flow
- **Source:** Agent D D-CR-01
- **Location:** `src/components/persona/persona-switcher.tsx:48-66` + `src/features/proposals/edit-gate.ts:34-40`
- **Action:** **code-fix.** Plumb the target person's `departmentId` through `buildPersona`. Extend `/api/people` payload `PersonRowLite` to include `departmentId`. Add integration test through `<PersonaSwitcher>`.
- **Why P0:** PM-direct-edit journey broken in prod despite green unit tests; predicate `persona.homeDepartmentId !== undefined` is always false.

### CONS-P0-06 — `getOvercommitBreakdown.pctOfOvercommit` math/contract mismatch
- **Source:** Agent D D-CR-02
- **Location:** `src/features/capacity/capacity.read.ts:333-352`
- **Action:** **code-fix (with re-validation step).** Decide canonical contract first (rename or recompute). Then update field, code, contract test, and i18n key.

### CONS-P0-07 — `/api/dashboard/layout` has auth + validation gaps
- **Source:** Agent D D-CR-03
- **Location:** `src/app/api/dashboard/layout/route.ts:62-208`
- **Action:** **code-fix (3 sub-fixes):**
  1. Wrap GET + PUT with `requireRole('viewer')`
  2. Validate `dashboardId` against Zod enum (`'manager' | 'project-leader'`)
  3. Bump `version` via `sql\`${dashboardLayouts.version} + 1\`` instead of hardcoded 1

### CONS-P0-08 — `getOvercommitBreakdown` queries don't scope `people`/`projects` by `organization_id`
- **Source:** Agent D D-CR-04
- **Location:** `src/features/capacity/capacity.read.ts:316-331` (projectRows), `:378-395` (personRows)
- **Action:** **code-fix.** Add `eq(schema.people.organizationId, args.orgId)` and `eq(schema.projects.organizationId, args.orgId)` to the join predicates. Defense-in-depth alignment with the rest of the file.

### CONS-P0-09 — `patchAllocation` throws wrong error class (`HISTORIC_EDIT_NOT_CONFIRMED` vs documented `HISTORIC_CONFIRM_REQUIRED`)
- **Source:** Agent B F-B-02
- **Location:** `src/features/allocations/allocation.errors.ts:10-26` (definition), `src/features/allocations/allocation.service.ts:270` (throw site)
- **Action:** **code-fix.** Retire `HistoricEditNotConfirmedError`. Have `patchAllocation` throw `HistoricConfirmRequiredError` from `lib/errors.ts`. Update tests. Decide HTTP status (409 vs 400) — see CONS-P1-12.

---

## P1 — needs re-validation (5 items, code-or-doc decision required)

### CONS-P1-RV-01 — DepartmentPicker existence (UNBREAK-08)
- **Sources:** Agent C P0-4
- **Question:** Does the persona-switcher's department-picker already cover this requirement, OR was a dedicated `<DepartmentPicker>` always intended? Per plan v1 §0.1 it sounds like dedicated. Per current implementation, persona-switcher is the dispatcher.
- **Decision:** code-fix (build dedicated picker) or doc-fix (acknowledge persona-switcher is the intended UX).

### CONS-P1-RV-02 — RBAC drift on POST/PATCH for people, projects
- **Sources:** Agent A F-A-004
- **Question:** Are `planner`-role users supposed to create/update people and projects, or did the doc (`admin+` requirement) get loosened intentionally?
- **Decision:** code-fix (tighten back to `admin+`) or doc-fix (acknowledge planner has CUD). Security-relevant.

### CONS-P1-RV-03 — `bulkCopyForward` + bulk-copy route missing
- **Sources:** Agent B F-B-03
- **Question:** §6.3 documents this and `ALLOCATION_BULK_COPIED` enum exists, but no implementation. §14 places it in Phase 6.1 polish. Is this still planned?
- **Decision:** code-fix (ship it) or doc-fix (mark §6.3 lines 710-726 deferred and TC-PS-009/010/012/013/014/016 deferred in tc-allowlist.json).

### CONS-P1-RV-04 — `/api/v5/actuals` and `/api/v5/actuals/daily` routes missing
- **Sources:** Agent B F-B-04
- **Question:** §8.1 lists these as required, with read helpers existing in `actuals.read.ts`. Required for which persona journey?
- **Decision:** code-fix (ship thin wrappers) or doc-fix (acknowledge gap).

### CONS-P1-RV-05 — Capacity GET requires `departmentId`; doc says optional
- **Sources:** Agent B F-B-15
- **Question:** R&D persona expects un-scoped capacity reads. R&D doesn't render heatmap directly today, so no functional bug — but contract diverges.
- **Decision:** code-fix (make optional) or doc-fix (acknowledge required).

---

## P1 — definite code-fix (12 items)

### CONS-P1-01 — Inconsistent error response shape across routes
- **Source:** Agent A F-A-005
- **Action:** Migrate inline returns to `AppError.toJSON()` flat shape. ⚠️ Or migrate `AppError.toJSON()` to flat shape if the inline returns are canonical. Decide first.

### CONS-P1-02 — Allocation hours validation max=999, doc says 744
- **Source:** Agent A F-A-011
- **Locations:** `src/features/allocations/allocation.schema.ts:11`, `src/features/import/import.service.ts:163`
- **Action:** Change cap to 744. Add regression test.

### CONS-P1-03 — Flag names use camelCase vs documented dotted form
- **Source:** Agent C P1-1
- **Action:** **doc-fix** — update plan §4 to acknowledge camelCase TS convention.

### CONS-P1-04 — e2e flag-toggle helper missing 2 of 4 v6 flags
- **Source:** Agent C P1-3
- **Location:** `e2e/helpers/flag-toggle.ts`, `e2e/_invariants/flag-off-parity.spec.ts`
- **Action:** Add `setLandingFlag` and `setLeanTrimFlag` helpers; extend flag-off parity invariant.

### CONS-P1-05 — Journey 2D and 5A lack click-count specs
- **Source:** Agent C P1-4
- **Action:** Add `e2e/line-manager/2d-upload-actuals.spec.ts` and `e2e/admin/5a-add-person.spec.ts`.

### CONS-P1-06 — PersonaGate hard-codes `v5.lineManager` namespace
- **Source:** Agent C P1-5
- **Location:** `src/features/personas/persona-route-guard.ts:41`
- **Action:** Switch to `v5.persona.kind.*` map for the `wrongPersonaHint` copy.

### CONS-P1-07 — `notification-bell.test.tsx` mock signature missing 3rd arg
- **Source:** Agent D D-CR-05
- **Location:** `src/components/persona/__tests__/notification-bell.test.tsx:90-92`
- **Action:** Use `vi.fn()` mock; assert `enabled=false` for non-admin personas.

### CONS-P1-08 — `ResourceConflictsPanel` localStorage no SSR guard
- **Source:** Agent D D-CR-07
- **Location:** `src/components/alerts/resource-conflicts-panel.tsx:46-62, 302`
- **Action:** Add `typeof window === 'undefined'` guards to `getDismissed`/`setDismissed`.

### CONS-P1-09 — `OvercommitDialog` deep-link missing `encodeURIComponent`
- **Source:** Agent D D-CR-08
- **Location:** `src/components/dialogs/overcommit-dialog.tsx:159`
- **Action:** Wrap `monthKey` in `encodeURIComponent`.

### CONS-P1-10 — `LmTimelineCell` silent no-op when no allocation in target month
- **Source:** Agent D D-CR-09
- **Location:** `src/components/timeline/lm-timeline-cell.tsx:114-138`
- **Action:** Pass `editable={!!editAllocationId}` to `<PlanVsActualCell>`.

### CONS-P1-11 — `eslint-rules/require-change-log` regex differs from codegen manifest
- **Source:** Agent B F-B-08
- **Action:** Sync regexes via shared module (or copy literal-for-literal).

### CONS-P1-12 — `HistoricConfirmRequiredError` HTTP status 409 vs documented 400
- **Source:** Agent B F-B-01
- **Action:** **decision pre-required.** If 409 is canonical (it's defensible — concurrent-state conflict), update doc §11.1 to move HISTORIC_CONFIRM_REQUIRED out of ValidationError(400) into ConflictError(409). If 400 is canonical, change error class super-call to status 400. Pairs with CONS-P0-09.

---

## P1 — doc-fix bucket (11 items, single ARCHITECTURE.md modernization pass)

ARCHITECTURE.md (the v1.0 root spec, 4708 lines) has been heavily superseded by v5.0/v6.0 milestones but never updated. **Recommendation:** treat all P1 doc-drift as a **single coordinated rewrite task** (not per-finding). Add a header to ARCHITECTURE.md acknowledging it's the v1.0 baseline; reference `.planning/v5.0-ARCHITECTURE.md`, `.planning/milestones/v6.0-ROADMAP.md` as authoritative for later work.

Findings in this bucket:
- F-A-001 (getTenantId/requireRole location)
- F-A-002 (allocation service names)
- F-A-003 (getById renamed)
- F-A-006 (trial enforcement deferred)
- F-A-007 (Stripe deferred)
- F-A-008 (platform admin auth)
- F-A-009 (tenants vs organizations URL — internal contradiction in doc)
- F-A-013 (POST/DELETE allocations routes)
- F-A-014 (middleware → proxy.ts in Next 16)
- F-B-05 (actuals service collapse)
- F-B-06 (planning.service split)
- F-B-10 (date-fns rule name)

---

## P2 — backlog candidates (~27, fix cheap ones inline; defer rest)

Auto-fix during round 1 (cheap):
- D-CR-11 (notification-bell `safeT` fallback)
- D-CR-12 (polish-discipline-rename SQL EXISTS clause — better correctness)
- D-CR-13 (`getDefaultLayout` discriminated union)
- D-CR-15 (discipline-breakdown-widget chartType Zod parse)
- D-CR-16 (next.config.ts `permanent: true` → `false` for /team*, /projects*)
- F-B-12 (collectBlockers shares `getServerNowMonthKey`)
- F-B-14 (drop `US_WEEK_DETECTED` fallback in `use-import-wizard.ts`)
- C-P2-1 (top-nav.tsx href values point at routes that 308-redirect)

Defer / log:
- F-A-010 (seedDefaults wrong defaults — needs product input)
- F-A-012 (withTenant abstraction inconsistent — refactor work)
- F-A-016 (Sentry/Resend not installed — product call)
- F-A-018, F-A-019, F-A-020 (doc-fix, batched)
- F-B-11 (TC-stub tests — covered by Phase 44 deferred plans)
- F-B-13 (change-log invariant exercises 9 of 14 — tighten later)
- F-B-18 (TC-NEG-* allowlist — known deferred)
- F-B-19 (auxiliary import error codes)
- D-CR-14 (RdPortfolioCell testid uniqueness — defense in depth)
- C-P1-6 (empty `/team`, `/wishes` directories — cosmetic)
- C-P1-7 (D-06 deferral not surfaced in plan §0)
- C-P2-2 (widget-registry fallback location drift)
- C-P2-3 (flag-off parity coverage — covered by CONS-P1-04)
- C-P2-4, C-P2-5 (downgraded P3)

---

## P3 — log only (~25 items)

All Agent D D-CR-17 through D-CR-24, all Agent B F-B-09/16/20/21/22, Agent C P3-1..4, Agent A F-A-015/017/021/022. None block.

---

## Recommended round-1 execution order

1. **Re-validate ambiguous P1s** (5 items, parallel agents) — get code-vs-doc decisions before fixing
2. **Apply P0 fixes** (9 items) — atomic commits per fix
3. **Apply definite P1 code-fixes** (12 items) — atomic commits
4. **Apply cheap P2 fixes** (~8 items) — atomic commits
5. **Doc-fix bucket** — single ARCHITECTURE.md modernization commit
6. **Round 2 scan** — fresh agents verify P0+P1 didn't regress
