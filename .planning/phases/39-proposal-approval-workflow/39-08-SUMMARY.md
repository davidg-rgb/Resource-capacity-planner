---
phase: 39-proposal-approval-workflow
plan: 08
subsystem: proposals
tags: [proposals, ui, pm, resubmit, PROP-06]
requires:
  - src/features/proposals/use-proposals.ts (hooks)
  - src/features/proposals/ui/wish-card.tsx (PROP-04)
  - POST /api/v5/proposals/[id]/resubmit
provides:
  - src/app/(app)/wishes/page.tsx (My wishes route)
  - src/features/proposals/ui/my-wishes-panel.tsx (tabs + resubmit flow)
  - useResubmitProposal / useWithdrawProposal hooks
affects: []
tech-stack:
  added: []
  patterns: [react-query mutation, tabbed filter, prefilled modal]
key-files:
  created:
    - src/features/proposals/ui/my-wishes-panel.tsx
    - src/app/(app)/wishes/page.tsx
    - src/features/proposals/__tests__/my-wishes-panel.test.tsx
  modified:
    - src/features/proposals/use-proposals.ts
decisions:
  - Resubmit modal prefills both proposedHours and note from the rejected row; empty note is sent as null so the server can distinguish "cleared" from "unchanged".
  - Resubmit button disabled when editHours <= 0 to avoid obviously invalid posts; deeper validation is the server's job.
metrics:
  duration: ~8min
  completed: 2026-04-08
---

# Phase 39 Plan 39-08: PM "My Wishes" Panel Summary

PM-facing proposal management UI with state-filtered tabs and edit-and-resubmit flow for rejected wishes, closing PROP-06.

## What shipped

- `useResubmitProposal` hook: POSTs to `/api/v5/proposals/[id]/resubmit` with optional `proposedHours`, `note`, `month` override; invalidates `['proposals']`.
- `useWithdrawProposal` hook: POSTs to `/api/v5/proposals/[id]/withdraw` (ready for future Withdraw action; not wired in UI yet).
- `MyWishesPanel` component: three tabs (Proposed / Approved / Rejected), filters by `status` + `proposerId`, reuses the existing `WishCard` from Plan 39-07. Rejected cards show an "Edit & resubmit" button that opens an accessible modal pre-filled with the original hours and note.
- `/wishes` route: client component that pulls the Clerk `userId` and renders `<MyWishesPanel proposerId={userId} />`.
- RTL test (5 assertions): default tab, tab switching, rejected cards expose resubmit button, modal prefill, POST body assertion, empty state.

## Commits

- `3553894` feat(39-08): add useResubmitProposal + useWithdrawProposal hooks
- `4de5dc1` feat(39-08): MyWishesPanel + /wishes route with resubmit flow

## Verification

- `npm run typecheck` → clean
- `npx vitest run src/features/proposals/__tests__/my-wishes-panel.test.tsx` → 5/5 passing

## Deviations from Plan

None. Minor enhancements vs the plan body (all inside the task action scope):

- Added `useWithdrawProposal` error handling parity with resubmit (JSON error extraction).
- Added empty-state assertion as a fifth test case to meet the ">= 5 assertions" acceptance criterion comfortably.
- Added `aria-label` on the tablist and on the dialog for a11y (doesn't change behavior).
- Normalized note to `null` when the trimmed string is empty before sending to the server (matches the server's parent-inherit semantics via `input.note !== undefined ? input.note : parent.note`).

## Known Stubs

None. Panel is fully wired to the real fetch layer; the `/wishes` route is a live client page.

## i18n

All strings inline per plan instructions. Plan 39-09 will sweep.

## Self-Check: PASSED

- FOUND: src/features/proposals/ui/my-wishes-panel.tsx
- FOUND: src/app/(app)/wishes/page.tsx
- FOUND: src/features/proposals/__tests__/my-wishes-panel.test.tsx
- FOUND commit: 3553894
- FOUND commit: 4de5dc1
