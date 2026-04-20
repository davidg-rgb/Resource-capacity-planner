# Phase 40: Persona views Part 1 — PM — Research

**Researched:** 2026-04-08
**Domain:** Next.js (App Router) persona route shell, PM timeline grid, edit-gate composition, historic-edit dialog
**Confidence:** HIGH (in-repo code inspection; no external library guesses)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Verbatim from `40-CONTEXT.md` `<decisions>` (D-01 … D-22). Highlights the planner must honor:

- **D-01..D-03:** Routes `src/app/(app)/pm/{page.tsx, projects/[projectId]/page.tsx, wishes/page.tsx}`. `/pm/wishes` is a thin wrapper around `MyWishesPanel`; do NOT delete `/wishes`. Do NOT touch the legacy `(app)/projects/[projectId]/page.tsx`. `<PersonaSwitcher />` must be mounted in the authenticated shell header; persona context wraps the same layout.
- **D-04..D-07:** PM Home reads via TanStack Query key `['pm-home', personaId]` from a NEW route `GET /api/v5/planning/pm-home`. New file `src/features/planning/planning.read.ts` exposes `getPmOverview` composing project list (filtered by `lead_pm_person_id`), `getProjectBurn`, and pending-wish counts.
- **D-08..D-12:** Reuse `PlanVsActualCell` (do not fork). New `components/timeline/timeline-grid.tsx` (thin grid wrapper) + `timeline-columns.ts`. New route `GET /api/v5/planning/allocations?scope=pm`. 13-month default window (current−1 … current+11). Edit flow strictly per D-11: `direct` = 600 ms debounced auto-save; `proposal` = explicit submit via existing `ProposalCell`; `historic-warn-*` opens `HistoricEditDialog`; `blocked` = read-only. Debounce owned by the cell wrapper (not the grid).
- **D-13..D-16:** New `src/components/dialogs/historic-edit-dialog.tsx` with the exact prop shape `{ targetMonthKey, onConfirm, onCancel, open }`. Esc cancels, Enter confirms. Persona-agnostic so Phase 41 can reuse. Server side must re-validate `confirmHistoric` and reject silent historic edits.
- **D-17..D-18:** Reuse the existing Phase 39 `MyWishesPanel` and the `v5.proposals.*` i18n keys unchanged. New PM-shell strings live under `v5.pm.*` and `v5.historicEdit.*`.
- **D-19..D-20:** Persona switch must invalidate persona-tagged TanStack Query keys; mount switcher in the shell header.
- **D-21..D-22:** Test files map 1:1 to roadmap test codes (TC-UI-001..002, TC-UI-debounce, TC-PR-001, TC-PS-005..006, TC-PSN-003, TC-API-004). E2E happy path is a PGlite + vitest test mirroring `proposal.service.e2e.test.ts`.

### Claude's Discretion
- Whether `/pm/wishes` is a wrapper or a redirect (default = wrapper).
- Grid primitive choice for `timeline-grid.tsx` (default = reuse what already exists).
- One vs. two queries for PM Home (overview card + project list).
- Exact `PmTimelineView` / `CellView` type shape.
- Whether `planning.read.ts` is final home for `getPmOverview` / `getPmTimeline` or whether they live next to API routes.
- Exact debounce hook name.

### Deferred Ideas (OUT OF SCOPE)
- Mobile-tuned PM project timeline (tap-a-cell sheet)
- Quarter / year zoom on the PM timeline
- Drill-down drawer from a cell with red delta
- Persona-scoped notifications
- PM dashboard widgets beyond the single overview card
- Replacing `/projects/[projectId]` legacy generic page
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **UX-V5-01** | Role switcher header globally available; switching role changes default landing + scope without page reload | `PersonaProvider` already mounted in `src/app/(app)/layout.tsx` line 33. `PersonaSwitcher` exists at `src/components/persona/persona-switcher.tsx` and uses `router.push(getLandingRoute(next))` (no reload). ❌ Switcher is NOT yet mounted in `AppShell` header — Phase 40 must add it. Persona invalidation logic does not yet exist. |
| **UX-V5-02** | PM Home + project timeline with plan-vs-actual cells and inline edit gate | `PlanVsActualCell` is editable-mode ready (props: `planned, actual, delta, personId, projectId, monthKey, onCellEdit?, onCellClick?`); 600 ms debounce is internal. `resolveEditGate` exists and accepts `{ persona, targetPerson, month, currentMonth }`. NO grid wrapper in `src/components/timeline/` yet — only the cell. The codebase grid primitive is **ag-grid-community** (`src/components/grid/allocation-grid.tsx`). |
| **UX-V5-03** | PM "My Wishes" panel (proposed / approved / rejected, resubmit) | `MyWishesPanel` ships with all three tabs + resubmit modal at `src/features/proposals/ui/my-wishes-panel.tsx`. `/wishes` route mounts it; Phase 40 adds `/pm/wishes` thin wrapper. |
| **UX-V5-11** | Historic edit confirmation dialog | Helper `getServerNowMonthKey` exists at `src/lib/server/get-server-now-month-key.ts`. `resolveEditGate` already returns `historic-warn-direct` / `historic-warn-proposal`. ❌ NO `HistoricEditDialog` component exists. ❌ NO server-side `confirmHistoric` flag handling exists anywhere. |
| **HIST-01** | Soft warning, no hard lock; historic edits allowed with confirmation; writes `ALLOCATION_HISTORIC_EDITED` | `ALLOCATION_HISTORIC_EDITED` is **only** declared in the change_log enum (`src/db/schema.ts` and the test e2e schema). NO service writes it yet. Wave 0 must add the write path before the dialog can be wired. |
</phase_requirements>

