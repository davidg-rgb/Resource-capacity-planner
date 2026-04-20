---
phase: 43-admin-register-maintenance
plan: 03
subsystem: admin-registers-per-entity-pages
tags: [frontend, admin, register, pages, forms, rtl-tests, i18n]
requirements: [ADM-01, ADM-02]
dependency_graph:
  requires:
    - use-admin-registers hooks + DependentRowsError (43-02)
    - RegisterTable / RegisterDrawer / RegisterFormField (43-02)
    - v5.admin.register i18n namespace (43-02)
    - personCreateSchema / projectCreateSchema / departmentCreateSchema / disciplineCreateSchema / programCreateSchema
    - PersonaGate (Phase 41)
    - useDepartments / useDisciplines / usePrograms / usePeople v4 read hooks (D-13 — read-only reuse)
  provides:
    - /admin/people page (NEW)
    - /admin/projects page (NEW)
    - /admin/departments page (REWRITTEN on v5 pattern, route preserved)
    - /admin/disciplines page (REWRITTEN, route preserved)
    - /admin/programs page (REWRITTEN, route preserved)
    - PersonForm / ProjectForm / DepartmentForm / DisciplineForm / ProgramForm
    - FormFooter shared primitive
    - AdminRegisterPageShell wrapper (gate + RegisterTable + RegisterDrawer + blocker banner)
    - useBlockerFormatter helper
    - v5.admin.register.form.* i18n keys
  affects:
    - Plan 43-04 (change-log landing + persona router default + integration tests)
tech-stack:
  added: []
  patterns:
    - Thin per-entity pages (~15-60 LOC each) delegate to AdminRegisterPageShell
    - Schema-first form validation: each form imports its existing Zod schema and parses on submit
    - window.confirm archive flow inherited from RegisterTable (no per-page logic)
    - DependentRowsError caught in shell, formatted to banner via i18n templates
    - Test fetch stub uses longest-prefix routing so /:id handlers beat list handlers
key-files:
  created:
    - src/components/admin/forms/FormFooter.tsx
    - src/components/admin/forms/PersonForm.tsx
    - src/components/admin/forms/ProjectForm.tsx
    - src/components/admin/forms/DepartmentForm.tsx
    - src/components/admin/forms/DisciplineForm.tsx
    - src/components/admin/forms/ProgramForm.tsx
    - src/components/admin/AdminRegisterPageShell.tsx
    - src/app/(app)/admin/people/page.tsx
    - src/app/(app)/admin/projects/page.tsx
    - src/components/admin/__tests__/register-pages.test.tsx
  modified:
    - src/app/(app)/admin/departments/page.tsx (REWRITE — v4 inline-edit body replaced)
    - src/app/(app)/admin/disciplines/page.tsx (REWRITE)
    - src/app/(app)/admin/programs/page.tsx (REWRITE)
    - src/messages/sv.json (added v5.admin.register.form.*, forbidden)
    - src/messages/en.json (added v5.admin.register.form.*, forbidden)
    - src/messages/keys.ts (added form.* + forbidden)
decisions:
  - "Form fields follow the REAL Zod schemas, not the plan doc. personCreateSchema exposes firstName/lastName/disciplineId/departmentId/targetHoursPerMonth (NOT name/email/employmentPercentage); projectCreateSchema exposes name/programId/status (NOT code/leadPm/startDate/endDate). Shipping the plan's fictional fields would have broken the POST round-trip because /api/v5/admin/registers/:entity validates with those same schemas on the server (Plan 43-01 register.service). See deviation #1."
  - "AdminRegisterPageShell component owns the full Clerk-gate + persona-gate + table + drawer + blocker-banner wiring. The five per-entity pages are now ~15-60 LOC each — a pure config (entity key, columns, form component) — which is the payoff Plan 43-02's scaffolding was designed for"
  - "useBlockerFormatter is exported from AdminRegisterPageShell (rather than format-blockers.ts as the plan suggested) because it's a React hook (calls useTranslations) and only one consumer needs it — extracting a separate file would add an import boundary for no reuse gain"
  - "FormFooter is a real shared component (not inlined per form) so the Cancel/Save/Återställ UX stays byte-identical across all 5 entities"
  - "/admin/people column set: FirstName+LastName concat, Discipline name (resolved via useDisciplines lookup), Department name, Målstimmar/mån. Dropping the plan's Email column (no email column on `people` table) and the Employment% column (no column — targetHoursPerMonth is the closest concept but rendered as its own column, not a %)"
  - "/admin/projects column set: Name, Program (resolved via usePrograms lookup), Status chip. Dropping the plan's Code, Lead PM, and Start–End columns (no code/startDate/endDate columns on `projects` table; leadPmPersonId exists but is PROP-02-owned assignment, not admin-register CRUD)"
  - "Status chip for /admin/projects renders `active` (green) / `planned` (blue) / `archived` (gray) inline — v4 had no equivalent status rendering to mirror, so a minimal token chip is used"
  - "The two NEW pages (people, projects) are functional client components wrapping AdminRegisterPageShell; the three REWRITTEN pages are pure AdminRegisterPageShell mounts because their column sets need no lookup joins"
  - "Integration test suite uses a fetch-stub handler map with longest-prefix routing so that a DELETE handler for `.../department/:id` correctly beats the list handler for `.../department` — without this, 409 blocker tests fail because the archive request is routed to the list handler first"
  - "Test-side label lookup uses `document.getElementById('register-field-name')` instead of `getByLabelText('Namn')` because RegisterFormField's required asterisk splits the label text node and the column header 'Namn' in RegisterTable creates ambiguous matches"
