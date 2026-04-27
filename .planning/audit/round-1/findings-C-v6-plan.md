# Round 1 — Agent C — UI-RESTRUCTURE-PLAN-v2.md conformance audit

**Scope:** `D:\Kod Projekt\Resurs & Projektplanering\.planning\ui-reviews\UI-RESTRUCTURE-PLAN-v2.md` (342 lines, v6.0 source of truth)
**Date:** 2026-04-27
**Mode:** Read-only. Phase 54 QUAD-* skipped per instructions.

## Executive summary

Migration files, default layouts, click-count assertions, NotificationBell, NavItemDef.visibleFor, /alerts tabs, StrategicAlertsBanner, defensive widget fallback, and the i18n `sidebar.personaSections.*` namespace all match the plan. The PersonaRedirect implementation, however, is wired to the wrong server entrypoint — the Clerk-orgRole router at `src/app/page.tsx` was never modified to honour `uiV6Landing`, so the persona chain only runs if a user manually visits `/home`. The `SECTION_NAV` table in `src/components/layout/side-nav.tsx` still holds **zero persona entries** — NAV-02 is not implemented; the existing test suite for it is failing 3/5. Breadcrumbs is still parser-only (R7 not addressed); 5/9 of its tests fail. UNBREAK-08 (DepartmentPicker component) was not built — the line-manager pages fall through to a `safeT()` fallback string instead.

These four gaps reach **P0** because they break documented contract.

## P0 — broken contract

### P0-1 Root `/page.tsx` ignores `uiV6Landing` flag (NAV-01 / R1, plan §1.1, Wave 1)

`src/app/page.tsx:1-24` still hard-codes `getRoleLandingPage(orgRole)` and unconditionally calls `redirect()` from a server component. Plan §1.1 specifies "(app)/page.tsx becomes a client component … gate behind the new `uiV6.landing` flag". No `(app)/page.tsx` exists (`Glob src/app/(app)/page.tsx` → no files). The `PersonaRedirect` client component was placed at `src/app/(app)/home/page.tsx:20-35` instead, but nothing in the auth-redirect chain points to `/home`. Result: signed-in users land on `/dashboard` or `/dashboard/team` exactly as in v5.0 — `uiV6Landing=true` has no observable effect. The component header comment at `home/page.tsx:13` even documents this expectation ("The server root (src/app/page.tsx) redirects here when uiV6Landing is on") but the server root never received the change.

- **Severity:** P0
- **Location:** `src/app/page.tsx:1-24`
- **Doc reference:** UI-RESTRUCTURE-PLAN-v2.md §1.1, Wave 1
- **Suggested action:** code-fix

### P0-2 `SECTION_NAV` has zero persona-keyed sections (NAV-02, plan §6)

`src/components/layout/side-nav.tsx:22-73` still keys `SECTION_NAV` by route prefix (`/input`, `/team`, `/projects`, `/data`, `/dashboard`, `/scenarios`, `/admin`). No entries for `/pm`, `/line-manager`, `/staff`, `/rd`. `usePersona()` is not imported, `useFlags()` is not imported, `personaSections.*` translation keys (which exist — see P1-2) are never read. Visiting `/pm` triggers fallback at line 84 (`SECTION_NAV[sectionKey] ?? SECTION_NAV['/dashboard']`), which renders manager dashboard headings under the PM persona. Vitest confirms 3/5 tests fail in `src/components/layout/__tests__/side-nav.test.tsx` ("renders PM section when persona is pm", "renders line-manager section …", "renders admin section items by default"). The test file flags the gap at lines 11-17: `PERSONA_SECTION_NAV` was never exported and was tracked in `.planning/phases/52-per-journey-friction-fixes/deferred-items.md` for "Phase 53 follow-up" — Phase 53 shipped without it.

- **Severity:** P0
- **Location:** `src/components/layout/side-nav.tsx:22-73`
- **Doc reference:** UI-RESTRUCTURE-PLAN-v2.md §6, NAV-02
- **Suggested action:** code-fix

### P0-3 `Breadcrumbs` is still parser-only (R7, plan §1.3 EXPANDED)

