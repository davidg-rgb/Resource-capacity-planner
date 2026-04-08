# Phase 39: Proposal / Approval Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 39-proposal-approval-workflow
**Mode:** `--auto` (Claude selected recommended defaults; no interactive Q&A)
**Areas auto-discussed:** Service & API shape, State machine & concurrency, Routing (PROP-07), Edit gate, UI surfaces, Tests

---

## Service & API shape

| Option | Description | Selected |
|--------|-------------|----------|
| New `src/features/proposals/` feature folder mirroring allocations/actuals | Consistent with established pattern | ✓ |
| Fold proposals into `src/features/allocations/` | Less duplication, but couples two state machines | |
| Standalone `src/lib/proposals/` outside features tree | Breaks existing convention | |

**Selected:** New feature folder with `proposal.service.ts`, `proposal.schema.ts`, `proposal.types.ts`, `__tests__/`, `ui/`.
**Notes:** Matches v5.0-ARCHITECTURE.md §363-415; lowest cognitive load for downstream agents.

---

## State machine & concurrency

| Option | Description | Selected |
|--------|-------------|----------|
| Conditional UPDATE … WHERE status='proposed' RETURNING + supersede siblings in same tx | Atomic, exactly-one-winner provable in test | ✓ |
| Advisory lock per (person, project, month) | Works but adds lock contention surface | |
| Optimistic version column on proposals | Extra column, no real upside over status check | |

**Selected:** Conditional UPDATE with `PROPOSAL_NOT_ACTIVE` error + sibling supersede in same tx.
**Notes:** Required for TC-PR-013 (concurrency winner test).

---

## Routing (PROP-07)

| Option | Description | Selected |
|--------|-------------|----------|
| Re-read `people.default_department_id` live at decision time + filter queue by live join | No background job, always correct | ✓ |
| Trigger / cron rewriting snapshotted `target_department_id` on person move | More moving parts, race window | |
| Block person move if pending proposal exists | Friction; rejected by client journeys | |

**Selected:** Live read at decision time; snapshot column kept for audit only.
**Notes:** Satisfies PROP-07 without adding background machinery.

---

## Edit gate

| Option | Description | Selected |
|--------|-------------|----------|
| Single `resolveEditGate(...)` helper used by both UI and API | Defense in depth, single source of truth | ✓ |
| Duplicate logic in cell component + each API route | Drift risk | |
| Server-only gate, UI just optimistic | UX gets confusing on failed submit | |

**Selected:** Shared helper. API still hard-checks line-manager authorization on approve/reject regardless.
**Notes:** ADR-004 says persona is UX shortcut, not security boundary — server enforces.

---

## UI surfaces

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated `proposal-cell.tsx`, `wish-card.tsx`, `approval-queue.tsx`, `my-wishes-panel.tsx` under feature/ui | Matches ARCHITECTURE.md file plan | ✓ |
| Reuse current allocation-cell with a `mode` prop | Bloats existing component | |
| Render proposals in a separate page only (no inline cell) | Breaks Journey 1B | |

**Selected:** Dedicated components per ARCHITECTURE.md §406-415.
**Notes:** Inline `proposal-cell` is what enables "dashed border + Pending badge" on the planning grid.

---

## Tests

| Option | Description | Selected |
|--------|-------------|----------|
| Test files keyed to TC-PR-/TC-PS-/TC-API- codes from ROADMAP.md | Direct traceability for verification phase | ✓ |
| Free-form test names | Verification needs manual mapping | |

**Selected:** Code-keyed test files matching the roadmap success criteria.

---

## Claude's Discretion (deferred to planner)
- Optimistic UI vs server-confirmed UI in approval queue
- Whether `/api/v5/proposals/[id]/impact` is its own route or query flag on GET list
- Whether to introduce `proposal.read.ts` now or fold into `planning.read.ts` (Phase 40)

## Deferred Ideas
- Counter-proposal flow (out per UX-V5-06)
- Notifications on proposal lifecycle
- Bulk approve/reject
- Persona-specific view layouts (Phases 40-42)
