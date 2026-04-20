---
phase: 51
slug: lean-cleanup-duplicate-removal
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 51-01-01 | 01 | 1 | LEAN-01..03 | — | N/A | integration | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 51-01-02 | 01 | 1 | LEAN-05 | T-51-01 | SQL injection safe (parameterized) | migration | manual DB verification | — | ⬜ pending |
| 51-02-01 | 02 | 2 | LEAN-06 | — | N/A | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 51-02-02 | 02 | 2 | LEAN-09 | — | N/A | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 51-02-03 | 02 | 2 | LEAN-10 | — | N/A | snapshot | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for redirect verification (LEAN-01..03)
- [ ] Test stubs for widget-registry fallback (LEAN-09)
- [ ] PDF snapshot baseline capture (LEAN-10)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production dashboard_layouts migration | LEAN-05 | Requires prod DB access | Re-run VERIFY-05 SQL on production Neon branch; verify 0 dead widget references remain |
| Feature flag rollback | LEAN-07 | Requires flag toggle in production | Toggle uiV6LeanTrim OFF; verify original layouts render |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