`src/components/layout/breadcrumbs.tsx:1-33` is 33 lines, exactly the original parser. No persona import, no `useFlags`, no Home link, no `useTranslations`. Plan §1.3 is explicit: "marked 'new component logic, not patch'" with Home-link, persona-aware labels, and snapshot refresh. Vitest: 5/9 tests fail in `src/components/layout/__tests__/breadcrumbs.test.tsx`, including "renders Home link with correct href" and all 3 snapshot tests.

- **Severity:** P0
- **Location:** `src/components/layout/breadcrumbs.tsx:1-33`
- **Doc reference:** UI-RESTRUCTURE-PLAN-v2.md §1.3, NAV-03
- **Suggested action:** code-fix

### P0-4 `DepartmentPicker` component never built (UNBREAK-08, plan v1 §0.1)

Plan Wave 0.1 mandates "Wire Phase 41 department picker into `/line-manager` and `/line-manager/timeline`" with a new `<DepartmentPicker>` component. Pre-flight (Wave −1) was supposed to verify it. Search for `DepartmentPicker` in `src/` returns zero hits; only planning docs reference it. The line-manager surfaces (`src/app/(app)/line-manager/page.tsx:100-104` and `src/app/(app)/line-manager/timeline/page.tsx:125-129`) detect missing `departmentId` and render a `safeT()` fallback string ("Select a department in the persona switcher.") because the i18n key `v5.lineManager.home.selectDepartment` does not exist in `messages/sv.json` or `messages/en.json`. Functionally the user sees readable English text instead of a key, so the symptom is masked — but the deliverable (an actual picker) is missing. The flow still requires the user to find the persona-switcher in the top-nav and pick the department there.

- **Severity:** P0
- **Location:** `src/app/(app)/line-manager/page.tsx:100-104`, `src/app/(app)/line-manager/timeline/page.tsx:125-129`
- **Doc reference:** UI-RESTRUCTURE-PLAN-v2.md v1 §0.1, UNBREAK-08
- **Suggested action:** re-validate-needed (might be doc-fix if the persona-switcher implementation was the intended replacement)

## P1 — diverges from plan

### P1-1 Flag names use camelCase, not the dotted form documented in §4

Plan §4 lists `'uiV6.landing' | 'uiV6.leanTrim' | 'uiV6.perJourney' | 'uiV6.polish'`. Implementation at `src/features/flags/flag.types.ts:1-24` uses camelCase (`uiV6Landing`, etc.). Functionally equivalent; documentation drift only.

- **Severity:** P1
- **Suggested action:** doc-fix (camelCase is conventional in TS)

### P1-2 18 i18n keys exist but `SideNav` doesn't consume them

`src/messages/sv.json:48-67` and `src/messages/en.json:48-67` contain all 18 `sidebar.personaSections.*` keys verbatim per plan §6. Pure i18n dead code until P0-2 ships.

- **Severity:** P1 (dependency of P0-2)
- **Suggested action:** code-fix (will resolve when P0-2 lands)

### P1-3 e2e flag-toggle helper covers only 2 of 4 v6 flags

`e2e/helpers/flag-toggle.ts` exports `enablePerJourney/disablePerJourney/setPolishFlag` only. No `setLandingFlag` or `setLeanTrimFlag`. `e2e/_invariants/flag-off-parity.spec.ts:11-16` only imports per-journey/polish setters; landing and lean-trim parity are never asserted against the flag-off path.

- **Severity:** P1
- **Suggested action:** code-fix

### P1-4 Journey 2D and 5A lack click-count specs

Plan §1 table lists 13 journeys with click targets; §10 says "every target is now a Playwright assertion on a `data-clicks` counter". Missing: `e2e/line-manager/2d-upload-actuals.spec.ts` (target 2 clicks) and `e2e/admin/5a-add-person.spec.ts` (target 2 clicks). 11 of 13 journeys have click-count specs.

- **Severity:** P1
- **Suggested action:** code-fix (test gap)

### P1-5 PersonaGate hard-codes `v5.lineManager` namespace

