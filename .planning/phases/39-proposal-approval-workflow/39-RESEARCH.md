# Phase 39: Proposal / Approval Workflow — Research

**Researched:** 2026-04-08
**Domain:** State-machine feature on existing Drizzle + Next.js App Router + Clerk + ag-grid stack
**Confidence:** HIGH (all findings come from direct file reads of the repo)

## Summary

Phase 39 has an unusually clean runway: the schema is already deployed (migration `0004_slippery_epoch.sql`), the `change_log` pipeline is ADR-003–locked through `recordChange`, and the existing v5 API routes (under `src/app/api/v5/imports/*`) give a verbatim template for route handler conventions, error envelope, Zod input validation, and Clerk-based tenant scoping. The persona system is client-only localStorage and never reaches the server — the server will need to derive the edit gate solely from `people.department_id` + Clerk `userId`/role, and the client `persona.kind` is only a UX pre-check. The planning grid is a secondary concern: today's production editable grid is **`src/components/grid/allocation-grid.tsx` (ag-grid)** and does not use `PlanVsActualCell`; wiring proposal-mode into ag-grid is the single largest UI integration risk in this phase.

**Primary recommendation:** Build the service layer against PGlite-mocked tests first (the concurrency winner test is trivial with two awaited `db.transaction` calls against one PGlite instance). Then build API routes mirroring `src/app/api/v5/imports/[sessionId]/commit/route.ts` line-for-line. Treat proposal-mode in the ag-grid as a dedicated wave: extend the existing `cell-renderers/` folder with a `proposal-cell.tsx` renderer toggled by the column definition when the target person is out-of-department, rather than wrapping the entire grid. `PlanVsActualCell` is NOT the editable production surface and only matters for Phase 40/41.

## User Constraints (from CONTEXT.md)

### Locked Decisions
(See `39-CONTEXT.md` — all D-01 through D-20 decisions are locked. Key points:)
- **D-01:** New `src/features/proposals/{proposal.service.ts, proposal.schema.ts, proposal.types.ts, __tests__/, ui/}` mirroring `allocations`/`actuals`.
- **D-02:** API routes under `src/app/api/v5/proposals/` — `POST /` (create), `GET /` (list), `POST /[id]/approve`, `POST /[id]/reject`, `POST /[id]/resubmit`, `POST /[id]/withdraw`.
- **D-04:** `db.transaction(...)` + `recordChange(…, tx)` in same tx (ADR-003 single writer).
- **D-06:** Concurrency resolution via conditional `UPDATE … WHERE status='proposed' RETURNING` + supersede siblings same tx; 0 rows → `ProposalNotActiveError` (code `PROPOSAL_NOT_ACTIVE`).
- **D-07:** Approve writes through to `allocations` via `batchUpsertAllocations` path; emits BOTH `PROPOSAL_APPROVED` and `ALLOCATION_EDITED` change_log rows; `ALLOCATION_EDITED` row carries `via='proposal'` in the change_log `context` JSON column.
- **D-08/D-09:** Routing (PROP-07) resolved by live read of `people.department_id` at decision time; no triggers, no cron. List query joins live.
- **D-10:** Single `resolveEditGate({persona, targetPerson, month})` helper used by both UI and API (defense in depth).
- **D-12:** API still authorizes by Clerk role/org membership; persona is NOT a security boundary.
- **D-13..D-17:** UI components under `src/features/proposals/ui/` — `proposal-cell.tsx`, `wish-card.tsx`, `approval-queue.tsx`, `my-wishes-panel.tsx`. Reject = modal with required reason 1..1000 chars. Resubmit clones row with `parent_proposal_id`.
- **D-18:** i18n keys under `v5.proposals.*` in the existing catalog.
- **D-19/D-20:** Test file layout matches TC-PR-*/TC-PS-*/TC-API-* codes; concurrency test uses two parallel `db.transaction` calls.

### Claude's Discretion
- Optimistic UI for approve/reject in queue.
- Whether `/[id]/impact` is its own route or a query param on `GET /`.
- Internal naming of the edit-gate helper enum.
- Whether to create `proposal.read.ts` now or fold into `planning.read.ts`.

