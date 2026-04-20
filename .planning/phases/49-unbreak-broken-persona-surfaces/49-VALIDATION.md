---
phase: 49
slug: unbreak-broken-persona-surfaces
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-15
---

# Phase 49 — Validation Strategy

> Per-phase validation contract. Source: `49-RESEARCH.md §Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit/integration) + Playwright (E2E) |
| **Config file** | `vitest.config.ts` (root) + `e2e/playwright.config.ts` |
| **Quick run command** | `pnpm test <pattern>` |
| **Full suite command** | `pnpm test && pnpm playwright test` |
| **Estimated runtime** | Quick: <10s per file · Full Vitest: ~2min · Full E2E: ~5min |

---

## Sampling Rate

- **After every task commit:** `pnpm test <changed-file-pattern>` (fast Vitest run for affected files)
- **After every plan wave:** `pnpm test && pnpm lint` (full Vitest + ESLint, <2 min)
- **Before `/gsd-verify-work`:** `pnpm test && pnpm playwright test` (full suite, ≤5 min)
- **Max feedback latency:** ~10 seconds per task commit

---

## Per-UNBREAK-0N Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| UNBREAK-01 | `/line-manager` picker renders, no raw key | E2E | `pnpm playwright test e2e/line-manager/heatmap.spec.ts` | ✅ (existing) | ⬜ pending |
| UNBREAK-02 | `/line-manager/timeline` picker renders | E2E | `pnpm playwright test e2e/line-manager/direct-edit.spec.ts` | ✅ (existing) | ⬜ pending |
| UNBREAK-03 | PM Home falls through to empty state (guard order fix) | unit + E2E | `pnpm test src/app/(app)/pm/__tests__/page.test.tsx` + `pnpm playwright test e2e/pm/submit-wish.spec.ts` | ❌ W0 (unit) + ✅ (E2E) | ⬜ pending |
| UNBREAK-04 | `/admin` (Ändringslogg) loads without error banner | manual smoke + dev-log | No spec (CONTEXT D-06 forbids new) — planner records smoke evidence | ❌ — manual | ⬜ pending |
| UNBREAK-05 | `/admin/people` register rows populate | manual smoke + dev-log | Same as UNBREAK-04 | ❌ — manual | ⬜ pending |
| UNBREAK-06 | PersonaGate reads `allowed` prop | unit | `pnpm test src/features/personas/__tests__/persona-route-guard.test.tsx` | ✅ (existing) | ⬜ pending |
| UNBREAK-07 | 12 specs pass against unbroken path | E2E | `pnpm playwright test` (whole suite) | ✅ all 12 exist | ⬜ pending |
| UNBREAK-08 | Department picker in persona-switcher | unit | `pnpm test src/components/persona/__tests__/persona-switcher.test.tsx` | ✅ (existing) | ⬜ pending |
| UNBREAK-09 | PersonaGate uses `v5.persona.kind.*` namespace | unit | Same as UNBREAK-06 | ✅ (existing) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Verify `src/features/personas/__tests__/persona-route-guard.test.tsx` exists — CONFIRMED (3570 bytes, last modified 2026-04-08)
- [x] Verify `src/components/persona/__tests__/persona-switcher.test.tsx` exists — CONFIRMED (3467 bytes, last modified 2026-04-08)
- [x] Confirm `package.json` migrate script name (`pnpm db:migrate` vs `pnpm db:push`) before UNBREAK-04/05 cluster runs — RESOLVED in 49-03-PLAN.md (`pnpm db:migrate` confirmed in `package.json:23`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/admin` (Ändringslogg) loads without error banner | UNBREAK-04 | CONTEXT D-06 forbids new specs in Phase 49; `e2e/admin/` doesn't exist. Admin spec block lands in a later phase. | After migration fix: sign in as admin (Clerk), navigate `/admin`, confirm Ändringslogg entries populate, no "Kunde inte ladda" toast. Capture screenshot + dev-log tail as evidence. |
| `/admin/people` register populates | UNBREAK-05 | Same as above | Same steps for `/admin/people`. |

Coverage gap explicitly flagged per research §Wave 0 Gaps — acceptable because UNBREAK-04/05 fix is environmental (migrations), not code; automated regression lands with the admin spec block in Phase 50 or 51.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (planner fills per-task)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags in commands
- [ ] Feedback latency < 10s per task
- [ ] `nyquist_compliant: true` set in frontmatter after planner verifies map coverage

**Approval:** pending