`src/features/personas/persona-route-guard.ts:41` calls `useTranslations('v5.lineManager')` and reads `wrongPersonaHint.*` from there. The `v5.persona.kind.*` map (sv.json:534-540) IS consumed by `persona-switcher.tsx:122` (so K11 spirit lands), but the PersonaGate copy still uses lineManager namespace as a catch-all even when gating PM/RD/Admin.

- **Severity:** P1
- **Suggested action:** code-fix

### P1-6 Empty legacy directories left behind

`src/app/(app)/team/` and `src/app/(app)/wishes/` are empty directories (page files correctly deleted, redirects active). Cosmetic.

- **Severity:** P2 (not P1)
- **Suggested action:** code-fix

### P1-7 Legacy widget retention not surfaced in plan §0 R4

Plan row R4 says "3 dead widgets confirmed (`discipline-progress`, `discipline-demand`, `project-impact`) — v1 correct, no change". Confirmed deleted. However `src/features/dashboard/widgets/index.ts:7-21` still imports `bench-report-widget`, `strategic-alerts-widget`, `discipline-chart-widget`, `discipline-distribution-widget`, `resource-conflict-widget`. The `default-layouts.ts:1-19` header comment justifies this under D-06: "physical deletion is deferred to a post-rollout cleanup phase" — matches plan §8's "files kept for one milestone post-flag-on" rollback rule.