## Summary

Phase 40 sits on top of substantial Phase 33-39 infrastructure. The PM persona, the edit-gate decision helper, the proposal flow + UI, the plan-vs-actual cell, persona context provider, server-now month key helper, ISO calendar, change_log enum, and project schema column `lead_pm_person_id` **all exist**. The phase work is shell + composition + three new files (`historic-edit-dialog.tsx`, `timeline-grid.tsx`, `planning.read.ts`) + one new API route (`/api/v5/planning/pm-home`) + extending the allocation write path to honor `confirmHistoric`.

The two largest unknowns surfaced by this audit are not in CONTEXT.md and must be added to the plan:

1. **There is no PATCH allocation route, no `/api/v5/planning/*` namespace, and no `confirmHistoric` plumbing anywhere in the codebase.** Direct allocation writes today go through `POST /api/allocations/batch` (used by `useGridAutosave`), not a PATCH-by-id. CONTEXT.md D-11 says "PATCH /api/v5/planning/allocations/[id] (route already exists from Phase 39 work; verify during research, create if missing)" — confirmed missing. The phase must either (a) create a new `PATCH /api/v5/planning/allocations/[id]` route + extend `allocation.service` with a `recordChange(ALLOCATION_HISTORIC_EDITED)` branch, OR (b) extend the existing batch route with a `confirmHistoric` field. Option (a) matches ARCHITECTURE §616-627 and the test code TC-API-004 — recommended.
2. **`ALLOCATION_HISTORIC_EDITED` is in the enum but no production code emits it.** A wave-0 task must add the change_log write inside the allocation service (mirroring the `ALLOCATION_EDITED via='proposal'` pattern already proven in `approveProposal`).

**Primary recommendation:** Plan as five waves — (W0) backend gap fill: `confirmHistoric` field on schema + `PATCH /api/v5/planning/allocations/[id]` route + `ALLOCATION_HISTORIC_EDITED` write path; (W1) `planning.read.ts` + `pm-home` route; (W2) PM route shell + persona switcher mount + persona-key invalidation; (W3) `timeline-grid.tsx` + cell edit orchestrator + `historic-edit-dialog.tsx`; (W4) i18n catalog adds + happy-path PGlite e2e + per-test-code coverage.

## Standard Stack

| Library | Version (verified in package.json) | Purpose | Notes |
|---------|------------------------------------|---------|-------|
| Next.js (App Router) | existing | Route shell `(app)/pm/...` | Use Server Components for layout, `'use client'` for interactive pages — same pattern as `wishes/page.tsx` |
| next-intl | ^4.8.3 | i18n via `useTranslations('v5.pm')`, `useTranslations('v5.historicEdit')` | Catalog at `src/messages/sv.json` + `en.json`. NO `messages/sv/v5/*.json` split — single-file catalog with nested keys. Confirmed by globbing. |
| @tanstack/react-query | existing | PM Home + timeline data fetch | Already used by `MyWishesPanel`, `useGridAutosave`, etc. Provider is mounted in `(app)/layout.tsx` as `<QueryProvider>`. |
| ag-grid-community / ag-grid-react | existing | Grid primitive (already in use by `allocation-grid.tsx`) | **Do NOT add a second grid library.** `timeline-grid.tsx` should be a thin wrapper over AgGridReact mirroring `allocation-grid.tsx` — same imports, same `cellRenderer` shape, just different column definitions. |
| Drizzle ORM (pglite for tests) | existing | DB reads in `planning.read.ts` | Pattern: `import { db } from '@/db'` + `import * as schema from '@/db/schema'` — see `actuals.read.ts`. |
| Clerk (`@clerk/nextjs`) | existing | Auth context for proposer ID | `useAuth()` pattern — see `wishes/page.tsx`. |
| Sonner | existing | Toasts (mounted in layout) | Use for cell save success/failure toasts. |

**No new dependencies required.** Critically: there is **no** `lodash`, `lodash.debounce`, or `use-debounce` package in `package.json`. The codebase uses hand-rolled debounce via `useRef<setTimeout>` (see `PlanVsActualCell.tsx` lines 67/85, `useGridAutosave.ts` line 27). Phase 40's cell wrapper should follow the same pattern — no new dep.

