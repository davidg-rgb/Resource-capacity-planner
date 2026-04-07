---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Plan vs Actual + Approval Workflow
status: defining_requirements
stopped_at: New milestone started — requirements + roadmap pending
last_updated: "2026-04-07T00:00:00Z"
last_activity: 2026-04-07
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Nordic Capacity -- Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-07)
Planning artifacts (frozen):
- .planning/v5.0-FEEDBACK.md
- .planning/v5.0-USER-JOURNEYS.md
- .planning/v5.0-ARCHITECTURE.md
- .planning/v5.0-HANDOFF.md

**Core value:** Plan vs actual comparison + proposal/approval workflow + persona-scoped views — stop being a fancier Excel, start being a workflow tool.
**Current focus:** v5.0 requirements + roadmap definition

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-07 — Milestone v5.0 started

## Previous Milestones

| Milestone | Phases | Status | Shipped |
| --------- | ------ | ------ | ------- |
| v1.0 Core Platform | 1-10 | Complete | 2026-03-27 |
| v2.0 Visibility & Insights | 11-17 | Complete | 2026-03-28 |
| v3.0 Switch from Excel | 18-22 | Complete | 2026-03-30 |
| v4.0 Dashboard Visualizations | 23-32 | Complete | 2026-04-01 |

## Accumulated Context

### v5.0 Locked Decisions (from FEEDBACK.md Q1–Q6 + ARCHITECTURE.md ADRs)

- **ADR-004** Personas are UX shortcuts, not security boundaries. Role switcher in header, no real auth.
- **Q2** Store actuals at day grain; accept input at day/week/month; default display monthly.
- **Q3** Excel (.xlsx) primary format. Unique key `(org, person, project, date)`. Override checkbox unchecked by default.
- **Q4** Hybrid: PM→line mgr approval for wishes, universal change_log for all edits. States: draft/proposed/approved/rejected.
- **Q5** Staff read-only "My Schedule" only.
- **Q6** Historic edits allowed with soft warning, no hard locks, no mandatory reasons.
- **ISO 8601** + 53-week year first-class. 2026 is a 53-week year. Swedish holidays 2026–2030 hardcoded in `lib/time/iso-calendar.ts`.
- **Largest-remainder** distribution for week/month → daily expansion (ADR-010).
- **Universal change_log** enforced via eslint + codegen + runtime test (TC-CL-005).
- **Strictly additive** to v4.0 — only existing-table change is `projects.lead_pm_person_id`.

### Pending Todos

None.

### Blockers/Concerns

- **PDF export bug (launch gate, not planning-blocker):** html2canvas still blank for non-SVG widgets. Phase 7.1 in architecture roadmap. Last attempt commit `9e19794`. Next try: swap to `html-to-image` or `modern-screenshot`.

## Session Continuity

Last session: 2026-04-07 (handoff + new-milestone kickoff)
Stopped at: Requirements + roadmap pending

---

_Last updated: 2026-04-07_
