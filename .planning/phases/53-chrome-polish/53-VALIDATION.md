---
phase: 53
phase-slug: chrome-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 53 — Validation Strategy

> Per-phase validation contract for feedback sampling during Phase 53 (Chrome Polish) execution.
> Derived from `53-RESEARCH.md` §Validation Architecture (lines ~701-758) and the five approved PLAN.md files.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Unit/Integration framework** | Vitest ^2.1.9 (with React Testing Library for component tests) |
| **E2E framework** | Playwright ^1.59.1 |
| **DB integration harness** | PGlite (used by existing migration tests — precedent in Phase 51 LEAN-11) |
| **Config files** | `vitest.config.ts` (root), `e2e/playwright.config.ts` |
| **Quick run command** | `pnpm test` (Vitest; ~10s) or `pnpm test --run <path>` for scoped |
| **Full suite command** | `pnpm test && pnpm test:e2e` |
| **Typecheck** | `pnpm typecheck` (exit 0 required per task) |
| **Build gate** | `pnpm build` (smoke — runs at wave boundaries, notably after Plan 02 + Plan 05) |
| **Estimated runtime** | Unit: ~15 s; Full E2E: ~3–5 min |

All infrastructure already exists in the repo. No Wave 0 framework installation is required; only test-file scaffolding.

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` `<verify>` command (each plan's task specifies exact scoped commands — typically < 10 s).
- **After every plan wave completes:**
  - Wave 0: `pnpm typecheck && pnpm test --run src/features/flags src/messages && pnpm test:e2e --list | grep _diagnostic`
  - Wave 1: `pnpm typecheck && pnpm test --run src/app/api/v5/capacity src/features/proposals src/components/persona src/components/layout src/features/dashboard src/components/charts src/db/migrations`
  - Wave 2: `pnpm typecheck && pnpm test --run src/components/alerts src/features/dashboard src/db/migrations && pnpm build`
  - Wave 3: `pnpm typecheck && pnpm test && pnpm test:e2e -- e2e/_viewport e2e/_invariants e2e/alerts && pnpm build`
- **Before `/gsd-verify-work`:** full `pnpm test && pnpm test:e2e` green; all three SQL migrations applied and asserted idempotent.
- **Max feedback latency:** 15 s per task commit; ~5 min per wave; ~8 min full suite.

---

## Per-Task Verification Map

Rows are ordered by Wave → Plan → Task ID. Column `File Exists` marks whether the test file currently exists (`⚠️`) vs. is a Wave 0/subsequent-wave scaffold gap (`❌`). `Threat Ref` cites the plan's `<threat_model>` STRIDE table.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 53-01-01 | 01 | 0 | POLISH-FLAG | — | `uiV6Polish: false` default asserted; no privilege change | unit | `pnpm test --run src/features/flags` | ⚠️ extend `flag.service.test.ts` | ⬜ pending |
| 53-01-02 | 01 | 0 | POLISH-FLAG (i18n) | T-53-02 | next-intl escapes ICU interpolation; no `dangerouslySetInnerHTML` | unit | `pnpm test --run src/messages/__tests__/keys.test.ts` | ⚠️ existing parity test; passes once keys land | ⬜ pending |
| 53-01-03 | 01 | 0 | POLISH-FLAG (help stub + viewport baseline) | T-53-01, T-53-03, T-53-04 | `/help` is static (no tenant data, `rel="noreferrer"`); `setPolishFlag` helper confined to `e2e/helpers/` | E2E (diagnostic, soft) | `pnpm typecheck && pnpm test:e2e --list \| grep _diagnostic` | ❌ create `e2e/_viewport/_diagnostic.spec.ts`, `e2e/helpers/flag-toggle.ts`, `src/app/(app)/help/page.tsx` | ⬜ pending |
| 53-02-01 | 02 | 1 | POLISH-01 (R&D count endpoint, D-01) | T-53-06, T-53-07 | `requireRole('rd')` enforces role+tenant; integration test Test 3 asserts tenant isolation | integration | `pnpm test --run src/app/api/v5/capacity/overcommit/__tests__/count.test.ts` | ❌ create | ⬜ pending |
| 53-02-02 | 02 | 1 | POLISH-01 (NotificationBell + persona invalidation, D-FLAG) | T-53-08, T-53-09, T-53-10 | PM branch uses `useAuth().userId` (not `persona.personId`); invalidation list prevents stale count leak across persona switches; Staff bell returns null | unit | `pnpm test --run src/components/persona/__tests__/notification-bell.test.tsx src/features/personas` | ❌ create `notification-bell.test.tsx` | ⬜ pending |
| 53-02-03 | 02 | 1 | POLISH-02 (visibleFor + Help NAV_ITEM, D-03 LITERAL) | T-53-10 | Staff persona gets empty center-nav (only Help + logo); flag-off preserves legacy filter | unit | `pnpm test --run src/components/layout/__tests__/top-nav.visibleFor.test.tsx` | ❌ create | ⬜ pending |
| 53-03-01 | 03 | 1 | POLISH-03 (donut chart primitive, D-02) | — | Empty-state short-circuit (Pitfall 7); no DOM injection (recharts-managed SVG) | unit | `pnpm test --run src/components/charts/__tests__/discipline-donut.test.tsx` | ❌ create | ⬜ pending |
| 53-03-02 | 03 | 1 | POLISH-03 (unified widget + normalize, D-02/D-07) | — | `normalizeProjectStaffing` unit-tested on shared fixture (Pitfall 5); enabled-gates prevent hook-firing for inactive scope | unit | `pnpm test --run src/features/dashboard/widgets/__tests__/discipline-breakdown-widget.test.tsx` | ❌ create | ⬜ pending |
| 53-03-03 | 03 | 1 | POLISH-03 (default-layouts swap + migration, D-02/D-06) | T-53-12, T-53-13, T-53-14, T-53-15 | Migration idempotent + tenant-scoped (in-place UPDATE, no cross-tenant mixing) | unit + integration (PGlite) | `pnpm test --run src/features/dashboard/__tests__/default-layouts.test.ts src/db/migrations/__tests__/polish-discipline-rename.test.ts` | ⚠️ extend layout test; ❌ create migration test + SQL | ⬜ pending |
| 53-04-01 | 04 | 2 | POLISH-06 (banner + mount, D-FLAG) | T-53-17, T-53-20 | `useAlerts` already tenant-scoped; banner is pass-through; CTA is static `/alerts` href | unit | `pnpm test --run src/components/alerts/__tests__/strategic-alerts-banner.test.tsx` | ❌ create | ⬜ pending |
| 53-04-02 | 04 | 2 | POLISH-04 + POLISH-06 (strip migration + layouts, D-06) | T-53-16, T-53-18, T-53-19 | Migration idempotent (Test 11); empty-layout rows handled by Phase 51 LEAN-08 fallback; WHERE clause scoped to rows containing the stripped IDs | unit + integration (PGlite) | `pnpm test --run src/features/dashboard/__tests__/default-layouts.test.ts src/db/migrations/__tests__/polish-strip-widgets.test.ts` | ⚠️ extend layout test; ❌ create migration test + SQL | ⬜ pending |
| 53-05-01 | 05 | 3 | POLISH-05 (panel + tabbed /alerts, D-FLAG) | T-53-21, T-53-22 | `?tab=` allowlist narrowed to `'warnings' \| 'conflicts'` with default fallthrough; localStorage origin-scoped (Clerk session isolation) | unit | `pnpm test --run src/components/alerts/__tests__/resource-conflicts-panel.test.tsx src/app/(app)/alerts/__tests__/tabs.test.tsx` | ❌ create both | ⬜ pending |
| 53-05-02 | 05 | 3 | POLISH-05 (strip resource-conflicts from 3 slots, D-06) | T-53-23 | Migration idempotent + tenant-in-place (same pattern as Plans 03/04) | unit + integration (PGlite) | `pnpm test --run src/features/dashboard/__tests__/default-layouts.test.ts src/db/migrations/__tests__/polish-strip-resource-conflicts.test.ts` | ⚠️ extend layout test; ❌ create migration test + SQL | ⬜ pending |
| 53-05-03 | 05 | 3 | POLISH-07 (soft viewport) + POLISH-FLAG (parity) | T-53-24, T-53-25, T-53-26 | Viewport specs capture-only (no `expect()` on overflow per D-04); `setPolishFlag` confined to `e2e/helpers/`; parity spec restores flag in `afterAll` | E2E (soft viewport + invariants + tabs journey) | `pnpm test:e2e -- e2e/_viewport e2e/_invariants/flag-off-parity.spec.ts e2e/alerts/polish-tabs.spec.ts` | ❌ create 4 spec files; ⚠️ extend `flag-off-parity.spec.ts` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Requirement coverage matrix

| Requirement | Covered by Task(s) | Layer(s) |
|-------------|--------------------|----------|
| POLISH-FLAG | 53-01-01, 53-01-02, 53-01-03, 53-05-03 | unit + E2E |
| POLISH-01 | 53-02-01, 53-02-02 | unit + integration |
| POLISH-02 | 53-02-03 | unit |
| POLISH-03 | 53-03-01, 53-03-02, 53-03-03 | unit + integration |
| POLISH-04 | 53-04-02 | unit + integration |
| POLISH-05 | 53-05-01, 53-05-02, 53-05-03 (tabs journey) | unit + integration + E2E |
| POLISH-06 | 53-04-01, 53-04-02 | unit + integration |
| POLISH-07 | 53-05-03 (soft — D-04) | E2E (capture-only) |

Every requirement from `.planning/REQUIREMENTS.md` §Chrome Polish (POLISH-01..POLISH-07 + POLISH-FLAG) has at least one automated layer.

---

## Wave 0 Requirements

- [ ] **Extend** `src/features/flags/__tests__/flag.service.test.ts` — add `uiV6Polish: false` default assertion (single-line addition to existing test block)
- [ ] **Create** `src/app/(app)/help/page.tsx` — stub client component reading `useTranslations('v6.polish.help')`
- [ ] **Create** `e2e/helpers/flag-toggle.ts` — `setPolishFlag(enabled: boolean)` helper
- [ ] **Create** `e2e/_viewport/_diagnostic.spec.ts` — 2 tests (manager + project-leader dashboards at 1440×900 with `uiV6Polish=OFF`) capturing `scrollHeight` via `test.info().attach`; NO `expect()` on overflow (soft diagnostic per D-04/D-05)
- [ ] **Extend** `e2e/lib/seed.ts` — insert `{flag_name:'uiV6Polish', enabled:true}` for the test tenant (mirror Phase 52 `uiV6PerJourney` precedent)
- [ ] **Register** 16 i18n keys under `v6.polish.*` in `src/messages/sv.json`, `src/messages/en.json`, and `src/messages/keys.ts` (bell×4, help×3, alerts.tabs×2, banner×2, discipline×2, nav×3 including `home`/`help`/`helpDesc`)
- [ ] Ensure `src/messages/__tests__/keys.test.ts` (existing parity enforcer) passes once the 16 keys land

No framework installation. No `@axe-core/playwright` install (a11y zero-violation gate is out of Phase 53 scope per RESEARCH §Environment Availability — escalate if UI-RESTRUCTURE-PLAN §7 requires it).

---

## Manual-Only Verifications

Per research, every POLISH requirement has automated coverage. The following items are flagged as **soft/manual observation** rather than gated assertions — they feed Phase 54 planning but do not fail Phase 53:

| Behavior | Requirement | Why Manual / Soft | Test Instructions |
|----------|-------------|-------------------|-------------------|
| Manager dashboard 1440×900 zero-scroll fit | POLISH-07 | D-04 locks this as a SOFT gate — Phase 53 measures but does not assert. Real layout redesign is deferred to Phase 54 with measurements in hand. | Run `pnpm test:e2e -- e2e/_viewport/manager-dashboard-1440x900.spec.ts`; read the attached JSON artifact in Playwright report; compare overflow to the Wave 0 `_diagnostic.spec.ts` baseline. |
| Project-leader dashboard 1440×900 zero-scroll fit | POLISH-07 | Same — D-04 SOFT gate. | Same, for `/dashboard/projects` spec. |
| Visual chrome smoke across personas | POLISH-01 + POLISH-02 | RTL snapshots cover structure; pixel-level verification not gated. | Dev-server personas: PM, LM, R&D, Staff, Admin × uiV6Polish=ON/OFF. Visit `/pm`, `/line-manager/approval-queue`, `/alerts`, `/staff`, `/admin/disciplines`. Confirm bell per persona; Staff center-nav shows only Help. |
| Tenant custom-layout migration result on prod-like Neon branch | POLISH-03 + POLISH-04 + POLISH-05 + POLISH-06 | Automated PGlite tests cover idempotency; real tenant-fixture volume is an operational smoke. | Before merge, run all 3 migrations against dev Neon; `SELECT count(*) FROM dashboard_layouts WHERE layout::text ~* '(discipline-chart\|discipline-distribution\|bench-report\|strategic-alerts\|resource-conflicts)'` — expected 0 after. Document row counts in each plan's SUMMARY. |

---

## Threat Coverage Summary

Each plan's `<threat_model>` STRIDE register is consolidated below to confirm every mitigated threat maps to an automated verification:

| Threat ID | Plan | Disposition | Verified By |
|-----------|------|-------------|-------------|
| T-53-01 | 01 | accept | — (static help page; no test) |
| T-53-02 | 01 | mitigate | `keys.test.ts` parity + next-intl default-escape |
| T-53-03 | 01 | mitigate | `grep -r "from.*e2e/helpers/flag-toggle" src/` returns 0 (production-import check) |
| T-53-04 | 01 | accept | Viewport artifact content review (numbers only) |
| T-53-05 | 01 | accept | — |
| T-53-06 | 02 | mitigate | `count.test.ts` Test 4 (401 on unauthenticated) |
| T-53-07 | 02 | mitigate | `count.test.ts` Test 3 (tenant isolation) |
| T-53-08 | 02 | mitigate | `notification-bell.test.tsx` persona-switch invalidation coverage + grep for 3 query keys in `persona.context.tsx` |
| T-53-09 | 02 | mitigate | `notification-bell.test.tsx` Test 3 (PM uses Clerk `useAuth().userId`, not `persona.personId`) |
| T-53-10 | 02 | mitigate | `top-nav.visibleFor.test.tsx` Test 2 (Staff center-nav narrowing) |
| T-53-11 | 02 | accept | — |
| T-53-12 | 03 | mitigate | `polish-discipline-rename.test.ts` Test 8 (idempotency) |
| T-53-13 | 03 | accept | — |
| T-53-14 | 03 | mitigate | PGlite test assertion on tenant-in-place UPDATE |
| T-53-15 | 03 | accept | — |
| T-53-16 | 04 | mitigate | `polish-strip-widgets.test.ts` Test 11 (idempotent) |
| T-53-17 | 04 | accept | — |
| T-53-18 | 04 | mitigate | `polish-strip-widgets.test.ts` Test 9 (empty layout survives); Phase 51 LEAN-08 fallback |
| T-53-19 | 04 | mitigate | PGlite assertion scope (WHERE clause) |
| T-53-20 | 04 | accept | — |
| T-53-21 | 05 | mitigate | `tabs.test.tsx` Tests 3-5 (allowlist narrowing via type assertion + fallthrough) |
| T-53-22 | 05 | accept | — |
| T-53-23 | 05 | accept | — |
| T-53-24 | 05 | accept | — |
| T-53-25 | 05 | mitigate | Production-import grep check (same as T-53-03) |
| T-53-26 | 05 | accept | — |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (longest dry stretch: 0; every task above has a command)
- [ ] Wave 0 scaffolds every ❌ test file before Wave 1 fires
- [ ] No `--watch` flags in CI commands (all `--run` or Playwright one-shot)
- [ ] Feedback latency < 15 s per task; < 5 min per wave
- [ ] Requirement coverage matrix: POLISH-01..07 + POLISH-FLAG each covered by ≥ 1 automated task
- [ ] Threat coverage summary: every `mitigate` disposition has a named verifier
- [ ] SQL migrations (3 total) each have a PGlite integration test asserting idempotency + tenant scoping
- [ ] `nyquist_compliant: true` set in frontmatter once Wave 0 completes and all ❌ entries flip to ⚠️/✅

**Approval:** pending