## Architecture Patterns

### Recommended file layout (matches CONTEXT.md D-01..D-22 + ARCHITECTURE §310-318)

```
src/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx                              # MODIFY: mount <PersonaSwitcher /> in shell header
│   │   └── pm/
│   │       ├── page.tsx                            # NEW: PM Home (S2)
│   │       ├── projects/[projectId]/page.tsx       # NEW: PM project timeline (S3)
│   │       └── wishes/page.tsx                     # NEW: thin wrapper around MyWishesPanel
│   └── api/v5/planning/
│       ├── pm-home/route.ts                        # NEW: GET pm-home aggregate
│       ├── allocations/route.ts                    # NEW: GET PM timeline data
│       └── allocations/[id]/route.ts               # NEW: PATCH with confirmHistoric? flag
├── features/
│   ├── planning/planning.read.ts                   # NEW: getPmOverview, getPmTimeline
│   ├── allocations/allocation.service.ts           # MODIFY: add patchAllocation w/ confirmHistoric branch
│   └── personas/persona.context.tsx                # MODIFY (small): emit invalidation hook on setPersona
├── components/
│   ├── timeline/
│   │   ├── timeline-grid.tsx                       # NEW: thin ag-grid wrapper, rows=people, cols=months
│   │   ├── timeline-columns.ts                     # NEW: buildTimelineColumns(range, zoom='month')
│   │   └── PlanVsActualCell.tsx                    # REUSE — do NOT modify
│   ├── dialogs/historic-edit-dialog.tsx            # NEW: persona-agnostic soft-warn dialog
│   └── persona/persona-switcher.tsx                # REUSE — verify it imports cleanly into AppShell
└── messages/
    ├── sv.json                                     # MODIFY: add v5.pm.*, v5.historicEdit.* keys
    └── en.json                                     # MODIFY: same keys (en fallback)
```

### Pattern 1: Route shell mirrors `/wishes`
**What:** Each persona page is `'use client'` + `useAuth()` + `useTranslations('v5.<ns>')` + a TanStack Query hook. See `src/app/(app)/wishes/page.tsx` for the canonical 30-line shape.
**When:** Every new PM route page in this phase.

### Pattern 2: Read helper next to feature folder
**What:** `planning.read.ts` exports pure async functions taking `orgId` first, returning typed rows. Mirrors `actuals.read.ts` exactly (`getProjectBurn`, `aggregateByMonth`).
**When:** PM Home + PM timeline data loaders.

### Pattern 3: Service shares the same Drizzle tx as `recordChange`
**What:** `allocation.service.ts` already has the `_applyAllocationUpsertsInTx` internal helper specifically because `approveProposal` needs to share a tx with `recordChange` per ADR-003. The new `patchAllocation(..., { confirmHistoric })` path follows the same shape: open one tx, apply the upsert, call `recordChange` with action `'ALLOCATION_HISTORIC_EDITED'` if historic, else `'ALLOCATION_EDITED'`.
**When:** Wave 0 backend extension.

### Pattern 4: `'use client'` cell wrapper owns debounce
**What:** Cell-local `useRef<setTimeout>` + 600 ms timeout, cleared on unmount. The existing `PlanVsActualCell` already debounces internally for `onCellEdit`. Phase 40 needs to wire `onCellEdit` to a callback that runs `resolveEditGate` first, then chooses direct PATCH vs proposal popover vs historic dialog.
**When:** The cell-edit orchestrator that wraps `<PlanVsActualCell editable />`.

### Anti-Patterns to Avoid
- **Forking `PlanVsActualCell`** — wrap it, don't copy it. The 600 ms debounce inside the cell already meets TC-UI-debounce; the orchestrator only needs to run gate resolution in `onCellEdit`.
- **Adding a second grid library** — the codebase has ag-grid mounted; mirror `allocation-grid.tsx`'s setup instead of pulling in TanStack Table.
- **New i18n file split** — the codebase is single-file `sv.json` / `en.json` with nested keys. Do NOT create `messages/sv/v5/*.json`.
- **Duplicating MyWishesPanel logic** — `/pm/wishes/page.tsx` should be ~15 lines that re-render `<MyWishesPanel proposerId={userId} />`.
- **Bypassing the existing `_applyAllocationUpsertsInTx` helper** — extending it preserves the proposal-approval invariants from Phase 39.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Edit gate decision | Custom if/else in the cell wrapper | `resolveEditGate({ persona, targetPerson, month, currentMonth })` from `src/features/proposals/edit-gate.ts` |
| Server "now" month | `new Date().toISOString().slice(0,7)` in the API route | `getServerNowMonthKey(tx)` from `src/lib/server/get-server-now-month-key.ts` (per-request cached) |
| Month range generation | Hand-roll `for (let i…)` | `generateMonthRange(start, end)` + `getCurrentMonth()` from `src/lib/date-utils.ts` |
| Project burn totals | New SQL aggregate | `getProjectBurn(orgId, projectId, { from, to })` from `src/features/actuals/actuals.read.ts` line 175 |
| Per-month actuals | New SQL aggregate | `aggregateByMonth(orgId, …)` from `src/features/actuals/actuals.read.ts` |
| Pending-wish list per proposer | New query | `listProposals({ orgId, proposerId, status })` from `proposal.service.ts` (already used by `MyWishesPanel`) |
| Cell debounce | New hook | Internal `useRef<setTimeout>` already inside `PlanVsActualCell` (600 ms, see lines 57/67/85) |
| Resubmit modal | New dialog | Already inside `MyWishesPanel` |
| Proposal POST | New mutation | `useCreateProposal()` from `src/features/proposals/use-proposals.ts` |

