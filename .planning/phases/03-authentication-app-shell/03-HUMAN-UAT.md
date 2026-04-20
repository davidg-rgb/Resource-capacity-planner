---
status: partial
phase: 03-authentication-app-shell
source: [03-VERIFICATION.md]
started: 2026-03-26T11:35:00Z
updated: 2026-03-26T11:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Sign-up flow end-to-end
expected: User can sign up with email/password, create an organization, and land on /onboarding
result: [pending]

### 2. Session persistence across page reloads
expected: After signing in, refreshing the page keeps the user logged in (no re-auth required)
result: [pending]

### 3. Webhook delivery creates DB record
expected: After org creation via Clerk sign-up, the webhook fires and creates an internal organizations record with 6 default disciplines and 3 default departments
result: [pending]

### 4. Route protection live test
expected: Visiting /input while logged out redirects to /sign-in; after sign-in, redirects back to /input
result: [pending]

### 5. No-org user redirects to /onboarding
expected: A user who has no organization membership is redirected to /onboarding
result: [pending]

### 6. Invite 403 enforcement for viewer/planner roles
expected: POST /api/organizations/invite returns 403 when called by a user with viewer or planner role
result: [pending]

### 7. App shell active state navigation
expected: Top nav highlights the active section, side nav updates contextually when switching sections
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