- **Severity:** P1
- **Suggested action:** doc-fix (plan §0 should make D-06's deferral explicit)

## P2 — code quality

### P2-1 `top-nav.tsx` `NAV_ITEMS` href values point at routes that 308-redirect

`src/components/layout/top-nav.tsx:69-72,109-110` uses `href: '/projects'` and `href: '/team'`. `next.config.ts:8-15` permanently redirects both. Browser follows the 308 but Next's `<Link>` prefetcher fetches source page metadata before the redirect resolves. Update to `/admin/people` and `/admin/projects` directly.

- **Severity:** P2
- **Suggested action:** code-fix

### P2-2 `widget-registry.ts` lacks the documented defensive fallback at the registry layer

Plan LEAN-08 specifies fallback in `widget-registry.ts`. Implementation places it at `src/features/dashboard/dashboard-layout-engine.tsx:256-261` (renderer layer); `widget-registry.ts:24-26` returns `undefined`. Contract satisfied behaviourally; location differs from plan.

- **Severity:** P2
- **Suggested action:** doc-fix or code-fix (location-only drift)

### P2-3 flag-off parity invariant only covers per-journey

`e2e/_invariants/flag-off-parity.spec.ts:32-46` exercises only `disablePerJourney`. No parallel block for `uiV6Landing=false` or `uiV6LeanTrim=false`. Plan §8 sets <1 min RTO via flag flip per wave; without invariant coverage there's no CI gate proving the flip returns to pre-wave behavior.

- **Severity:** P2
- **Suggested action:** code-fix

### P2-4 `next.config.ts` redirects asymmetric for `/team/:path*` vs `/projects/:path*`

`next.config.ts:11-13` has `/team/:path*` rule (correct) but no `/projects/:path*` because `/projects/:projectId` stays live (verified: `src/app/(app)/projects/[projectId]/page.tsx` exists; the hard-coded back-link at line 167 was correctly fixed to `/admin/projects` per plan K1). Conformance OK; flagging because the asymmetry is non-obvious.

- **Severity:** P3 (downgraded — intentional)
- **Suggested action:** log-only

### P2-5 `useAlertCount(monthFrom, monthTo, adminEnabled)` was a review-fix (WR-02)

`src/components/persona/notification-bell.tsx:64-69` documents that PM/LM/RD users were polling `/api/analytics/alerts/count` despite the count being consumed only in the admin branch. Fixed post-Phase 53 in WR-02. Suggests insufficient pre-merge load coverage; current code is correct.

- **Severity:** P3
- **Suggested action:** log-only

## P3 — known-deferred / nits

### P3-1 Phase 54 QUAD-01..03 not implemented — by design (POLISH-07 telemetry)

### P3-2 `FLAG_ROUTE_MAP` entries for `uiV6.*` are empty arrays

`src/features/flags/flag.types.ts:32-35`. Plan never specifies route gating via FLAG_ROUTE_MAP for v6 flags (gating is component-level). Empty arrays intentional but type forces registration — consider making `routes` optional.

### P3-3 `PersonaRedirect` mounts at `/home` with no incoming production link

`src/app/(app)/home/page.tsx:20-35` reachable only via direct nav. Even after P0-1 fix, the `/home` URL collides with `sidebar.personaSections.pmHome` = "Hem". Route through `(app)/page.tsx` per plan §1.1 step 1.

### P3-4 `LEGACY_LAYOUTS` and `DEFAULT_LAYOUTS` widget lists match plan §5 exactly

No finding — confirms conformance.

## What is on-spec (no findings)

- `next.config.ts` 308 redirects: `/team`, `/team/:path*`, `/projects`, `/wishes` all present with `permanent: true`. Source page files deleted.
- `messages/{sv,en}.json` `sidebar.personaSections.*`: exactly 18 keys each, match plan §6 verbatim.
- 3 polish SQL migrations exist at `src/db/migrations/20260422_polish_*.sql`; idempotent + "NOT wired into drizzle-kit's journal" per design.
- `NotificationBell`: persona-scoped (PM=rejected wishes, LM=pending approvals, RD=overcommits, Staff=null, Admin=fall-through), mutually-exclusive with legacy bell at `top-nav.tsx:240-258`, hooks gated per persona, 99+ cap, sr-only live region.
- `NavItemDef.visibleFor: PersonaKind[]` in `top-nav.tsx:41-49` with filter at lines 160-166. Filter ordering (flag gate before visibleFor) preserved.
- `/alerts` tabbed page: 2-tab tablist, allowlist guard `parseTab()`, ResourceConflictsPanel extracted, flag-off renders legacy AlertList.
- `StrategicAlertsBanner` mounted inline on `dashboard-content.tsx:20`, gated by `flags.uiV6Polish`.
- `/api/v5/proposals/queue/count` and `/api/v5/capacity/overcommit/count` route files exist.
- Click-count assertions: 11 of 13 journeys covered.
- Defensive widget fallback "Widget ej tillganglig": `dashboard-layout-engine.tsx:256-261`.
- 4 v6 flags exist (modulo P1-1 naming). Defaults OFF in `flag.service.ts:10-20` and `flag.context.tsx:13`.
- Originally-dead widget files (discipline-progress, discipline-demand, project-impact) confirmed deleted from disk.

## Summary

- **P0:** 4 findings
- **P1:** 7 findings (5 code-fix candidates, 2 doc-fix candidates)
- **P2:** 5 findings
- **P3:** 4 findings (deferred/log-only)

## Areas inspected

- `src/app/page.tsx`, `src/app/(app)/home/page.tsx`
- `src/components/layout/{side-nav,breadcrumbs,top-nav}.tsx`
- `src/app/(app)/{line-manager,line-manager/timeline,pm,staff,rd,alerts}/page.tsx`
- `src/components/persona/notification-bell.tsx`
- `src/features/flags/{flag.types,flag.service,flag.context}.ts`
- `src/features/dashboard/{default-layouts.ts,widgets/index.ts,widget-registry.ts,dashboard-layout-engine.tsx}`
- `src/components/alerts/strategic-alerts-banner.tsx`
- `src/messages/{sv,en}.json` (sidebar + persona namespaces)
- `next.config.ts`
- `src/db/migrations/20260422_polish_*.sql`
- `e2e/helpers/flag-toggle.ts`, `e2e/_invariants/flag-off-parity.spec.ts`, journey specs in `e2e/{pm,line-manager,staff,rd,admin}/`
- Vitest runs of `side-nav.test.tsx`, `breadcrumbs.test.tsx`

## Notes

- Round 2 should verify P0-1 through P0-4 against the post-ship review-fix backlog. If any are tracked as known-deferred items in `.planning/phases/53-chrome-polish/deferred-items.md`, treat as P1 plan-drift; otherwise they are real P0 contract breaks that escaped the v6.0 ship.
- P0-2 is the most surprising: tests for `PERSONA_SECTION_NAV` already exist and are failing — meaning the plan was scoped, the test file was committed, and the implementation was never done. Worth checking the deferred-items log to see if this was deliberately deferred or simply missed.