## Common Pitfalls

### Pitfall 1: Persona stub IDs vs. real `personId`
**What:** `PersonaSwitcher` builds personas with `'stub-pm'`, `'stub-staff'`, etc. The PM Home query `getPmOverview({ leadPmPersonId })` will return ZERO projects when called with `'stub-pm'`.
**Avoid:** Either (a) wire the persona switcher to a real person picker before Phase 40 ships, OR (b) document an explicit dev-mode bypass in PM Home that resolves `stub-pm` to the first person whose `id` matches a project's `lead_pm_person_id`. The team comment in `persona-switcher.tsx` lines 9-12 explicitly says "Stub entity IDs are placeholders until Phase 40+ ships real entity pickers" — this is Phase 40's job.

### Pitfall 2: `homeDepartmentId` is optional on the PM persona
**What:** `Persona` type defines `pm` with `homeDepartmentId?: string`. `resolveEditGate` line 36 uses `!== undefined` — if the stub PM has no department, EVERY edit becomes `proposal` (correctly out-of-dept by default), which is acceptable but might confuse devs testing the direct path.
**Avoid:** Document that to test the `direct` path the persona must be constructed with a real `homeDepartmentId`.

### Pitfall 3: Persona context has no invalidation hook
**What:** D-20 says persona switch must invalidate `['pm-home', ...]` keys. `persona.context.tsx` `setPersona` does not call `queryClient.invalidateQueries`.
**Avoid:** Either inject `queryClient` via `useQueryClient()` inside the provider, or wrap `setPersona` in a side-effect hook in the shell header. Belongs in Wave 2.

### Pitfall 4: `lead_pm_person_id` is nullable
**What:** Schema (`src/db/schema.ts` line 221): `leadPmPersonId: uuid('lead_pm_person_id').references(() => people.id)` — no `.notNull()`. A project with NULL never appears in any PM's list.
**Avoid:** PM Home empty-state copy must distinguish "no projects assigned" from "no projects exist". Test fixtures must explicitly set the column.

### Pitfall 5: No PATCH route exists today
**What:** `src/app/api/allocations/route.ts` is GET-only. Direct edits in v4 go through `POST /api/allocations/batch` via `useGridAutosave`. CONTEXT.md D-11 assumes a PATCH route exists "from Phase 39 work" — it does NOT.
**Avoid:** Wave 0 task must create the route + extend `allocation.service` with a single-row patch path. Match the existing batch route's tx + `recordChange` shape.

### Pitfall 6: `ALLOCATION_HISTORIC_EDITED` is enum-only, never written
**What:** Grep across all of `src/` finds the action only in `db/schema.ts` and the test e2e CREATE TYPE. Production services do not emit it.
**Avoid:** Wave 0 must add the branch in `allocation.service` AND a contract test (`TC-API-004`) that asserts the row appears in `change_log` when `confirmHistoric: true` is passed.

### Pitfall 7: Editing the cell value before debounce fires + then unmounting
**What:** `PlanVsActualCell` clears the debounce timer in its unmount effect (line 76). If a user types and immediately navigates away, the edit is lost silently.
**Avoid:** Either flush on blur OR document this as known acceptable behavior. The proposal path is explicit-submit so unaffected.

## Code Examples

### Mount the persona switcher (verify pattern; AppShell file not yet inspected)
```tsx
// src/app/(app)/layout.tsx — already imports PersonaProvider on line 15.
// Phase 40 task: pass <PersonaSwitcher /> through to AppShell header slot.
// Source: existing src/app/(app)/layout.tsx + src/components/persona/persona-switcher.tsx
```

