# v5.0 Requirements — Plan vs Actual + Approval Workflow

**Milestone:** v5.0
**Date:** 2026-04-07
**Source of truth:** `.planning/v5.0-ARCHITECTURE.md` (§14 roadmap, §15 testable contract), `.planning/v5.0-USER-JOURNEYS.md`, `.planning/v5.0-FEEDBACK.md`

Architecture frozen — each requirement traces to architecture sections and the §15 testable assertions (TC-* IDs) that verify it. Previous milestone (v4.0) requirements archived in `.planning/v2.0-REQUIREMENTS.md` / MILESTONES.md history.

---

## v5.0 Requirements

### Foundations (FOUND-V5)

- [x] **FOUND-V5-01**: `lib/time/iso-calendar.ts` provides ISO 8601 week math (Monday start, `getISOWeek`, `getISOWeekYear`, `getISOWeeksInYear`) and 53-week year detection; no other module may import `date-fns` week APIs or rely on native `Date` locale defaults — verified by TC-CAL-*
- [x] **FOUND-V5-02**: Swedish holidays for 2026–2030 hardcoded (New Year, Epiphany, Good Friday, Easter Monday, May 1, Ascension, National Day, Midsummer Eve, Christmas Eve, Christmas, Boxing Day, New Year's Eve); `isSwedishHoliday(date)` and `workingDaysInRange(start, end)` helpers exposed
- [x] **FOUND-V5-03**: Role switcher header component with 5 roles (PM, Line Mgr, Staff, R&D Mgr, Admin) backed by a React context; selection persists in localStorage; no server enforcement (ADR-004)
- [x] **FOUND-V5-04**: Universal `change_log` table + `recordChange()` service used by every mutating service; enforcement via (a) eslint rule `no-direct-mutation-without-change-log`, (b) `scripts/generate-mutations-manifest.ts` codegen, (c) runtime test TC-CL-005
- [x] **FOUND-V5-05**: i18n key catalog for v5.0 strings (SV primary, EN fallback) seeded under `messages/sv/v5/*` and `messages/en/v5/*` before UI phases begin
- [x] **FOUND-V5-06**: `getServerNowMonthKey(tx)` per-request cached helper for historic-edit checks (ADR-009)

### Actuals Layer (ACT)

- [x] **ACT-01**: `actual_entries` table — columns `(id, organization_id, person_id, project_id, date, hours numeric(5,2), source enum('import'|'manual'), import_batch_id nullable, created_at, updated_at)`, unique index on `(organization_id, person_id, project_id, date)`
- [x] **ACT-02**: `actuals.service.upsertActuals(input, { grain: 'day'|'week'|'month' })` — distributes week/month input across working days via largest-remainder algorithm (ADR-010), stores daily rows, writes change_log
- [x] **ACT-03**: Plan-vs-actual cell component renders planned, actual, and delta with color coding (green under, red over, neutral on plan); reused in PM timeline, Line Mgr group view, Staff schedule, R&D portfolio
- [x] **ACT-04**: Drill-down drawer shows daily plan vs actual breakdown for a person-project-period, callable from any timeline cell
- [x] **ACT-05**: Monthly aggregation of day-grain actuals matches input totals within ±0.01h (largest-remainder preserves sums) — verified by TC-AC-*

### Excel Import Pipeline (IMP)

- [x] **IMP-01**: `import_batches` table — `(id, organization_id, uploaded_by, filename, row_count, state enum('parsing'|'preview'|'committed'|'rolled_back'|'superseded'), override_manual bool, reversal_payload jsonb, created_at, committed_at, rolled_back_at)`
- [x] **IMP-02**: SheetJS-based parser accepts two layouts (row-per-entry canonical: `person_name, project_name, date, hours`; pivoted: dates across / projects down); US `WEEKNUM()` headers raise ValidationError code `ERR_US_WEEK_HEADERS`
- [x] **IMP-03**: Two-stage import flow — (a) parse → preview with row diff counts (new / updated / warnings), (b) explicit commit writes actuals + change_log
- [x] **IMP-04**: Idempotent re-import on unique key `(org, person, project, date)`; override checkbox "Skriv över manuella ändringar" unchecked by default; manual edits preserved unless override is checked
- [x] **IMP-05**: Rollback endpoint `POST /api/v5/imports/{id}/rollback` restores pre-batch state via `reversal_payload`; supersession tracking prevents reversal corruption on a second import over the same rows
- [x] **IMP-06**: Downloadable Excel template (`template_row_per_entry.xlsx`) linked from import wizard
- [x] **IMP-07**: Import preview shows unmatched person/project names with fuzzy suggestions before commit

### Proposal / Approval Workflow (PROP)

- [x] **PROP-01**: `allocation_proposals` table — `(id, organization_id, proposer_id, target_person_id, target_project_id, target_department_id, period_start, period_end, proposed_hours numeric(5,2), note, state enum('proposed'|'approved'|'rejected'|'withdrawn'|'superseded'), rejection_reason, decided_by, decided_at, created_at, updated_at)`
- [x] **PROP-02**: `projects.lead_pm_person_id` column added (only v4.0 schema mutation); determines which PM owns a project's planning
- [x] **PROP-03**: PM inline cell edit on an out-of-department person triggers proposal mode (dashed border, Pending badge) instead of auto-save; explicit "Submit wish" button required (ADR-008b)
- [x] **PROP-04**: Line Manager approval queue lists pending proposals for their department with impact preview ("Sara's June utilization 40% → 90%") and Approve / Reject actions; rejection requires a reason
- [x] **PROP-05**: Approved proposals write through to `allocations`, mark proposal `approved`, record change_log; rejected proposals persist with reason and can be edited + resubmitted by proposer
- [x] **PROP-06**: PM "My Wishes" panel filterable by state (proposed/approved/rejected) with resubmit from rejected card
- [x] **PROP-07**: `target_department_id` stays in sync with `target_person.department_id` — if a person moves departments while a proposal is pending, re-route to the new department's line manager
- [x] **PROP-08**: Line Mgr direct edits within own department bypass the approval gate; still audited via change_log

### Persona Views & Screens (UX-V5)

- [x] **UX-V5-01** (S1): Role switcher header globally available; switching role changes default landing + scope without page reload
- [x] **UX-V5-02** (S2, S3): PM Home + project timeline — overview card, horizontal month-column timeline with plan-vs-actual cells, inline edit with approval gate
- [x] **UX-V5-03** (S4): PM "My Wishes" panel (proposed / approved / rejected tabs, resubmit)
- [x] **UX-V5-04** (S5): Line Mgr Home capacity heatmap — rows = people, cols = months, thresholds: green 60–90%, red >100%, yellow <60%, grey absence
- [x] **UX-V5-05** (S6): Line Mgr group timeline with project breakdown, direct edit, change log visible
- [x] **UX-V5-06** (S7): Approval queue with impact preview, approve/reject; counter-proposal explicitly out of scope
- [x] **UX-V5-07** (S9): Staff "My Schedule" read-only (projects × months, plan-vs-actual split, month summary strip)
- [x] **UX-V5-08** (S10): R&D Manager portfolio grid — projects × months aggregate, project/group row toggle, drill-into-PM-view, long-horizon zoom (20–30 months forward) with 53-week handling
- [x] **UX-V5-09** (S11): Shared drill-down drawer component reused across personas
- [x] **UX-V5-10** (S12): Change log feed filterable by project/person/period/author with persona-scoped defaults
- [x] **UX-V5-11** (S13): Historic edit confirmation dialog on any edit to a period before `getServerNowMonthKey()`
- [x] **UX-V5-12**: Long-horizon timeline zoom levels (month/quarter/year) handle ISO 8601 and 53-week years correctly — week 53 gets its own column in 2026

### Import Actuals Wizard (WIZ)

- [x] **WIZ-01** (S8): Import Actuals wizard accessible from Line Mgr + Admin menus — entry description, template download, drop zone, preview table, override checkbox, confirmation, rollback button (available 24h or until next import)

### Admin Register Maintenance (ADM)

- [x] **ADM-01** (S14): Admin register tables for People, Projects, Departments, Disciplines, Programs with list view (active default, archived toggle) + side-sheet create/edit form
- [x] **ADM-02**: Archive with dependent-row blocking — archiving a project with active allocations raises `ConflictError` code `DEPENDENT_ROWS_EXIST`; archived rows hidden from default views
- [x] **ADM-03**: Every register mutation writes `change_log` entries (`REGISTER_ROW_CREATED` / `REGISTER_ROW_UPDATED` / `REGISTER_ROW_DELETED`)
- [ ] **ADM-04**: Admin landing view is the change_log feed (scoped to all entities)

### Historic Edit Guardrails (HIST)

- [x] **HIST-01**: Any edit (direct or via proposal) targeting a period before the current month triggers a soft warning dialog; confirmation required; no hard lock even when actuals exist

### API Contract (API-V5)

- [ ] **API-V5-01**: All new endpoints live under `/api/v5/*` (proposals, actuals, imports, change-log, register) and return AppError hierarchy with consistent error codes
- [x] **API-V5-02**: Every mutating endpoint tenant-scoped via existing `withTenant()` ORM wrapper; no cross-tenant reads

### Testable Functional Contract (TEST-V5)

- [ ] **TEST-V5-01**: ~280 assertions from ARCHITECTURE.md §15 (TC-CAL-*, TC-PS-*, TC-PR-*, TC-AC-*, TC-IMP-*, TC-API-*, TC-UI-*, TC-E2E-*, TC-NEG-*, TC-PERF-*, TC-REG-*, TC-PSN-*, TC-ZOOM-*, TC-CL-*) have corresponding automated tests that pass before launch — each phase's DoD points at its test IDs
- [ ] **TEST-V5-02**: Deterministic UUID v5 seed data (ARCHITECTURE.md §16) produces identical fixtures across runs for integration tests

### Launch Gate (LAUNCH) — separate from v5.0 feature work

- [ ] **LAUNCH-01**: PDF export captures all dashboard widget types (html2canvas currently blank for non-SVG widgets) — swap to `html-to-image` or `modern-screenshot`; last attempt commit `9e19794`. Tracked as Phase 7.1 in ARCHITECTURE roadmap. **Must ship before v5.0 launch**

---

## Future Requirements (deferred)

- **Counter-proposal flow** — line mgr counters a wish with an alternative value. Flagged nice-to-have in Journey 2B; deferred unless client pushes.
- **Email / Slack notifications** — in-app only for v5.0
- **Staff actuals self-entry** — staff read-only in v5.0; competes with time-tracking tools
- **Hidden-row persistence / user filter prefs** — noted for v6.0
- **Drag-reorder of project/people rows** — drag-to-copy hours IS in scope, reorder is not

## Out of Scope (explicit exclusions)

- **Real authentication for personas** — ADR-004 locked personas as UX shortcuts
- **Task/activity sub-dimension under projects** — Q3 locked project-level grain
- **Multi-entry-per-day preservation** — sums on import, lossy by design
- **Mobile-first design** — desktop primary, mobile degrades gracefully
- **Hard locks on historic edits** — Q6 locked; soft warning only
- **Migrations touching existing tables** — only `projects.lead_pm_person_id` added; everything else additive

---

## Traceability

Filled by roadmapper — maps each REQ-ID to its phase.

| REQ-ID | Phase |
|--------|-------|
| FOUND-V5-01 | Phase 33 |
| FOUND-V5-02 | Phase 33 |
| FOUND-V5-03 | Phase 34 |
| FOUND-V5-05 | Phase 34 |
| FOUND-V5-06 | Phase 34 |
| FOUND-V5-04 | Phase 35 |
| ACT-01 | Phase 36 |
| IMP-01 | Phase 36 |
| PROP-01 | Phase 36 |
| PROP-02 | Phase 36 |
| ACT-02 | Phase 37 |
| ACT-03 | Phase 37 |
| ACT-04 | Phase 37 |
| ACT-05 | Phase 37 |
| IMP-02 | Phase 38 |
| IMP-03 | Phase 38 |
| IMP-04 | Phase 38 |
| IMP-05 | Phase 38 |
| IMP-06 | Phase 38 |
| IMP-07 | Phase 38 |
| WIZ-01 | Phase 38 |
| PROP-03 | Phase 39 |
| PROP-04 | Phase 39 |
| PROP-05 | Phase 39 |
| PROP-06 | Phase 39 |
| PROP-07 | Phase 39 |
| PROP-08 | Phase 39 |
| UX-V5-01 | Phase 40 |
| UX-V5-02 | Phase 40 |
| UX-V5-03 | Phase 40 |
| UX-V5-11 | Phase 40 |
| HIST-01 | Phase 40 |
| UX-V5-04 | Phase 41 |
| UX-V5-05 | Phase 41 |
| UX-V5-06 | Phase 41 |
| UX-V5-10 | Phase 41 |
| UX-V5-07 | Phase 42 |
| UX-V5-08 | Phase 42 |
| UX-V5-09 | Phase 42 |
| UX-V5-12 | Phase 42 |
| ADM-01 | Phase 43 |
| ADM-02 | Phase 43 |
| ADM-03 | Phase 43 |
| ADM-04 | Phase 43 |
| API-V5-01 | Phase 44 |
| API-V5-02 | Phase 44 |
| TEST-V5-01 | Phase 44 |
| TEST-V5-02 | Phase 44 |
| LAUNCH-01 | Phase 45 |

**Coverage:** 38/38 v5.0 requirements + 1 launch gate = 39/39 mapped (100%). No orphans, no duplicates.
