---
phase: 49-unbreak-broken-persona-surfaces
plan: "04"
subsystem: e2e-specs
tags: [playwright, persona, specs, department-picker, empty-state]
dependency_graph:
  requires: [49-01, 49-02, 49-03]
  provides: [UNBREAK-07]
  affects: [e2e/line-manager, e2e/pm, e2e/staff, e2e/rd]
tech_stack:
  patterns: [department-select-in-spec-setup, person-select-in-spec-setup]
key_files:
  modified:
    - e2e/line-manager/heatmap.spec.ts
    - e2e/line-manager/approve.spec.ts
    - e2e/line-manager/direct-edit.spec.ts
    - e2e/line-manager/import.spec.ts
    - e2e/line-manager/reject.spec.ts
    - e2e/pm/monday-checkin.spec.ts
    - e2e/pm/historic-edit.spec.ts
    - e2e/pm/rejected-resubmit.spec.ts
    - e2e/pm/submit-wish.spec.ts
decisions:
  - "LM specs: select department via data-testid persona-switcher-department dropdown after goto (seed has 4 depts, auto-select branch does not fire)"
  - "PM specs: select person via aria-label Project Manager picker after goto (UNBREAK-03 empty-state now visible without explicit selection)"
  - "Staff + R&D specs: no edits needed (personas unaffected by Phase 49 switcher changes)"
metrics:
  duration: 166s
  completed: 2026-04-20T09:28:34Z
  tasks: 3
  files_modified: 9
---

# Phase 49 Plan 04: E2E Spec Alignment for Post-Wave-1 Code Path Summary

All 12 Playwright specs updated (9 edited, 3 verified-pass-without-edit) to align with Wave 1 persona switcher and PM page changes.

## What Changed

### Task 1: 5 LM Specs -- Department Picker Setup (5 commits)

Plan 49-01 introduced a department sub-picker in the persona switcher. The seed database has 4 departments (software-design, electronics-design, mechanical-design, management), so the auto-select branch (fires only for 1-dept tenants) does not activate. All 5 LM specs now explicitly:

1. Wait for `data-testid="persona-switcher-department"` to be visible (5s timeout)
2. Select the first option (`{ index: 0 }`)

This ensures `persona.departmentId` is populated before the LM page's capacity query fires.

**Files:** `e2e/line-manager/{heatmap,approve,direct-edit,import,reject}.spec.ts`
**Commits:** 41103ae, 1aaee15, 6e0fad7, ad4f449, 240c3d5

### Task 2: 4 PM Specs -- Person Selection Guard (4 commits)

Plan 49-02 reordered the PM home guard so `!personaId` falls through to the empty state instead of hanging on a loading spinner. PM specs that assert on project content now explicitly:

1. Wait for the person picker (`select[aria-label="Project Manager"]`) to be visible
2. Select the first person (`{ index: 0 }` -- Anna Lindqvist in the deterministic seed)
3. monday-checkin additionally waits for "Nordlys" text before proceeding

**Files:** `e2e/pm/{monday-checkin,historic-edit,rejected-resubmit,submit-wish}.spec.ts`
**Commits:** 8978669, 93496f1, 7ae714f, 200d1c8

### Task 3: Staff + R&D Specs -- Verified No Edit Needed (0 commits)

Staff and R&D personas are unaffected by Phase 49 changes:
- Staff persona uses `personId` (not department), and the switcher changes only affect the LM department block
- R&D persona has no scoping field at all
- No specs reference old PersonaGate hint copy (confirmed by pre-flight Signal-3)

**Files verified (no changes):** `e2e/staff/read-only.spec.ts`, `e2e/rd/{overcommit-drill,portfolio}.spec.ts`

## Verification Results

| Check | Result |
|-------|--------|
| Total spec file count | 12 (unchanged) |
| No admin/ directory created | Confirmed |
| No `/team`, `/projects`, `/wishes` navigation | Confirmed (grep returns 0) |
| `persona-switcher-department` in LM specs | 5/5 specs |
| Per-spec commits (no empty commits) | 9 commits for 9 edited files, 0 for 3 unedited |
| No new test cases added | Confirmed (only setup blocks modified) |

## Deviations from Plan

None -- plan executed exactly as written.

## Self-Check: PASSED

- [x] 41103ae exists
- [x] 1aaee15 exists
- [x] 6e0fad7 exists
- [x] ad4f449 exists
- [x] 240c3d5 exists
- [x] 8978669 exists
- [x] 93496f1 exists
- [x] 7ae714f exists
- [x] 200d1c8 exists
