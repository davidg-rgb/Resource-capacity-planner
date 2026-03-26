---
status: partial
phase: 07-grid-polish-navigation
source: [07-VERIFICATION.md]
started: 2026-03-27T01:00:00Z
updated: 2026-03-27T01:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Keyboard navigation — Tab/Enter/Arrow keys move between cells
expected: Tab moves right, Enter moves down, Arrow keys navigate, Escape cancels edit
result: [pending]

### 2. Drag-to-fill — drag handle copies value across months
expected: Click fill handle on cell, drag right, values copied to dragged months
result: [pending]

### 3. Clipboard paste — Ctrl+V from Excel populates cells
expected: Copy block from Excel, Ctrl+V in grid, values populate correct cells
result: [pending]

### 4. Conflict detection — second user sees warning
expected: Edit same cell in two tabs, second save triggers window.confirm with conflict details
result: [pending]

### 5. Person sidebar — departments grouped with status dots
expected: Sidebar shows people grouped by department headings, colored dots reflect allocation status
result: [pending]

### 6. Prev/next navigation — arrows switch people
expected: Click prev/next arrows, person switches, grid reloads with new person's data
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
