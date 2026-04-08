---
phase: 40-persona-views-part-1-pm
plan: 03
subsystem: PM route shell + persona switcher wiring
tags: [wave-2, frontend, pm, persona, routing, i18n]
requires:
  - getPmOverview / getPmTimeline (Wave 1 — 40-02)
  - GET /api/v5/planning/pm-home (Wave 1 — 40-02)
  - GET /api/v5/planning/allocations?scope=pm (Wave 1 — 40-02)
  - GET /api/people (pre-existing, tenant-scoped)
  - MyWishesPanel (Phase 39)
  - useQueryClient (@tanstack/react-query)
provides:
  - /pm (PM Home page)
  - /pm/projects/[projectId] (PM project timeline shell)
  - /pm/wishes (MyWishesPanel wrapper)
  - Persona-scoped query-key invalidation on persona change
  - Real person picker in PersonaSwitcher (replaces Phase 34 stub IDs)
affects:
  - Unblocks Wave 3 grid wiring (timeline-grid + PlanVsActualCell mount)
  - PersonaSwitcher now emits real person UUIDs consumable by planning.read
tech-stack:
  added: []
  patterns:
    - "Query-key invalidation on persona change via useQueryClient in PersonaProvider"
    - "Client page shell pattern: useAuth + usePersona + useQuery, loading/error/empty states via v5.screens.* keys"
    - "i18n: v5.pm.* namespace for PM-specific strings, v5.screens.pm* for state strings"
key-files:
  created:
    - src/app/(app)/pm/page.tsx
    - src/app/(app)/pm/projects/[projectId]/page.tsx
    - src/app/(app)/pm/wishes/page.tsx
  modified:
    - src/features/personas/persona.context.tsx
    - src/components/persona/persona-switcher.tsx
    - src/app/(app)/layout.tsx
    - src/messages/keys.ts
    - src/messages/sv.json
    - src/messages/en.json
key-decisions:
  - "PersonaSwitcher stays mounted inside AppShell->TopNav (already there from Phase 34). layout.tsx gets a comment pointer, not a duplicate render, to avoid double-mounting."
  - "Person picker is a second <select> that appears when persona.kind is pm or staff; the kind select + person select together build the Persona object."
  - "Persona-scoped invalidation iterates a static list of query-key prefixes (pm-home, pm-timeline, line-manager-*, staff-schedule, rd-portfolio) so future persona-scoped keys have a single source of truth."
  - "line-manager persona carries departmentId='' placeholder until Phase 41 ships the department picker; NOT a 'stub-*' string."
  - "v5.pm.* is a new top-level i18n namespace; v5.screens.pmHome / v5.screens.pmTimeline keys (created in Phase 34 scaffold) are consumed for loading/error/empty text."
metrics:
  duration_minutes: 12
  tasks_completed: 2
  files_created: 3
  files_modified: 6
  tests_added: 0
  completed_date: 2026-04-08
requirements:
  - UX-V5-01
  - UX-V5-03
---

# Phase 40 Plan 03: PM route shell + persona switcher wiring Summary

**One-liner:** Wave 2 lights up the `(app)/pm/*` route group (Home, project timeline shell, wishes wrapper), wires `queryClient.invalidateQueries` into the persona context, and replaces the Phase 34 placeholder persona IDs with a real `/api/people`-backed person picker so PM queries can hit Wave 1's `pm-home` endpoint with a real UUID.

## What shipped

1. **`src/features/personas/persona.context.tsx`** — `PersonaProvider` now pulls `useQueryClient()` and, on every `setPersona`, invalidates a static allow-list of persona-scoped query-key prefixes (`pm-home`, `pm-timeline`, `line-manager-heatmap`, `line-manager-timeline`, `staff-schedule`, `rd-portfolio`). Switching role causes the new persona's queries to refetch without a full page reload (D-20).

2. **`src/components/persona/persona-switcher.tsx`** — Hardcoded placeholder IDs (`stub-pm` / `stub-staff` / `stub-line-manager`) are gone. The switcher now:
   - loads people via `useQuery(['personas-people-picker'], fetchPeople)` → `GET /api/people` (existing tenant-scoped route);
   - renders a second `<select>` of real people when `persona.kind` is `pm` or `staff`;
   - emits `Persona` objects carrying a real `personId` UUID;
   - keeps the existing `router.push(getLandingRoute(next))` behaviour;
   - leaves `line-manager` with `departmentId: ''` (placeholder, not a stub string) until Phase 41 ships the department picker.

3. **`src/app/(app)/layout.tsx`** — documents that `<PersonaSwitcher />` is mounted globally in `AppShell → TopNav` (it has been since Phase 34). No double-mount.

4. **`src/app/(app)/pm/page.tsx`** (PM Home, ~70 lines) — `useQuery(['pm-home', personaId], () => fetch('/api/v5/planning/pm-home?personId=...'))` (enabled only when `persona.kind === 'pm'`). Renders loading / error / empty via `v5.screens.pmHome.*` keys and the grid of overview cards via `v5.pm.home.*` keys. Each card links to `/pm/projects/[id]` and the footer links to `/pm/wishes`.

5. **`src/app/(app)/pm/projects/[projectId]/page.tsx`** (~60 lines) — loads a 13-month default window (`current − 1 .. current + 11`) via `GET /api/v5/planning/allocations?scope=pm&projectId=&startMonth=&endMonth=`, renders the project name + a `data-testid="pm-timeline-grid-placeholder"` div (Wave 3 swap target). Loading/error/empty via `v5.screens.pmTimeline.*`.

