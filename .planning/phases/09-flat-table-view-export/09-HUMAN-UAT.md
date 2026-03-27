---
status: partial
phase: 09-flat-table-view-export
source: [09-VERIFICATION.md]
started: 2026-03-27
updated: 2026-03-27
---

## Current Test

[awaiting human testing]

## Tests

### 1. Flat table renders real data
expected: AG Grid shows rows of allocation data with all 6 columns populated from the database
result: [pending]

### 2. Filter interactions narrow results and update URL
expected: URL gains filter params; rows narrow; "Clear filters" link appears and resets all
result: [pending]

### 3. Page refresh preserves filter state
expected: Same filters and page 2 are active after refresh
result: [pending]

### 4. Excel export downloads a valid file
expected: Browser downloads allocations-{today}.xlsx with only filtered data and correct headers
result: [pending]

### 5. CSV export downloads a valid file
expected: Browser downloads allocations-{today}.csv with all allocations and correct headers
result: [pending]

### 6. Import button and template links remain accessible
expected: Import navigates to /data/import; template links trigger XLSX downloads
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
