---
agent: D-code-reviewer
round: 3
scanned_at: 2026-04-27
codebase_head: 09da8fc
---

# Round 3 — Code Review (Agent D)

## Round 2 fix verification

| ID | Topic | Status |
|---|---|---|
| R2-P0-01 (D-CR-100) | Error wire shape canonicalized on 7 routes | **PASS** ✓ |
| R2-P0-02 (D-CR-101) | `focus-trap-react` + `@axe-core/playwright` installed | **PASS** ✓ |
| R2-P1-01 (D-CR-102) | `/rd` flag-OFF dialog button disabled | **PASS** ✓ |
| R2-P1-02 (D-CR-103) | Brand consistency + i18n | **PASS** ✓ |
| R2-P1-03 (D-CR-104) | Sidenav dead links removed | **PASS** ✓ |
| R2-P1-04 (D-CR-105) | Top-nav search inputs removed | **PASS** ✓ |
| R2-P1-09 (P1-101 / K12) | Members route migrated | **PASS** ✓ |
| R2-P1-10 (F-A-105) | DB CHECK constraint + runbook | **PASS** ✓ |
| D-CR-107 | `/api/people` GET role check | **PASS** ✓ |
| D-CR-109 | `OvercommitDialog` scope narrowed | **PASS** ✓ |
| D-CR-110 | Breadcrumb `LABEL_MAP` | **PASS** ✓ |
| D-CR-111 | Mobile menu Escape | **PASS** ✓ |

**All 12 R2 items verified PASS. Convergence achieved.**

## Pre-existing test debt — verified

- **`top-nav.visibleFor.test.tsx` Tests 1, 3, 4, 5, 7** — STILL FAILING. Tests 3-6 assert `/projects` and `/team` hrefs; R1 C-P2-1 changed to canonical `/admin/projects` and `/admin/people`. Test expectations never updated. **No source change needed; just update expectations.**
- **`lean-trim-integration.test.ts`** — Test asserts ≥4 `permanent: true`; only 1 (`/wishes`) since R1 D-CR-16 changed `/team`+`/projects` to 307. Test expectation needs adjustment.
- **`change-log.coverage.test.ts archiveRegisterRow`** — stub harness shadows real implementation but doesn't emit the change-log row. Pre-existing harness bug.

## NEW findings (D-CR-200+)

### D-CR-200 [P2] Misleading nav label in admin sidebar
- **File:** `src/components/layout/side-nav.tsx:143`
- **Issue:** R2-P1-09 placed disciplines/departments/programs rows but the disciplines row uses `labelKey: 'referenceData'` which resolves to "Reference Data" — clicking arrives at `/admin/disciplines`, surprising. `sidebar.disciplines = "Disciplines"` already exists.
- **Fix:** Change `labelKey: 'referenceData'` → `labelKey: 'disciplines'`.

### D-CR-201 [P2] Dead-link twin in `person-sidebar.tsx`
- **File:** `src/components/person/person-sidebar.tsx:46-71`
- **Issue:** R2-P1-03 removed dead links from `side-nav.tsx`, but the same anti-pattern survives in `person-sidebar.tsx`: `<button>New Entry</button>` (no onClick), `<a href="#">Help</a>`, `<a href="#">Archive</a>`.
- **Fix:** Apply the same R2-P1-03 cleanup: remove New Entry button, point Help at `/help`, drop Archive.

### D-CR-202 [P3] Orphan i18n keys after R2-P1-03 cleanup
- **Files:** `src/messages/en.json:45,47`, `sv.json` mirror
- **Issue:** `sidebar.newEntry` and `sidebar.archive` are no longer referenced.
- **Fix:** Delete keys (or keep if D-CR-201 still uses them).

### D-CR-203 [P3] Stale `nav.members` / `nav.membersDesc` keys
- **Files:** `src/messages/en.json:11,20`, `sv.json:11,20`
- **Issue:** R2-P1-09 removed `members` `NavItemDef`, but matching i18n keys remain. Sidebar uses `personaSections.adminMembers` instead.
- **Fix:** Delete `nav.members` and `nav.membersDesc` from both message files.

## Out of scope / acknowledged

- `useDisciplineBreakdown` always fires in project scope — explicit comment acknowledging waste; out of audit scope.
- `overcommit-dialog.tsx FocusTrap clickOutsideDeactivates: false + allowOutsideClick: true` — intentional, tested.
- `/rd` flag-OFF button — defense in depth; R2-P1-01 disable + scopeId='' query gate.

## Summary

| Severity | Count |
|---|---|
| P0 | 0 |
| P1 | 0 |
| P2 | 2 (D-CR-200, D-CR-201) |
| P3 | 2 (D-CR-202, D-CR-203) |
| **Total NEW** | **4** |

All R2 fixes hold. Convergence achieved at the code level. Remaining items are cleanup + test-debt.
