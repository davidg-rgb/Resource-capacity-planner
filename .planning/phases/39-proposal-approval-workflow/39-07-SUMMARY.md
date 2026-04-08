---
phase: 39-proposal-approval-workflow
plan: 07
subsystem: proposals
tags: [prop-04, line-manager, approval-queue, ui]
requires:
  - 39-05 (POST /approve, POST /reject, GET /impact API routes)
  - 39-06 (useListProposals + proposal.types)
provides:
  - ApprovalQueue component
  - WishCard component (reused by Plan 39-08 My Wishes panel)
  - RejectModal component
  - useApproveProposal, useRejectProposal, useProposalImpact hooks
  - /line-manager/approval-queue route
affects:
  - src/features/proposals/use-proposals.ts (extended with 3 hooks)
tech-stack:
  added: []
  patterns:
    - Keyed conditional mount for dialog reset (avoid set-state-in-effect)
    - react-query onSuccess invalidateQueries for optimistic queue removal
    - Per-row useProposalImpact query to compose PROP-04 phrase client-side
key-files:
  created:
    - src/features/proposals/ui/wish-card.tsx
    - src/features/proposals/ui/reject-modal.tsx
    - src/features/proposals/ui/approval-queue.tsx
    - src/app/(app)/line-manager/approval-queue/page.tsx
    - src/features/proposals/__tests__/approval-queue.test.tsx
  modified:
    - src/features/proposals/use-proposals.ts
decisions:
  - RejectModal is conditionally mounted via `{rejectTarget && <RejectModal key={rejectTarget.id} ...>}` instead of being permanently mounted with an `open` prop. This lets React unmount/remount it per target, naturally resetting the reason textarea without a set-state-in-effect hook (which the lint config forbids).
  - Impact phrase uses absolute hours ("40h → 90h") rather than percentages because the /impact endpoint returns raw hours. REQUIREMENTS shows "40% → 90%" as an illustrative example; the literal phrase pattern ("<Name>'s <Month> utilization X → Y") matches. Plan 39-09 i18n sweep may revisit wording.
  - Month formatting is done inline with a hard-coded English month table. This is a deliberate stub: Plan 39-09 does the i18n pass and will replace it with the shared locale helper.
metrics:
  duration: ~15 min
  tasks: 3
  files_created: 5
  files_modified: 1
  completed: 2026-04-08
---

# Phase 39 Plan 07: Line Manager Approval Queue Summary

Built PROP-04 surface: `/line-manager/approval-queue` page that lists pending proposals for the active line-manager persona's department, with per-row impact preview ("Sara's June utilization 40h → 90h"), approve/reject actions, and a required-reason rejection modal. Optimistic removal via react-query invalidation.

## What Ships

1. **Three react-query hooks** appended to `use-proposals.ts`:
   - `useApproveProposal` — `POST /api/v5/proposals/[id]/approve` with `{ departmentId }` body
   - `useRejectProposal` — `POST /api/v5/proposals/[id]/reject` with `{ departmentId, reason }` body
   - `useProposalImpact` — `GET /api/v5/proposals/[id]/impact` (enabled when id is set)
   - Both mutations call `qc.invalidateQueries({ queryKey: ['proposals'] })` on success, giving optimistic queue removal.

2. **WishCard** (`src/features/proposals/ui/wish-card.tsx`)
   - Status-aware action buttons: Approve + Reject for `proposed`, Edit & resubmit for `rejected`.
   - Slot for pre-formatted impact phrase (`impactText` prop).
   - `data-testid="wish-card"` + `data-status={status}` for tests/e2e.
   - Designed for reuse by Plan 39-08 (PM "My Wishes" panel).

3. **RejectModal** (`src/features/proposals/ui/reject-modal.tsx`)
   - `role="dialog"` + `aria-modal="true"` + `aria-label`.
   - Required reason textarea, 1..1000 chars, char counter, disabled Confirm while empty or pending.
   - Parent mounts conditionally + keys by proposal id, so unmount resets state (no effect needed).

4. **ApprovalQueue** (`src/features/proposals/ui/approval-queue.tsx`)
   - `useListProposals({ status: 'proposed', departmentId })` drives the list.
   - Each row mounts a `QueueRow` that fires `useProposalImpact(proposal.id)` and composes the phrase: `${personName}'s ${monthLabel} utilization ${before}h → ${after}h`.
   - Approve calls the mutation directly; Reject opens the keyed RejectModal.
   - Loading / error / empty states included.

