---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Plan vs Actual + Approval Workflow
status: verifying
stopped_at: Completed 41-05-PLAN.md
last_updated: "2026-04-08T15:44:00.569Z"
last_activity: 2026-04-08
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 3
  completed_plans: 3
---

# Nordic Capacity -- Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-07)
Planning artifacts (frozen):

- .planning/v5.0-FEEDBACK.md
- .planning/v5.0-USER-JOURNEYS.md
- .planning/v5.0-ARCHITECTURE.md
- .planning/v5.0-HANDOFF.md
- .planning/ROADMAP.md (v5.0 phases 33-45)

**Core value:** Plan vs actual comparison + proposal/approval workflow + persona-scoped views — stop being a fancier Excel, start being a workflow tool.
**Current focus:** Phase 42 — persona-views-part-3-staff-rd-drilldown-zoom

## Current Position

Phase: 42 (persona-views-part-3-staff-rd-drilldown-zoom) — EXECUTING
Plan: 4 of 4
Status: Phase complete — ready for verification
Last activity: 2026-04-08

## v5.0 Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 33 | Foundations — ISO calendar + Swedish holidays | Not started |
| 34 | Foundations — Personas, i18n catalog, historic-edit helper | Not started |
| 35 | Foundations — Universal change_log infrastructure | Not started |
| 36 | Data model — v5.0 schema migrations | Not started |
| 37 | Actuals layer — services, distribution, plan-vs-actual cell | Not started |
| 38 | Excel import pipeline | Not started |
| 39 | Proposal / approval workflow | Not started |
| 40 | Persona views Part 1 — PM | Not started |
| 41 | Persona views Part 2 — Line Manager | Not started |
| 42 | Persona views Part 3 — Staff, R&D, drill-down, zoom | Not started |
| 43 | Admin register maintenance | Not started |
| 44 | API hardening + test contract fill | Not started |
| 45 | Launch gate — PDF export bug fix | Not started |

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
- **Q4** Hybrid: PM→line mgr approval for wishes, universal change_log for all edits. States: proposed/approved/rejected/withdrawn/superseded.
- **Q5** Staff read-only "My Schedule" only.
- **Q6** Historic edits allowed with soft warning, no hard locks, no mandatory reasons.
- **ISO 8601** + 53-week year first-class. 2026 is a 53-week year. Swedish holidays 2026–2030 hardcoded in `lib/time/iso-calendar.ts`.
- **Largest-remainder** distribution for week/month → daily expansion (ADR-010).
- **Universal change_log** enforced via eslint + codegen + runtime test (TC-CL-005).
- **Strictly additive** to v4.0 — only existing-table change is `projects.lead_pm_person_id`.

### Pending Todos

None.

### Blockers/Concerns

- **PDF export bug (launch gate, scheduled as Phase 45):** html2canvas still blank for non-SVG widgets. Last attempt commit `9e19794`. Next try: swap to `html-to-image` or `modern-screenshot`.

## Session Continuity

Last session: 2026-04-08T13:11:58.151Z
Stopped at: Completed 41-05-PLAN.md

---

_Last updated: 2026-04-07_
