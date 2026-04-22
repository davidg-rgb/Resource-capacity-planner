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
result: partial-pass (4/10 combos verified live 2026-04-22 via Chrome + dev server)
verified_combos:
  - Admin + flag-ON: bell renders, aria-label="Varningar: 0", href="/alerts" (adminAlertsLabel path) ✓
  - PM + flag-ON: bell renders, aria-label="Avvisade önskemål: 0", href="/pm/wishes?tab=rejected" (pmRejectedLabel path); top-nav filtered (no Admin/Medlemmar) ✓
  - LM + flag-ON: bell renders, aria-label="Väntande godkännanden: 0", href="/line-manager/approval-queue" (lmPendingLabel path); top-nav filtered to 5 items (Teambelastning, Planera timmar, Projekt, Översikt, Hjälp) ✓
  - RD + flag-ON: bell renders in DOM with aria-label="Nya överbokningar: 0", href="/alerts" (rdOvercommitsLabel path) ✓ — top-nav visibleFor state inconclusive due to render timing
deferred_combos:
  - Staff + flag-ON (bell should be null): not tested live
  - 5 personas + flag-OFF: not tested live
dev_env_constraints_encountered:
  - `/api/test/seed` fails with "No transactions support in neon-http driver" — blocked the seed+flags test harness path
  - `/api/v5/proposals/queue/count` + `/api/v5/capacity/overcommit/count` return 404 in dev (Turbopack routing quirk) — counts always read 0 regardless of data
  - Route-level requireRole() returns 401 even with proxy E2E_TEST bypass — Clerk session-level guards still fire
  - Turbopack panics on /team/page cause intermittent 500s and stale React state
note: flag toggled via direct SQL insert (workaround for seed failure); flipped back to `false` after verification to leave DB clean

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
