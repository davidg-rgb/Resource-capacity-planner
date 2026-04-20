# Phase 39: Proposal / Approval Workflow - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Mode:** `--auto` (recommended defaults selected by Claude; review and override before planning if needed)

<domain>
## Phase Boundary

Implements the full PM-wish → Line-Manager-approval state machine on top of the schema laid down in Phase 36 (`allocation_proposals` table, `proposal_status` enum, `change_log` action enum already includes `PROPOSAL_*` values).

In scope:
- Server-side proposal service (create, list, approve, reject, edit-rejected → resubmit)
- API routes under `/api/v5/proposals/*` (per ADR API-V5-01)
- Persona-aware edit-gate logic (PM out-of-dept → proposal mode; Line Mgr in-dept → direct; warn on historic per HIST-01)
- Inline cell "proposal mode" UI (dashed border, Pending badge, Submit-wish button + optional note)
- Line Manager approval queue with impact preview + approve/reject (rejection requires reason)
- PM "My Wishes" panel filterable by state with resubmit-from-rejected
- Routing sync (target_department_id follows person.department_id at submit time and on approve)
- change_log writes for every lifecycle event via existing `recordChange` helper
- Concurrency: exactly-one-winner on concurrent approves via `PROPOSAL_NOT_ACTIVE` guard

Out of scope (deferred):
- Counter-proposal flow (line-mgr suggests alternative value) — explicitly out per UX-V5-06
- Bulk approve/reject — not in PROP-03..08
- Notifications (email/push) — separate phase
- Persona-specific full views (PM dashboard, Line Mgr dashboard layouts) — Phases 40-42

</domain>

<decisions>
## Implementation Decisions

### Service & API shape
- **D-01:** New feature folder `src/features/proposals/` with `proposal.service.ts`, `proposal.schema.ts`, `proposal.types.ts`, mirroring the `allocations` and `actuals` feature layout. Keeps service patterns consistent.
- **D-02:** API routes live at `src/app/api/v5/proposals/` per ADR API-V5-01:
  - `POST /api/v5/proposals` — create wish (body: personId, projectId, month, hours, note?)
  - `GET  /api/v5/proposals` — list, with `?status=`, `?departmentId=`, `?proposerId=`, `?personId=` filters
  - `POST /api/v5/proposals/[id]/approve` — approve (line mgr only)
  - `POST /api/v5/proposals/[id]/reject` — reject (body: reason, required)
  - `POST /api/v5/proposals/[id]/resubmit` — clone rejected → new proposed row with `parent_proposal_id`
  - `POST /api/v5/proposals/[id]/withdraw` — proposer withdraws their own pending wish
- **D-03:** All mutating endpoints return `AppError` hierarchy (per API-V5-01); use existing error helpers from `src/lib/errors`.
- **D-04:** Service writes go through `db.transaction(...)` and call `recordChange(tx, …)` inside the same transaction (ADR-003 — single writer guarantee).

### State machine & concurrency
- **D-05:** Status transitions allowed:
  - `proposed → approved` (line mgr in target dept)
  - `proposed → rejected` (line mgr in target dept)
  - `proposed → withdrawn` (proposer only)
  - `proposed → superseded` (set automatically when concurrent approve wins on same person+project+month)
  - `rejected → (new row, parent_proposal_id set)` via resubmit; original stays `rejected`
- **D-06:** Concurrent approve resolution: approve transaction does
  `UPDATE allocation_proposals SET status='approved' … WHERE id=$1 AND status='proposed' RETURNING *`.
  If 0 rows returned → throw `ProposalNotActiveError` mapped to API code `PROPOSAL_NOT_ACTIVE`.
  Then within the same tx, mark any other still-`proposed` rows for the same `(person_id, project_id, month)` as `superseded` and emit `PROPOSAL_WITHDRAWN`-style change_log rows tagged `reason: 'superseded_by'` referencing the winner.
- **D-07:** Approve writes through to `allocations` via the existing `batchUpsertAllocations` path (or a dedicated internal helper that wraps the same SQL) so the conflict-detection / ON CONFLICT logic is reused. The change_log emits BOTH `PROPOSAL_APPROVED` and `ALLOCATION_EDITED` rows; the `ALLOCATION_EDITED` row carries `via='proposal'` in its metadata JSON column to satisfy success criterion #2.

### Routing (PROP-07)
- **D-08:** `target_department_id` is computed at submit time from `people.default_department_id`. On approve, the service re-reads `people.default_department_id` and uses THAT value for the routing check — so a person who moved departments while a proposal was pending is approved/rejected by the new dept's line manager. No background job needed; PROP-07 is satisfied by always reading the live person row at decision time.
- **D-09:** No trigger or cron to "rewrite" pending proposals' target_department_id. The list query for the line-manager queue filters on `people.default_department_id = $myDept` (joined live), not on the snapshotted column. The snapshot column stays for audit/history.

