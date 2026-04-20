---
phase: 16-onboarding-announcements
plan: "03"
subsystem: announcements
tags: [announcements, platform-admin, banner, crud, localStorage]
dependency_graph:
  requires: [db-schema-systemAnnouncements, platform-auth, tenant-auth]
  provides: [announcement-service, announcement-api, announcement-banner]
  affects: [app-layout, platform-sidebar]
tech_stack:
  added: []
  patterns: [server-side-date-filtering, localStorage-dismissal, tanstack-query-staleTime]
key_files:
  created:
    - src/features/announcements/announcement.types.ts
    - src/features/announcements/announcement.schema.ts
    - src/features/announcements/announcement.service.ts
    - src/app/api/platform/announcements/route.ts
    - src/app/api/platform/announcements/[id]/route.ts
    - src/app/api/announcements/active/route.ts
    - src/app/(platform)/announcements/page.tsx
    - src/components/announcements/announcement-banner.tsx
    - src/components/announcements/use-dismissed-announcements.ts
  modified:
    - src/app/(app)/layout.tsx
    - src/components/platform/platform-sidebar.tsx
decisions:
  - "Server-side date filtering for active announcements (no client-side filtering of expired/future)"
  - "localStorage for dismissal tracking with SSR-safe guards"
  - "Banner in document flow (not fixed) to avoid z-index conflicts with impersonation banner"
  - "Show only highest-severity visible announcement at a time"
metrics:
  duration: "4m"
  completed: "2026-03-28"
  tasks: 3
  files_created: 9
  files_modified: 2
---

# Phase 16 Plan 03: Announcement System Summary

Announcement CRUD with platform admin management page and tenant-facing dismissible banner with severity-based behavior.

## What Was Built

### Task 1: Announcement Service, Schemas, Types, and API Routes
- **Types**: `AnnouncementSeverity` union type and `Announcement` interface
- **Zod schemas**: `createAnnouncementSchema` (title, body, severity, dates, optional targetOrgIds) and `updateAnnouncementSchema` (partial)
- **Service**: Five functions - `getActiveAnnouncements` (server-side date filtering, severity ordering, org targeting), `listAnnouncements`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`
- **Platform API**: GET+POST at `/api/platform/announcements`, PATCH+DELETE at `/api/platform/announcements/[id]` - all behind `requirePlatformAdmin()`
- **Tenant API**: GET at `/api/announcements/active` - resolves tenant org ID and returns filtered active announcements
- **Commit**: d3dd842

### Task 2: Platform Admin Announcements Page
- Full CRUD management page at `/platform/announcements`
- Create/edit modal with title, body, severity dropdown (with color indicators), datetime pickers, optional target org IDs textarea
- Announcements table with severity badges, computed status (Active/Expired/Scheduled), edit/delete actions
- Delete confirmation dialog
- Sonner toast feedback on all operations
- Added "Announcements" nav link with Megaphone icon to platform sidebar
- **Commit**: cd1c058

### Task 3: Announcement Banner and Layout Wiring
- `use-dismissed-announcements.ts`: SSR-safe localStorage helper (`getDismissedIds`, `dismissAnnouncement`)
- `AnnouncementBanner`: Client component using TanStack Query with 5-minute staleTime, filters dismissed IDs except critical severity, renders first visible announcement with severity-appropriate styling
- Critical: `bg-red-50 border-red-200 text-red-800`, no dismiss button
- Warning: `bg-amber-50 border-amber-200 text-amber-800`, dismiss X button
- Info: `bg-blue-50 border-blue-200 text-blue-800`, dismiss X button
- Wired into `(app)/layout.tsx` after ImpersonationBanner, before FlagGuard - in document flow, no fixed positioning
- **Commit**: cd2ed5f

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Server-side date filtering**: Active announcements query uses SQL WHERE clauses for startsAt/expiresAt, never returning expired or future items to the client
2. **localStorage dismissal**: Simple string array in localStorage, SSR-safe with typeof window check
3. **Document flow positioning**: Banner uses `border-l-4` inline styling, avoids fixed/absolute positioning to prevent z-index conflicts with the impersonation banner
4. **Single announcement display**: Shows only the highest-severity visible announcement to avoid banner stacking

## Known Stubs

None - all features are fully wired with real API endpoints.

## Self-Check: PASSED

- All 9 created files exist on disk
- All 3 commits verified: d3dd842, cd1c058, cd2ed5f
- TypeScript compiles cleanly after all tasks
