---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Plan vs Actual + Approval Workflow
status: ready
stopped_at: Completed phase 47 (10/10 plans, APPROVED, 12 TC-E2E specs + CI + allowlist closed)
last_updated: "2026-04-09T22:30:00.000Z"
last_activity: 2026-04-09
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 4
  completed_plans: 4
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
**Current focus:** v5.0 fully shipped + hardened; no next phase scheduled

## Current Position

Phase: 47 (playwright-e2e-infra) — COMPLETE, APPROVED on 2026-04-09
Last shipped: Phase 47 (10 plans, full Playwright E2E infra + 12 TC-E2E specs + CI extension + allowlist cleanup)
Last activity: 2026-04-09

Phase 47-10 results:
- scripts/generate-tc-manifest.ts widened: added `e2e` to ROOTS, regex now accepts alphanumeric prefix segments and `-approve`/`-reject` tail suffixes (TC-E2E-* grammar)
- tc-manifest.json regenerated: 280 → 292 entries, all 12 canonical TC-E2E-* IDs present with e2e/**/*.spec.ts sources
- tc-allowlist.json: removed 12 TC-E2E entries, dropped groups.TC-E2E and reasons.TC-E2E (TC-NEG deferral preserved)
- tc-id-coverage invariant 3/3 green; full vitest suite 714/714 green; typecheck clean
- Commits: 159b457, 81abdbe
- Phase 44-12's remaining deferral is now closed

Phase 46 results:
- Department Capacity Gauges FIXED: button-preservation filter (preserve buttons containing recharts/svg)
- Availability Finder FIXED: capture height cap (1200px) + dashboard PDF document chartImage maxHeight 350→600
- Live DOM inspection via chrome devtools disproved both research hypotheses; corrected after 2 rounds
- 11/11 pdf-export tests passing (8 baseline + TC-PDF-004 gauge filter + TC-PDF-005 height cap × 2)
- Playwright E2E infrastructure SPLIT to Phase 47 (was originally bundled here)
- 11/11 pdf-export tests green, 707/707 full vitest suite green, pnpm typecheck clean, pnpm build success
- Commits: 1ed32a2, 535526f, ddbd9c3

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
| 46 | Playwright E2E infra + widget rendering polish | In progress (46-01 complete 2026-04-09, widget polish shipped) |
| 47 | Playwright E2E infrastructure (TC-E2E-* coverage) | Complete (APPROVED, 2026-04-09) |

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

- **PDF export residuals RESOLVED (Phase 46-01, 2026-04-09):** Department Capacity Gauges (WIDGET-01) and Availability Finder (WIDGET-02) both fixed in `svg-snapshot.ts` via narrowed button filter and parent-width fallback. Awaiting orchestrator browser smoke re-run to record 9/9 PDF widget family result. Original Phase 45 hypotheses (nested-SVG, react-window) were disproved; actual causes were a wholesale `<button>` denylist and intrinsic-content-width `getBoundingClientRect()`, both documented in `46-01-SUMMARY.md`.

## Session Continuity

Last session: 2026-04-09T22:30:00.000Z
Stopped at: Completed 47-10-PLAN.md (TC-E2E deferral closed, tc-manifest generator widened for e2e specs, 714/714 vitest green, tc-id-coverage 3/3 green)

---

_Last updated: 2026-04-07_