### Edit gate (persona-aware)
- **D-10:** Edit-gate decision lives in a single helper `resolveEditGate({persona, targetPerson, month}): 'direct' | 'proposal' | 'historic-warn-direct' | 'historic-warn-proposal' | 'blocked'`. Used by both the cell component and the API routes (defense in depth — UI hides the path, API still re-checks).
- **D-11:** Rules (matches ADR-008/008b):
  - persona.kind === 'pm' && targetPerson.default_department_id === pm.home_department_id → `direct` (or `historic-warn-direct` if month < currentMonth)
  - persona.kind === 'pm' && targetPerson.default_department_id !== pm.home_department_id → `proposal` (or `historic-warn-proposal`)
  - persona.kind === 'line-manager' && targetPerson.default_department_id === lm.departmentId → `direct` (per PROP-08)
  - persona.kind === 'line-manager' && targetPerson.default_department_id !== lm.departmentId → `proposal`
  - persona.kind === 'staff' → `blocked`
  - persona.kind === 'rd' or 'admin' → `direct` (read-write everywhere; existing v4 behavior preserved)
- **D-12:** Persona is a UX shortcut, NOT a security boundary (ADR-004). API still authorizes by org membership; gate rules above are for UX correctness, but the API route for `approve`/`reject` enforces "caller is line manager OR admin/rd of the proposal's target department" as a hard server-side check.

### UI components
- **D-13:** New components under `src/features/proposals/ui/`:
  - `proposal-cell.tsx` — wraps an inline cell when in proposal mode; dashed border, Pending badge, on-blur captures draft, explicit "Submit wish" button with optional note textarea in a popover. Discard guard on navigate-away if dirty.
  - `wish-card.tsx` — single proposal summary (used in approval queue + My Wishes)
  - `approval-queue.tsx` — list view for line manager with impact preview row ("Sara's June utilization 40% → 90%")
  - `my-wishes-panel.tsx` — PM's filtered list (proposed/approved/rejected) with resubmit action
- **D-14:** Approval queue surfaces at `src/app/(app)/line-manager/approval-queue/page.tsx`. My Wishes surfaces at `src/app/(app)/wishes/page.tsx` (matching ARCHITECTURE.md §312, §337).
- **D-15:** Impact preview is computed client-side from already-loaded month data when possible; falls back to a dedicated `/api/v5/proposals/[id]/impact` endpoint for queue rows where the target person's row is not in the current view. Keeps queue snappy without pre-computing impacts in the DB.
- **D-16:** Reject UX = modal with required-reason textarea (min 1 char, max 1000 to match schema). Cancel and Confirm-reject buttons. Confirm fires the API call.
- **D-17:** Resubmit UX = on a rejected wish-card, "Edit & resubmit" opens the cell back into proposal-mode with the previous hours and note pre-filled; submitting POSTs to `/resubmit` which clones the row (parent_proposal_id set, status `proposed`).

### i18n
- **D-18:** All user-visible strings keyed under `v5.proposals.*` in the existing i18n catalog (Phase 34 infrastructure). Swedish + English at minimum, matching prior phases.

### Tests (mapping to roadmap success criteria)
- **D-19:** Test files match the roadmap codes:
  - `TC-PR-001..013` — proposals service + API integration tests under `src/features/proposals/__tests__/`
  - `TC-PS-001..015` — persona / edit-gate tests under `src/features/personas/__tests__/`
  - `TC-API-010..014` — API contract tests under `src/app/api/v5/proposals/__tests__/`
- **D-20:** Concurrency test uses two parallel `db.transaction` calls in a single test to prove exactly-one-winner; second one must surface `PROPOSAL_NOT_ACTIVE`.

### Claude's Discretion
- Optimistic UI for approve/reject in the queue (rollback on error) — leave to planner.
- Whether `/api/v5/proposals/[id]/impact` lives as its own route or as a query param on GET `/api/v5/proposals` — planner decides based on test/perf trade-off.
- Internal naming of the edit-gate helper enum values — fine to refine.
- Whether to expose a separate `proposal.read.ts` model now or fold into `planning.read.ts` (ARCHITECTURE.md mentions the latter; planner picks based on Phase 40 readiness).

### Folded Todos
None — no pending todos matched Phase 39.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & ADRs
- `.planning/v5.0-ARCHITECTURE.md` §35, §54, §82, §118 (ADR-001), §140 (ADR-003), §193 (ADR-008), §211 (ADR-008b), §312, §337, §363, §406, §415, §557 — defines proposal workflow, two-table model, change_log writer rule, edit gates, and target file structure.