### Deferred Ideas (OUT OF SCOPE)
- Counter-proposal flow (UX-V5-06 out).
- Bulk approve/reject.
- Notifications (email/in-app).
- Persona full view layouts (Phases 40–42).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROP-03 | PM inline out-of-dept edit → proposal mode, explicit Submit wish | Edit gate helper + client-side resolveEditGate + ag-grid proposal-cell renderer; existing grid in `src/components/grid/allocation-grid.tsx` is the integration surface |
| PROP-04 | Line Mgr approval queue with impact preview, approve/reject, reject requires reason | Reuse `batchUpsertAllocations` write-through path; modal pattern not yet established — recommend building one-off modal in `src/features/proposals/ui/` using existing shadcn/Radix primitives (assumed present; verify in planning) |
| PROP-05 | Approve writes through to allocations + emits both PROPOSAL_APPROVED and ALLOCATION_EDITED (via='proposal'); rejection persists + resubmittable | `recordChange` takes a `context: jsonb` arg — put `{via:'proposal', proposalId}` there; schema confirmed via migration `0003_busy_black_bird.sql` line 12 |
| PROP-06 | PM "My Wishes" panel filterable by state + resubmit from rejected | List endpoint `GET /api/v5/proposals?proposerId=…&status=…` |
| PROP-07 | Person moves department → proposal re-routes to new dept's line manager | List query JOINs `people` live on `department_id`, not the snapshotted `target_department_id` column |
| PROP-08 | LM direct edits in own dept bypass gate, still log | `resolveEditGate` returns `'direct'` for LM in own dept; existing `batchUpsertAllocations` path already writes `ALLOCATION_EDITED` via the mutations pattern — verify in planning |

## Standard Stack

All libraries in use; no new dependencies needed.

| Library | Version | Purpose | Why Standard (here) |
|---------|---------|---------|---------------------|
| drizzle-orm | current | ORM + transactions | Already the sole data layer |
| @electric-sql/pglite | current | In-process Postgres for tests | Used by `change-log.service.test.ts` — concurrency-safe |
| zod | current | Input validation | Used by every v5 API route and every service entry point |
| @clerk/nextjs | current | Auth + org scoping via `auth()`/`requireRole` | `src/lib/auth.ts` — no replacement |
| @tanstack/react-query | current | Client data fetching | Used by `use-actuals-cell.ts` — mirror for proposals queue |
| next-intl | current | i18n | Keys live in `src/messages/{sv,en}.json` under `v5.*` |
| ag-grid-community / ag-grid-react | current | Editable grid surface | This is the real planning grid; proposal-cell must integrate as an ag-grid custom cell renderer / editor |

**Do NOT introduce:** a new state machine library (xstate etc.), a new modal library (use whatever the repo already uses — verify during planning), email/notification libs.

## Architecture Patterns

### Feature folder (mirror `src/features/actuals/`)
```
src/features/proposals/
├── proposal.service.ts       # state machine, transactions, recordChange calls
├── proposal.schema.ts        # Zod input schemas (also re-export drizzle schema if needed)
├── proposal.types.ts         # ProposalStatus, EditGateDecision, ProposalDTO
├── edit-gate.ts              # resolveEditGate({persona, targetPerson, month}) — pure fn
├── use-proposals.ts          # react-query hooks (mirror use-actuals-cell.ts)
├── __tests__/
│   ├── proposal.service.test.ts            # TC-PR-001..013
│   ├── edit-gate.test.ts                   # TC-PS-001..010
│   └── concurrency.test.ts                 # TC-PR-013 two-tx winner
└── ui/
    ├── proposal-cell.tsx          # ag-grid custom cell component OR standalone for Phase 40
    ├── wish-card.tsx
    ├── approval-queue.tsx
    ├── my-wishes-panel.tsx
    └── reject-modal.tsx
```

