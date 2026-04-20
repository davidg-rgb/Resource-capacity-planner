---
status: partial
phase: 05-reference-data-admin
source: [05-VERIFICATION.md]
started: 2026-03-26T17:20:00Z
updated: 2026-03-26T17:20:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. New discipline appears in Person form dropdown immediately
expected: Create discipline in admin, navigate to Team page, open Add Person form — new discipline appears without page reload
result: [pending]

### 2. Department delete warning shows affected people count
expected: Assign people to department, attempt delete in admin — warning shows count of affected people, blocks deletion
result: [pending]

### 3. Viewer role cannot access admin pages
expected: Log in as Viewer, navigate to /admin/* — sees Access Denied message, cannot manage reference data
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
