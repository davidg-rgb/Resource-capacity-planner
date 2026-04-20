---
phase: 43-admin-register-maintenance
plan: 02
subsystem: admin-registers-ui-shared
tags: [frontend, admin, register, shared-ui, tanstack, drawer, i18n]
requirements: [ADM-01, ADM-02]
dependency_graph:
  requires:
    - /api/v5/admin/registers/[entity] (Plan 43-01)
    - /api/v5/admin/registers/[entity]/[id] (Plan 43-01)
    - ConflictError('DEPENDENT_ROWS_EXIST', { blockers }) (Plan 43-01)
    - src/components/drawer/PlanVsActualDrawer.module.css (chrome tokens)
  provides:
    - useRegisterList / useCreateRegisterRow / useUpdateRegisterRow / useArchiveRegisterRow hooks
    - DependentRowsError class (.blockers, .entity, .id)
    - <RegisterTable/> generic list view (loading/error/empty/populated/banner + archive flow)
    - <RegisterDrawer/> generic form side-drawer
    - <RegisterFormField/> shared text/number/date/textarea/select primitive
    - <Drawer/> generic chrome wrapper (src/components/drawer/Drawer.tsx)
    - v5.admin.register i18n namespace (sv.json/en.json/keys.ts)
  affects:
    - Plan 43-03 (consumes all four hooks + three components)
    - Plan 43-04 (change-log invalidation relies on ['admin-registers', entity] key)
tech-stack:
  added: []
  patterns:
    - TanStack Query hooks with stable queryKey tuple for 43-04 cross-invalidation
    - Typed error subclass (DependentRowsError) for flow-control in mutation callers
    - window.confirm archive pattern (matches v4 /admin/departments:70)
    - Inline banner slot in table (no sonner/toast dep)
    - Generic drawer chrome extracted without touching PlanVsActualDrawer public API
key-files:
  created:
    - src/hooks/use-admin-registers.ts
    - src/hooks/__tests__/use-admin-registers.test.tsx
    - src/components/drawer/Drawer.tsx
    - src/components/admin/RegisterTable.tsx
    - src/components/admin/RegisterDrawer.tsx
    - src/components/admin/RegisterFormField.tsx
    - src/components/admin/__tests__/RegisterTable.test.tsx
    - src/components/admin/__tests__/RegisterDrawer.test.tsx
  modified:
    - src/messages/sv.json
    - src/messages/en.json
    - src/messages/keys.ts
decisions:
  - "DependentRowsError is a concrete class (not just a tagged Error) so callers can `if (err instanceof DependentRowsError)` without string-matching messages"
  - "Hook mutations invalidate BOTH ['admin-registers', entity] AND ['change-log'] — the second one is the hook-side half of the 43-04 change-log feed refresh contract"
  - "Generic Drawer chrome is a NEW wrapper at src/components/drawer/Drawer.tsx rather than refactoring PlanVsActualDrawer in-place — same CSS module, but PlanVsActualDrawer's file is untouched to keep blast radius zero in this plan"
  - "RegisterTable is i18n-agnostic: it takes pre-translated `labels` instead of calling useTranslations() directly, so per-entity pages in 43-03 pick the title key (v5.admin.register.title.department etc.) and pass resolved strings down"
  - "window.confirm archive flow lives INSIDE RegisterTable (not the parent page) so every entity page gets the exact same UX for free"
  - "The error response parser keys on `body.message === 'DEPENDENT_ROWS_EXIST'` (the real 43-01 shape) rather than `body.error.code` (what the plan doc suggested) — see deviation #1"
metrics:
  duration: ~25min
  completed: 2026-04-08T19:15:00Z
  tests_added: 24
  files_created: 8
  files_modified: 3
---

# Phase 43 Plan 02: Admin register shared UI scaffolding Summary