### Requirements
- `.planning/REQUIREMENTS.md` lines 42-49 — PROP-01..PROP-08
- `.planning/REQUIREMENTS.md` line 58 — UX-V5-06 (counter-proposal explicitly out of scope)
- `.planning/REQUIREMENTS.md` line 79 — HIST-01 historic-warn rule
- `.planning/REQUIREMENTS.md` line 83 — API-V5-01 `/api/v5/*` namespace + AppError contract
- `.planning/REQUIREMENTS.md` line 99 — counter-proposal noted as deferred

### Roadmap
- `.planning/ROADMAP.md` §156-167 — Phase 39 goal, success criteria, test code mapping

### Existing schema (Phase 36 output)
- `drizzle/migrations/0004_slippery_epoch.sql` — `allocation_proposals` table, `proposal_status` enum, indexes (`proposals_org_status_idx`, `proposals_org_dept_status_idx`, `proposals_org_person_status_idx`, `proposals_org_person_project_month_idx`, `proposals_parent_idx`)
- `drizzle/migrations/0003_busy_black_bird.sql` — `change_log_action` enum incl. `PROPOSAL_SUBMITTED|APPROVED|REJECTED|WITHDRAWN|EDITED`
- `src/db/schema.ts` — Drizzle types for the above

### Existing services to integrate with / mirror
- `src/features/change-log/change-log.service.ts` — `recordChange` is the ONLY writer for change_log (ADR-003); call inside same tx
- `src/features/allocations/allocation.service.ts` — `batchUpsertAllocations` write-through path + conflict detection pattern to reuse on approve
- `src/features/personas/persona.types.ts` + `persona.context.tsx` — Persona discriminated union + client-side context
- `src/features/actuals/` — feature folder layout to mirror

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `recordChange(tx, …)` in `src/features/change-log/change-log.service.ts` — the mandatory single writer for change_log; proposal service calls it for every lifecycle event.
- `batchUpsertAllocations` in `src/features/allocations/allocation.service.ts` — already handles upsert + zero-hour delete + optimistic-concurrency conflict detection. Approve path wraps it (or a thin internal twin that accepts a tx) to write through.
- `Persona` discriminated union in `src/features/personas/persona.types.ts` — feeds the edit-gate helper directly.
- i18n catalog from Phase 34 — `v5.*` namespace already in use (e.g., `v5.import.*` from Phase 38).
- Existing `(app)` route group at `src/app/(app)/...` for authenticated UI surfaces.

### Established Patterns
- Feature-folder layout: `src/features/<name>/{name.service.ts, name.schema.ts, name.types.ts, __tests__/, ui/}` — used by `allocations`, `actuals`, `change-log`, `import`. Mirror for `proposals`.
- Drizzle transactions wrap any multi-write operation; `recordChange` inside same tx.
- API routes return `AppError` hierarchy with stable error codes (API-V5-01).
- Tests live in `__tests__/` next to the feature, with contract tests for schema and service tests for logic.

### Integration Points
- Persona context (`persona.context.tsx`) provides the active persona to UI; the edit-gate helper consumes it.
- Inline cell components in the existing planning grid (Phase 37 actuals layer) need a hook to switch into proposal mode — likely a render-prop or wrapper, planner decides.
- `src/app/api/v5/` namespace pre-existing from Phase 36-38; just add `proposals/` subtree.
- Line manager nav entry needs to surface "Approval queue" — slot into existing nav for line-manager persona.

</code_context>

<specifics>
## Specific Ideas

- ADR-008 + ADR-008b are the spec authority for the gate. ADR-001 is the spec authority for the two-table model. Don't deviate without revisiting those ADRs first.
- The "exactly one winner" test is the load-bearing concurrency proof — TC-PR-013 — and the planner should call it out as a must-pass gate.
- Impact preview phrasing matches REQUIREMENTS line 45: "Sara's June utilization 40% → 90%". Use the same phrasing pattern in the UI string.

</specifics>

<deferred>
## Deferred Ideas

- **Counter-proposal flow** — line manager suggests an alternative value instead of plain reject. Explicitly out of scope per UX-V5-06 and REQUIREMENTS line 99. Backlog candidate for v5.1+.
- **Notifications** (email/in-app) on proposal submitted/approved/rejected — not in PROP-03..08; separate phase.
- **Bulk approve/reject** in the queue — not in scope; future UX polish.
- **Persona view layouts** (PM dashboard, LM dashboard, Staff view) — Phases 40-42.

### Reviewed Todos (not folded)
None — no todos matched Phase 39.

</deferred>

---

*Phase: 39-proposal-approval-workflow*
*Context gathered: 2026-04-08*
