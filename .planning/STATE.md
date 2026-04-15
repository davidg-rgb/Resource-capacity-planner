---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: Plan vs Actual + Approval Workflow
status: Milestone complete
stopped_at: Phase 48 context gathered
last_updated: "2026-04-15T22:04:49.784Z"
last_activity: 2026-04-15
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 100
---

# Nordic Capacity -- Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15 — v6.0 milestone added)
Planning artifacts (frozen, authoritative for v6.0):

- .planning/ui-reviews/UX-AUDIT-PERSONAS.md — click-count audit per journey
- .planning/ui-reviews/WIDGET-INVENTORY.md — widget duplication matrix + page-fit scores
- .planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md — **source of truth** (supersedes v1); 6 waves + optional Wave 5, with 3-agent review findings integrated

v5.0 artifacts (completed, do not re-review):

- .planning/v5.0-FEEDBACK.md
- .planning/v5.0-USER-JOURNEYS.md (journey source of truth — still authoritative)
- .planning/v5.0-ARCHITECTURE.md
- .planning/v5.0-HANDOFF.md
- .planning/milestones/v5.0-REQUIREMENTS.md (archived)

**Core value:** Every user journey at its target click-count — remove persona-blind chrome, delete duplicate surfaces, unblock the Line Manager / PM / Admin pages that regress today. No new features.
**Current focus:** Phase 48 — Pre-flight verification

## Current Position

Phase: 48
Plan: Not started
Next command: `/gsd-discuss-phase 48` or `/gsd-plan-phase 48`
Last activity: 2026-04-15

## v6.0 Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 48 | Pre-flight verification | Not started |
| 49 | Unbreak broken persona surfaces | Not started |
| 50 | Persona-aware landing & navigation | Not started |
| 51 | Lean cleanup — duplicate removal | Not started |
| 52 | Per-journey friction fixes | Not started |
| 53 | Chrome polish | Not started |
| 54 | Dashboard quadrant redesign (optional) | Deferred |

## Previous Milestones

| Milestone | Phases | Status | Shipped |
| --------- | ------ | ------ | ------- |
| v1.0 Core Platform | 1-10 | Complete | 2026-03-27 |
| v2.0 Visibility & Insights | 11-17 | Complete | 2026-03-28 |
| v3.0 Switch from Excel | 18-22 | Complete | 2026-03-30 |
| v4.0 Dashboard Visualizations | 23-32 | Complete | 2026-04-01 |
| v5.0 Plan vs Actual + Approval | 33-47 | Complete | 2026-04-13 |

## Accumulated Context

### v6.0 Locked Decisions (from UI-RESTRUCTURE-PLAN-v2.md §0 review response)

- **Feature-flag gating** mandatory for every wave. New flags: `uiV6.landing`, `uiV6.leanTrim`, `uiV6.perJourney`, `uiV6.polish`. Each acts as an independent kill-switch.
- **Wave ordering corrected** — Wave 1 (Landing) strictly precedes Wave 2 (Lean trim); they are not parallelizable. Prior v1 plan's parallel claim is obsolete.
- **Counter-proposal flow stays deferred** (from v5.0 non-goals) — not in any v6.0 phase.
- **DB schema corrected** — custom-dashboard audit uses `dashboard_layouts(layout jsonb)`, not the fictional `layout_versions.placements`. Audit SQL and migration scripted in LEAN-05 requirement.
- **`next.config.redirects[]`** is the chosen mechanism for deleted-route redirects (308 permanent, preserves query strings for deep-links like `/pm/wishes?tab=rejected`).
- **i18n keys land under `sidebar.personaSections.*`** to avoid collision with existing `sidebar.staff` / `sidebar.projects` section headings.
- **Widget-registry defensive fallback** — unknown widget IDs render a "Widget ej tillgänglig" placeholder, never throw. Protects tenant custom layouts during widget deletion rollout.

### v5.0 Locked Decisions (inherited, still binding)

- **ADR-004** Personas are UX shortcuts, not security boundaries. Role switcher in header, no real auth.
- **Q5** Staff read-only "My Schedule" only.
- **Q6** Historic edits allowed with soft warning, no hard locks, no mandatory reasons.
- **ISO 8601** + 53-week year first-class. 2026 is a 53-week year. Swedish holidays 2026–2030 hardcoded in `lib/time/iso-calendar.ts`.
- **Universal change_log** enforced via eslint + codegen + runtime test (TC-CL-005).

### Pending Todos

None.

### Blockers/Concerns

- **Phase 48 must complete before any code change.** 3-agent review surfaced 9 unverified assumptions (getLandingRoute existence, `/api/v5/proposals/queue/count` existence, Phase 41 department picker status, admin API 500 root causes, custom-dashboard widget references, existing Playwright spec classification, sidebar i18n collision map, `v5.persona.kinds.*` key presence, plan-vs-actual cell reuse). Pre-flight report resolves each or expands downstream phase scope.

## Session Continuity

Last session: 2026-04-15T21:08:49.274Z
Stopped at: Phase 48 context gathered

---

_Last updated: 2026-04-15 — v6.0 initialized_
