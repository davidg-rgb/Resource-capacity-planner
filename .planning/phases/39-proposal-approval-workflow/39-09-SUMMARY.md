---
phase: 39-proposal-approval-workflow
plan: 09
subsystem: i18n
tags: [i18n, next-intl, proposals, sweep]
provides:
  - "v5.proposals.* message catalog (57 keys across page/tabs/card/actions/editor/rejectModal/resubmit/queue/wishes/months)"
  - "Localized impact phrase parameterization { name, monthName, before, after }"
requires:
  - "next-intl NextIntlClientProvider mounted in (app) layout"
  - "src/messages/keys.ts parity test (FOUND-V5-05)"
key-files:
  modified:
    - src/messages/keys.ts
    - src/messages/en.json
    - src/messages/sv.json
    - src/features/proposals/ui/wish-card.tsx
    - src/features/proposals/ui/reject-modal.tsx
    - src/features/proposals/ui/approval-queue.tsx
    - src/features/proposals/ui/my-wishes-panel.tsx
    - src/components/grid/cell-editors/proposal-cell-editor.tsx
    - src/app/(app)/line-manager/approval-queue/page.tsx
    - src/app/(app)/wishes/page.tsx
    - src/features/proposals/__tests__/approval-queue.test.tsx
    - src/features/proposals/__tests__/my-wishes-panel.test.tsx
metrics:
  duration: ~25min
  completed: 2026-04-08
---

# Phase 39 Plan 09: Proposal i18n Sweep Summary

Extracted every user-visible English literal from the Phase 39 proposal-flow UI into the next-intl `v5.proposals.*` namespace and routed all components through `useTranslations`. Swedish + English catalogs at parity, RTL tests rewired through `NextIntlClientProvider`.

## Deviations from Plan

### Catalog layout — followed real convention, not the plan path

The plan called for `src/messages/sv/v5/proposals.json` + `src/messages/en/v5/proposals.json`. The actual project layout (Phase 34 FOUND-V5-05) uses **single flat catalogs** at `src/messages/{en,sv}.json` plus a typed key registry at `src/messages/keys.ts` enforced by `keys.test.ts`. Followed the real convention (Rule 3 — blocking convention mismatch). All keys added under the existing `v5.proposals.*` namespace inside both flat catalogs and mirrored in `keys.ts`.

### Auto-fixed: NextIntlClientProvider missing from RTL test wrappers (Rule 1 — bug)

After the components started calling `useTranslations`, `approval-queue.test.tsx` and `my-wishes-panel.test.tsx` blew up with "context from NextIntlClientProvider was not found". Wrapped each test's `makeWrapper()` in `<NextIntlClientProvider locale="sv" messages={sv}>` (matching the established pattern in `ImportPreviewTable.test.tsx`) and updated the assertions from English literals (`'Approve'`, `'Reject'`, `'Rejection reason'`, `'Proposed/Approved/Rejected'`, `/no proposed wishes/i`, etc.) to their Swedish equivalents (`'Godkänn'`, `'Avvisa'`, `'Avvisningsanledning'`, `'Föreslagna/Godkända/Avvisade'`, `/inga föreslagna önskemål/i`). Impact-phrase assertion now checks for `beläggning`, `Sara`, `juni`. All 45 proposal tests green.

## What Was Built

**`v5.proposals.*` namespace — 57 keys** across these groups:

- `page` — approvalQueue, myWishes, myWishesIntro, switchToLineManager, notAuthenticated, loading
- `tabs` — proposed, approved, rejected, tablistLabel
- `card` — status, hoursMonth, rejected (parameterized)
- `actions` — approve, reject, editResubmit, submit, cancel, confirmReject, resubmit, pending
- `editor` — title, notePlaceholder, hoursAria, noteAria, missingProject, submitFailed
- `rejectModal` — title, dialogLabel, reasonHint, reasonAria, charCount
- `resubmit` — dialogLabel, title, monthSummary, hoursLabel, noteLabel, hoursAria, noteAria, resubmitFailed
- `queue` — loading, empty, loadFailed, impactPhrase
- `wishes` — emptyForTab
- `months` — 01..12 (used by approval-queue impact phrase to localize the YYYY-MM segment)

**Impact phrase parameterization** (D-18 must-have): `t('queue.impactPhrase', { name, monthName, before, after })`. Month name resolved via a separate `useTranslations('v5.proposals.months')` lookup keyed by `'01'..'12'` from the `YYYY-MM` segment, with a try/catch fallback to the raw value. This replaces the previous hardcoded English month-name array in `approval-queue.tsx`.

**UI files swept** (all now contain zero hardcoded user-facing literals; the existing eslint `no-restricted-syntax` JSXText guard passes):

1. `wish-card.tsx`
2. `reject-modal.tsx`
3. `approval-queue.tsx` (incl. month name lookup helper)
4. `my-wishes-panel.tsx`
5. `proposal-cell-editor.tsx`
6. `(app)/line-manager/approval-queue/page.tsx`
7. `(app)/wishes/page.tsx`

## Verification

- `node` parity check on `v5.proposals` keys: **57 keys, en/sv identical** ✓
- `npx vitest run src/messages/__tests__/keys.test.ts`: **4/4 passing** (FOUND-V5-05 parity, sv non-empty, namespace coverage) ✓
- `npm run typecheck`: **clean** ✓
- `npx eslint` on all 7 swept files: **zero errors** (no-restricted-syntax JSXText guard satisfied) ✓
- `npx vitest run src/features/proposals`: **45/45 passing** across 8 test files ✓
- `npm run build`: **succeeded**, all routes including `/wishes` and `/line-manager/approval-queue` compiled ✓

## Out of Scope (Deferred)

- `src/features/proposals/ui/proposal-cell.tsx` still contains hardcoded `'Submit wish'` literal at line 81. Not in this plan's `files_modified` list — left untouched per the SCOPE BOUNDARY rule. Track for a follow-up sweep.

## Self-Check: PASSED

- `src/messages/keys.ts`: FOUND (v5.proposals namespace, 57 keys)
- `src/messages/en.json`, `src/messages/sv.json`: FOUND (v5.proposals block appended, parity verified)
- All 7 UI files: FOUND, modified, build green
- Commit `8e5103c` exists in `git log`
