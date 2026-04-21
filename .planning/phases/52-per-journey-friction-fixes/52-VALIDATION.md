---
phase: 52
slug: per-journey-friction-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Populated from `52-RESEARCH.md` §Validation Architecture. Owns the Nyquist
> sampling map for all 13 requirements (PM-01..PJ-FLAG).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x (unit + contract), Playwright 1.x (E2E), @react-pdf/renderer snapshots |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `pnpm test -- --run` |
| **Full suite command** | `pnpm test -- --run && pnpm test:e2e` |
| **Estimated runtime** | ~180 seconds unit + ~300 seconds Playwright |

---

## Sampling Rate

- **After every task commit:** `pnpm test -- --run --changed` (scoped to touched files)
- **After every plan wave:** `pnpm test -- --run` (full unit suite) + targeted Playwright journey
- **Before `/gsd-verify-work`:** `pnpm test -- --run && pnpm test:e2e` (full green)
- **Max feedback latency:** 60 seconds per task commit, 8 minutes per wave

---

## Per-Requirement Verification Map

| REQ | Plan | Wave | Test Type | Automated Command | File Exists | Status |
|-----|------|------|-----------|-------------------|-------------|--------|
| PM-01 | 52-02 | 2 | unit + E2E | `pnpm test pm-home` + `pnpm test:e2e e2e/pm/1a-monday-checkin.spec.ts` | ❌ W0 | ⬜ pending |
| PM-02 | 52-02 | 2 | unit + E2E | `pnpm test pending-wish-chip` + `pnpm test:e2e e2e/pm/1c-rejected-wish.spec.ts` | ❌ W0 | ⬜ pending |
| PM-03 | 52-02 | 2 | E2E (4-combo matrix) | `pnpm test:e2e e2e/pm/1d-historic-edit.spec.ts` | ❌ W0 | ⬜ pending |
| PM-04 | 52-02 | 2 | snapshot (vitest) | `pnpm test pm-timeline-cell` | ✅ (extend) | ⬜ pending |
| LM-01 | 52-03 | 3 | unit + E2E | `pnpm test use-lm-queue-count` + `pnpm test:e2e e2e/line-manager/2b-approve-reject.spec.ts` | ❌ W0 | ⬜ pending |
| LM-02 | 52-05 | 5 | E2E | `pnpm test:e2e e2e/line-manager/2c-direct-edit.spec.ts` | ❌ W0 | ⬜ pending |
| LM-03 | 52-01 | 1 | contract (vitest) | `pnpm test src/app/api/v5/proposals/queue/count` | ❌ W0 | ⬜ pending |
| STAFF-01 | 52-03 | 3 | contract + E2E | `pnpm test TimelineGrid.readonly` + `pnpm test:e2e e2e/staff/3a-check-schedule.spec.ts` | ❌ W0 | ⬜ pending |
| RD-01 | 52-03 | 3 | unit matrix + E2E | `pnpm test timeline-columns.year` (2026/2027/2028) + `pnpm test:e2e e2e/rd/4a-portfolio-overview.spec.ts` | ⚠️ partial | ⬜ pending |
| RD-02 | 52-03 | 3 | contract + E2E | `pnpm test OvercommitDialog.contract` + `pnpm test:e2e e2e/rd/4b-overcommit-drilldown.spec.ts` | ❌ W0 | ⬜ pending |
| SHARED-01 | 52-04 | 4 | contract + E2E | `pnpm test usePlanVsActualDrawer.deeplink` + exercised in 1A and 4B specs | ❌ W0 | ⬜ pending |
| ADMIN-01 | 52-04 | 4 | contract + E2E | `pnpm test admin-archive-toast` + `pnpm test:e2e e2e/admin/5b-archive-dependent.spec.ts` | ❌ W0 | ⬜ pending |
| PJ-FLAG | 52-05 | 5 | cross-journey invariant | `pnpm test:e2e e2e/_invariants/flag-off-parity.spec.ts` (every journey with flag off matches Phase 51 behavior) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Cross-Journey Invariants (Nyquist axioms)

These are tested once and apply across all 11 journey specs:

1. **Click-count invariant** — every journey assertion reads `window.__clickCount` after actions and enforces `expect(count).toBeLessThanOrEqual(journey.target)`. CI fails if any journey exceeds.
2. **Flag-off parity invariant** — with `uiV6PerJourney=false`, every journey spec's pre-Phase-52 control path still works (no regression from Phase 51 baseline).
3. **ISO 8601 53-week correctness** — `getISOWeeksInYear(2026) === 53`, `timeline-columns.year` produces 53 week slots for 2026 and 52 for 2027/2028.
4. **Focus-trap preservation** — `Drawer.tsx` focus-trap semantics hold for SHARED-01 deep-link open AND ESC-dismiss (verified via keyboard Tab cycle + Escape key).
5. **Tenant isolation (LM-03)** — `/api/v5/proposals/queue/count` with no auth returns 401; with cross-tenant `departmentId` returns 0 (never leaks).
6. **Axe a11y gate** — each persona landing (`/pm`, `/line-manager`, `/staff`, `/rd`, `/admin`) passes `@axe-core/playwright` zero-violations when `uiV6PerJourney` is on (deferred to Phase 53 if axe install is out of scope — planning decision).

---

## Wave 0 Requirements

- [ ] `src/lib/testing/click-tracker.tsx` — global click-tracker context + `data-clicks` delegated listener
- [ ] `src/app/(app)/layout.tsx` — conditional mount of `ClickTrackerProvider` when `NEXT_PUBLIC_E2E_CLICK_TRACKING === 'true'`
- [ ] `e2e/helpers/click-counter.ts` — `getClickCount(page)` + `resetClickCount(page)` helpers
- [ ] `e2e/helpers/persona-setup.ts` — extended with Phase 52 persona fixtures (default project, pending wish seeds, department with pending proposals, overcommit scenario)
- [ ] `src/features/flags/flag.types.ts` — `uiV6PerJourney` added to `FLAG_NAMES` + `FeatureFlags`
- [ ] `src/features/flags/flag.service.ts` — `uiV6PerJourney: false` default
- [ ] `src/features/flags/flag.context.tsx` — `uiV6PerJourney: false` default
- [ ] `playwright.config.ts` — env override sets `NEXT_PUBLIC_E2E_CLICK_TRACKING='true'` for test runs

**Wave 0 exit criteria:** all boxes checked + `pnpm build` passes with new flag + `pnpm test:e2e --list` shows 11 new specs scaffolded (may skip but listed).

---

## Nyquist Sampling Summary

- **13 REQs** mapped to tests
- **11 Playwright journey specs** (one per journey ID)
- **1 flag-off parity invariant spec** (cross-journey)
- **Targeted unit/contract tests** per component change
- **Sampling rate** ≥ Nyquist minimum: each REQ has ≥1 automated test; integration points (LM-03 ↔ LM-01 badge, zoom ↔ timeline-columns, drawer ↔ router) each have at least 1 spec

---

*Validation strategy scaffolded 2026-04-21. Populated during planning.*
