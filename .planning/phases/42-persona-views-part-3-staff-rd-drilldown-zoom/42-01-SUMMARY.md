---
phase: 42-persona-views-part-3-staff-rd-drilldown-zoom
plan: 01
subsystem: timeline-zoom-foundation
tags: [iso-calendar, timeline, drawer, wave-0, foundation]
requires:
  - src/lib/time/iso-calendar.ts (existing helpers: getISOWeekYear, workDaysInMonth, workingDaysInRange)
  - src/lib/time/swedish-holidays.ts (Dec 31 = Nyårsafton, Jan 1 = Nyårsdagen)
  - src/components/drawer/usePlanVsActualDrawer.tsx (Phase 37)
  - src/components/timeline/timeline-columns.ts (Phase 40)
provides:
  - rangeQuarters / rangeYears / quarterKeyForMonth / yearKeyForMonth helpers
  - formatQuarter / formatYear locale formatters (sv: KV1 2026, en: Q1 2026)
  - TimelineZoom widened to 'month' | 'quarter' | 'year'
  - DrawerContext.personId widened to string | null with DrawerMode discriminant
  - TC-CAL-003 + TC-CAL-006 green tests
affects:
  - Phase 42 Waves 1-3 (build against stable contracts)
tech-stack:
  added: []
  patterns:
    - ISO-year-majority bucket assignment for boundary months (Dec 2026 → 2026-Q4)
    - Discriminated drawer modes with runtime invariant at fetch time
key-files:
  created:
    - src/lib/time/__tests__/iso-calendar.zoom.test.ts
    - src/lib/time/__tests__/formatters.zoom.test.ts
  modified:
    - src/lib/time/iso-calendar.ts
    - src/lib/time/formatters.ts
    - src/components/timeline/timeline-columns.ts
    - src/components/drawer/usePlanVsActualDrawer.tsx
    - src/components/drawer/PlanVsActualDrawer.tsx
    - src/components/drawer/__tests__/PlanVsActualDrawer.test.tsx
decisions:
  - Quarter year uses ISO-year majority of working days (not raw calendar year), so Dec 2026 lives in 2026-Q4 even though week 53 spans into 2027.
  - DrawerContext widening uses a 'mode' discriminant rather than a sibling drawer component (per plan D-17 default — extend, don't fork).
  - Wave 2 will implement quarter/year column branches; Wave 0 throws at runtime so callers compile but cannot accidentally enter unimplemented territory.
metrics:
  duration: ~5 min
  completed: 2026-04-08
requirements: [UX-V5-08, UX-V5-09, UX-V5-12]
---

# Phase 42 Plan 01: Wave 0 Foundation Summary

Widened types and added ISO-year-aware quarter/year calendar helpers + locale formatters + RED-then-GREEN TC-CAL tests so Phase 42 Waves 1-3 can build against stable contracts without scavenger-hunt refactors.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | rangeQuarters/rangeYears + TC-CAL tests | 8c594b5 | iso-calendar.ts, iso-calendar.zoom.test.ts |
| 2 | formatQuarter/formatYear | aa5d49e | formatters.ts, formatters.zoom.test.ts |
| 3 | Widen TimelineZoom + DrawerContext | b80ad19 | timeline-columns.ts, usePlanVsActualDrawer.tsx, PlanVsActualDrawer.tsx, PlanVsActualDrawer.test.tsx |

## Verification

- `pnpm vitest run src/lib/time/__tests__/iso-calendar.zoom.test.ts` → 7/7 green
- `pnpm vitest run src/lib/time/__tests__/formatters.zoom.test.ts` → 6/6 green
- `pnpm vitest run src/components/drawer` → 5/5 green (existing drawer tests still pass after widening)
- `pnpm tsc --noEmit` → clean

## Deviations from Plan

### [Rule 1 – Bug] Plan claim about week 53 working-day count was wrong

- **Found during:** Task 1 (TC-CAL-006 first run)
- **Issue:** Plan asserted "Dec 28–31 2026, 4 working days excluding Jan 1 holiday". But Dec 31 = Nyårsafton is also a Swedish fixed holiday (per `swedish-holidays.ts` FIXED_HOLIDAYS line 85), so week 53 of 2026 actually has **3** working days (Dec 28 Mon, 29 Tue, 30 Wed) — not 4.
- **Fix:** Updated TC-CAL-006 expectation to 3, with comment explaining both Dec 31 + Jan 1 are SE holidays. The semantic claim — "week 53's working days belong to ISO 2026, not 2027" — is unchanged and asserted by the property test (which is the load-bearing assertion).
- **Files modified:** src/lib/time/__tests__/iso-calendar.zoom.test.ts
- **Commit:** 8c594b5

### [Rule 2 – Critical] Drawer fetch invariant for null personId

- **Found during:** Task 3 (TS broke when personId was widened to string|null)
- **Issue:** PlanVsActualDrawer.queryFn passed `context.personId` to a fetcher typed `string`. Widening would have either broken every existing PM/LM call site or required a type cast.
- **Fix:** Added a runtime invariant inside queryFn — if `mode !== 'daily'` or `personId === null`, throw. The 'project-person-breakdown' branch will get its own fetcher in Wave 3. Existing daily-mode call sites keep their non-null contract via the discriminant, no cast needed.
- **Files modified:** src/components/drawer/PlanVsActualDrawer.tsx
- **Commit:** b80ad19

## Known Stubs

- `buildTimelineColumns` throws on `quarter` / `year` zoom — intentional Wave 2 placeholder, not a stub. Type widened so Wave 1 persona pages can pass `zoom='month'` while Wave 2 fills the branches.
- `'project-person-breakdown'` drawer mode has no fetcher implementation yet — Wave 3 R&D drill will add it. Runtime guard prevents accidental entry.

## Self-Check: PASSED

- src/lib/time/iso-calendar.ts: FOUND (rangeQuarters/rangeYears/quarterKeyForMonth/yearKeyForMonth exported)
- src/lib/time/formatters.ts: FOUND (formatQuarter/formatYear exported)
- src/lib/time/__tests__/iso-calendar.zoom.test.ts: FOUND
- src/lib/time/__tests__/formatters.zoom.test.ts: FOUND
- src/components/timeline/timeline-columns.ts: FOUND (TimelineZoom widened)
- src/components/drawer/usePlanVsActualDrawer.tsx: FOUND (DrawerMode + nullable personId)
- Commits 8c594b5, aa5d49e, b80ad19: all present in `git log`
- All tests green; tsc clean