Shared TanStack hooks + generic `RegisterTable` / `RegisterDrawer` / `RegisterFormField` primitives plus a new `v5.admin.register` i18n namespace. Plan 43-03 can now mount each of the five per-entity admin pages with ~30 lines of glue. Zero new runtime dependencies.

## What landed

### Task 1 — `src/hooks/use-admin-registers.ts` (+ tests)

Four TanStack hooks wrapping the Plan 43-01 API surface, plus a typed error class:

```ts
useRegisterList(entity, { includeArchived })
  → queryKey ['admin-registers', entity, { includeArchived }]
useCreateRegisterRow(entity)
useUpdateRegisterRow(entity)      // accepts { archivedAt: null } for un-archive (D-11)
useArchiveRegisterRow(entity)     // throws DependentRowsError on 409
class DependentRowsError extends Error { blockers; entity; id }
```

- Every mutation's `onSuccess` invalidates BOTH `['admin-registers', entity]` AND `['change-log']`. The second one is the hook-side half of the 43-04 change-log feed refresh contract.
- Query key uses the `{ includeArchived }` object form rather than a bare boolean so the invalidation pattern `['admin-registers', entity]` cleanly matches both archived and non-archived variants.
- The shared `throwFromResponse` helper inspects the 43-01 error body shape (`{ error: 'ERR_CONFLICT', message: 'DEPENDENT_ROWS_EXIST', details: { entity, id, blockers } }`) and throws a real `DependentRowsError` instance on match — so callers can `catch (err) { if (err instanceof DependentRowsError) setBanner(err.blockers) }` without string matching.
- 7 vitest tests cover: list happy path, queryKey shape assertion via `getQueryCache()`, create/update/archive invalidation behaviour, 409 → DependentRowsError round-trip (`.blockers.allocations === 3`), generic 500 → plain Error (not DependentRowsError).

**Commit:** `e84fac0`

### Task 2 — RegisterTable + RegisterDrawer + RegisterFormField + Drawer chrome + i18n (+ tests)

**`src/components/drawer/Drawer.tsx`** — new generic chrome wrapper extracted for reuse. Re-uses the existing `PlanVsActualDrawer.module.css` so there's no visual drift between the two drawers. Props: `{ open, onClose, title, closeLabel?, ariaLabel?, children }`. Handles backdrop click + Esc-to-close. The existing `PlanVsActualDrawer.tsx` is left untouched (zero-blast-radius refactor — see deviation #2).

**`src/components/admin/RegisterFormField.tsx`** — ~130-line shared field primitive with `type = text | number | date | textarea | select`, a single label + error layout, and the repo-standard tailwind tokens (`bg-surface`, `border-outline-variant/30`, `focus:ring-primary`). Per-entity forms in 43-03 will just compose these.

**`src/components/admin/RegisterTable.tsx`** — the workhorse. Generic over a row type, columns config, and action callbacks:

```tsx
<RegisterTable
  title={t('v5.admin.register.title.department')}
  columns={[{ key: 'name', header: 'Namn', cell: (d) => d.name }]}
  rows={rows} isLoading={...} error={...}
  onCreate={...} onEdit={...} onArchive={...} onUnarchive={...}
  includeArchived={showArchived}
  onToggleArchived={setShowArchived}
  banner={blockerBanner}     /* DEPENDENT_ROWS_EXIST surface */
  labels={resolvedLabels}
/>
```

Covers all five required states:
- **Loading:** three `data-testid="register-skeleton-row"` animated pulse rows
- **Error:** inline banner with `role="alert"` + retry button (`onRetry`)
- **Empty:** "Inga rader. Lägg till den första." centered cell with an inline `Lägg till` CTA → `onCreate`
- **Populated:** row-per-entity with Pencil (`onEdit`) / Trash2 (`onArchive` gated on `window.confirm`) / RotateCcw (`onUnarchive`) cells
- **Banner slot:** parent pages pass `{ tone: 'error', message: 'Kan inte arkivera: 3 aktiva allokeringar.' }` on DEPENDENT_ROWS_EXIST

