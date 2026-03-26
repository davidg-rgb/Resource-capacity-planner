---
phase: 06
slug: ag-grid-spike-core-grid
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (tsc) |
| **Config file** | tsconfig.json |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | INPUT-01, INPUT-02, INPUT-12 | compile + grep | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | INPUT-03, INPUT-04, INPUT-05, INPUT-08 | compile + grep | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 2 | INPUT-13 | compile + grep | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 2 | INPUT-01 | compile + grep | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Grid renders with month columns and project rows | INPUT-01 | Requires AG Grid rendering in browser | Navigate to person input form, verify grid layout |
| Cell editing saves on blur within 500ms | INPUT-02, INPUT-13 | Requires browser interaction timing | Edit cell, blur, check network tab for save request |
| SUMMA row updates in real time | INPUT-03 | Requires AG Grid pinned row reactivity | Change cell value, verify SUMMA row recalculates instantly |
| Status row shows correct colors | INPUT-05 | Requires visual color verification | Set allocation to >100%, verify red indicator |
| Past months are read-only | INPUT-12 | Requires date-based conditional rendering | Try clicking past-month cell, verify no editing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