### PM Home page skeleton (mirrors existing wishes/page.tsx)
```tsx
'use client';
import { useAuth } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { usePersona } from '@/features/personas/persona.context';

export default function PmHomePage() {
  const { isLoaded, userId } = useAuth();
  const { persona } = usePersona();
  const t = useTranslations('v5.pm');
  const personaId = persona.kind === 'pm' ? persona.personId : null;

  const { data, isLoading } = useQuery({
    queryKey: ['pm-home', personaId],
    queryFn: () => fetch(`/api/v5/planning/pm-home`).then((r) => r.json()),
    enabled: !!personaId,
  });

  if (!isLoaded || isLoading) return <div>{t('loading')}</div>;
  // ... render overview card + project list
}
```
Source: pattern lifted from `src/app/(app)/wishes/page.tsx` + `MyWishesPanel`.

### `planning.read.getPmOverview` skeleton
```ts
// src/features/planning/planning.read.ts — NEW
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { getProjectBurn } from '@/features/actuals/actuals.read';
import { listProposals } from '@/features/proposals/proposal.service';

export async function getPmOverview(args: {
  orgId: string;
  leadPmPersonId: string;
  monthRange: { from: string; to: string };
}) {
  const projects = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.organizationId, args.orgId),
        eq(schema.projects.leadPmPersonId, args.leadPmPersonId),
      ),
    );
  const cards = await Promise.all(
    projects.map(async (p) => ({
      project: p,
      burn: await getProjectBurn(args.orgId, p.id, args.monthRange),
      pendingWishes: (await listProposals({
        orgId: args.orgId,
        projectId: p.id,
        status: 'proposed',
      })).length,
    })),
  );
  return { projects: cards, defaultProjectId: cards[0]?.project.id ?? null };
}
```
Source: composed from `actuals.read.ts` line 175, `proposal.service.listProposals`, schema line 221.

### Cell-edit orchestrator (the load-bearing piece)
```tsx
'use client';
import { useState } from 'react';
import { PlanVsActualCell } from '@/components/timeline/PlanVsActualCell';
import { ProposalCell } from '@/features/proposals/ui/proposal-cell';
import { HistoricEditDialog } from '@/components/dialogs/historic-edit-dialog';
import { resolveEditGate } from '@/features/proposals/edit-gate';
import { usePersona } from '@/features/personas/persona.context';

export function PmTimelineCell(props: { /* row, col, currentMonth */ }) {
  const { persona } = usePersona();
  const [pendingHistoric, setPendingHistoric] = useState<null | { hours: number; nextStep: 'direct' | 'proposal' }>(null);

  function handleEdit(nextHours: number) {
    const decision = resolveEditGate({
      persona,
      targetPerson: { id: props.personId, departmentId: props.departmentId },
      month: props.monthKey,
      currentMonth: props.currentMonth,
    });
    if (decision === 'blocked') return;
    if (decision === 'direct') return savePatch({ confirmHistoric: false, hours: nextHours });
    if (decision === 'proposal') return openProposalPopover(nextHours);
    if (decision === 'historic-warn-direct') return setPendingHistoric({ hours: nextHours, nextStep: 'direct' });
    if (decision === 'historic-warn-proposal') return setPendingHistoric({ hours: nextHours, nextStep: 'proposal' });
  }

  return (
    <>
      <PlanVsActualCell {...props} onCellEdit={handleEdit} />
      {pendingHistoric && (
        <HistoricEditDialog
          open
          targetMonthKey={props.monthKey}
          onCancel={() => setPendingHistoric(null)}
          onConfirm={() => {
            if (pendingHistoric.nextStep === 'direct') savePatch({ confirmHistoric: true, hours: pendingHistoric.hours });
            else openProposalPopover(pendingHistoric.hours);
            setPendingHistoric(null);
          }}
        />
      )}
    </>
  );
}
```
Source: composed from `PlanVsActualCell` props (lines 31-43), `edit-gate.ts` return values (lines 26-49).

### `HistoricEditDialog` shape
```tsx
// src/components/dialogs/historic-edit-dialog.tsx — NEW
'use client';
import { useTranslations } from 'next-intl';

export interface HistoricEditDialogProps {
  open: boolean;
  targetMonthKey: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HistoricEditDialog(props: HistoricEditDialogProps) {
  const t = useTranslations('v5.historicEdit');
  if (!props.open) return null;
  // Use the same hand-rolled overlay as MyWishesPanel resubmit modal
  // (lines 100-166 of my-wishes-panel.tsx) — fixed inset-0, role="dialog",
  // aria-modal, Escape closes, Enter confirms.
  return (
    <div role="dialog" aria-modal="true" /* ... */>
      <h2>{t('title')}</h2>
      <p>{t('body', { month: props.targetMonthKey })}</p>
      <button onClick={props.onCancel}>{t('cancel')}</button>
      <button onClick={props.onConfirm}>{t('confirm')}</button>
    </div>
  );
}
```
Source: pattern lifted from `MyWishesPanel` resubmit dialog (lines 100-166). **No shadcn `Dialog` primitive exists in the codebase** — `src/components/ui/dialog*` returned no files, `src/components/dialogs/` directory does not exist. The repo's existing convention is hand-rolled fixed-inset overlays inside the consuming feature. Match that.