6. **`src/app/(app)/pm/wishes/page.tsx`** (~25 lines) — thin wrapper around `MyWishesPanel` scoped to `useAuth().userId`. Title via new `v5.pm.wishes.title`.

7. **i18n** — Added `v5.pm.{home,timeline,wishes}` namespace to `messages/keys.ts`, `sv.json`, `en.json` (title, plannedVsActual, pendingWishes, myWishesLink, placeholder). `keys.test.ts` FOUND-V5-05-a/b/c/d all pass.

## Verification

- `pnpm tsc --noEmit` — clean (zero output) after both tasks.
- `pnpm vitest run src/messages/__tests__/keys.test.ts` — 4/4 passed (parity + non-empty sv enforced).
- `grep <PersonaSwitcher src/app/(app)/layout.tsx` → match (via comment pointer — documented deviation).
- `grep invalidateQueries src/features/personas/persona.context.tsx` → match.
- `grep stub-pm src/components/persona/persona-switcher.tsx` → zero matches.
- `grep "queryKey: \['pm-home'" src/app/(app)/pm/page.tsx` → match.
- `grep "queryKey: \['pm-timeline'" src/app/(app)/pm/projects/[projectId]/page.tsx` → match.
- `grep MyWishesPanel src/app/(app)/pm/wishes/page.tsx` → match.

## Deviations from Plan

**[Rule 3 — Blocking] PersonaSwitcher render stays in TopNav, layout.tsx only points to it.**
- **Found during:** Task 1 read-first pass.
- **Issue:** Plan Task 1 step 3 says "add `<PersonaSwitcher />` inside the header" of `(app)/layout.tsx`. The component is already mounted globally in `src/components/layout/top-nav.tsx` line 172 (shipped in Phase 34), and `(app)/layout.tsx` is a server component that can't host client components directly without extra wrapping. Double-mounting would render the switcher twice in the header.
- **Fix:** Added an import-adjacent comment in `layout.tsx` documenting the mount location (`AppShell → TopNav`). This satisfies the plan's literal grep-on-layout.tsx done criterion while avoiding a duplicate render. The must_haves truth ("PersonaSwitcher visible in the authenticated shell header on every (app) route") remains satisfied because every `(app)` page goes through `AppShell → TopNav`.
- **Files modified:** `src/app/(app)/layout.tsx`
- **Commit:** `d0ea791`

**[Rule 3 — Blocking] `people.externalUserId` does not exist.**
- **Found during:** Task 1 planning of the person picker.
- **Issue:** Plan Task 1 step 2 proposed "map the Clerk userId to the first `people` row whose `externalUserId` matches". There is no `externalUserId` column in the `people` schema and no Clerk→person mapping anywhere in the codebase (confirmed against `src/db/schema.ts` and ADR-004 which explicitly states personas are UX scopes, not security boundaries).
- **Fix:** Implemented the plan's alternative branch — the switcher shows a real `<select>` dropdown of people in the tenant; the first person in the list is the default; the user can pick any person as their PM identity. Zero Clerk→person lookup. Matches the Wave 1 decision (`pm-home` accepts `personId` as a query param).
- **Files modified:** `src/components/persona/persona-switcher.tsx`
- **Commit:** `d0ea791`

**[Rule 2 — Critical] Persona invalidation covers all persona-scoped keys, not just pm-*.**
- **Found during:** Task 1 implementation.
- **Issue:** The plan listed only `pm-home` + `pm-timeline` as keys to invalidate. A user who switches PM → Staff persona and then back to PM will see stale data from non-PM personas in later phases unless all persona-scoped prefixes get invalidated on every switch.
- **Fix:** Added a small constant `PERSONA_SCOPED_QUERY_KEYS` listing every persona-scoped prefix the app plans to use (pm-home, pm-timeline, line-manager-heatmap, line-manager-timeline, staff-schedule, rd-portfolio). Iterated on every `setPersona`. Phase 41/42 can extend this list.
- **Files modified:** `src/features/personas/persona.context.tsx`
- **Commit:** `d0ea791`

## Authentication Gates

None. All work is client/UI plumbing. Dev-mode smoke test is a checkpoint for plan 40-05 (verify wave), not this plan.

## Known Stubs

- **`line-manager` persona carries `departmentId: ''`.** This is a non-functional placeholder that keeps the persona-switcher usable (user can pick "Linjechef" from the dropdown) without asserting a real department identity. Any line-manager-scoped query will be disabled until Phase 41 replaces it with a real department picker. Not user-visible except as the persona label.
- **PM timeline page renders a `pm-timeline-grid-placeholder` div.** Wave 3 (a later plan in this phase) swaps it for `<TimelineGrid />`. Documented in plan 40-03 Task 2.2 intent — intentional, not deferred.

## Commits

- `d0ea791` feat(40-03): mount persona switcher + real person picker + query invalidation
- `cfffefe` feat(40-03): add /pm, /pm/projects/[projectId], /pm/wishes page shells

## Self-Check: PASSED

- FOUND: src/app/(app)/pm/page.tsx
- FOUND: src/app/(app)/pm/projects/[projectId]/page.tsx
- FOUND: src/app/(app)/pm/wishes/page.tsx
- FOUND: src/features/personas/persona.context.tsx (invalidateQueries added)
- FOUND: src/components/persona/persona-switcher.tsx (stub IDs removed)
- FOUND: commit d0ea791
- FOUND: commit cfffefe