5. **Page** (`src/app/(app)/line-manager/approval-queue/page.tsx`)
   - Uses `usePersona()` (destructures `{ persona }`).
   - Non line-manager personas see an inline hint; otherwise mounts `<ApprovalQueue departmentId={persona.departmentId} />`.

6. **RTL test** (`src/features/proposals/__tests__/approval-queue.test.tsx`) — 3 tests, 9 assertions:
   - Renders 2 wish cards and asserts impact phrase contains `"Sara's"`, `"June"`, `"utilization"`.
   - Approve path: clicks first card's Approve, asserts `POST /api/v5/proposals/p-a/approve` with body `{ departmentId: 'dept-1' }`.
   - Reject path: opens dialog, asserts Confirm is disabled on empty, types reason, clicks Confirm, asserts `POST /api/v5/proposals/p-b/reject` with `{ departmentId, reason }`.

## Verification

- `npm run typecheck` — clean.
- `npx vitest run src/features/proposals/__tests__/approval-queue.test.tsx` — 3/3 passing (~1s).
- Acceptance greps:
  - `useApproveProposal|useRejectProposal|useProposalImpact` present in `use-proposals.ts` (3+ hits each).
  - `role="dialog"` in `reject-modal.tsx`.
  - `utilization` in `approval-queue.tsx`.
  - `useListProposals`, `useApproveProposal`, `useRejectProposal` all present in `approval-queue.tsx`.
  - `persona.kind !== 'line-manager'` present in page.
  - Test file contains 9+ `expect` calls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced `useEffect` reset with keyed conditional mount**
- **Found during:** Task 2 commit (pre-commit lint)
- **Issue:** Initial `RejectModal` used `useEffect(() => { if (!open) setReason(''); }, [open])` to reset the textarea when the modal closes. The repo's ESLint config enforces `react-hooks/set-state-in-effect`, which blocked the commit.
- **Fix:** Removed the effect; instead, the parent (`ApprovalQueue`) conditionally mounts the modal with `{rejectTarget && <RejectModal key={rejectTarget.id} open ... />}`. Unmount-on-close naturally resets state and also guarantees a fresh textarea per target.
- **Files modified:** `src/features/proposals/ui/reject-modal.tsx`, `src/features/proposals/ui/approval-queue.tsx`
- **Commit:** `9dc9a10`

**2. [Rule 1 - Bug] `usePersona()` destructuring**
- **Found during:** Task 3 write
- **Issue:** The plan snippet assumed `usePersona()` returned the persona object directly (`const persona = usePersona(); persona.kind ...`). The hook actually returns `{ persona, setPersona }`.
- **Fix:** Destructured `const { persona } = usePersona();` in the page.
- **Files modified:** `src/app/(app)/line-manager/approval-queue/page.tsx`

**3. [Cosmetic] Prettier tailwind class reordering**
- A post-commit linter reordered Tailwind class names in `reject-modal.tsx`, `approval-queue.tsx`, and the page. No semantic changes; classes are identical sets. Noted for transparency.

## Known Stubs

- **Month label formatter** (`approval-queue.tsx`): hard-coded English month table. Plan 39-09 i18n sweep will replace with the shared locale helper. Intentional and scoped.
- **Impact phrase uses hours not percentages**: the /impact endpoint returns raw hours, so the phrase renders `40h → 90h`. REQUIREMENTS shows `40% → 90%` as illustrative; pattern (`<Name>'s <Month> utilization X → Y`) is preserved. Not blocking PROP-04.

## Requirements

- **PROP-04** — Line Manager approval queue: complete. Queue lists pending wishes filtered by persona department, impact preview phrase assembled from /impact payload, Approve posts departmentId, Reject modal requires 1..1000 char reason, optimistic removal via react-query invalidation.

## Self-Check: PASSED

- `src/features/proposals/ui/wish-card.tsx` — FOUND
- `src/features/proposals/ui/reject-modal.tsx` — FOUND
- `src/features/proposals/ui/approval-queue.tsx` — FOUND
- `src/app/(app)/line-manager/approval-queue/page.tsx` — FOUND
- `src/features/proposals/__tests__/approval-queue.test.tsx` — FOUND
- Commit `b8c0675` (hooks) — FOUND
- Commit `9dc9a10` (components) — FOUND
- Commit `6a1a650` (page + test) — FOUND