## Runtime State Inventory

Not applicable — this phase is greenfield code addition, no rename / refactor / migration. Skipping.

## Environment Availability

Not applicable — phase is pure code/config inside the existing Next.js app. No new external services or CLI tools required.

## Validation Architecture

Nyquist validation is enabled (`.planning/config.json` does not set `workflow.nyquist_validation: false`). Include this section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (already configured) + @testing-library/react for components + PGlite (`@electric-sql/pglite`) for DB integration |
| Config file | `vitest.config.ts` (existing — used by Phase 33-39 tests) |
| Quick run command | `pnpm vitest run <path>` (single file, fast feedback per task) |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map

| Test code | Behavior | Test type | Location | Automated command | File exists? |
|-----------|----------|-----------|----------|-------------------|--------------|
| **TC-UI-001** | PM Home renders overview card with project list (loading → loaded → empty states) | Component (RTL) | `src/app/(app)/pm/__tests__/pm-home.test.tsx` | `pnpm vitest run src/app/(app)/pm/__tests__/pm-home.test.tsx` | ❌ Wave 0 |
| **TC-UI-002** | PM project timeline renders 13-month grid with `PlanVsActualCell` per row×col; clicking renders the cell | Component (RTL) with mocked `useQuery` | `src/app/(app)/pm/projects/[projectId]/__tests__/pm-timeline.test.tsx` | `pnpm vitest run src/app/(app)/pm/projects/\[projectId\]/__tests__/pm-timeline.test.tsx` | ❌ Wave 0 |
| **TC-UI debounce** | Cell edit triggers `onCellEdit` exactly once after 600 ms; rapid edits coalesce to last value | Component (RTL + `vi.useFakeTimers`) | `src/components/timeline/__tests__/PlanVsActualCell.test.tsx` (already exists — extend) | `pnpm vitest run src/components/timeline/__tests__/PlanVsActualCell.test.tsx` | ✅ Extend |
| **TC-PSN-003** | Switching persona to `pm` redirects to `/pm`; switching away from `pm` invalidates `['pm-home']` query | Component (RTL + mock router) | `src/features/personas/__tests__/persona.context.test.tsx` (extend) OR new `__tests__/pm-routing.test.tsx` | `pnpm vitest run src/features/personas/__tests__/persona.context.test.tsx` | ✅ Extend |
| **TC-PR-001** | Cell edit on out-of-dept person opens proposal popover and POST `/api/v5/proposals` succeeds | Component integration (RTL + MSW or fetch mock) | `src/features/proposals/__tests__/proposal-cell.test.tsx` (already exists — extend) and/or new `pm-cell-orchestrator.test.tsx` | `pnpm vitest run src/features/proposals/__tests__/proposal-cell.test.tsx` | ✅ Extend |
| **TC-PS-005** | Editing a historic month on direct path opens `HistoricEditDialog`; confirm fires `PATCH` with `confirmHistoric: true` | Component (RTL + mock fetch) | `src/components/dialogs/__tests__/historic-edit-dialog.test.tsx` | `pnpm vitest run src/components/dialogs/__tests__/historic-edit-dialog.test.tsx` | ❌ Wave 0 |
| **TC-PS-006** | Editing a historic month on proposal path opens dialog FIRST then drops into proposal popover on confirm | Component (RTL) | same file as TC-PS-005 (second test) | same | ❌ Wave 0 |
| **TC-API-004** | `PATCH /api/v5/planning/allocations/[id]` rejects historic edit when `confirmHistoric` omitted; accepts when present and writes `ALLOCATION_HISTORIC_EDITED` to change_log | Server integration (PGlite + drizzle, mirror `proposal.service.e2e.test.ts`) | `src/app/api/v5/planning/allocations/__tests__/patch.test.ts` AND `src/features/allocations/__tests__/patch-allocation.contract.test.ts` | `pnpm vitest run src/features/allocations/__tests__/patch-allocation.contract.test.ts` | ❌ Wave 0 |
| **E2E happy path (D-22)** | Anna PM → /pm → click project → type 60 in Sara's June cell → wish in /pm/wishes | PGlite e2e mirroring `proposal.service.e2e.test.ts` style | `src/features/planning/__tests__/pm.e2e.test.ts` | `pnpm vitest run src/features/planning/__tests__/pm.e2e.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run <file>` for the file the task touched.
- **Per wave merge:** `pnpm vitest run src/features/planning src/app/\(app\)/pm src/components/dialogs src/components/timeline src/features/proposals` (focused subset; ~30 s).
- **Phase gate:** `pnpm vitest run` full suite green before `/gsd:verify-work`.

