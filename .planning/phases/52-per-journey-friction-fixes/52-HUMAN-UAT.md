---
status: partial
phase: 52-per-journey-friction-fixes
source: [52-VERIFICATION.md]
started: 2026-04-21
updated: 2026-04-21
---

## Current Test

[awaiting human testing — structural verification passed 13/13]

## Tests

### 1. Full `pnpm test:e2e` run against live dev server
expected: All 11 journey specs + 13 flag-off parity invariants pass; no click-count overruns
result: [pending]

### 2. PM-01 auto-redirect in real browser
expected: Signing in as a PM persona with exactly one project lands directly on `/pm/projects/<id>` (not `/pm`); two-or-more projects shows the grid
result: [pending]

### 3. ADMIN-01 toast visual + `<details>` expand
expected: Archive attempt on project with active allocations shows sonner toast; clicking the summary expands to show kind-counts (e.g., "Allokeringar: 12")
result: [pending]

### 4. SHARED-01 deep-link URL → drawer open + ESC strips params
expected: Visiting `/pm/projects/<id>?drawer=person-month&personId=<id>&month=2026-03` opens the drawer; pressing Escape closes drawer AND strips the three params from the URL
result: [pending]

### 5. OvercommitDialog shows live data
expected: Clicking a red overcommit cell on `/rd` opens a dialog with two sections ("Bidragande projekt" + "Mest överbokade personer"); each row has a working navigation link
result: [pending]

### 6. Focus-trap cycling inside drawer
expected: With drawer open, pressing Tab cycles focus within the drawer content only; focus never escapes to the underlying page until drawer is closed
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

_(none yet — gaps populated after human runs the tests above)_