metrics:
  duration: ~40min
  completed: 2026-04-08T19:35:00Z
  tests_added: 8
  files_created: 10
  files_modified: 6
---

# Phase 43 Plan 03: Per-entity admin register pages Summary

Five admin register pages mounted on top of the 43-02 shared scaffolding: `/admin/people` and `/admin/projects` are NEW, and `/admin/departments` / `/admin/disciplines` / `/admin/programs` are rewrites that preserve their existing routes while swapping the v4 inline-edit UI for the v5 side-drawer pattern. ADM-01 (admin CRUD surface) and ADM-02 (DEPENDENT_ROWS_EXIST blocker copy) are now end-to-end.

## What landed

### Task 1 — Five per-entity form components + shared FormFooter + i18n

All five forms share the same `RegisterDrawerFormProps<T>` contract from 43-02 and validate on submit via the real Zod schema that `/api/v5/admin/registers/:entity` uses on the server side:

- **`PersonForm`** — fields: firstName, lastName, disciplineId (select from `useDisciplines`), departmentId (select from `useDepartments`), targetHoursPerMonth (1–744). Schema: `personCreateSchema`.
- **`ProjectForm`** — fields: name, programId (select from `usePrograms`, nullable), status (`active` | `planned`). Schema: `projectCreateSchema`.
- **`DepartmentForm`** — single field: name. Schema: `departmentCreateSchema` (from 43-01 register.schema).
- **`DisciplineForm`** — fields: name, abbreviation (max 10 chars). Schema: `disciplineCreateSchema`.
- **`ProgramForm`** — fields: name, description (textarea, max 500). Schema: `programCreateSchema`.

Each form renders `<FormFooter>` which switches between `Cancel + Spara` (normal) and `Cancel + Återställ` (when `isArchived=true`, per D-11). The Återställ button calls `onSubmit({ ...currentValues, archivedAt: null })` — the `useUpdateRegisterRow` hook's PATCH accepts `archivedAt: null` per D-11.

`submitError` is displayed inline above the footer; Save is disabled while `submitting`.

