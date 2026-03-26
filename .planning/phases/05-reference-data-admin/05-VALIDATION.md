---
phase: 05
slug: reference-data-admin
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 05 — Validation Strategy

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
| 05-01-01 | 01 | 1 | MGMT-03, MGMT-04, MGMT-05 | compile + grep | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 05-01-02 | 01 | 1 | MGMT-03, MGMT-04, MGMT-05 | compile + grep | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Discipline appears in Person form dropdown after creation | MGMT-03 | Requires browser rendering + TanStack Query cache refresh | Create discipline in admin, navigate to Team page, open Add Person form, verify new discipline in dropdown |
| Delete department shows usage count warning | MGMT-04 | Requires browser dialog interaction with live data | Assign people to department, attempt delete, verify warning with count |
| Viewer role cannot access admin pages | MGMT-03/04/05 | Requires Clerk role simulation in browser | Log in as Viewer, navigate to /admin/*, verify redirect or access denied |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