### Wave 0 Gaps (must exist before Wave 1 implementation)
- [ ] `src/features/allocations/__tests__/patch-allocation.contract.test.ts` — covers TC-API-004 (asserts `ALLOCATION_HISTORIC_EDITED` write path); REQUIRES the new service code from Wave 0 backend tasks.
- [ ] `src/components/dialogs/__tests__/historic-edit-dialog.test.tsx` — covers TC-PS-005, TC-PS-006.
- [ ] `src/app/(app)/pm/__tests__/pm-home.test.tsx` — covers TC-UI-001.
- [ ] `src/app/(app)/pm/projects/[projectId]/__tests__/pm-timeline.test.tsx` — covers TC-UI-002.
- [ ] `src/features/planning/__tests__/pm.e2e.test.ts` — D-22 happy path.
- [ ] Extend `src/components/timeline/__tests__/PlanVsActualCell.test.tsx` with explicit TC-UI-debounce coalescing assertion (use `vi.useFakeTimers`).
- [ ] Extend `src/features/personas/__tests__/persona.context.test.tsx` with TC-PSN-003 router-push + invalidation assertion.

No new framework install needed — vitest, RTL, and PGlite are all already in `package.json` (verified by Phase 39 tests using them).

## Open Questions Resolved

| # | Question | Answer |
|---|----------|--------|
| 1 | Does `projects.lead_pm_person_id` exist? | **YES.** `src/db/schema.ts` line 221: `leadPmPersonId: uuid('lead_pm_person_id').references(() => people.id)`, plus an org+pm partial index at line 234. Migration shipped in Phase 36 (drizzle/migrations/0004_slippery_epoch.sql). NO additive migration needed. |
| 2 | Does PATCH allocation route accept `confirmHistoric` and write `ALLOCATION_HISTORIC_EDITED`? | **NO on both counts.** No PATCH route exists at all (`src/app/api/allocations/route.ts` is GET-only). `confirmHistoric` is not referenced in any source file. `ALLOCATION_HISTORIC_EDITED` exists only in the change_log enum, never written. **This is the largest hidden gap; Wave 0 must address it.** |
| 3 | Is `<PersonaProvider>` mounted? Is `PersonaSwitcher` mounted in shell header? | **PersonaProvider: YES** (`src/app/(app)/layout.tsx` line 33 wraps children). **PersonaSwitcher in header: NOT VERIFIED — almost certainly NO.** Grep finds the component imported only in its own test file. Phase 40 task required to add it to `AppShell` header slot. |
| 4 | What grid primitive does the codebase use? | **ag-grid-community + ag-grid-react.** `src/components/grid/allocation-grid.tsx` lines 4-10 imports `AllCommunityModule, GridApi, AgGridReact`. CONTEXT.md default ("reuse what exists, don't add ag-grid fresh") → **reuse ag-grid**, mirror `allocation-grid.tsx` setup in `timeline-grid.tsx`. Do not introduce TanStack Table. |
| 5 | What debounce utility is available? | **None as a dep.** No `lodash`, no `lodash.debounce`, no `use-debounce` in `package.json` (verified by grep). Codebase pattern is hand-rolled `useRef<setTimeout>` — see `PlanVsActualCell.tsx` lines 67/85 (600 ms) and `useGridAutosave.ts` line 27 (300 ms). Match the existing pattern; no new dep. |
| 6 | What dialog primitive is in use? | **None — no shadcn Dialog, no Radix Dialog wrapper exists.** `src/components/ui/dialog*` returned no files; `src/components/dialogs/` directory does not exist. The convention in Phase 39 (`reject-modal.tsx`, `MyWishesPanel` resubmit modal lines 100-166) is **hand-rolled `<div role="dialog" aria-modal="true" className="fixed inset-0 z-50 ...">`**. Match that pattern. |
| 7 | `PlanVsActualCell` props + parent data shape? | Props (line 31-43): `{ planned: number, actual: number \| null, delta: number \| null, personId, projectId, monthKey, editable?, onCellEdit?(next:number)=>void, onCellClick?(ctx)=>void }`. Editable mode is "auto" — defined as `editable = !!onCellEdit`. Internal 600 ms debounce already wired. Parent data shape per cell: a `CellView` with at least those four numeric fields plus the three IDs. |
| 8 | Exact `resolveEditGate` signature? | `resolveEditGate({ persona: Persona, targetPerson: { id, departmentId }, month: 'YYYY-MM', currentMonth: 'YYYY-MM' }): 'direct' \| 'proposal' \| 'historic-warn-direct' \| 'historic-warn-proposal' \| 'blocked'`. **Pure function, no I/O.** Caller MUST provide `currentMonth` (use `getServerNowMonthKey()` server-side or `getCurrentMonth()` client-side — note: ARCHITECTURE §616-627 is the source of truth that historic checks ultimately re-validate server-side). |
| 9 | TanStack Query setup? | `<QueryProvider>` mounted at `(app)/layout.tsx` line 14/31. Existing query keys are flat tuples (`['pm-home', personaId]` would match convention). |
| 10 | i18n catalog file structure for `v5.pm.*` and `v5.historicEdit.*`? | **Single-file per locale:** `src/messages/sv.json` and `src/messages/en.json` with nested keys. NO `messages/sv/v5/*.json` split exists (verified by glob — `messages/**` returned only `__tests__`, `en.json`, `keys.ts`, `sv.json`). Add `v5.pm.*` and `v5.historicEdit.*` as nested objects in both files. `src/messages/keys.ts` likely codegens type-safe key constants — check before commit. |
| 11 | Validation Architecture section needed? | **YES** (nyquist enabled — `.planning/config.json` does not set it false). Section above. |
| 12 | Does a PM-scoped project list query exist? | **NO.** Grep for `lead_pm_person_id` in `src/` returns only `db/schema.ts` and one contract test. No service or read-helper queries by it. `planning.read.getPmOverview` writes it from scratch. |
| 13 | Test harness for route-level tests? | **PGlite + vitest + drizzle** for DB integration (`proposal.service.e2e.test.ts` is the canonical pattern, lines 1-50 of the file show the in-test `CREATE TABLE` bootstrap). **RTL + vitest** for component tests. **No Playwright** in the repo for v5 work. Use PGlite for TC-API-004 and the D-22 happy path; RTL for everything UI. |

