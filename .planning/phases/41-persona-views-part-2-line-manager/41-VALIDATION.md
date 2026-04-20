---
phase: 41
slug: persona-views-part-2-line-manager
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 41 — Validation Strategy

> See `41-RESEARCH.md` § "Validation Architecture" for full test plan.

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | vitest + @testing-library/react + PGlite |
| Config | `vitest.config.ts` |
| Quick run | `pnpm vitest run --changed` |
| Full suite | `pnpm vitest run` |
| Estimated runtime | ~120s |

## Sampling Rate
- After every task commit: quick run
- After every wave: full suite
- Before `/gsd:verify-work`: full suite green
- Max feedback latency: 120s

## Per-Task Verification Map (populated from 41-RESEARCH.md)

| Test Code | Type | Location | Covers |
|-----------|------|----------|--------|
| TC-CP-001..004 | PGlite unit | `src/features/capacity/__tests__/capacity.read.test.ts` | threshold boundaries (under/ok/over/absent) |
| TC-API-050..051 | PGlite contract | `src/app/api/v5/capacity/__tests__/capacity.contract.test.ts` | GET /api/v5/capacity shape + error cases |
| TC-API-040..041 | PGlite contract | `src/app/api/v5/change-log/__tests__/change-log.contract.test.ts` | GET /api/v5/change-log filter + cursor pagination |
| TC-PS-001..010 | PGlite integration | `src/features/planning/__tests__/group-timeline.test.ts` | getGroupTimeline read + direct edit round-trip + change-log visible |
| TC-PR-004..009 | PGlite + RTL | `src/features/proposals/__tests__/approval-queue.impact.test.ts` + existing `approval-queue.test.tsx` | impact preview `40% → 90%` format + approve/reject |
| TC-CL-* (feed) | PGlite unit | `src/features/change-log/__tests__/change-log.read.test.ts` | feed filter + persona-scoped defaults |
| TC-E2E-2A | PGlite + RTL | `src/features/planning/__tests__/line-manager.e2e.test.ts` | Per switches to LM → heatmap + queue count |
| TC-MOBILE-001 | RTL | `src/components/responsive/__tests__/desktop-only-screen.test.tsx` | <768px interstitial |
| TC-NEG-013 | RTL | `src/app/(app)/line-manager/__tests__/route-guard.test.tsx` | PM persona blocked from /line-manager/* |

## Wave 0 Requirements

Wave 0 lands backend gap fills and non-UI infra before UI work:
- [ ] `src/features/capacity/capacity.read.ts` — `getPersonMonthUtilization`, `getCapacityBreakdown`
- [ ] `src/features/change-log/change-log.read.ts` — `getFeed` with cursor pagination
- [ ] Extend `ProposalImpactDTO` with `currentUtilizationPct` + `projectedUtilizationPct` fields (research found this service is already shipped in hours only — UX-V5-06 requires %)
- [ ] `src/app/api/v5/capacity/route.ts` — GET handler
- [ ] `src/app/api/v5/change-log/route.ts` — GET handler
- [ ] `src/components/responsive/desktop-only-screen.tsx` — ~30 LOC
- [ ] Wire `/api/departments` into persona switcher department dropdown (replace `departmentId: ''` stub)
- [ ] PGlite contract tests for all of the above (TC-CP-001..004, TC-API-050..051, TC-API-040..041, TC-CL-*)

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Instructions |
|----------|-------------|------------|--------------|
| Heatmap color shading reads correctly against brand palette | UX-V5-04 | Visual | Open `/line-manager`, confirm 60-90 green, 90-100 green/yellow-green, >100 red, <60 yellow, absent grey |
| Swedish LM nav labels | UX-V5-04/05/10 | Visual copy | Inspect `v5.lineManager.*` keys in sv.json |

## Validation Sign-Off
- [ ] All tasks have `<automated>` verify or Wave 0 deps
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