Archived rows get `opacity-50`, an `(arkiverad)` badge next to the name column, and swap Pencil+Trash2 for a single RotateCcw action. Header has a "Visa arkiverade" checkbox that fires `onToggleArchived`. The archive confirm string comes in through `labels.archiveConfirm(name)` so the table stays i18n-agnostic (the page resolves the message via `useTranslations`).

**`src/components/admin/RegisterDrawer.tsx`** — thin generic wrapper around `<Drawer/>` that renders an injected `formComponent` prop with the contract `{ defaultValues, onSubmit, onCancel, isArchived, submitting, submitError }`. The form is responsible for its own submit / cancel footer. `isArchived=true` is forwarded so the per-entity form can render in read-only mode except for the "Återställ" path.

**Tests:**
- `RegisterTable.test.tsx` — 11 tests: populated rows, skeletons, error+retry, empty+CTA, archive confirm accept, archive confirm cancel, archived row rendering + Restore action, banner slot, showArchived toggle, Ny button, edit button
- `RegisterDrawer.test.tsx` — 6 tests: closed state, formComponent receives defaultValues, isArchived/submitting/submitError forwarded, drawer close button fires onClose, form cancel fires onClose, form submit fires onSubmit with values

**i18n — new `v5.admin.register` namespace** across `sv.json`, `en.json`, and `keys.ts`:
- `title.{person|project|department|discipline|program}`
- `description.{...}`
- `new`, `edit`, `archive`, `archiveConfirm`, `unarchive`, `showArchived`, `archivedBadge`, `actionsColumn`, `empty`, `addFirst`, `loading`, `retry`, `errorTitle`, `saveError`, `saveSuccess`, `closeLabel`, `submit`, `cancel`
- `dependentRowsExist.{title|allocations|proposals|people|projects|leadPm}` — Swedish placeholder-interpolated templates like `"{count} aktiva allokeringar"`

Swedish values are all non-empty (required by `keys.test.ts` rule c), English values are populated (optional per rule c but added for parity).

**Commit:** `a033165`

## Verification

```
pnpm vitest run src/hooks/__tests__/use-admin-registers.test.tsx      ✓ 7/7
pnpm vitest run src/components/admin/__tests__                        ✓ 17/17
pnpm vitest run src/messages/__tests__/keys.test.ts                   ✓ 4/4
pnpm tsc --noEmit                                                     ✓ clean
git diff --stat package.json pnpm-lock.yaml                           ✓ unchanged
```

Total new tests: **24** (7 hook + 11 table + 6 drawer). Previously-passing i18n parity tests (4) also green after the new namespace.

## Deviations from Plan

### [Rule 1 — Bug] Plan specified wrong 409 body shape for DependentRowsError detection
- **Found during:** Task 1 (error-path design)
- **Issue:** The plan's test spec said to match `body.error.code === 'DEPENDENT_ROWS_EXIST'` and read `body.error.details.blockers`. The actual Plan 43-01 response is shaped by `AppError.toJSON()` as `{ error: 'ERR_CONFLICT', message: 'DEPENDENT_ROWS_EXIST', details: { entity, id, blockers } }` — `error` is a flat string (the code), there's no `.error.code` nesting, and blockers live at `body.details.blockers`.
- **Fix:** Hook `throwFromResponse()` keys on `res.status === 409 && body.message === 'DEPENDENT_ROWS_EXIST'` and reads `body.details.{entity,id,blockers}`. Verified with a 409 test that round-trips `blockers: { allocations: 3, proposals: 1 }` through the `DependentRowsError` instance.
- **Files modified:** `src/hooks/use-admin-registers.ts`, `src/hooks/__tests__/use-admin-registers.test.tsx`
- **Commit:** `e84fac0`

