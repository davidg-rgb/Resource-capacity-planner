---
status: partial
phase: 53-chrome-polish
source: [53-VERIFICATION.md]
started: 2026-04-22T00:00:00Z
updated: 2026-04-22T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. CI viewport artifacts (POLISH-07 SOFT gate per D-04)
expected: `manager-1440x900-polishOn.json` and `project-leader-1440x900-polishOn.json` show `scrollHeight - clientHeight <= 0` (or an acceptable threshold for Phase 54 planning input)
result: [pending]

### 2. Visual persona chrome smoke (POLISH-01 + POLISH-02 integration)
expected: Flag ON — PM sees bell w/ rejected-wish count + link to `/pm/wishes?tab=rejected`; LM sees pending-approval count + `/line-manager/approval-queue`; R&D sees overcommit count + `/alerts`; Staff sees no bell + center-nav = Help only; Admin sees all items + alert count. Flag OFF — legacy `<Link href="/alerts"><Bell/><AlertBadge/></Link>` is present with no visibleFor filtering.
result: [pending]

### 3. Operator migration rowcount check (POLISH-03 / POLISH-04 / POLISH-05 / POLISH-06)
expected: For each of `20260422_polish_discipline_rename.sql`, `20260422_polish_strip_widgets.sql`, `20260422_polish_strip_resource_conflicts.sql` — `SELECT COUNT(*) FROM dashboard_layouts WHERE layout::text ~* '<target ids>'` returns > 0 before apply, and 0 after apply. Idempotent re-run leaves the count at 0.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
