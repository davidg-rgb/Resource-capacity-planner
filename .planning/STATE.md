---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Visibility & Insights
status: executing
stopped_at: Completed 12-01-PLAN.md
last_updated: "2026-03-28T12:22:43.490Z"
last_activity: 2026-03-28
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 4
  completed_plans: 3
  percent: 0
---

# Nordic Capacity -- Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Real-time visibility into team capacity, project staffing, and resource utilization
**Current focus:** Phase 12 — Team Overview Heat Map

## Current Position

Phase: 12 (Team Overview Heat Map) — EXECUTING
Plan: 2 of 2
Status: Ready to execute
Last activity: 2026-03-28

Progress: [░░░░░░░░░░] 0% (v2.0)

## Phase Status

| Phase | Name | Status | Started | Completed |
| ----- | ---- | ------ | ------- | --------- |
| 11 | Infrastructure & Feature Flags | Not started | - | - |
| 12 | Team Overview Heat Map | Not started | - | - |
| 13 | Dashboard & Charts | Not started | - | - |
| 14 | Alerts & Project View | Not started | - | - |
| 15 | PDF Export | Not started | - | - |
| 16 | Onboarding & Announcements | Not started | - | - |
| 17 | Platform Operations | Not started | - | - |

## Performance Metrics

**Velocity (v1.0 baseline):**

- v1.0: 26 plans across 10 phases (shipped 2026-03-27)

**By Phase:** Updated after plan completion.

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table.

Key architectural notes for v2.0:

- Analytics service (aggregation SQL) is critical path -- built in Phase 12, reused by 13-15
- Heat map: pure HTML/CSS table with Tailwind, NOT AG Grid
- Charts: Recharts 3.x; heat map: custom CSS grid or @nivo/heatmap
- PDF: @react-pdf/renderer (no Puppeteer -- Vercel 50MB limit)
- Feature flags at route level, not component level, max 3-4 flags
- Alerts computed on demand (no background jobs)
- All v2.0 features are read-only computed views over existing allocations table
- [Phase 11]: Used React cache() for getOrgFlags deduplication and dedupe'd Clerk-to-UUID resolver in flag definitions
- [Phase 11]: Sonner Toaster added to both (app) and (platform) layouts; all hand-rolled toast patterns replaced
- [Phase 11-02]: Used useEffect + router.replace for FlagGuard redirect to avoid hydration issues
- [Phase 11-02]: Optional flag property on NavItem for incremental nav gating
- [Phase 12]: Single CTE query with generate_series for gapless month grid avoids N+1 and Neon cold-start multiplication

### Pending Todos

None yet.

### Blockers/Concerns

- PDF export: chart-to-image serialization pipeline needs prototyping (Phase 15)
- Nivo heat map performance at 200+ people x 18 months (3,600 cells) -- benchmark in Phase 12
- driver.js SSR integration with Next.js App Router -- client-only dynamic import needed (Phase 16)

## Session Continuity

Last session: 2026-03-28T12:22:43.486Z
Stopped at: Completed 12-01-PLAN.md
Resume file: None

---

_Last updated: 2026-03-28_