**i18n** — extended the `v5.admin.register` namespace with `form.{person|project|department|discipline|program}.*` field labels and a `forbidden` key for the Clerk-gate fallback. Both sv.json and en.json are populated (keeps 43-02's precedent from deviation #3).

**Commit:** `6d3196e`

### Task 2 — Five pages + AdminRegisterPageShell + 8 RTL integration tests

**`src/components/admin/AdminRegisterPageShell.tsx`** — the central glue that ties everything together:

```tsx
<AdminRegisterPageShell<TRow, TFormValues>
  entity="department"
  titleKey="title.department"
  descriptionKey="description.department"
  columns={columns}
  formComponent={DepartmentForm}
/>
```

It handles:
1. Clerk `orgRole` gate (accepts `org:admin` and `org:owner`; renders a ShieldAlert forbidden card with the new `v5.admin.register.forbidden` string otherwise)
2. `<PersonaGate allowed={['admin']}>` wrap (UX-only, per ADR-004)
3. `useRegisterList` / `useCreateRegisterRow` / `useUpdateRegisterRow` / `useArchiveRegisterRow` wiring
4. The five RegisterTable labels resolved from `v5.admin.register.*` via `useTranslations`
5. Archive flow catches `DependentRowsError`, formats via the internal `useBlockerFormatter` hook, and surfaces it as the RegisterTable `banner` prop (tone: error, with `onDismiss`)
6. Drawer open/close for create (empty defaults), edit (prefilled), unarchive (opens row with `isArchived=true` → form shows Återställ button)

**`useBlockerFormatter`** is exported alongside and maps `{ allocations: 3, proposals: 1, people: 2, projects: 4, leadPm: 1 }` → a Swedish string like `"Kan inte arkivera — raden används på andra ställen. 3 aktiva allokeringar, 1 aktiva önskemål"` by keying into `v5.admin.register.dependentRowsExist.*` templates.

**The five pages:**

- **`/admin/people` (NEW)** — resolves discipline and department names via the v4 `useDisciplines`/`useDepartments` read hooks for display, then delegates to `AdminRegisterPageShell`. Columns: Name (firstName+lastName), Discipline, Department, Måltimmar/mån.
- **`/admin/projects` (NEW)** — resolves program name via `usePrograms`, renders status as a colored chip (active=green, planned=blue, archived=gray). Columns: Name, Program, Status.
- **`/admin/departments` (REWRITTEN)** — route preserved. Single column: Name.
- **`/admin/disciplines` (REWRITTEN)** — route preserved. Columns: Name, Förkortning (abbreviation).
- **`/admin/programs` (REWRITTEN)** — route preserved. Columns: Name, Description.

The three REWRITTEN pages went from ~280 LOC of inline-edit boilerplate to ~40 LOC of pure config, with the v4 `use-reference-data.ts` hooks left completely untouched (D-13).

**Integration tests (`register-pages.test.tsx`)** — 8 tests across 5 describe blocks covering every acceptance criterion:

| # | Describe          | Test                                                       |
| - | ----------------- | ---------------------------------------------------------- |
| 1 | /admin/departments | renders rows, create POST, archive 409 → banner shows "3 personer" |
| 2 | /admin/departments | toggle showArchived, open archived row, Återställ → PATCH archivedAt=null |
| 3 | /admin/disciplines | renders seeded row + abbreviation, drawer opens on Ny      |
| 4 | /admin/programs   | renders seeded row + description, create flow POSTs        |
| 5 | /admin/people     | renders person with resolved discipline + department names |
| 6 | /admin/people     | archive 409 allocations → banner shows "5 aktiva allokeringar" |
| 7 | /admin/projects   | renders project with status chip + program lookup          |
| 8 | /admin/projects   | archive 409 allocations → banner shows "2 aktiva allokeringar" |

The test harness reuses the `PersonaProvider` + `NextIntlClientProvider` + `QueryClientProvider` wrap pattern from `staff-schedule.test.tsx` plus a fetch stub with a longest-prefix handler map so that per-id DELETE/PATCH handlers win over the entity list handler.

**Commit:** `48c625d`

## Verification

```
pnpm tsc --noEmit                                                           ✓ clean
pnpm vitest run src/components/admin/__tests__/register-pages.test.tsx      ✓ 8/8
pnpm vitest run src/components/admin src/hooks/__tests__/use-admin-registers.test.tsx src/messages/__tests__/keys.test.ts  ✓ 36/36
```

No new runtime deps. No changes to `package.json` / `pnpm-lock.yaml`.

## Deviations from Plan

### [Rule 1 — Bug] Plan specified form field sets that don't exist in the schemas

- **Found during:** Task 1 (schema inspection before writing PersonForm / ProjectForm).
- **Issue:** The plan's Task 1 action block listed PersonForm fields as `name, email, disciplineId, departmentId, employmentPercentage` and ProjectForm fields as `name, code, leadPmPersonId, programId, status, startDate, endDate`. None of `email`, `employmentPercentage`, `code`, `startDate`, `endDate` exist as columns on the `people` or `projects` tables or in their Zod schemas (people.schema.ts is firstName/lastName/disciplineId/departmentId/targetHoursPerMonth; project.schema.ts is name/programId/status). Building the plan's form would have broken the POST round-trip because the server-side register.service (43-01) parses the incoming body with the exact same Zod schemas and would reject every create with `Invalid person payload` / `Invalid project payload`.
- **Fix:** Shipped the REAL schema fields in each form. Column lists in `<column_specs>` were similarly corrected: people has Name+Discipline+Department+Målstimmar/mån, projects has Name+Program+Status. The plan's fictional columns (`Email`, `Employment %`, `Code`, `Lead PM`, `Start–End`) are dropped — adding them would require (a) a schema migration to add the columns, (b) extending the create schemas in two v4 feature modules, and (c) updating the PROP-02 lead-PM assignment flow to reconcile with admin-register ownership. All three are out-of-scope for 43-03.
- **Files modified:** `PersonForm.tsx`, `ProjectForm.tsx`, `people/page.tsx`, `projects/page.tsx`
- **Commit:** `6d3196e` (forms) + `48c625d` (pages)

### [Rule 2 — Auto-add critical functionality] AdminRegisterPageShell extracted as a shared wrapper

- **Found during:** Task 2 (writing the three REWRITE pages after the two NEW ones).
- **Issue:** The plan's Task 2 template spread ~80 LOC of identical Clerk-gate + useRegisterList + archive-catch + drawer-open state + label map glue into EVERY per-entity page. Five copies of the same logic would have been ~400 LOC of duplication and five places to fix if the DEPENDENT_ROWS_EXIST copy ever changes.
- **Fix:** Extracted `AdminRegisterPageShell` at `src/components/admin/AdminRegisterPageShell.tsx`. Each of the five pages is now ~15–60 LOC (the NEW pages are larger because they need `useDisciplines`/`useDepartments`/`usePrograms` lookups for column rendering; the REWRITE pages are pure config). The blocker-formatting logic (`useBlockerFormatter`) lives in the same file rather than in a separate `format-blockers.ts` the plan suggested, because it's a React hook and only one consumer needs it.
- **Files created:** `src/components/admin/AdminRegisterPageShell.tsx`
- **Commit:** `48c625d`

### [Rule 1 — Bug] Test fetch stub would route DELETE-on-:id to the list handler

- **Found during:** Task 2 (first test run — the people/projects 409 banner tests failed because the archive response was a 200 `{ rows: [] }` instead of the 409 we had configured).
- **Issue:** The initial test fetch stub iterated `Object.keys(handlers)` in insertion order and used `url.startsWith(prefix)`. Since `/api/v5/admin/registers/person/:id` starts with `/api/v5/admin/registers/person`, any test that set a list handler first had its per-id handler shadowed. The department tests happened to pass because the per-id handler was registered BEFORE the list handler; the people/projects tests registered in the opposite order.
- **Fix:** Added longest-prefix-first routing: `Object.keys(handlers).sort((a, b) => b.length - a.length)`. Also tightened the prefix match so `/dept` doesn't accidentally match `/department` — now requires `url === prefix || startsWith(prefix + '?') || startsWith(prefix + '/')`. Verified by re-running all 8 tests.
- **Files modified:** `src/components/admin/__tests__/register-pages.test.tsx`
- **Commit:** `48c625d`

### [Rule 1 — Bug] `getByLabelText('Namn')` is ambiguous; required-asterisk splits label text

- **Found during:** Task 2 (first test run).
- **Issue:** `RegisterFormField` renders the label as `{label}{required && <span>*</span>}`, so the label's accessible text becomes `"Namn "` (with a trailing space plus a nested span). Combined with the RegisterTable column header also saying "Namn", `getByLabelText` returned multiple matches and `getAllByLabelText` only matched one of them unreliably across forms.
- **Fix:** Test-side, use `document.getElementById('register-field-name')` — deterministic because `RegisterFormField` always sets `id="register-field-{name}"`. Not a production fix; no component changes needed.
- **Commit:** `48c625d`

## Authentication gates

None — this plan is pure UI wiring. Clerk auth is handled by the existing middleware; the pages only check `orgRole` for the UX gate.

## Known Stubs

None. Every form is wired to its real schema and real POST/PATCH/DELETE endpoints from 43-01. No placeholder data flows to rendering. The `leadPmPersonId` column on `projects` is intentionally NOT surfaced in the admin register form because that column is owned by PROP-02 (lead-PM assignment flow); this is a documented scope boundary, not a stub.

## Deferred items

- None. All 43-03 scope landed.

## Self-Check: PASSED

- src/components/admin/forms/FormFooter.tsx — FOUND
- src/components/admin/forms/PersonForm.tsx — FOUND
- src/components/admin/forms/ProjectForm.tsx — FOUND
- src/components/admin/forms/DepartmentForm.tsx — FOUND
- src/components/admin/forms/DisciplineForm.tsx — FOUND
- src/components/admin/forms/ProgramForm.tsx — FOUND
- src/components/admin/AdminRegisterPageShell.tsx — FOUND
- src/app/(app)/admin/people/page.tsx — FOUND
- src/app/(app)/admin/projects/page.tsx — FOUND
- src/app/(app)/admin/departments/page.tsx — MODIFIED (rewrite)
- src/app/(app)/admin/disciplines/page.tsx — MODIFIED (rewrite)
- src/app/(app)/admin/programs/page.tsx — MODIFIED (rewrite)
- src/components/admin/__tests__/register-pages.test.tsx — FOUND
- src/messages/sv.json — MODIFIED (v5.admin.register.form.* + forbidden)
- src/messages/en.json — MODIFIED (v5.admin.register.form.* + forbidden)
- src/messages/keys.ts — MODIFIED (v5.admin.register.form.* + forbidden)
- commit 6d3196e — FOUND
- commit 48c625d — FOUND
