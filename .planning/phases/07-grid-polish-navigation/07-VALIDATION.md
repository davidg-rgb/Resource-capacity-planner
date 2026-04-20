---
phase: 07
slug: grid-polish-navigation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 07 — Validation Strategy

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

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tab/Enter/Arrow key cell navigation | INPUT-10 | Requires keyboard interaction in browser | Focus cell, press Tab/Enter/Arrows, verify focus moves correctly |
| Drag-to-fill across months | INPUT-09 | Requires mouse drag interaction | Click fill handle, drag right, verify values copied |
| Ctrl+V paste from Excel | INPUT-11 | Requires clipboard + browser paste event | Copy cells in Excel, Ctrl+V in grid, verify values populated |
| Conflict warning on concurrent edit | INPUT-14 | Requires two simultaneous sessions | Edit same cell in two tabs, verify warning on second save |
| Person sidebar with department grouping | INPUT-06 | Requires visual verification of grouping and status dots | Navigate to input form, verify sidebar shows departments with people grouped |
| Prev/next person navigation | INPUT-07 | Requires click interaction | Click prev/next arrows, verify person switches and grid reloads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