### API route (mirror `src/app/api/v5/imports/[sessionId]/commit/route.ts`)
```typescript
// src/app/api/v5/proposals/[id]/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { approveProposal } from '@/features/proposals/proposal.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId, userId, role } = await requireRole('planner');
    const { id } = await params;
    const result = await approveProposal({
      orgId,
      proposalId: id,
      actorPersonaId: userId,
      callerRole: role,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Single-writer change_log pattern (verbatim from `actuals.service.ts`)
```typescript
await db.transaction(async (tx) => {
  // 1. Conditional UPDATE for the win
  const [winner] = await tx
    .update(allocationProposals)
    .set({ status: 'approved', decidedBy: userId, decidedAt: new Date() })
    .where(and(
      eq(allocationProposals.id, proposalId),
      eq(allocationProposals.status, 'proposed'),
    ))
    .returning();
  if (!winner) throw new ProposalNotActiveError();

  // 2. Supersede siblings on same (person, project, month)
  await tx.update(allocationProposals).set({ status: 'superseded' }).where(...);

  // 3. Write through to allocations (reuse batchUpsertAllocations logic, tx-scoped)
  // NOTE: batchUpsertAllocations today opens its own db.transaction — see Gap #3.

  // 4. recordChange × 2 (PROPOSAL_APPROVED + ALLOCATION_EDITED w/ context.via='proposal')
  await recordChange({ ..., action: 'PROPOSAL_APPROVED', context: { proposalId } }, tx);
  await recordChange({ ..., action: 'ALLOCATION_EDITED', context: { via: 'proposal', proposalId } }, tx);
});
```

### Anti-patterns to avoid
- **Don't** re-open a second `db.transaction` inside the approve tx — nested transactions in Drizzle + Neon are not the savepoints you expect.
- **Don't** trust client-supplied `persona` in the API body. The server re-derives from `people.department_id` + Clerk role.
- **Don't** store `via='proposal'` in `new_value` JSON — the `context` column is the documented place (see `change_log.context jsonb`, migration 0003 line 12). Matches how `actuals.service.ts` uses `context`.
- **Don't** build a custom modal primitive. Reuse whatever the repo already has.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrency on approve | Advisory locks, SELECT FOR UPDATE ceremony | `UPDATE … WHERE status='proposed' RETURNING` | Single atomic statement, zero-row result = lost race, done |
| State machine transitions | xstate / custom FSM class | Inline guards in service methods | 5 states, 6 transitions — dispatching by method name is clearer |
| Modal management | New library | Existing repo modal primitive | Verify in Wave 0 — likely Radix/shadcn based on ag-grid/react-query stack |
| Route authorization | Middleware matcher | `requireRole('planner')` in each route + service-layer re-check | Matches every other v5 route |
| Error envelope | Custom codes scattered in routes | `AppError` subclasses + `handleApiError` | `src/lib/errors.ts` + `src/lib/api-utils.ts` — already the contract |

## Runtime State Inventory

Not applicable — this is a greenfield feature, not a rename/refactor. No stored data references, no external service config, no OS-registered state, no secret renames, no stale build artifacts.

## Common Pitfalls

### Pitfall 1: Nested transactions on approve write-through
**What goes wrong:** `batchUpsertAllocations` opens its own `db.transaction(...)`. Calling it from inside the approve transaction will either fail, silently swallow, or drop ADR-003 guarantees.
**Why:** Drizzle's Neon http driver does not do real savepoints for nested `db.transaction`.
**How to avoid:** Refactor `batchUpsertAllocations` to accept an optional `tx` parameter (like `recordChange` does), OR extract its core into an internal `_batchUpsertAllocationsInTx(tx, ...)` helper that both the existing public API and the proposal service call. **This is a required refactor, not optional.**
**Warning sign:** A test that asserts "approve + change_log row are both written or both rolled back" will fail.

### Pitfall 2: Persona drift between UI and API
**What goes wrong:** UI shows "Submit wish" (proposal mode), user clicks, API treats it as a direct edit because the server never sees `persona.kind`.
**Why:** Persona is localStorage-only. Client cannot assert "I am a PM" to the server trustworthy-ly, and `requireRole('planner')` is coarse (viewer/planner/admin/owner — Clerk roles, NOT persona).
**How to avoid:** The API endpoint for `POST /proposals` must exist independently of direct-edit endpoints. The client calls the correct endpoint based on `resolveEditGate` output. Server-side, the presence of a row in `allocation_proposals` with `status='proposed'` IS the proof that this was a proposal flow — no persona check needed on the create path. The gate on approve is "caller's Clerk role OR caller's `personId` matches target department's line manager" — to evaluate this server-side we need to know which `personId` represents the caller. **Open question:** there is no current mapping from Clerk `userId` → `people.id` → `department_id`. See Open Questions #1.
**Warning sign:** Approve endpoint has no server-side department check and only verifies `requireRole('planner')`.

### Pitfall 3: `PlanVsActualCell` is not the editable surface today
**What goes wrong:** Planner assumes Phase 37 delivered an editable cell that proposal-mode can wrap.
**Why:** `PlanVsActualCell` at `src/components/timeline/PlanVsActualCell.tsx` exists but the production planning grid is `src/components/grid/allocation-grid.tsx` (ag-grid). The two are unrelated. Phase 40 will unify them; Phase 39 inherits the mismatch.
**How to avoid:** Phase 39 UI integration should target ag-grid via a custom cell editor/renderer in `src/components/grid/cell-renderers/`. Simultaneously, build a standalone `proposal-cell.tsx` under `src/features/proposals/ui/` that Phase 40 can drop into `PlanVsActualCell`-based timelines. **Two integration points.**
**Warning sign:** Plan assumes a single UI integration point and doesn't mention ag-grid.

### Pitfall 4: Month column is `date` not text
**What goes wrong:** Tests and service code compare `month` as `'2026-06'` but DB stores `'2026-06-01'`.
**Why:** `allocation_proposals.month` is `date` (migration 0004 line 22), same as `allocations.month`. `allocation.service.ts` lines 71, 203 normalize via `${month}-01` on the way in and `normalizeMonth` on the way out.
**How to avoid:** Proposal service follows identical normalization pattern. The non-unique index `proposals_org_person_project_month_idx` allows multiple proposals per (person, project, month) — this is by design for superseded history.

### Pitfall 5: `recordChange` schema validation will reject wrong `entity`
**What goes wrong:** Writing `PROPOSAL_APPROVED` with `entity: 'allocation'` (because you copied the actuals code) fails Zod validation.
**Why:** `recordChange` Zod schema uses `z.enum(changeLogEntityEnum.enumValues)` and `changeLogEntityEnum` includes `'proposal'`, `'allocation'`, `'actual_entry'`, etc (migration 0003 line 2).
**How to avoid:** `PROPOSAL_APPROVED` → `entity: 'proposal', entityId: proposalId`; the sibling `ALLOCATION_EDITED` row → `entity: 'allocation', entityId: allocation.id`. Two separate `recordChange` calls with DIFFERENT entity/entityId but same `context.proposalId` for joining.

## Code Examples

### Conditional UPDATE winner pattern
```typescript
// src/features/proposals/proposal.service.ts
const [winner] = await tx
  .update(allocationProposals)
  .set({
    status: 'approved',
    decidedBy: actorPersonaId,
    decidedAt: new Date(),
  })
  .where(and(
    eq(allocationProposals.id, proposalId),
    eq(allocationProposals.organizationId, orgId),
    eq(allocationProposals.status, 'proposed'),
  ))
  .returning();

