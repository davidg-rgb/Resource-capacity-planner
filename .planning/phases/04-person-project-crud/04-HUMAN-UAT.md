---
status: partial
phase: 04-person-project-crud
source: [04-VERIFICATION.md]
started: 2026-03-26T14:30:00Z
updated: 2026-03-26T14:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Create a person and confirm they appear in the Team list
expected: Form submits, POST /api/people returns 201, person row appears in table without page reload
result: [pending]

### 2. Edit a person and confirm the updated values are reflected in the list
expected: Form pre-populated with existing values, PATCH succeeds, row updates in place
result: [pending]

### 3. Delete a person and confirm the confirmation dialog appears and they are removed from the list
expected: window.confirm fires, DELETE /api/people/:id returns 204, row removed from table
result: [pending]

### 4. Create a project and confirm it appears in the Projects list
expected: Form submits, POST /api/projects returns 201, project row appears in table
result: [pending]

### 5. Archive a project and confirm it disappears from the default list
expected: window.confirm fires, DELETE /api/projects/:id returns 204, project removed from table
result: [pending]

### 6. Attempt to create a duplicate project name in the same org
expected: Server returns HTTP 409 with ConflictError, UI shows error message
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