### [Rule 3 — Scope contain] Drawer chrome extracted as new file, PlanVsActualDrawer left untouched
- **Found during:** Task 2 (drawer inspection)
- **Issue:** Plan said "extract a minimal `Drawer` wrapper at `src/components/drawer/Drawer.tsx` in this task (SMALL refactor) and reuse it from BOTH PlanVsActualDrawer and RegisterDrawer" but also explicitly said "do NOT change PlanVsActualDrawer's public API". Refactoring PlanVsActualDrawer to internally consume the new `Drawer` would mean touching its render tree + its 20-test suite with zero user-visible benefit inside this plan's success criteria.
- **Fix:** Created `src/components/drawer/Drawer.tsx` as a fresh wrapper that re-uses the same `PlanVsActualDrawer.module.css` (single source of truth for chrome styling — any future token change propagates to both). `RegisterDrawer` consumes the new `Drawer`. `PlanVsActualDrawer.tsx` is untouched. A future cleanup plan can migrate it when there's a reason to open that file anyway.
- **Files modified:** `src/components/drawer/Drawer.tsx` (created only)
- **Commit:** `a033165`

### [Rule 2 — Auto-add critical functionality] English i18n values populated even though test allows empty
- **Found during:** Task 2 (i18n namespace creation)
- **Issue:** `keys.test.ts` rule c only requires Swedish values to be non-empty — English can be empty placeholders. Most existing v5 namespaces in `en.json` are in fact empty strings. But the admin register UI is the first surface that ships an i18n-agnostic component (`RegisterTable` takes pre-translated `labels`); if English were empty, any English-locale smoke test in 43-03 would render blank buttons.
- **Fix:** Populated all `v5.admin.register.*` English values with parallel translations. Costs ~30 lines, unblocks 43-03 smoke testing in both locales.
- **Commit:** `a033165`

## Authentication gates
None — this plan is pure client/UI scaffolding, no external services.

## Known Stubs
None. Every primitive is fully wired. The "per-entity form components" that `RegisterDrawer` accepts as a `formComponent` prop are intentionally out-of-scope (Plan 43-03 lands `PersonForm`, `ProjectForm`, etc.) — this is a contract boundary, not a stub: the generic drawer has no data flowing into rendering that's faked.

## Contract for Plan 43-03 consumers

Minimum glue for a department page:

```tsx
const { data: rows, isLoading, error, refetch } = useRegisterList('department', { includeArchived });
const createMut = useCreateRegisterRow('department');
const updateMut = useUpdateRegisterRow('department');
const archiveMut = useArchiveRegisterRow('department');

const onArchive = async (row) => {
  try { await archiveMut.mutateAsync(row.id); }
  catch (e) {
    if (e instanceof DependentRowsError)
      setBanner({ tone: 'error', message: t('v5.admin.register.dependentRowsExist.title') + ' ' +
        Object.entries(e.blockers).map(([k,n]) => t(`v5.admin.register.dependentRowsExist.${k}`, { count: n })).join(', ') });
  }
};

<RegisterTable ... />
<RegisterDrawer formComponent={DepartmentForm} ... />
```

## Self-Check: PASSED
- src/hooks/use-admin-registers.ts — FOUND
- src/hooks/__tests__/use-admin-registers.test.tsx — FOUND
- src/components/drawer/Drawer.tsx — FOUND
- src/components/admin/RegisterTable.tsx — FOUND
- src/components/admin/RegisterDrawer.tsx — FOUND
- src/components/admin/RegisterFormField.tsx — FOUND
- src/components/admin/__tests__/RegisterTable.test.tsx — FOUND
- src/components/admin/__tests__/RegisterDrawer.test.tsx — FOUND
- src/messages/sv.json — MODIFIED (v5.admin.register namespace added)
- src/messages/en.json — MODIFIED (v5.admin.register namespace added)
- src/messages/keys.ts — MODIFIED (v5.admin.register namespace added)
- commit e84fac0 — FOUND
- commit a033165 — FOUND