if (!winner) {
  throw new ProposalNotActiveError(proposalId);
}
```

### change_log context (verbatim pattern from `actuals.service.ts` lines 127-145)
```typescript
await recordChange(
  {
    orgId,
    actorPersonaId,
    entity: 'allocation',
    entityId: writtenAllocationId,
    action: 'ALLOCATION_EDITED',
    previousValue: { hours: previousHours },
    newValue: { hours: winner.proposedHours },
    context: {
      via: 'proposal',
      proposalId: winner.id,
      personId: winner.personId,
      projectId: winner.projectId,
      month: winner.month,
    },
  },
  tx,
);
```

### Live-routing list query (PROP-07)
```typescript
// Joins people LIVE — snapshot target_department_id is ignored for routing
const pending = await db
  .select({ proposal: allocationProposals, person: people })
  .from(allocationProposals)
  .innerJoin(people, eq(allocationProposals.personId, people.id))
  .where(and(
    eq(allocationProposals.organizationId, orgId),
    eq(allocationProposals.status, 'proposed'),
    eq(people.departmentId, myDepartmentId), // ← live department
  ));
```

### Concurrency test skeleton (TC-PR-013)
```typescript
// src/features/proposals/__tests__/concurrency.test.ts
// Mirrors the pglite pattern from change-log.service.test.ts
it('exactly one winner on concurrent approve', async () => {
  const [r1, r2] = await Promise.allSettled([
    approveProposal({ orgId, proposalId, actorPersonaId: 'lm-1' }),
    approveProposal({ orgId, proposalId, actorPersonaId: 'lm-2' }),
  ]);
  const successes = [r1, r2].filter(r => r.status === 'fulfilled');
  const failures  = [r1, r2].filter(r => r.status === 'rejected');
  expect(successes).toHaveLength(1);
  expect(failures).toHaveLength(1);
  expect((failures[0] as PromiseRejectedResult).reason)
    .toMatchObject({ code: 'PROPOSAL_NOT_ACTIVE' });
});
```

## Implementation Gap Answers (the 10 questions from the research focus)

### 1. Where is the inline cell rendered today? Can `proposal-cell` wrap it?
**Answer:** The production editable cell is an **ag-grid default cell editor inside `src/components/grid/allocation-grid.tsx`** — not `PlanVsActualCell`. Edits flow via `onCellValueChanged` → `onCellChange(projectId, month, hours)` prop → parent debounced autosave (line 94-112). Phase 37 shipped `PlanVsActualCell.tsx` as a standalone component for Phase 40 timelines; it is not yet wired into `allocation-grid.tsx`. **Recommendation:** Add a custom ag-grid cell editor component in `src/components/grid/cell-renderers/` that consults `resolveEditGate` on edit-begin; if gate returns `'proposal'`, intercept the edit commit and open a proposal-submit popover instead of calling `onCellChange`. The parent component passes `persona` and a per-row `targetPerson` down. **This is the single biggest integration risk** — budget a dedicated task for it.

### 2. How does persona reach API routes today?
**Answer: It doesn't.** `persona.context.tsx` is `'use client'` + localStorage only (key `nc:persona`). Server routes use `requireRole()` from `src/lib/auth.ts` which returns Clerk `userId`, `orgId`, and one of `viewer|planner|admin|owner`. There is **no middleware**, **no cookie**, **no header** that carries persona kind or persona-linked `personId`. Consequences:
- The server-side edit-gate "is this caller a line manager of target person's department" check **cannot be satisfied today** without a new mapping.
- **Required new piece:** Either (a) a `clerk_user_id → person_id` mapping (column on `people` or a join table), or (b) accept that Clerk role `planner`+ is sufficient authorization and the department check is advisory-only in v5.0. CONTEXT.md D-12 says "caller is line manager OR admin/rd of target department" is a hard server-side check — this **requires new data**. **Flag for planner/user.** See Open Questions #1.

### 3. What does `change_log.context` store? How to encode `via='proposal'`?
**Answer:** `change_log` has a dedicated `context jsonb` column (migration `0003_busy_black_bird.sql` line 12, Drizzle schema mirrored in `change-log.schema.ts`). `recordChange`'s Zod input accepts `context: z.record(z.string(), z.unknown()).nullable()`. `actuals.service.ts` lines 136-143 uses it for `{grain, dates, source, personId, projectId, importBatchId}`. **Encoding for phase 39:** `context: { via: 'proposal', proposalId, personId, projectId, month }` on the `ALLOCATION_EDITED` row. No schema change needed.

### 4. What `expectedUpdatedAt` should approve pass to `batchUpsertAllocations`?
**Answer:** None — **approve should bypass conflict detection**. The signature `AllocationUpsert` has `expectedUpdatedAt?: string` (see `allocation.service.ts` line 92 — "Omitting expectedUpdatedAt forces the upsert (backward compatible)"). Rationale: when a proposal is approved, the approver's intent is "whatever is there, write this value"; we have no "last known client state" to check against. The approve transaction itself is the concurrency boundary via the conditional UPDATE on `status='proposed'`. **But:** `batchUpsertAllocations` opens its own top-level `db.transaction` (line 68). We cannot call it from inside the approve tx. **Required refactor:** extract `_applyUpsertsInTx(tx, orgId, upserts)` private helper; public `batchUpsertAllocations` wraps it in a tx; proposal service calls the helper directly inside its own tx. This is a mandatory Wave 0 or Wave 1 task.

### 5. v5 API conventions (error envelope, validation, auth context)
**Answer: All verified and uniform.**
- **Error envelope:** `AppError.toJSON()` → `{ error: code, message, details? }` + HTTP status from `statusCode`. `handleApiError` in `src/lib/api-utils.ts` maps Zod errors to `ValidationError` and unknown errors to 500. Use `AppError` subclasses (`NotFoundError`, `ConflictError`, `ForbiddenError`, `ValidationError`) from `src/lib/errors.ts`. Add `ProposalNotActiveError extends ConflictError` with code `PROPOSAL_NOT_ACTIVE`.
- **Route pattern:** `route.ts` files with exported `POST`/`GET` functions; `async ({ params }: { params: Promise<{ id: string }> })` signature (Next 15 async params); wrap body in try/catch → `handleApiError`. Example: `src/app/api/v5/imports/[sessionId]/commit/route.ts`.
- **Validation:** Zod schemas defined inline in the route file OR in `{feature}.schema.ts`. Every input parsed before service call.
- **Auth/org context:** `const { orgId, userId, role } = await requireRole('planner');` — first line of every mutating route. Throws `AuthError`/`ForbiddenError` which `handleApiError` converts automatically.
- **`actorPersonaId`:** Services accept it as input and it is set to Clerk `userId` at the route layer (see `commit/route.ts` line 37). It is NOT the persona kind — it's the actor identifier for change_log.

### 6. Test infra — concurrency simulation
**Answer: Vitest + `@electric-sql/pglite` + `vi.mock('@/db')`.** Verified in `src/features/change-log/__tests__/change-log.service.test.ts` lines 1-40. Pattern:
1. Construct `new PGlite()` → `drizzle(pg, { schema })`.
2. `vi.mock('@/db', () => ({ get db() { return testDb } }))`.
3. `await import('../service')` AFTER the mock.
4. Seed minimal schema slice via `testDb.execute(sql\`CREATE TABLE…\`)`.

For **concurrency tests**: because PGlite is single-connection, "truly parallel" transactions are not possible, but `Promise.allSettled([approve(x), approve(x)])` DOES serialize them through PGlite's WAL and the conditional UPDATE pattern produces exactly-one-winner semantics identical to production Postgres (row lock is acquired by the first UPDATE, second sees status!='proposed'). This is the same mechanism that will work on real Neon in production. TC-PR-013 can and should use this.

**Config:** `vitest.config.ts` — tests matched by `src/**/__tests__/**/*.test.{ts,tsx}`; jsdom for .tsx, node for .ts; `vitest.setup.ts`. Commands: `npm test` (run) / `npm run test:watch`.

### 7. i18n mechanics
**Answer:** Single JSON file per locale: `src/messages/sv.json` and `src/messages/en.json`. Keys organized hierarchically under `v5.*`. **Existing keys already in place for phase 39:** `v5.approval.{approve,reject,rejectReasonPlaceholder,counterPropose,impactCurrent,impactProjected}` (lines 411-418), `v5.timeline.cell.pendingBadge` (line 407), `v5.persona.kind.*` (lines 389-396). Phase 39 should add `v5.proposals.*` namespace for newly-added strings (my wishes panel, modals, error messages). **No automated missing-key detection**; rely on TypeScript if there's a keys.ts index (exists at `src/messages/keys.ts` — verify in planning). Use `useTranslations('v5.proposals')` in UI components; ESLint rule `no-restricted-syntax` on JSXText is enforced (see PlanVsActualCell.tsx comment line 24).

### 8. Impact preview computation
**Answer: Partial reuse available.** `src/features/actuals/actuals.cell.actions.ts` has `getCellData(orgId, personId, projectId, monthKey)` returning `{planned, actual}` for ONE cell. For utilization "X% → Y%" across a full month, you need **sum of planned hours for person × month** / `people.targetHoursPerMonth`. Two options:
- **(a) Client-side (preferred per D-15):** Approval queue already loads the visible person's monthly aggregate via the existing planning read path — if person is already loaded, compute in JS.
- **(b) Dedicated endpoint `GET /api/v5/proposals/[id]/impact`:** new service function doing `SELECT sum(hours) FROM allocations WHERE person_id=$1 AND month=$2` + `people.target_hours_per_month` lookup. Simple; ~15 lines. **Recommend (b) as the baseline** and let the UI optimistically use (a) when data is already cached.

No existing "utilization aggregator" service to reuse. Closest is the dashboard widgets under `src/features/dashboard/` — not worth detouring through. Write a small helper in `proposal.service.ts` or `proposal.read.ts`.

### 9. Persona-gated routes / line-manager nav
**Answer: No server-side route gating exists.** `src/app/(app)/` contains `line-manager/import-actuals/page.tsx` but the route is reachable by anyone — only the Clerk role check (`requireRole('planner')`) on the server action or API gates writes. **Client-side nav gating:** verify during planning whether `src/app/(app)/layout.tsx` or a nav component consumes `usePersona()` to hide items (I did not find that pattern). For Phase 39 assume:
- `approval-queue/page.tsx` and `wishes/page.tsx` are reachable by URL.
- The page-level component calls `usePersona()` and shows a "Switch to Line Manager persona" nudge if the persona kind doesn't match.
- Server-side, `requireRole('planner')` is the only gate on the API — the "is this caller a line manager of this department" check depends on the clerk→person mapping (see Open Questions #1).

### 10. Discard guard / dirty navigation warning
**Answer: No pattern exists in the codebase.** Grep for `beforeunload`, `useBeforeUnload`, `unsaved`, `routerEvents` — none found in `src/features/**`. Next.js App Router does not ship a built-in "are you sure you want to leave" hook. **Recommend:** use `window.addEventListener('beforeunload', …)` inside the proposal-cell popover when dirty; for in-app navigation, guard clicks on the popover's own close/cancel buttons. Do NOT try to intercept `router.push` — App Router does not support it cleanly. Document this limitation in the plan.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate `allocations` autosave from approval flow | Approve writes through via the same upsert path | Phase 39 (this phase) | Requires the `_applyUpsertsInTx(tx, …)` refactor |
| `PlanVsActualCell` as the editable cell | ag-grid custom cell editor | Pending (Phase 39 or 40) | Phase 39 introduces a proposal-mode editor; Phase 40 unifies |
| Persona is purely UX | Still purely UX, but now with server-side department check on approve | Phase 39 | **Requires** clerk→person mapping if department check is hard |

## Environment Availability

Skipped — no new external tools/services. All dependencies are already installed (Drizzle, Clerk, ag-grid, PGlite, Vitest, next-intl).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- src/features/proposals` |
| Full suite command | `npm test` |
| DB strategy | In-process PGlite + `vi.mock('@/db')`; seed per-test via `testDb.execute(sql\`CREATE TABLE…\`)` or helper |

### Phase Requirements → Test Map

| Test ID | Behavior | Test Type | File | Automated Command |
|---------|----------|-----------|------|-------------------|
| TC-PR-001 | PM out-of-dept edit creates proposal (not direct allocation write) | service | `src/features/proposals/__tests__/proposal.service.test.ts` | `npm test -- proposal.service` |
| TC-PR-002 | PM in-dept edit returns `'direct'` gate | edit-gate unit | `src/features/proposals/__tests__/edit-gate.test.ts` | `npm test -- edit-gate` |
| TC-PR-003 | Staff persona → `'blocked'` | edit-gate unit | `.../edit-gate.test.ts` | same |
| TC-PR-004 | Approval queue list filters by target dept (live join) | service | `.../proposal.service.test.ts` | same |
| TC-PR-005 | Approve transitions `proposed → approved`, sets `decided_by`, `decided_at` | service | `.../proposal.service.test.ts` | same |
| TC-PR-006 | Approve writes through to `allocations` (row exists with right hours) | service | `.../proposal.service.test.ts` | same |
| TC-PR-007 | Approve emits `PROPOSAL_APPROVED` change_log row | service | `.../proposal.service.test.ts` | same |
| TC-PR-008 | Approve emits `ALLOCATION_EDITED` change_log row with `context.via='proposal'` | service | `.../proposal.service.test.ts` | same |
| TC-PR-009 | Reject requires reason; 1..1000 chars; persists reason | service + schema | `.../proposal.service.test.ts` | same |
| TC-PR-010 | PROP-07 — person moves dept → new dept LM sees pending in queue | service (live join) | `.../proposal.service.test.ts` | same |
| TC-PR-011 | Resubmit from rejected creates new row with `parent_proposal_id` set, `status='proposed'`; original stays `rejected` | service | `.../proposal.service.test.ts` | same |
| TC-PR-012 | Withdraw by proposer only; non-proposer gets `ForbiddenError` | service | `.../proposal.service.test.ts` | same |
| TC-PR-013 | **Concurrent approve → exactly one winner via `PROPOSAL_NOT_ACTIVE`** | service concurrency | `src/features/proposals/__tests__/concurrency.test.ts` | `npm test -- concurrency` |
| TC-PS-001..010 | Edit-gate decision table — all 5 persona kinds × in/out-of-dept × historic/current | pure unit | `.../edit-gate.test.ts` | `npm test -- edit-gate` |
| TC-PS-007 | LM direct edit in own dept bypasses gate but logs change_log (PROP-08) | integration | `.../proposal.service.test.ts` | same |
| TC-API-010 | `POST /api/v5/proposals` — happy path, returns 201 + proposal DTO | API route | `src/app/api/v5/proposals/__tests__/create.route.test.ts` | `npm test -- proposals.*route` |
| TC-API-011 | `POST /approve` — happy path + change_log assertions | API route | `.../approve.route.test.ts` | same |
| TC-API-012 | `POST /reject` — missing reason → 400 `ERR_VALIDATION` | API route | `.../reject.route.test.ts` | same |
| TC-API-013 | `POST /resubmit` — source row not rejected → 409 `ERR_CONFLICT` | API route | `.../resubmit.route.test.ts` | same |
| TC-API-014 | `POST /approve` — concurrent → 409 `PROPOSAL_NOT_ACTIVE` | API route | `.../approve.route.test.ts` | same |

### Sampling Rate
- **Per task commit:** `npm test -- src/features/proposals`
- **Per wave merge:** `npm test -- src/features/proposals src/app/api/v5/proposals`
- **Phase gate:** `npm test` full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/features/proposals/` folder does not exist — create it.
- [ ] `src/app/api/v5/proposals/` folder does not exist — create it.
- [ ] `src/features/proposals/__tests__/proposal.service.test.ts` — new.
- [ ] `src/features/proposals/__tests__/edit-gate.test.ts` — new.
- [ ] `src/features/proposals/__tests__/concurrency.test.ts` — new.
- [ ] Shared PGlite seed helper (optional; `change-log.service.test.ts` inlines its own — fine to duplicate or extract).
- [ ] **Refactor gap (required):** extract `_applyUpsertsInTx(tx, orgId, upserts)` from `batchUpsertAllocations` in `src/features/allocations/allocation.service.ts` so the proposal approve path can write through inside its own transaction without nested-tx pitfalls.
- [ ] **Refactor gap (likely required):** add Clerk `userId` → `people.id` mapping OR explicitly document that Phase 39's server-side department authorization is role-based only (advisory department check). See Open Questions #1.

## Open Questions

1. **Clerk userId → people.id mapping — does it exist?**
   - What we know: `requireRole()` returns Clerk `userId` only. `people` table has no `clerk_user_id` column that I found. Server-side "is caller a line manager for target person's department" check needs this link or an alternative.
   - What's unclear: Whether Phase 33/34/35 shipped a mapping I haven't surfaced, OR whether CONTEXT.md D-12 relaxes the check to "any `planner` Clerk role can approve any proposal in their org" (i.e., Clerk role is the hard gate, department is advisory).
   - Recommendation: **Flag this as a planning blocker.** The planner should confirm with the user which of three paths to take:
     - (a) Add a `clerk_user_id` column to `people` (migration + seed).
     - (b) Accept Clerk role as the sole hard gate; department check is UX-only.
     - (c) Add a separate `line_manager_memberships(user_id, department_id)` join table.
   - My recommendation: **(b) for Phase 39** — it matches ADR-004 (personas are UX shortcuts) and unblocks the phase. Document it explicitly in the plan.

2. **Modal primitive availability**
   - What we know: Reject-reason UX is a modal (D-16). I did not grep for existing modal components.
   - What's unclear: Whether the repo has a shadcn/Radix Dialog primitive.
   - Recommendation: Planner adds a Wave 0 task "verify modal primitive exists at `src/components/ui/dialog.tsx` (or similar); if not, build a minimal one".

3. **ag-grid cell editor extension pattern**
   - What we know: Existing custom renderers live at `src/components/grid/cell-renderers/{status-cell,project-cell}.tsx`. These are pure display renderers.
   - What's unclear: The repo may not yet have a custom cell EDITOR (with commit-intercept capability). ag-grid has a separate `ICellEditorComp` interface.
   - Recommendation: Planner dedicates one task to prototyping a proposal-mode cell editor and verifying the intercept-commit pattern works with ag-grid v31+.

## Sources

### Primary (HIGH confidence — direct file reads from the repo on 2026-04-08)
- `src/lib/auth.ts` — Clerk integration, role hierarchy, `requireRole`
- `src/lib/api-utils.ts`, `src/lib/errors.ts` — error envelope
- `src/features/change-log/change-log.service.ts` — `recordChange` signature + Zod schema
- `src/features/change-log/__tests__/change-log.service.test.ts` — PGlite test pattern
- `src/features/actuals/actuals.service.ts` — single-writer pattern, `context` jsonb usage
- `src/features/allocations/allocation.service.ts` — `batchUpsertAllocations` + conflict detection + nested-tx pitfall
- `src/features/personas/persona.types.ts`, `persona.context.tsx` — client-only, localStorage
- `src/components/grid/allocation-grid.tsx` — **production editable grid (ag-grid, not PlanVsActualCell)**
- `src/components/timeline/PlanVsActualCell.tsx` — standalone Phase 37 cell, NOT yet wired to grid
- `src/app/api/v5/imports/parse/route.ts`, `src/app/api/v5/imports/[sessionId]/commit/route.ts` — v5 route template
- `drizzle/migrations/0003_busy_black_bird.sql` — change_log action enum + context jsonb
- `drizzle/migrations/0004_slippery_epoch.sql` — `allocation_proposals` schema + indexes
- `src/db/schema.ts` lines 180-207 — `people.departmentId`
- `src/messages/sv.json` lines 387-445 — existing `v5.*` i18n keys
- `vitest.config.ts` — test runner config

### Secondary / not verified
- Existence of a shadcn/Radix Dialog primitive (Open Question #2)
- Existence of a Clerk `userId` → `people.id` mapping (Open Question #1)

## Metadata

**Confidence breakdown:**
- Service layer patterns: **HIGH** — all patterns directly copied from `actuals.service.ts` and `change-log.service.ts`.
- API routes: **HIGH** — template is `imports/[sessionId]/commit/route.ts`, one-to-one applicability.
- Concurrency model: **HIGH** — conditional UPDATE + PGlite-backed test already proven.
- UI integration into ag-grid: **MEDIUM** — custom cell editor intercept-commit is the one untested path.
- Server-side department check: **LOW** — blocked on Open Question #1 (Clerk→person mapping).
- i18n additions: **HIGH** — catalog file + keying convention verified.

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — stack is stable; the only risk is someone else touching `allocation-grid.tsx` or `allocation.service.ts` in the meantime).

## RESEARCH COMPLETE
