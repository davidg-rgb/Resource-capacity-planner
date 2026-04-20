---
phase: 16-onboarding-announcements
verified: 2026-03-28T14:30:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 16: Onboarding & Announcements Verification Report

**Phase Goal:** New tenants get guided setup, and platform admins can communicate with all tenants through announcements
**Verified:** 2026-03-28T14:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Existing tenants are marked as onboarded and never see the wizard | VERIFIED | `onboardingCompletedAt` column added to schema; service backfill via SQL UPDATE; `isOrgOnboarded` checks null |
| 2  | New tenants without onboardingCompletedAt are redirected to /onboarding when flag is enabled | VERIFIED | `(app)/layout.tsx` lines 18-22: `if (flags.onboarding) { if (!onboarded) redirect('/onboarding') }` |
| 3  | GET /api/onboarding/status returns onboarding state for the current org | VERIFIED | Route exports `GET`, calls `getOnboardingStatus(orgId)`, returns `{ isOnboarded, departmentCount, disciplineCount, personCount }` |
| 4  | POST /api/onboarding/complete marks the org as onboarded | VERIFIED | Route exports `POST`, calls `markOnboarded(orgId)` which sets `onboardingCompletedAt = new Date()` |
| 5  | Pre-filled department and discipline suggestions exist as typed constants | VERIFIED | `DEPARTMENT_SUGGESTIONS` (6 strings) and `DISCIPLINE_SUGGESTIONS` (6 objects with name+abbreviation) in `onboarding.constants.ts` |
| 6  | New tenant sees a multi-step wizard after org creation with departments, disciplines, people, and complete steps | VERIFIED | `onboarding/page.tsx` uses `useOrganization()`: shows `CreateOrganization` without org, then `OnboardingWizard` after; wizard has 4 steps |
| 7  | Wizard offers pre-filled engineering department and discipline suggestions as clickable chips | VERIFIED | `step-departments.tsx` imports and maps `DEPARTMENT_SUGGESTIONS`; `step-disciplines.tsx` imports and maps `DISCIPLINE_SUGGESTIONS` |
| 8  | User can skip the wizard at any step and go directly to the app | VERIFIED | `handleSkipAll` in orchestrator calls `POST /api/onboarding/complete` then `router.push('/input')`; passed to all 3 non-final steps as `onSkipAll` prop |
| 9  | Platform admin can create announcements with title, body, severity, and date range | VERIFIED | `createAnnouncementSchema` validates all fields; `POST /api/platform/announcements` wires to `createAnnouncement(data, adminId)`; admin page has form with all inputs |
| 10 | Tenant users see active announcements as a dismissible banner | VERIFIED | `AnnouncementBanner` in `(app)/layout.tsx`; TanStack Query fetches `/api/announcements/active`; service applies server-side date filtering |
| 11 | Critical announcements persist until expiry and cannot be dismissed | VERIFIED | Banner: `canDismiss = announcement.severity !== 'critical'`; critical items not filtered by `dismissedIds` check |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | onboardingCompletedAt column on organizations | VERIFIED | Line 64: `onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true })` |
| `src/features/onboarding/onboarding.service.ts` | isOrgOnboarded, markOnboarded, getOnboardingStatus | VERIFIED | All 3 functions exported, real DB queries |
| `src/features/onboarding/onboarding.constants.ts` | DEPARTMENT_SUGGESTIONS, DISCIPLINE_SUGGESTIONS | VERIFIED | Both arrays exported with correct types |
| `src/app/api/onboarding/status/route.ts` | GET endpoint | VERIFIED | Exports `GET`, calls `getOnboardingStatus` |
| `src/app/api/onboarding/complete/route.ts` | POST endpoint | VERIFIED | Exports `POST`, calls `markOnboarded` |
| `src/app/onboarding/page.tsx` | Onboarding page rendering wizard | VERIFIED | 33 lines (>10), client component, `CreateOrganization` + `OnboardingWizard` |
| `src/components/onboarding/onboarding-wizard.tsx` | Main wizard orchestrator with step state | VERIFIED | 210 lines (>50), 4-step state machine, idempotent data loading on mount |
| `src/components/onboarding/step-departments.tsx` | Department creation step with suggestions | VERIFIED | 159 lines (>30), chip rendering, POST to `/api/departments` |
| `src/components/onboarding/step-disciplines.tsx` | Discipline creation step with suggestions | VERIFIED | 175 lines (>30), chip rendering, POST to `/api/disciplines` |
| `src/components/onboarding/step-people.tsx` | First person creation step | VERIFIED | 203 lines (>20), form with firstName/lastName/dept/disc selects |
| `src/components/onboarding/step-complete.tsx` | Completion screen with navigation links | VERIFIED | 66 lines (>15), calls `/api/onboarding/complete` on mount, CTA buttons |
| `src/features/announcements/announcement.service.ts` | CRUD + active query | VERIFIED | 5 functions exported: getActiveAnnouncements, listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement |
| `src/features/announcements/announcement.schema.ts` | Zod schemas | VERIFIED | createAnnouncementSchema and updateAnnouncementSchema exported |
| `src/app/api/platform/announcements/route.ts` | Platform admin GET + POST | VERIFIED | Both methods exported |
| `src/app/api/platform/announcements/[id]/route.ts` | Platform admin PATCH + DELETE | VERIFIED | Both methods exported |
| `src/app/api/announcements/active/route.ts` | Tenant-facing GET active | VERIFIED | Exports GET, calls `getActiveAnnouncements(orgId)` |
| `src/app/(platform)/announcements/page.tsx` | Platform admin management UI | VERIFIED | 386 lines (>40), full CRUD form, severity badges, status column |
| `src/components/announcements/announcement-banner.tsx` | Dismissible banner | VERIFIED | 68 lines (>30), client component, severity-conditional dismiss |
| `src/components/announcements/use-dismissed-announcements.ts` | localStorage helper | VERIFIED | SSR-safe, exports getDismissedIds and dismissAnnouncement |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/(app)/layout.tsx` | `onboarding.service.ts` | `isOrgOnboarded` + `redirect` | WIRED | Lines 8, 19-22: import + flag-gated redirect |
| `src/app/api/onboarding/complete/route.ts` | `onboarding.service.ts` | `markOnboarded` call | WIRED | Lines 3, 10: import + call |
| `step-departments.tsx` | `/api/departments` | fetch POST | WIRED | Line 35: `fetch('/api/departments', { method: 'POST' ... })` |
| `step-disciplines.tsx` | `/api/disciplines` | fetch POST | WIRED | Line 36: `fetch('/api/disciplines', { method: 'POST' ... })` |
| `step-complete.tsx` | `/api/onboarding/complete` | fetch POST | WIRED | Line 22: `fetch('/api/onboarding/complete', { method: 'POST' })` |
| `onboarding-wizard.tsx` | `onboarding.constants.ts` | import suggestions | WIRED | Each step imports and renders the respective constant |
| `announcement-banner.tsx` | `/api/announcements/active` | TanStack Query | WIRED | Lines 21-23: `queryKey: ['announcements', 'active'], queryFn: fetch('/api/announcements/active')` |
| `(app)/layout.tsx` | `announcement-banner.tsx` | AnnouncementBanner rendered | WIRED | Line 30: `<AnnouncementBanner />` |
| `announcement-banner.tsx` | `use-dismissed-announcements.ts` | getDismissedIds / dismissAnnouncement | WIRED | Lines 9, 18, 27: import + use |
| `src/app/api/announcements/active/route.ts` | `announcement.service.ts` | getActiveAnnouncements | WIRED | Lines 3, 10: import + call |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `onboarding.service.ts:isOrgOnboarded` | `onboardingCompletedAt` | Drizzle SELECT from `organizations` | Yes — DB query, checks null | FLOWING |
| `onboarding.service.ts:getOnboardingStatus` | counts | Drizzle COUNT from departments, disciplines, people | Yes — 3 parallel COUNT queries | FLOWING |
| `onboarding-wizard.tsx` | departments/disciplines/people | fetch to `/api/departments`, `/api/disciplines`, `/api/people` on mount | Yes — passes real arrays to steps | FLOWING |
| `announcement.service.ts:getActiveAnnouncements` | announcements | Drizzle SELECT from `systemAnnouncements` with WHERE startsAt<=NOW AND (expiresAt IS NULL OR expiresAt>NOW) | Yes — real SQL date filters | FLOWING |
| `announcement-banner.tsx` | announcements | TanStack Query → `/api/announcements/active` → service | Yes — end-to-end wired | FLOWING |
| `(platform)/announcements/page.tsx` | announcements list | fetch `/api/platform/announcements` → `listAnnouncements()` → Drizzle SELECT | Yes — full DB-backed list | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: All code paths traced statically. Server required to exercise HTTP routes; skipping runtime checks.

| Behavior | Evidence | Status |
|----------|----------|--------|
| Onboarding redirect when flag enabled + not onboarded | `(app)/layout.tsx` lines 18-22 | PASS |
| Skip wizard calls complete API then navigates | `handleSkipAll` in wizard — POST then `router.push('/input')` | PASS |
| Critical announcements never filterable by dismissal | `canDismiss = severity !== 'critical'` | PASS |
| Server-side date filtering on active announcements | `lte(startsAt, now)` AND `(expiresAt IS NULL OR expiresAt > now)` | PASS |
| Banner not using fixed CSS positioning | No `fixed` found in `announcement-banner.tsx` | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ONBR-01 | 16-01, 16-02 | New tenant sees multi-step onboarding wizard after org creation | SATISFIED | `onboarding/page.tsx` renders wizard after org exists; wizard has 4 steps |
| ONBR-02 | 16-02 | Wizard guides through: departments, disciplines, first person or import | SATISFIED | step-departments, step-disciplines, step-people all exist and functional |
| ONBR-03 | 16-01, 16-02 | Wizard offers pre-filled suggestions for engineering departments and disciplines | SATISFIED | Constants in `onboarding.constants.ts` imported and rendered as chips |
| ONBR-04 | 16-01 | Existing tenants are marked as onboarded and skip the wizard | SATISFIED | DB backfill documented; `isOrgOnboarded` check gates redirect |
| ONBR-05 | 16-01, 16-02 | User can skip the wizard and access the app directly | SATISFIED | `handleSkipAll` on all steps — calls complete then navigates |
| PLOP-02 | 16-03 | Platform admin can create announcements with title, body, severity, and date range | SATISFIED | Admin page has full form; POST route + service wired |
| PLOP-03 | 16-03 | Tenant users see active announcements as a dismissible banner in the app | SATISFIED | `AnnouncementBanner` in `(app)/layout.tsx`, fetches active announcements |
| PLOP-04 | 16-03 | Critical announcements persist until expiry; info-level can be dismissed | SATISFIED | Banner dismissal logic excludes critical severity |

No orphaned requirements found. All 8 requirement IDs declared across plans are accounted for and satisfied.

---

### Anti-Patterns Found

None blocking goal achievement. No placeholder returns, empty implementations, or hardcoded static data found in phase files. All API routes query real data. All components render real state.

---

### Human Verification Required

#### 1. Onboarding Wizard First-Run Flow

**Test:** Create a new Clerk organization with the `onboarding` feature flag enabled, then navigate to any app route.
**Expected:** Redirected to `/onboarding`; see `CreateOrganization` UI; after org creation redirected back; wizard renders with 4 steps and pre-filled suggestion chips.
**Why human:** Requires live Clerk org creation and real feature flag state — cannot stub programmatically.

#### 2. Announcement Banner Dismissal Persistence

**Test:** As a tenant user, dismiss a warning-severity announcement. Refresh the page.
**Expected:** The dismissed announcement does not reappear; a critical announcement cannot be dismissed at all.
**Why human:** Requires live running app with active announcements in the database.

#### 3. Platform Admin Announcement CRUD

**Test:** Log in to `/platform/announcements`; create a new announcement with severity=critical, no expiry; verify it appears in the tenant banner; set expiry to past; verify it disappears from banner.
**Expected:** Banner respects both severity and date range in real time.
**Why human:** Requires live platform admin session and DB state changes to verify end-to-end behavior.

---

## Gaps Summary

No gaps found. All 11 observable truths are VERIFIED across both the onboarding and announcements subsystems. All 19 artifacts exist with substantive implementations (not stubs). All 10 key links are wired with real data flowing through each. All 8 requirement IDs are satisfied with implementation evidence.

---

_Verified: 2026-03-28T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
