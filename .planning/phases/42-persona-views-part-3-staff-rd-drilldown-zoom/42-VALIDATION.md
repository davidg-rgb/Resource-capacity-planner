---
phase: 42
slug: persona-views-part-3-staff-rd-drilldown-zoom
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 42 — Validation Strategy

> See `42-RESEARCH.md` § "Validation Architecture" for the full test plan.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | vitest + @testing-library/react + PGlite |
| Config | `vitest.config.ts` |
| Quick run | `pnpm vitest run --changed` |
| Full suite | `pnpm vitest run` |
| Estimated runtime | ~130s |

## Sampling Rate
- After every task commit: quick run
- After every wave: full suite
- Before `/gsd:verify-work`: full suite green
- Max feedback latency: 120s

## Per-Task Verification Map

| Test Code | Type | Location | Covers |
|-----------|------|----------|--------|
| TC-CAL-003 | vitest unit | `src/lib/time/__tests__/iso-calendar.zoom.test.ts` | Quarter aggregation snaps on ISO-year boundary |
| TC-CAL-006 | vitest unit (property) | `src/lib/time/__tests__/iso-calendar.zoom.test.ts` | Month-grain sum → quarter sum → year sum consistency incl. Dec 2026 |
| TC-ZOOM-* | vitest unit + RTL | `src/components/timeline/__tests__/timeline-columns.zoom.test.ts` + `TimelineGrid.zoom.test.tsx` | buildTimelineColumns branches + grid re-aggregation on zoom change |
| TC-PSN staff scope | vitest unit | `src/features/personas/__tests__/persona.scope.test.ts` (extend) | Staff scope filter derivation |
| TC-PSN-006 | vitest unit | `src/features/personas/__tests__/persona.scope.test.ts` (extend) | R&D scope (no filter) |
| TC-API-001 | PGlite contract | `src/app/api/v5/planning/allocations/__tests__/scope.contract.test.ts` (extend) | scope=staff + scope=rd branches |
| TC-UI read-only gating | RTL | `src/app/(app)/staff/__tests__/staff-schedule.test.tsx` | Staff cells render without edit affordances |
| TC-UI shared drawer | grep-based unit | `src/components/drawer/__tests__/shared-import.test.ts` | Import path of PlanVsActualDrawer identical across all 4 pages |
| TC-E2E-3A | PGlite + RTL | `src/features/planning/__tests__/staff.e2e.test.ts` | Staff journey happy path |
| TC-E2E-4A | PGlite + RTL | `src/features/planning/__tests__/rd.e2e.test.ts` | R&D portfolio journey + zoom toggle + drill |

## Wave 0 Requirements

Wave 0 foundation (types + calendar helpers + red test scaffolds):
- [ ] `src/lib/time/iso-calendar.ts` — `rangeQuarters(startMonth, endMonth): string[]` + `rangeYears(...)` (ISO-year semantics)
- [ ] `src/lib/time/formatters.ts` — `formatQuarter(key, locale)` + `formatYear(key, locale)` ("KV1 2026" / "Q1 2026")
- [ ] `src/components/drawer/usePlanVsActualDrawer.tsx` — widen `DrawerContext.personId` to `string | null`
- [ ] `src/components/timeline/timeline-columns.ts` — widen `TimelineZoom` to `'month' | 'quarter' | 'year'` (branches land in Wave 2)
- [ ] Red test scaffolds for all TC codes above

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Instructions |
|----------|-------------|------------|--------------|
| Swedish quarter labels render ("KV1 2026") | UX-V5-12 | Visual copy | Inspect `v5.timeline.zoom.*` keys + /rd page with zoom=quarter |
| 30-column R&D portfolio scrolls smoothly | UX-V5-08 | Perf feel | Load /rd with 30-month range, scroll horizontally |
| Drawer opens on cell click across all 4 personas | UX-V5-09 | End-to-end browser | Log in as each persona, click a cell on each timeline page |

## Validation Sign-Off
- [ ] All tasks have `<automated>` verify or Wave 0 deps
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
