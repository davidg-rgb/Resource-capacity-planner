---
phase: 51
slug: lean-cleanup-duplicate-removal
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-20
---

# Phase 51 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 51-01-01 | 01 | 1 | LEAN-01..03, LEAN-04, LEAN-09 | T-51-01 | Redirect destinations hardcoded | unit | `npx vitest run --reporter=verbose` | yes (created in task) | ⬜ pending |
| 51-01-02 | 01 | 1 | LEAN-09 | T-51-02, T-51-03 | Widget ID shown, not sensitive | unit | `npx vitest run src/features/dashboard/__tests__/widget-fallback.test.ts --reporter=verbose` | yes (created in task) | ⬜ pending |
| 51-02-01 | 02 | 2 | LEAN-05, LEAN-06, LEAN-11 | T-51-04, T-51-05 | SQL uses hardcoded string literals | migration + unit | `npx vitest run --reporter=verbose` | yes (created in task) | ⬜ pending |
| 51-02-02 | 02 | 2 | LEAN-07, LEAN-08 | T-51-06 | Flag controls cosmetic layout only | unit | `npx vitest run src/features/dashboard/__tests__/default-layouts.test.ts --reporter=verbose` | yes (created in task) | ⬜ pending |
| 51-03-01 | 03 | 3 | LEAN-10 | T-51-07 | Tests use direct imports, no mocks | integration | `npx vitest run src/features/dashboard/pdf-export/__tests__/team-heatmap-regression.test.ts src/features/dashboard/__tests__/lean-trim-integration.test.ts --reporter=verbose` | yes (created in task) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All test files are created within the tasks that need them (create-and-verify pattern). No separate Wave 0 stubs needed:

- `src/features/dashboard/__tests__/widget-fallback.test.ts` — created in Plan 01 Task 2
- `src/features/dashboard/__tests__/default-layouts.test.ts` — created in Plan 02 Task 2
- `src/features/dashboard/pdf-export/__tests__/team-heatmap-regression.test.ts` — created in Plan 03 Task 1
- `src/features/dashboard/__tests__/lean-trim-integration.test.ts` — created in Plan 03 Task 1

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production dashboard_layouts row count re-audit | LEAN-11 | Requires prod DB access | Re-run VERIFY-05 SQL on production Neon branch at Plan 02 kick-off; record row count in SUMMARY |
| Feature flag rollback (layouts) | LEAN-10 | Requires flag toggle in production | Toggle uiV6LeanTrim OFF; verify original layouts render. Automated test covers `getDefaultLayout(useLegacy=true)` path. |
| Redirect rollback | LEAN-01..03 | Build-time config, not runtime toggle | Rollback = revert next.config.ts redirects() function. Old page files remain on disk per D-07. Documented in Plan 01 Task 1. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] All test files are created within the tasks that verify them (create-and-verify)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
