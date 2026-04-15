# v6.0 Pre-flight Verification Report

**Date:** 2026-04-15
**Phase:** 48 — Pre-flight verification
**Commit:** `4db394bb1f252c4e3d4ee8081efec714e2d872ed`
**Scope:** Wave −1 assumption verification before any v6.0 code change.
**Source of truth:** `.planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md` §Wave −1

## Self-Review Checklist (D-03)

Before reviewer-agent sign-off, every verdict below must satisfy:

- [ ] Cites the verbatim command from `UI-RESTRUCTURE-PLAN-v2.md §Wave −1`
- [ ] Captures raw command output in a fenced code block (no paraphrasing)
- [ ] Verdict cell reads exactly one of: `PASS` | `FAIL` | `EXPANDS-SCOPE`
- [ ] Impact notes link the verdict to the downstream phase that consumes it

## Summary Table

| ID | Check | Verdict | Scope impact |
|---|---|---|---|
| [VERIFY-01](#verify-01-getlandingroute-exists) | `getLandingRoute(persona)` exists in `persona.routes.ts` | *TBD* | — |
| [VERIFY-02](#verify-02-proposalsqueuecount-endpoint) | `/api/v5/proposals/queue/count` endpoint exists | *TBD* | — |
| [VERIFY-03](#verify-03-phase-41-department-picker) | Phase 41 department-picker component ships | *TBD* | — |
| [VERIFY-04](#verify-04-admin-api-500-root-causes) | `/api/admin/change-log` + `/api/admin/people` 500 root causes | *TBD* | — |
| [VERIFY-05](#verify-05-custom-dashboard-dead-widget-references) | Custom-dashboard layouts reference dead/deletable widget IDs | *TBD* | — |
| [VERIFY-06](#verify-06-playwright-spec-inventory) | Every `e2e/**/*.spec.ts` classified keep/update/retire | *TBD* | — |
| [VERIFY-07](#verify-07-sidebar-i18n-collision-check) | `sidebar.staff` / `sidebar.projects` existing meanings | *TBD* | — |
| [VERIFY-08](#verify-08-v5personakinds-keys-present) | `v5.persona.kinds.*` keys present in both locales | *TBD* | — |
| [VERIFY-09](#verify-09-plan-vs-actual-cell-reuse) | Plan-vs-actual cell + timeline-grid reused across PM/Staff/R&D | *TBD* | — |

<!-- Detail sections follow; Tasks 2-6 fill them. -->
