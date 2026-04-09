---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Plan vs Actual + Approval Workflow
status: ready
stopped_at: Completed phase 45 (1/1 plan, LAUNCH-01 satisfied with deferrals)
last_updated: "2026-04-09T12:00:00.000Z"
last_activity: 2026-04-09
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
**Current focus:** Phase 46 — Playwright E2E infra + widget rendering polish (TC-E2E-* from Phase 44 + 2 PDF widget residuals from Phase 45)

## Current Position

Phase: 46 (playwright-e2e-and-widget-polish) — NEXT
Last shipped: Phase 45 (Launch gate — PDF export bug fix) — 1/1 plan, LAUNCH-01 satisfied with deferrals on 2026-04-09
Last activity: 2026-04-09

Phase 45 results:
- html2canvas → html-to-image@^1.11.13 swap in src/features/dashboard/pdf-export/svg-snapshot.ts
- 7/9 widget families fully fixed in PDF export (KPI cards, heat map, sparklines, bench report + 3 Recharts fast-path widgets already working)
- 2 residuals deferred to Phase 46: Department Capacity Gauges (empty frame — strictly better than pre-phase hijacked arc), Availability Finder (shrunken ~20% — unchanged pre/post phase)
- 8 new tests (5 capture-path + 3 dependency invariant), all green
- Rule 4 scope limit: shipped 7/9 fix now rather than block launch on deeper widget-specific rendering quirks
- v5.0 is UNBLOCKED for launch

Phase 44 results:
- 696/696 tests passing (+229 since baseline 467/473; 6 pre-existing TC-CL-005 failures now green)
- AppError taxonomy: 8 codes, 7 subclasses, ESLint guard active, TC-INV-ERRTAX + TC-INV-ERRWIRE passing
- Tenant isolation: static audit + runtime prober. Wave 2 surfaced and fixed 2 real security bugs (proposals 409→404 leak, register cross-tenant FK poisoning)
- TC-ID coverage gate green (3/3 invariants). 285 canonical TC-IDs; Wave 4 landed service/component tests
- Deferred: TC-E2E-* (12 IDs) → Phase 46 (Playwright infra). TC-NEG-* (13 IDs) → labeling-only gap, mitigating coverage already in place
- Latent bugs fixed in scripts/generate-tc-manifest.ts and scripts/extract-tc-ids-from-architecture.ts regex

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
| 44 | API hardening + test contract fill | Complete (APPROVED-WITH-DEFERRALS, 2026-04-09) |
| 45 | Launch gate — PDF export bug fix | Complete (LAUNCH-01-WITH-DEFERRALS, 2026-04-09) |
| 46 | Playwright E2E infra + widget rendering polish | Not started |

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

- **PDF export residuals (deferred to Phase 46):** Department Capacity Gauges render empty frame (Recharts nested-SVG composition); Availability Finder renders shrunken (~20%, react-window virtualization during capture). See `.planning/phases/45-launch-gate-pdf-export/deferred-items.md`. Core LAUNCH-01 blank-placeholder bug is FIXED for 7/9 widget families.

## Session Continuity

Last session: 2026-04-09T12:00:00.000Z
Stopped at: Completed 45-01-PLAN.md (LAUNCH-01 satisfied with deferrals)

---

_Last updated: 2026-04-07_