## State of the Art

| Old approach | Current approach in this codebase | Why |
|--------------|-----------------------------------|-----|
| Multi-file i18n catalog (`messages/sv/v5/cell.json`) | Single nested `sv.json` / `en.json` | Already established by Phase 33-39; do not split. |
| New PATCH route per-resource | (gap — none exists yet) | Must be created per ARCHITECTURE §616-627 contract. |
| External debounce lib | Hand-rolled `useRef<setTimeout>` | No `lodash`/`use-debounce` in deps; consistency. |
| shadcn/Radix Dialog | Hand-rolled `fixed inset-0` overlay with `role="dialog"` | Established by `reject-modal.tsx` and `MyWishesPanel`. |

## Sources

### Primary (HIGH confidence — direct code inspection)
- `src/db/schema.ts` lines 221, 234, 763 — `leadPmPersonId` column + index + relation
- `src/features/proposals/edit-gate.ts` (full file, 49 lines)
- `src/features/proposals/proposal.service.ts` + `proposal.types.ts`
- `src/features/proposals/ui/my-wishes-panel.tsx` (169 lines)
- `src/features/proposals/__tests__/proposal.service.e2e.test.ts` (385 lines — canonical PGlite e2e pattern)
- `src/features/personas/persona.context.tsx`, `persona.routes.ts`, `persona.types.ts`
- `src/components/persona/persona-switcher.tsx` (70 lines)
- `src/components/timeline/PlanVsActualCell.tsx` (177 lines — props, debounce, state machine)
- `src/components/grid/allocation-grid.tsx` lines 1-30 — confirms ag-grid is the chosen primitive
- `src/features/actuals/actuals.read.ts` lines 1-50, 175-190 — `getProjectBurn`, `aggregateByMonth`
- `src/features/allocations/allocation.service.ts` lines 1-60 — `_applyAllocationUpsertsInTx` shared-tx pattern
- `src/app/(app)/layout.tsx` (47 lines) — confirms `PersonaProvider` is mounted, `PersonaSwitcher` is NOT
- `src/app/(app)/wishes/page.tsx` (30 lines — canonical client page shape)
- `src/app/api/allocations/route.ts` — confirms only GET exists, no PATCH
- `package.json` — confirms next-intl ^4.8.3, no debounce dep
- `.planning/config.json` — confirms nyquist + yolo + commit_docs

### Secondary (HIGH confidence — referenced architecture, not re-verified line-by-line)
- `.planning/v5.0-ARCHITECTURE.md` §310-318, §391, §411, §547, §616-627, §785, §1069-1074, §1448-1502, §1710-1712, §1729 (per CONTEXT.md canonical refs)
- `.planning/REQUIREMENTS.md` UX-V5-01..03, UX-V5-11, HIST-01
- `.planning/ROADMAP.md` §169-179 (Phase 40 success criteria + test code mapping)

### No external sources used
This phase is entirely composition of in-repo code. Context7, Brave, Exa, Firecrawl not used — would have added zero signal beyond what direct file inspection provided.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version and pattern verified by reading the file or `package.json`.
- Architecture & file layout: HIGH — matches CONTEXT.md decisions and verified gaps.
- Pitfalls: HIGH — every pitfall is grounded in a specific source line.
- Backend gap (Pitfall 5/6 + open questions 2): HIGH — explicit grep evidence that `confirmHistoric` and `ALLOCATION_HISTORIC_EDITED` writes do not exist anywhere in `src/`.

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days; codebase is moving but the surfaces inspected here are stable Phase 33-39 outputs)
