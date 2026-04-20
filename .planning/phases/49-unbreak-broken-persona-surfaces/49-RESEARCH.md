# Phase 49: Unbreak broken persona surfaces - Research

**Researched:** 2026-04-15
**Domain:** Next.js 16 / Drizzle / Neon / Clerk app-shell bug fixes
**Confidence:** HIGH — admin 500 root cause proven live, all three targeted questions answered with verbatim code locations.

## Summary

Phase 49 is Wave 0 of v6.0: nine UNBREAK-0N gates that stop persona landing pages from shipping as raw i18n keys, error banners, or placeholder text. This research resolves the three gray areas from CONTEXT.md:

1. **Admin 500s (UNBREAK-04/05)** — Reproduced live from the already-running dev server's authenticated log stream at `.next/dev/logs/next-development.log`. Root cause is **migration drift on the dev Neon branch** — `drizzle.__drizzle_migrations` has 5 rows, the code ships 9. Missing migrations (`0005_motionless_blob` ... `0008_change_log_entity_program`) leave `departments.archived_at` / `disciplines.archived_at` / `programs.archived_at` absent and `change_log` table absent entirely. Exact Postgres error captured: `NeonDbError: column "archived_at" does not exist` (code `42703`, `errorMissingColumn`).
2. **Department fetch (UNBREAK-01/02/08)** — `/api/departments` already exists (`src/app/api/departments/route.ts`) with shape `{ departments: DepartmentRow[] }` already tenant-scoped via `getTenantId()`. A ready-to-use hook lives at `src/hooks/use-reference-data.ts` (`useDepartments()`). The `PersonaContext` already fetches and exposes departments via `usePersona().departments`. **No new endpoint or route needed** — wire `persona-switcher.tsx` to `usePersona().departments` (or directly `useDepartments()` for consistency with the existing `fetchPeople` pattern).
3. **PersonaGate rewire (UNBREAK-09)** — Confirmed file path `src/features/personas/persona-route-guard.ts`. Bug is two-fold: the error copy is hardcoded Swedish ("linjechefs-personan") in `src/messages/sv.json:437` AND the `allowed` prop is never read at the lookup site (line 67). Minimal diff is ~10 lines; singular-namespace rewire uses `useTranslations('v5.persona')` + a `kindKey(kind)` helper that hyphenates `lineManager` / `line-manager` (already hyphenated in the discriminator — no transform needed — see Surprise Finding below).

**Primary recommendation:** Order tasks as CONTEXT.md D-04's proximity heuristic suggests — persona-switcher cluster (UNBREAK-01/02/06/08/09) first since they mutate 3 adjacent files, then UNBREAK-03 (1-line PM fix), then UNBREAK-04/05 (run `drizzle-kit push` + verify), then UNBREAK-07 (12-spec sweep last, since earlier fixes may change what each spec sees).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 — PersonaGate i18n namespace (UNBREAK-09, closes VERIFY-08).** Rewire PersonaGate to read the existing `v5.persona.kind.*` (singular) namespace. Do NOT add a parallel `kinds.*` (plural) namespace. Translate the `lineManager` discriminator value to the hyphenated key `line-manager` at the lookup site. No change to `src/messages/sv.json` or `src/messages/en.json`.
- **D-02 — Department picker location + shape (UNBREAK-01/02/08, closes VERIFY-03).** The department picker lives inside `src/components/persona/persona-switcher.tsx` — NOT a standalone component. When `persona.kind === 'line-manager'`, render a secondary `<select>` below the kind selector. Edge cases: 0 departments → disable the LM option with a tooltip "Admin måste koppla ditt användarkonto till en avdelning först"; 1 department → auto-select; >1 → persist last selection in `localStorage` key `persona.line-manager.departmentId`. Remove the `safeT(t, 'home.selectDepartment', ...)` and `safeT(t, 'timeline.selectDepartment', ...)` fallback calls in the same commit as the picker lands.
- **D-03 — Admin API 500 reproduction method (UNBREAK-04/05).** Use the `claude-in-chrome` MCP tools (or the pre-existing authenticated dev server log) to reproduce the 500s from an authenticated admin session. Capture stack traces from `pnpm dev` stdout / `.next/dev/logs/next-development.log` concurrently. Record raw capture into RESEARCH.md before planning the fix. Do NOT fix blind.
- **D-04 — PM empty-state (UNBREAK-03).** Straight code fix at `src/app/(app)/pm/page.tsx:60`: fall through to `{tScreens('empty')}` when `data.projects.length === 0` instead of remaining on the loading spinner. The fall-through branch is already authored (lines 60-66) — Phase 48 was wrong to classify this as "stays on loading spinner"; the branch exists and is reachable, the remaining question is whether the branch fires (see Surprise Finding 3 below). No gray area.
- **D-05 — PersonaGate copy from `allowed` prop (UNBREAK-06).** Rewrite the error to read `allowed`, translate to the Swedish/English persona label via D-01's lookup, render "Kunde inte ladda — denna sida är för {allowedLabel}-personan". No i18n file changes needed.
- **D-06 — Playwright spec updates (UNBREAK-07).** Phase 49 updates all 12 specs to survive the current unbroken path (no /team, /projects, /wishes removals yet — those are Phase 51). Per-spec update is enumerated in `pre-flight-report.md §VERIFY-06` appendix. Each spec gets a single commit. Phase 49 does NOT add new specs.

### Claude's Discretion

- Exact dropdown visual styling inside persona-switcher — match existing kind-select styles (Tailwind tokens).
- Department fetch endpoint — planner researches; most likely reuses existing `/api/people` or introduces `/api/departments`. **Resolved by research:** `/api/departments` already exists; reuse it.
- PersonaGate file path (rename/relocate) — hold current location unless rewire requires it. **Resolved:** keep at `src/features/personas/persona-route-guard.ts`.
- Order of UNBREAK-0N implementation — sequence by code-touch proximity (persona-switcher cluster, then admin APIs, then PM, then spec sweep).

### Deferred Ideas (OUT OF SCOPE)

- **Persona-aware landing redirect** (NAV-01..05) → Phase 50
- **`/team`, `/projects`, `/wishes` deletion + redirects** → Phase 51
- **New Playwright specs for v6.0 flag paths** → Phases 50, 51, 52 (each owns its own spec additions)
- **Dashboard layout trim** → Phase 51
- **LM approval-queue badge** (LM-03 added by VERIFY-02) → Phase 52
- **PersonaGate architectural rewrite** — out of scope; only the i18n lookup shifts
- Feature-flag gating — Phase 49 unbreaks on the unflagged code path
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UNBREAK-01 | `/line-manager` renders a functional department picker; the raw i18n key `v5.lineManager.home.selectDepartment` no longer appears. | §Department fetch API findings; §Per-UNBREAK implementation — UNBREAK-01 |
| UNBREAK-02 | `/line-manager/timeline` renders a functional department picker; raw `v5.lineManager.timeline.selectDepartment` no longer appears. | §Department fetch API findings; §Per-UNBREAK implementation — UNBREAK-02 |
| UNBREAK-03 | PM Home at `src/app/(app)/pm/page.tsx:60` falls through to the empty-state translation instead of remaining on the loading spinner. | §Per-UNBREAK implementation — UNBREAK-03; §Surprise Findings — finding 3 |
| UNBREAK-04 | `/admin` landing (Ändringslogg) loads without rendering "Kunde inte ladda ändringsloggen"; change-log entries populate. | §Admin 500 research findings — live stack trace + DB proof |
| UNBREAK-05 | `/admin/people` loads without rendering "Kunde inte ladda listan"; person rows populate. | §Admin 500 research findings — same root cause |
| UNBREAK-06 | PersonaGate error message reads the persona kind from the `allowed` prop; no hardcoded "linjechefs-personan" when the actual allowed persona is admin or another kind. | §PersonaGate rewire findings; §Surprise Findings — finding 2 |
| UNBREAK-07 | Playwright spec inventory complete with updates applied. | §Per-UNBREAK implementation — UNBREAK-07 |
| UNBREAK-08 | Department-picker component authored; `/line-manager` and `/line-manager/timeline` consume it. | §Department fetch API findings; §Per-UNBREAK implementation — UNBREAK-08 |
| UNBREAK-09 | PersonaGate persona-kinds namespace resolved via rewire to `v5.persona.kind.*` (singular). | §PersonaGate rewire findings |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No repo-root `CLAUDE.md` exists (verified by `Glob **/CLAUDE.md` → no files found). Project-level directives are implicit in existing code patterns:

- **v5 no-literals eslint guard** — `persona-switcher.tsx` header comment: "This file is INSIDE the v5 no-literals eslint guard scope. All user-visible strings route through `useTranslations`." → the department dropdown's `<option>` content and `aria-label` must use i18n keys (no inline Swedish/English literals).
- **Universal change_log (ADR-005)** — Every mutating service writes to `change_log` via `recordChange()`. Phase 49 is read-only for the admin fix; no new mutations. Does NOT apply to persona-switcher selection (client-side state).
- **Personas are UX shortcuts, not security (ADR-004)** — `persona-route-guard.ts` header: "Client-side persona route guard. UX shortcut only — NOT a security boundary. The API still authorizes by org membership." → PersonaGate i18n fix must not be mistaken for an auth fix.
- **ISO 8601 + 53-week year first-class** — Not touched by Phase 49.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.1 (Turbopack) | Framework | Current prod version per `package.json dev` script output `[VERIFIED: dev-server log]` |
| `@tanstack/react-query` | v5 | Client cache for `/api/departments` fetch | Established pattern — `persona-switcher.tsx:78-82` (`useQuery` + `fetchPeople`) already uses it `[VERIFIED: source read]` |
| `next-intl` | (whatever ships — `useTranslations` hook) | i18n lookup | Established pattern — `persona-switcher.tsx:72` uses `useTranslations('v5.persona')` `[VERIFIED: source read]` |
| `drizzle-orm/neon-http` | current | DB access | `src/db/index.ts:1` `[VERIFIED: source read]` |
| `@clerk/nextjs` | current | Auth middleware | `src/proxy.ts` 307s unauthenticated requests `[VERIFIED: repro trace]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-kit` | current | Schema migrations | **REQUIRED for UNBREAK-04/05 fix** — dev Neon branch has 5 migrations applied, code has 9; `pnpm db:push` or `pnpm db:migrate` (CLI name in this repo — see Environment Availability) brings branch up to date |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reusing `/api/departments` | Building `/api/line-manager/departments?userId=...` | The existing endpoint already tenant-scopes via `getTenantId()` and returns all departments in the Clerk org. CONTEXT D-02's "departments the signed-in user can MANAGE" hint implies filtering — but the app's persona model is "UX shortcut, not security" (ADR-004), so ANY user in the org can already "act as LM" for ANY department. Filtering to managed-only is out of scope for Phase 49. |
| Adding `v5.persona.kinds.*` namespace | Rewire PersonaGate to read `v5.persona.kind.*` | CONTEXT D-01 locks the rewire — decision already made. |

**Installation:** no new dependencies required. All needed libraries are already in `package.json`.

## Architecture Patterns

### Existing conventions to mirror

**Persona-switcher fetch pattern** (already in place for people; mirror for departments):
```typescript
// Source: src/components/persona/persona-switcher.tsx:38-44 [VERIFIED: source read]
async function fetchPeople(): Promise<PersonRowLite[]> {
  const res = await fetch('/api/people');
  if (!res.ok) return [];
  const json = (await res.json()) as PeopleResponse;
  return json.people ?? [];
}
```

**Department data is already fetched in context** (prefer this — avoid double fetch):
```typescript
// Source: src/features/personas/persona.context.tsx:54-78 [VERIFIED: source read]
const [departments, setDepartments] = useState<DepartmentLite[]>([]);
useEffect(() => {
  fetch('/api/departments')
    .then((r) => (r.ok ? r.json() : Promise.reject(...)))
    .then((data: { departments?: DepartmentLite[] }) => {
      if (Array.isArray(data?.departments)) setDepartments(data.departments);
    })
    .catch(() => { /* empty fallback */ });
}, []);
// Exposed via context: usePersona().departments
```

**Persona-scoped query keys** (`persona-switcher.tsx:79`, `persona.context.tsx:25-32`) — the LM department selection must invalidate `line-manager-capacity` and `line-manager-group-timeline` query keys when the departmentId changes, because both pages key their queries on `[kind, departmentId, monthRange]`.

### Don't build

**Don't build a standalone `DepartmentPicker` component.** CONTEXT D-02 locks the decision; architectural reason confirmed: building one creates a second test surface and a second state-management path. The picker belongs inside `persona-switcher.tsx` (~30 lines of JSX + 1 `useState` for `departmentId`).

**Don't filter departments by "manageable by user".** No such column exists on `people` (people have exactly one `department_id` — they belong to a department, they don't manage N departments). CONTEXT D-02 acknowledges this by not requiring it. Scope guard.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Department list fetch | `fetch('/api/line-manager/departments')` | `usePersona().departments` (already populated in context) OR `useDepartments()` from `src/hooks/use-reference-data.ts:115` | Double-fetch; already cached in context |
| localStorage persistence for LM departmentId | Custom IIFE in persona-switcher | Reuse the same `window.localStorage.setItem` pattern from `persona.context.tsx:112` (STORAGE_KEY = `'nc:persona'`) but with a NEW key `persona.line-manager.departmentId` per CONTEXT D-02 edge-case spec | Proven SSR-safe + quota-error-tolerant pattern |
| Admin 500 environment fix | `try/catch` wrapper in `change-log.read.ts` | **Run `drizzle-kit migrate` against the Neon branch** (see §Admin 500 research findings → Fix approach) | This is environmental drift, not a code bug. Swallowing the error with try/catch would hide the real problem AND break the admin feed permanently on any branch that's actually behind. |
| PersonaGate persona label lookup | Inline `switch (persona.kind)` in PersonaGate | `t(\`kind.\${kind}\`)` where `kind` is already the hyphenated discriminator | Namespace already exists at `v5.persona.kind.*`; CONTEXT D-01 locks this path |

**Key insight:** Three of four UNBREAK-0N clusters are already 90% scaffolded in the codebase — persona-switcher has the placeholder (`departmentId: ''` at line 58), persona-context already fetches departments, and `/api/departments` already returns them. Phase 49 is primarily **wiring existing parts together**, not building anything new.

## Runtime State Inventory

> Phase 49 is code-only; no rename/refactor/migration of persisted strings. Skipping per research depth guidance.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `localStorage` key `nc:persona` already stores `{kind, departmentId: '', displayName, …}`; existing stored personas with `departmentId: ''` will continue to deserialize safely (empty string is a valid initial state) | No data migration. New key `persona.line-manager.departmentId` is additive. |
| Live service config | None — no external service embeds persona kind as configuration | None |
| OS-registered state | None | None |
| Secrets/env vars | `DATABASE_URL` in `.env.local` — unchanged. Clerk keys — unchanged. | None |
| Build artifacts | None for UNBREAK-01/02/03/06/07/08/09. For UNBREAK-04/05 fix: Neon branch schema is a build-time artifact that drifted from code; remediated by running migrations (not a rebuild). | Run `drizzle-kit migrate` (see fix approach) |

**The canonical question:** After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered? → **Old personas in localStorage** with `departmentId: ''` will need the switcher to detect this empty state on first load and prompt user to pick a department. Not a migration — the new picker code already handles this naturally (edge case "0-or-1 selected → auto-select / prompt") per CONTEXT D-02.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js dev server | Admin 500 repro + spec runs | ✓ | 16.2.1 (Turbopack), already running on :3000 PID 43284 `[VERIFIED]` | — |
| `pnpm` | Package scripts | ✓ | (assumed current; `pnpm dev` invoked successfully) | — |
| Neon dev branch | Admin 500 repro + schema inspection | ✓ | org_id `0b200821-c78c-4717-9099-696c8520d2d3` `[VERIFIED: direct query succeeded against public.information_schema]` | — |
| `@neondatabase/serverless` | Direct DB probes | ✓ | v1.0.2 `[VERIFIED: node_modules path]` | — |
| `drizzle-kit` CLI | Applying missing migrations | **Verify before Phase 49 starts** | `package.json` likely defines `pnpm db:push` / `pnpm db:migrate` — check exact script name; the repo ships with `drizzle/migrations/` dir and `meta/_journal.json` with 9 entries `[VERIFIED: file presence]` | Manual `psql` apply of 0005-0008 SQL files as last resort |
| Clerk dev pane | Signed-in admin session | ✓ | Development keys active per dev log WARN `[VERIFIED]` | — |
| `claude-in-chrome` MCP | Live browser repro | Not required — existing authenticated session log at `.next/dev/logs/next-development.log` already captured the 500 traces from a real user click `[VERIFIED]` | — |
| Playwright runner | UNBREAK-07 validation | ✓ | `e2e/playwright.config.ts` present, 12 specs confirmed by VERIFY-06 `[VERIFIED]` | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- The `claude-in-chrome` MCP was not invoked during research because the pre-existing dev-server log had already captured the error traces from a real authenticated session at timestamps `00:03:05.982`, `00:10:20.305`, ..., `00:47:26.971` (237 log lines, 62+ ERROR entries). The fallback (reading the log) produced higher-fidelity evidence than a synthetic click would have, because the errors occurred during real navigation cycles the user exercised while auditing v6.0 surfaces.

## Admin 500 Research Findings (CONTEXT D-03 — UNBREAK-04/05)

### Reproduction

**Dev server state at research time:** Pre-existing `pnpm dev` process, PID 43284, port 3000, running against the dev Neon branch.

**Authenticated-session log captured automatically:** `.next/dev/logs/next-development.log` (237 lines at capture time, authenticated user had navigated `/admin`, `/admin/people`, `/admin/departments`, `/admin/disciplines`, `/admin/programs` in prior sessions). No new browser click required to repro — the errors were already logged.

**Representative log entries** (verbatim, timestamps chronological):

```
{"timestamp":"00:03:05.982","source":"Server","level":"ERROR","message":"Unhandled API error: Error: Failed query: select \"id\", \"organization_id\", \"name\", \"archived_at\", \"created_at\" from \"departments\" where \"departments\".\"organization_id\" = $1 order by \"departments\".\"name\"\nparams: 0b200821-c78c-4717-9099-696c8520d2d3"}

{"timestamp":"00:03:14.033","source":"Server","level":"ERROR","message":"Unhandled API error: Error: Failed query: select \"id\", \"organization_id\", \"name\", \"abbreviation\", \"archived_at\", \"created_at\" from \"disciplines\" where \"disciplines\".\"organization_id\" = $1 order by \"disciplines\".\"name\"\nparams: 0b200821-c78c-4717-9099-696c8520d2d3"}

{"timestamp":"00:10:20.305","source":"Server","level":"ERROR","message":"Unhandled API error: Error: Failed query: select \"id\", \"organization_id\", \"actor_persona_id\", \"entity\", \"entity_id\", \"action\", \"previous_value\", \"new_value\", \"context\", \"created_at\" from \"change_log\" where \"change_log\".\"organization_id\" = $1 order by \"change_log\".\"created_at\" desc, \"change_log\".\"id\" desc limit $2\nparams: 0b200821-c78c-4717-9099-696c8520d2d3,51"}

{"timestamp":"00:41:58.637","source":"Server","level":"ERROR","message":"Unhandled API error: Error: Failed query: select \"id\", \"organization_id\", \"name\", \"description\", \"archived_at\", \"created_at\", \"updated_at\" from \"programs\" where \"programs\".\"organization_id\" = $1 order by \"programs\".\"name\"\nparams: 0b200821-c78c-4717-9099-696c8520d2d3"}
```

(Tenant UUID `0b200821-c78c-4717-9099-696c8520d2d3` — same tenant as VERIFY-05's affected dashboard_layouts row. Consistent across all errors.)

**Count:** 62+ distinct `Unhandled API error` entries across the 237-line log, all variations on "column does not exist" for `archived_at` OR "relation does not exist" for `change_log`.

### Direct Postgres Error (Drizzle swallows it; probed manually)

`handleApiError` in `src/lib/api-utils.ts:25` logs only `console.error('Unhandled API error:', error)` — the exact `Error: Failed query: ...` text seen in the log is what Drizzle's `neon-http` driver surfaces. To get the actual Postgres error code, I ran an ad-hoc probe via `@neondatabase/serverless` (probe script cleaned up after capture):

```
NeonDbError: column "archived_at" does not exist
  name: NeonDbError
  severity: ERROR
  code: 42703
  file: parse_relation.c
  line: 3716
  routine: errorMissingColumn
  position: 35
```

(code 42703 = Postgres `undefined_column`)

### Root Cause (CONFIRMED, not hypothesized)

**Migration drift on the dev Neon branch.**

Code ships 9 migrations in `drizzle/migrations/meta/_journal.json`:
```
idx 0  0000_tearful_the_initiative
idx 1  0001_goofy_doctor_doom
idx 2  0002_oval_butterfly
idx 3  0003_busy_black_bird         — creates change_log table + enums
idx 4  0004_slippery_epoch
idx 5  0005_motionless_blob         — ALTER TYPE change_log_action ADD VALUE 'ACTUAL_UPSERTED'
idx 6  0006_import_status_staged_committed
idx 7  0007_register_archive        — ALTER TABLE departments/disciplines/programs ADD archived_at
idx 8  0008_change_log_entity_program
```

Neon branch has **5 rows** in `drizzle.__drizzle_migrations`:
```
1774518414872 6221cce310840688...
1775573609283 5ba054ac902f969f...
1775573609411 0ad79bd066ba3336...
1775573609470 bd5d5976375cf65e...
1775573609530 52ef4d2091826611...
```

Live `public` schema has:
```
actual_entries, allocation_proposals, allocations, dashboard_layouts, departments,
disciplines, feature_flags, impersonation_sessions, import_batches, import_sessions,
organizations, people, platform_admins, platform_audit_log, programs, projects,
scenario_allocations, scenario_temp_entities, scenarios, system_announcements
```

Missing from live schema:
- `change_log` table (created by migration `0003_busy_black_bird.sql` — despite 5 migration rows being applied, the `change_log` table is absent; this is an inconsistency that Phase 49 does not need to resolve, it only needs to **re-run all 9 migrations idempotently**)
- `departments.archived_at` column (created by `0007_register_archive.sql`)
- `disciplines.archived_at` column (created by `0007_register_archive.sql`)
- `programs.archived_at` column (created by `0007_register_archive.sql`)
- `projects_org_archived_idx` index (created by `0007_register_archive.sql`)

### Fix Approach (CONTEXT D-03 — "do not fix blind")

**NOT a code fix.** All four handlers (`/api/departments`, `/api/v5/admin/registers/person`, `/api/v5/change-log`, `/api/v5/admin/registers/department`, etc.) have correct code that matches the `schema.ts` definitions. The schema.ts is authoritative; the DB is behind.

**Two-part fix for Phase 49:**

1. **Environment remediation (primary fix) — run migrations:**
   - Confirm script name in `package.json` (likely `pnpm db:migrate` or `pnpm db:push`).
   - Run against the dev Neon branch in `.env.local`.
   - Verify by re-querying `drizzle.__drizzle_migrations` (expect 9 rows) and `information_schema.columns` for `archived_at` (expect present on departments/disciplines/programs).
   - Verify by re-hitting `/admin` + `/admin/people` in the signed-in dev browser — dev log should stop emitting `Unhandled API error` entries.
   - **Important:** this is a dev-branch fix. The same remediation must be re-run against the **production** Neon branch as a deploy step (track as a separate deploy action item; Phase 49 tasks should include a note pointing at the prod re-run).

2. **Defensive code patch (secondary, optional, low-risk):**
   - `src/lib/api-utils.ts:25` currently logs only `console.error('Unhandled API error:', error)` — the caller gets a generic `ERR_INTERNAL` with no detail. For admin-facing 500s, consider extracting the `NeonDbError.code` (42703 = `undefined_column`) and surfacing a specific "ERR_SCHEMA_DRIFT" response that points at the missing migration. **Defer to a later phase** (not in Phase 49 scope per CONTEXT guard) — UNBREAK-04/05 needs only the migration fix.

**Do NOT:**
- Add `try/catch` wrappers around the failing queries — would hide future migration drift.
- Strip `archived_at` from the Drizzle schema — would break every other consumer (archive filter in admin register, staff filter in reference lists).
- Conditionally query based on column presence — complexity with no payoff when the real fix is a 1-command migration run.

### Validation After Fix

1. Tail `.next/dev/logs/next-development.log` — zero new `Unhandled API error` entries for `archived_at` / `change_log`.
2. `/admin` page renders `<ChangeLogFeed>` with entries (or empty state, if branch has no history) — no error banner.
3. `/admin/people` renders the register table with person rows — no error banner.
4. `/admin/departments` and `/admin/disciplines` and `/admin/programs` also recover (collateral fix — same root cause).
5. Commit the git SHA of the Neon migration state post-fix in the Phase 49 plan's Evidence section per CONTEXT `<specifics>` bullet (line 167).

## Department Fetch API Findings (CONTEXT D-02 — UNBREAK-01/02/08)

### Endpoint Decision

**Reuse existing `/api/departments`.** No new endpoint needed.

**Existing endpoint:** `src/app/api/departments/route.ts:8-16`
```typescript
export async function GET() {
  try {
    const orgId = await getTenantId();
    const departments = await listDepartments(orgId);
    return NextResponse.json({ departments });
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Response shape:** `{ departments: DepartmentRow[] }` where `DepartmentRow` is `typeof schema.departments.$inferSelect`, i.e.:
```typescript
{
  id: string;          // uuid
  organizationId: string;
  name: string;
  archivedAt: Date | null;  // nullable
  createdAt: Date;
}
```

**Service:** `src/features/departments/department.service.ts:13-19` — `listDepartments(orgId)` runs a Drizzle `SELECT ... FROM departments WHERE organization_id = $1 ORDER BY name`. **Does NOT filter archived** — includes both live and archived departments. For the LM picker, filter client-side: `departments.filter(d => d.archivedAt === null)`.

**Tenant scope:** Enforced at `getTenantId()` which reads `auth().orgId` from Clerk middleware. No need for explicit filtering in the hook — the response is already tenant-scoped.

**Auth:** The route doesn't call `requireRole` on GET (only on POST) — any authenticated user in the org can list departments. This matches ADR-004 ("personas are UX shortcut, not security") and is the correct behavior for the LM picker.

### Integration Plan

**Preferred pattern — use context (already populated):**

`src/features/personas/persona.context.tsx:54-78` already fetches `/api/departments` on mount and exposes `usePersona().departments` to any consumer. The `PersonaSwitcher` at `persona-switcher.tsx:73` already calls `usePersona()`. Just destructure `departments`:

```typescript
// In persona-switcher.tsx
const { persona, setPersona, departments } = usePersona();
```

This avoids a second `useQuery` + second fetch. The `DepartmentLite` shape from context (`{ id, name }` — narrower than `DepartmentRow` but sufficient) is exactly what the dropdown needs.

**Alternative pattern — `useDepartments()` hook:**

If the planner prefers a dedicated query (e.g., wants `isLoading` / `error` states for the picker, which context doesn't expose), `src/hooks/use-reference-data.ts:115-125` provides:

```typescript
export function useDepartments() {
  return useQuery<DepartmentRow[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await fetch('/api/departments');
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data = await res.json();
      return data.departments;
    },
  });
}
```

This returns the full `DepartmentRow[]` and provides React Query's loading/error states. Cost: a second fetch with key `['departments']` (the context already fetches with no query key).

**Recommendation:** Use `usePersona().departments` — the context is already the single source of truth for persona-scoped state, and the picker's edge cases (0/1/>1) can be derived from `departments.length` without needing an explicit loading gate. If `departments.length === 0` at render time, the context is either still loading OR the tenant genuinely has no departments — the CONTEXT D-02 "0 departments" edge case handles both identically (disable LM option with tooltip).

### Integration Points (files to touch)

| File | Change | Lines |
|------|--------|-------|
| `src/components/persona/persona-switcher.tsx` | Add `departments` to `usePersona()` destructure; add a second `<select>` rendered when `persona.kind === 'line-manager'`; add `departmentId` state + localStorage persistence under key `persona.line-manager.departmentId`; replace `departmentId: ''` at line 58 with the selected value | ~30 lines added; line 58 replaced |
| `src/app/(app)/line-manager/page.tsx` | Remove the `{!departmentId && <div>...safeT('home.selectDepartment')...</div>}` block at lines 68-72 — once the switcher guarantees a `departmentId`, this branch is dead code | lines 68-72 removed |
| `src/app/(app)/line-manager/timeline/page.tsx` | Same — remove lines 125-129 | lines 125-129 removed |
| `src/app/(app)/line-manager/page.tsx` + `timeline/page.tsx` | Consider removing the `safeT` helper from these files too (it exists only to support the now-removed fallback); hold unless other callers remain | — |
| `src/messages/sv.json`, `src/messages/en.json` | Optionally delete `home.selectDepartment` and `timeline.selectDepartment` keys; can also leave them as dead keys (cheaper) | optional |

## PersonaGate Rewire Findings (CONTEXT D-01 + D-05 — UNBREAK-06/09)

### File path + exact lookup site

**File:** `src/features/personas/persona-route-guard.ts` (confirmed — no `.tsx` variant exists; file uses `createElement` instead of JSX).

**Relevant namespace declaration:** line 41 — `const t = useTranslations('v5.lineManager');` — this is the bug. The namespace is `v5.lineManager`, not `v5.persona`. So when PersonaGate renders the "wrong persona" hint, it reads `v5.lineManager.wrongPersonaHint.description`, which hardcodes "linjechefs-personan" regardless of what the `allowed` prop contains. Source: `sv.json:437` — `"description": "Den här sidan är bara tillgänglig för linjechefs-personan."`.

**Current lookup site (the bug):**
```typescript
// src/features/personas/persona-route-guard.ts:38-72 [VERIFIED: source read]
export function PersonaGate({ allowed, children }: PersonaGateProps) {
  const { persona } = usePersona();
  const result = assertPersonaOrRedirect(persona, allowed);
  const t = useTranslations('v5.lineManager');            // ← bug: wrong namespace

  if (result.allowed) { return /* children */ }

  return createElement('div', { … },
    createElement('h3', { … }, safeT(t, 'wrongPersonaHint.title', 'Wrong persona')),
    createElement('p', { … },
      safeT(t, 'wrongPersonaHint.description',             // ← bug: hardcoded for LM
            'Switch to the correct persona to view this page.')),
    createElement('button', { … }, safeT(t, 'wrongPersonaHint.switchCta', 'Switch persona'))
  );
}
```

### Surprise finding — no string transform actually needed

CONTEXT D-01 prescribes translating `lineManager` → `line-manager` at the lookup site. **But `PersonaKind` is already declared as `'line-manager'` in `src/features/personas/persona.types.ts:8`** (the discriminator IS the hyphenated form). The i18n keys `v5.persona.kind.{pm, line-manager, staff, rd, admin}` (sv.json:494-498) match `PersonaKind` values verbatim. So the "transform" is a no-op; `t(\`kind.\${kind}\`)` works directly.

The `lineManager` (camelCase) form CONTEXT D-01 refers to is only ever seen in REQUIREMENTS.md UNBREAK-09's enumeration of the MISSING keys — i.e., the keys the OTHER fix option would have added. Since we're taking option (b) (rewire, no locale change), there is no `lineManager` camelCase anywhere in actual code to transform.

**Implication:** The rewire is simpler than CONTEXT D-01's hint suggests — no `.replace(/([A-Z])/g, '-$1').toLowerCase()` transform is needed. A direct `t(\`kind.\${kind}\`)` works.

### Minimal Diff Preview

```typescript
// src/features/personas/persona-route-guard.ts — BEFORE
import { useTranslations } from 'next-intl';
import type { Persona, PersonaKind } from './persona.types';
import { usePersona } from './persona.context';

export function PersonaGate({ allowed, children }: PersonaGateProps) {
  const { persona } = usePersona();
  const result = assertPersonaOrRedirect(persona, allowed);
  const t = useTranslations('v5.lineManager');

  if (result.allowed) { return createElement('div', { 'data-testid': 'persona-gate-allowed' }, children); }

  return createElement('div', { 'data-testid': 'persona-gate-hint', className: '...' },
    createElement('div', { className: '...' },
      createElement('h3',     { ... }, safeT(t, 'wrongPersonaHint.title', 'Wrong persona')),
      createElement('p',      { ... }, safeT(t, 'wrongPersonaHint.description', 'Switch to the correct persona to view this page.')),
      createElement('button', { ... }, safeT(t, 'wrongPersonaHint.switchCta', 'Switch persona')),
    ),
  );
}
```

```typescript
// src/features/personas/persona-route-guard.ts — AFTER
import { useTranslations } from 'next-intl';
import type { Persona, PersonaKind } from './persona.types';
import { usePersona } from './persona.context';

export function PersonaGate({ allowed, children }: PersonaGateProps) {
  const { persona } = usePersona();
  const result = assertPersonaOrRedirect(persona, allowed);
  const tLM       = useTranslations('v5.lineManager');   // keep for title + switchCta — they're still LM-namespaced today
  const tPersona  = useTranslations('v5.persona');        // for kind.<kind> labels
  // Optional: introduce a new 'v5.personaGate' namespace in a later phase; Phase 49 keeps the LM keys for now.

  if (result.allowed) {
    return createElement('div', { 'data-testid': 'persona-gate-allowed' }, children);
  }

  // Build "Kunde inte ladda — denna sida är för {allowedLabel}-personan"
  // D-05: read the FIRST allowed persona (allowed is readonly PersonaKind[] — may have >1)
  const firstAllowed = allowed[0];
  const allowedLabel = firstAllowed ? tPersona(`kind.${firstAllowed}`) : '';
  // NOTE: No camelCase → hyphen transform needed — PersonaKind is already hyphenated.

  return createElement('div', { 'data-testid': 'persona-gate-hint', className: '...' },
    createElement('div', { className: '...' },
      createElement('h3', { ... }, safeT(tLM, 'wrongPersonaHint.title', 'Wrong persona')),
      createElement('p',  { ... },
        // Dynamic description — honor the allowed prop
        allowedLabel
          ? `Kunde inte ladda — denna sida är för ${allowedLabel}-personan`
          : safeT(tLM, 'wrongPersonaHint.description', 'Switch to the correct persona to view this page.'),
      ),
      createElement('button', { ... }, safeT(tLM, 'wrongPersonaHint.switchCta', 'Switch persona')),
    ),
  );
}
```

**Diff size:** ~8 added lines, 1 modified line. No new i18n keys. No changes to other call sites.

**Caveat on the CONTEXT D-05 copy string:** "Kunde inte ladda — denna sida är för {allowedLabel}-personan" is Swedish-hardcoded. For i18n correctness, an inline template should go into `sv.json` and `en.json`. Since CONTEXT D-05 says "no i18n file changes needed" (meaning the existing copy stays, just be dynamic), one clean path:
- **Option A (CONTEXT-compliant, simplest):** Swedish-only inline template, English falls through to the existing `safeT` fallback. Matches current app state (Swedish-first per `feedback_work_style`).
- **Option B (stricter i18n, ~5 extra lines):** Add `v5.personaGate.notAllowedFor` key with ICU interpolation `"Kunde inte ladda — denna sida är för {persona}-personan"` and use `tNew('notAllowedFor', { persona: allowedLabel })`. Deviates from CONTEXT D-05's "no i18n file changes needed" but is cleaner.
- **Recommendation for planner:** Option A. CONTEXT locks the no-i18n-change decision and the repo's Swedish-first convention is well established.

### Test churn estimate

- `src/features/personas/__tests__/persona-route-guard.test.*` if it exists — likely needs assertions updated for new description text. Grep after planning.
- No other callers of `PersonaGate` need changes; the `allowed` prop was already being passed correctly at every call site (verified: `pm/page.tsx:26`, `line-manager/page.tsx:37`, `line-manager/timeline/page.tsx:65`, `admin/page.tsx:18`, `admin/people/page.tsx:31`).

## Per-UNBREAK Implementation Notes

### UNBREAK-01 + UNBREAK-02 + UNBREAK-08 (persona-switcher department picker)

**Files:** `src/components/persona/persona-switcher.tsx` (primary), `src/app/(app)/line-manager/page.tsx:68-72` (remove dead branch), `src/app/(app)/line-manager/timeline/page.tsx:125-129` (remove dead branch).

**Implementation sketch** (planner refines into tasks):
```typescript
// persona-switcher.tsx — additions
import { useState, useEffect } from 'react';

const LM_DEPT_STORAGE_KEY = 'persona.line-manager.departmentId';

// Inside PersonaSwitcher component:
const { persona, setPersona, departments } = usePersona();
const isLM = persona.kind === 'line-manager';

// Derive initial department for LM
const activeDepts = departments.filter(d => !d.archivedAt);  // D-02 edge cases
const [selectedDeptId, setSelectedDeptId] = useState<string>(() => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(LM_DEPT_STORAGE_KEY) ?? '';
});

// Auto-select single dept
useEffect(() => {
  if (!isLM) return;
  if (activeDepts.length === 1 && selectedDeptId !== activeDepts[0].id) {
    setSelectedDeptId(activeDepts[0].id);
  }
  if (selectedDeptId && !activeDepts.some(d => d.id === selectedDeptId)) {
    // Stored dept no longer exists — reset
    setSelectedDeptId(activeDepts[0]?.id ?? '');
  }
}, [isLM, activeDepts, selectedDeptId]);

// Propagate into persona
useEffect(() => {
  if (!isLM || !selectedDeptId) return;
  if (persona.kind === 'line-manager' && persona.departmentId !== selectedDeptId) {
    setPersona({ ...persona, departmentId: selectedDeptId });
    window.localStorage.setItem(LM_DEPT_STORAGE_KEY, selectedDeptId);
  }
}, [isLM, selectedDeptId, persona, setPersona]);

// Render (after the existing kind <select>)
{isLM && activeDepts.length > 0 && (
  <select aria-label={t('departmentLabel')} /* i18n key already exists? verify */
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          className="bg-surface-container-low text-on-surface max-w-[12rem] rounded-sm px-2 py-1 text-xs">
    {activeDepts.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
  </select>
)}
{isLM && activeDepts.length === 0 && (
  <span className="text-xs text-error" title={/* "Admin måste koppla ..." tooltip */}>
    — {t('noDepartmentHint')}
  </span>
)}
```

**i18n keys needed** (check if these already exist, add to both locales if not):
- `v5.persona.departmentLabel` — "Avdelning" / "Department"
- `v5.persona.noDepartmentHint` — "Admin måste koppla ditt användarkonto till en avdelning först" / English equivalent

The v5 no-literals eslint guard will flag any inline string — these MUST go to `sv.json`/`en.json` per the guard.

**buildPersona update:** Line 58 already has `departmentId: ''` — after the picker lands, pass the real ID via `setPersona` when the user selects. The existing `handleKindChange` flow needs to check `selectedDeptId` when switching TO line-manager; if empty (and no departments loaded), persona stays in pending state.

**Edge case testing:**
- Tenant with 0 active departments — picker disabled, tooltip shown, LM persona option disabled in the kind dropdown (consider a `disabled` attribute on the `<option>` when `persona.kind === 'line-manager'` is selected and `activeDepts.length === 0`).
- Tenant with 1 active department — auto-selected, no dropdown rendered.
- Tenant with >1 — user picks, choice persists, picker rehydrates on next mount from localStorage.

### UNBREAK-03 (PM empty-state)

**File:** `src/app/(app)/pm/page.tsx:60`.

**Current code (lines 40-66):**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['pm-home', personaId],
  queryFn: () => fetchPmHome(personaId as string),
  enabled: !!personaId,
});

if (!isLoaded || isLoading) return <loading />;
if (error) return <error />;
if (!data || data.projects.length === 0) return <empty />;
```

**Observation:** The fall-through branch IS present at lines 60-66. The branch renders `{tScreens('empty')}` which reads from the `v5.screens.pmHome.empty` namespace. CONTEXT D-04 says the page "currently stays on the loading spinner when `data.projects.length === 0`." That framing is misleading — the branch exists. The real question is whether it FIRES.

**Possible mis-fire** (surprise finding 3): `personaId` is `null` when `persona.kind !== 'pm'` (line 38). `useQuery`'s `enabled: !!personaId` flag is `false`, so `isLoading` stays `true` forever per React Query v5 semantics when the query is disabled. Result: a PM Home viewer who hasn't selected a specific PM person via the switcher (common for admin impersonation) sees infinite "loading" and never hits the empty branch.

**Fix hypothesis:** Change the gate so that `personaId === null` short-circuits to either the empty state OR a "select a PM in the switcher" prompt — NOT a perpetual spinner.

```typescript
// Proposed fix
if (!isLoaded) return <loading />;
if (!personaId) return <empty-or-prompt />;
if (isLoading) return <loading />;
if (error) return <error />;
if (!data || data.projects.length === 0) return <empty />;
```

**Planner decision needed:** Is the "no PM selected" state the same as "empty projects" UX-wise? If yes, one branch suffices. If not (e.g., "pick a PM in the switcher" is a distinct prompt), add a separate i18n key.

### UNBREAK-04 + UNBREAK-05 (admin 500s)

See §Admin 500 Research Findings. Tasks:

1. Confirm migration script name (inspect `package.json.scripts` for `db:migrate` / `db:push` / `migrate`).
2. Run migrations against the dev Neon branch.
3. Smoke test `/admin`, `/admin/people`, `/admin/departments`, `/admin/disciplines`, `/admin/programs` — all five should load without 500 (collateral fix).
4. Tail dev log for 60 seconds post-fix; assert zero new `Unhandled API error` entries.
5. Record Neon branch SHA / migration count in the Phase 49 plan's Evidence section (per CONTEXT `<specifics>` line 167).
6. Document the same remediation for production Neon branch as a deploy-time checklist item (not executed in Phase 49).

### UNBREAK-06 + UNBREAK-09 (PersonaGate)

See §PersonaGate Rewire Findings. Single file change. Estimated ~10-line diff. Tests in `src/features/personas/__tests__/` (search + update if any assert on old text).

### UNBREAK-07 (Playwright spec sweep)

All 12 specs currently use `await page.goto('/')` at their setup (per pre-flight §VERIFY-06 rubric). Phase 49 does NOT change what `/` does (that's Phase 50 NAV-01). **So what is the Phase 49 update?**

Re-reading CONTEXT D-06: "Phase 49 updates them to survive the **current unbroken path** ... no /team, /projects, /wishes removals yet." This means: after UNBREAK-01/02/03/04/05/06 land, the 12 specs must still pass. The risk is that:
- LM specs (approve, direct-edit, heatmap, import, reject) may now require the picker to auto-select a department before the heatmap renders. If the e2e fixture's tenant has >1 department, the test may land with an empty `departmentId` and the heatmap won't fetch. **Per-spec fix:** after `personaAs(page, 'line-manager')`, wait for the picker's auto-selection OR explicitly click the picker dropdown + select a test fixture department.
- PM specs (historic-edit, monday-checkin, rejected-resubmit, submit-wish) — after UNBREAK-03 fix, the page may render a "no PM selected" empty state instead of hanging on spinner. Any spec that asserts on the PM project list must first confirm a PM person is selected in the switcher.

**Planner action:** For each spec, inspect its setup block; add a step right after `personaAs(...)` that waits for or triggers the new switcher state. Single commit per spec per CONTEXT D-06.

**No new specs.** Explicitly forbidden by CONTEXT D-06 and scope guard.

## Surprise Findings (worth calling out)

1. **Admin 500 is deeper than VERIFY-04 suggested.** VERIFY-04 posited "environmental migration drift on the Neon branch" as a static hypothesis. Research confirms it *and* extends the blast radius: 5 admin pages break (`/admin`, `/admin/people`, `/admin/departments`, `/admin/disciplines`, `/admin/programs`), not 2. Phase 49 VERIFY should explicitly smoke-test all 5 post-fix.

2. **CONTEXT D-01's "lineManager → line-manager" transform is a no-op.** `PersonaKind` is already `'line-manager'` (hyphenated). The v6.0 spec's camelCase `kinds.lineManager` namespace never existed in the code. Simplifies the PersonaGate diff.

3. **CONTEXT D-04's "stays on loading spinner" framing is inaccurate.** The PM empty branch exists (pm/page.tsx:60-66); it's the `!personaId` preconditon that traps the page in `isLoading`. UNBREAK-03's real fix is a guard order change, not "add a missing branch."

4. **`persona.context.tsx` already fetches departments.** VERIFY-03 reported no picker component but didn't mention the context-level fetch. Phase 41 pre-wired the data layer for the picker — only the UI was absent. This makes UNBREAK-01/02/08 even cheaper (~30 lines in one file) than CONTEXT D-02 implies.

5. **`change_log` table is missing from the Neon branch** despite being created in migration `0003_busy_black_bird.sql` (which *appears* to be applied). This is an inconsistency in the Neon branch state itself, possibly from a manual drop or a branched-off snapshot before 0003. The fix — run all migrations idempotently — will recreate it via `CREATE TABLE IF NOT EXISTS` semantics if Drizzle generates it that way, OR by ignoring already-applied migrations and only applying 0005-0008. Planner must verify `CREATE TABLE` statements in 0003 use `IF NOT EXISTS` before running. If they don't, `drizzle-kit migrate` may error on "relation exists" for tables that DO exist while `change_log` stays missing — in which case an explicit `psql` apply of just the change_log portion of 0003 is needed. **Flag for planner verification.**

## Common Pitfalls

### Pitfall 1: Running `drizzle-kit push` instead of `drizzle-kit migrate`

**What goes wrong:** `push` syncs the live schema to the code's current `schema.ts`, bypassing the migration files and the `__drizzle_migrations` tracker. The Neon branch's tracker stays at 5 rows, so the next dev who runs `migrate` may re-apply migrations that were already pushed, causing "column already exists" errors.

**Prevention:** Use `drizzle-kit migrate` (file-driven). If the repo's script is called `db:push`, inspect what it runs (`package.json`) and override to `migrate` for this specific fix.

**Warning signs:** Post-fix, `drizzle.__drizzle_migrations` row count is not 9.

### Pitfall 2: Switcher dropdown races with the persona context fetch

**What goes wrong:** `PersonaProvider` fetches `/api/departments` in a `useEffect` on mount. If the LM persona was stored in localStorage with `departmentId: ''`, the `line-manager/page.tsx` renders with `departmentId === ''` (empty string), the `useQuery` is disabled, and the empty-state branch (now removed) disappears. Result: blank page until the `/api/departments` fetch resolves and the picker auto-selects.

**Prevention:** Phase 49 keeps the existing "departmentId set to '' means no selection" semantics. The new picker's auto-select effect MUST fire before the capacity fetch does. Alternative: in `LineManagerHomeInner`, hold on a skeleton until `persona.departmentId !== ''` (matches current behavior).

**Warning signs:** LM page renders a visible blank on first load after a cold login; visible only for ~100-300ms.

### Pitfall 3: localStorage key collision with existing persona storage

**What goes wrong:** `persona.context.tsx` already persists the entire persona (including `departmentId: ''`) under `nc:persona`. The new CONTEXT D-02-mandated key `persona.line-manager.departmentId` creates a second source of truth; they can drift.

**Prevention:** Decide a precedence rule in the Phase 49 plan. Recommended: `persona.line-manager.departmentId` is the "preferred last-used department" for LM persona; when user SWITCHES to LM, seed `persona.departmentId` from that key. When departmentId changes DURING LM session, update both keys.

**Warning signs:** Switch to PM persona (LM dept clears in context), switch back to LM — if it doesn't restore the last dept, the keys are drifting.

### Pitfall 4: eslint v5 no-literals guard fails new switcher strings

**What goes wrong:** `persona-switcher.tsx` header declares it's inside the guard scope. Any new inline Swedish string (e.g., `"Avdelning"` hardcoded in the dropdown label) will fail CI.

**Prevention:** Add i18n keys `v5.persona.departmentLabel` + `v5.persona.noDepartmentHint` to both locale files FIRST, in the same commit.

**Warning signs:** `pnpm lint` fails with `nordic/no-hardcoded-ui-string` (or similar) rule name.

### Pitfall 5: Removing `safeT` fallback breaks jsdom tests

**What goes wrong:** The LM pages use `safeT(t, 'home.selectDepartment', '<fallback>')`. The fallback exists because `useTranslations` throws on missing keys in jsdom / ESM test contexts. If UNBREAK-01/02 removes the fallback-using branch, but the `safeT` helper is kept, it's dead code but harmless. If `safeT` is also removed, any OTHER callsite that uses it in the same file breaks.

**Prevention:** Audit `safeT` callsites in `line-manager/page.tsx` and `line-manager/timeline/page.tsx` before removing the helper. Only remove the helper if no other callers remain.

**Warning signs:** jsdom tests for LM pages start throwing `MISSING_MESSAGE: v5.lineManager.home.title`.

## Code Examples

### Using existing departments from PersonaContext
```typescript
// Source: src/features/personas/persona.context.tsx:128 [VERIFIED]
<PersonaContext.Provider value={{ persona, setPersona, departments }}>
```

### Existing useQuery pattern in persona-switcher (to mirror if not using context)
```typescript
// Source: src/components/persona/persona-switcher.tsx:78-82 [VERIFIED]
const { data: people = [] } = useQuery({
  queryKey: ['personas-people-picker'],
  queryFn: fetchPeople,
  staleTime: 60_000,
});
```

### Existing localStorage persistence pattern
```typescript
// Source: src/features/personas/persona.context.tsx:108-125 [VERIFIED]
const setPersona = useCallback((next: Persona) => {
  setPersonaState(next);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / privacy mode errors */
    }
  }
  for (const key of PERSONA_SCOPED_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}, [queryClient]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PersonaGate hardcoded LM copy | Dynamic `allowed`-based copy | Phase 49 (this phase) | One-file fix, no i18n changes |
| LM pages show `safeT` raw-key fallback | LM pages get guaranteed `departmentId` via switcher | Phase 49 | Removes two dead-code branches |
| Admin APIs 500 on archived_at | Drizzle migrations 0005-0008 applied to dev Neon | Phase 49 | Restores 5 admin pages |

**Deprecated/outdated (in CONTEXT / pre-flight):**
- VERIFY-04's "can't repro without signed-in session" — superseded: the dev log already has signed-in errors captured.
- CONTEXT D-01's `lineManager → line-manager` transform — superseded: discriminator is already hyphenated, transform is a no-op.
- CONTEXT D-04's "stays on loading spinner" — superseded: the bug is in guard ORDER, not missing branch.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (unit/integration) + Playwright (E2E) — verified by `e2e/playwright.config.ts` and `package.json.scripts` convention |
| Config file | `e2e/playwright.config.ts` (existing), root `vitest.config.ts` (existing) |
| Quick run command | `pnpm test <pattern>` (Vitest) / `pnpm playwright test <spec>` |
| Full suite command | `pnpm test && pnpm playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UNBREAK-01 | `/line-manager` renders picker, no raw `v5.lineManager.home.selectDepartment` | E2E | `pnpm playwright test e2e/line-manager/heatmap.spec.ts` | ✅ (existing spec — update per CONTEXT D-06) |
| UNBREAK-02 | `/line-manager/timeline` renders picker | E2E | `pnpm playwright test e2e/line-manager/direct-edit.spec.ts` | ✅ (existing) |
| UNBREAK-03 | PM Home falls through to empty state when no projects | unit + E2E | `pnpm test src/app/(app)/pm/__tests__/page.test.tsx` + `pnpm playwright test e2e/pm/submit-wish.spec.ts` | ❌ (unit may not exist — planner Wave 0 gap) + ✅ |
| UNBREAK-04 | `/admin` loads without error banner | smoke (E2E or curl post-auth) | Manual smoke via dev log; no existing automated spec | ❌ Wave 0 — no admin spec exists per VERIFY-06 |
| UNBREAK-05 | `/admin/people` loads register rows | same as UNBREAK-04 | same | ❌ Wave 0 — no admin spec |
| UNBREAK-06 | PersonaGate reads allowed prop | unit | `pnpm test src/features/personas/__tests__/persona-route-guard.test.tsx` | ⚠ verify file exists via grep; likely exists |
| UNBREAK-07 | 12 specs still pass against unbroken path | E2E | `pnpm playwright test` | ✅ all 12 specs exist |
| UNBREAK-08 | department-picker shipped inside persona-switcher | unit | `pnpm test src/components/persona/__tests__/persona-switcher.test.tsx` | ⚠ verify unit test exists for switcher |
| UNBREAK-09 | PersonaGate uses `v5.persona.kind.*` namespace | unit | `pnpm test src/features/personas/__tests__/persona-route-guard.test.tsx` | same as UNBREAK-06 |

### Sampling Rate
- **Per task commit:** `pnpm test <changed-file-pattern>` (fast — under 10s for a single test file)
- **Per wave merge:** `pnpm test && pnpm lint` (full Vitest + ESLint — under 2 min)
- **Phase gate:** `pnpm test && pnpm playwright test` (full suite — up to 5 min)

### Wave 0 Gaps
- [ ] Verify `src/features/personas/__tests__/persona-route-guard.test.tsx` exists; if missing, add unit test covering the `allowed` prop behavior for UNBREAK-06 / UNBREAK-09.
- [ ] Verify `src/components/persona/__tests__/persona-switcher.test.tsx` exists; if missing, add unit test covering the department dropdown edge cases (0/1/>1 depts) for UNBREAK-08.
- [ ] No existing admin E2E spec (per pre-flight §VERIFY-06 — `e2e/admin/` does not exist). CONTEXT D-06 forbids adding new specs in Phase 49. UNBREAK-04/05 rely on manual smoke + dev-log tail as per §Admin 500 Research Findings "Validation After Fix". Planner: flag explicitly that UNBREAK-04/05 have no automated regression coverage until Phase 50 or later adds an admin spec block.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Clerk middleware (`src/proxy.ts`) — unchanged in Phase 49 |
| V3 Session Management | yes | Clerk session cookie — unchanged |
| V4 Access Control | yes | `requireRole('admin')` / `requireRole('planner')` at route handler level — unchanged; persona is NOT a security boundary per ADR-004 |
| V5 Input Validation | yes (N/A for Phase 49) | Zod schemas on mutating endpoints — unchanged in Phase 49 (no new mutations) |
| V6 Cryptography | no | N/A |

### Known Threat Patterns for Phase 49

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| localStorage tampering (user edits `persona.line-manager.departmentId` to another tenant's dept UUID) | Tampering | The department list is server-side tenant-scoped at `/api/departments`. A tampered UUID will either (a) not match any department in the tenant's org and fall through to auto-select, or (b) will be a valid UUID from a DIFFERENT tenant — but the downstream `/api/v5/capacity?departmentId=...` endpoint (the consumer) MUST tenant-scope the query. Per VERIFY-09 / Phase 41 conventions, it does. Phase 49 does not weaken this. |
| Missing migration in production Neon branch | Information Disclosure | Same drift pattern as dev; remediation is the same (`drizzle-kit migrate`). Production re-run is a deploy task, not Phase 49 scope. Document explicitly in Phase 49 plan evidence section. |
| PersonaGate reveals persona names to unauthorized users | Information Disclosure | Persona names (Projektledare, Linjechef, etc.) are public labels visible in the persona switcher dropdown to every authenticated user. Surfacing "this page is for {label}" reveals nothing not already public. No mitigation needed. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `pnpm db:migrate` (or equivalent) exists in `package.json.scripts` | Admin 500 fix approach | Low — planner verifies by reading package.json; worst case is manual psql apply of 0005-0008.sql |
| A2 | Running migrations against the Neon branch is idempotent | Pitfall 5 | Medium — if migration 0003's `CREATE TABLE change_log` does NOT use `IF NOT EXISTS`, the run will error on tables that exist while leaving change_log missing. Flagged for planner verification. |
| A3 | `src/features/personas/__tests__/persona-route-guard.test.tsx` exists | Wave 0 Gaps | Low — planner greps in first task; if missing, Wave 0 adds it. Does NOT block Phase 49. |
| A4 | `src/components/persona/__tests__/persona-switcher.test.tsx` exists | Wave 0 Gaps | Low — same as A3. |
| A5 | Production Neon branch has the same migration drift | Admin fix — production implication | Medium — if prod is NOT drifted, the production deploy checklist note is unnecessary but harmless. If prod IS drifted and the deploy note is missed, users see the same 500s post-Phase-49 release. Planner flags explicitly. |

## Open Questions (RESOLVED)

1. **`pnpm db:migrate` vs `pnpm db:push` — exact script name?**
   - What we know: `drizzle/migrations/` dir + `meta/_journal.json` strongly imply a migrate-based workflow.
   - What's unclear: The exact script name. Research did not read `package.json.scripts` in full.
   - Recommendation: Planner's first task under the UNBREAK-04/05 cluster reads `package.json`, confirms script name, tests on dev branch.
   - **RESOLVED:** `pnpm db:migrate` confirmed in `package.json:23` — addressed in `49-03-PLAN.md`.

2. **Should production Neon branch re-migration be a Phase 49 subtask or a post-phase deploy note?**
   - What we know: Fix is the same as dev; risk is different (live users).
   - What's unclear: Which Neon branch the prod deployment binds to, and whether the team has a deploy runbook for prod migrations.
   - Recommendation: Record the requirement in Phase 49 evidence but keep execution outside the Phase 49 scope boundary. CONTEXT `<domain>` already separates dev-branch fix from prod rollout (the `uiV6.leanTrim`-style gating for the rest of v6.0 isolates blast radius; Phase 49 has no flag gate yet because it's Wave 0 unbreak, so prod migration is a direct dependency of the Phase 49 release, not a separate wave).
   - **RESOLVED:** Kept as post-phase deploy checklist in `49-03-PLAN.md` Task 5 (`PROD-NEON-MIGRATION-CHECKLIST.md`), not a Phase 49 subtask.

3. **UNBREAK-03 — is "no PM selected" the same UX as "no projects"?**
   - What we know: pm/page.tsx:60-66 renders `{tScreens('empty')}` for both cases if the guard order is fixed.
   - What's unclear: Product intent — does the user need a distinct prompt to pick a PM, or is "empty" acceptable?
   - Recommendation: Planner asks user OR defaults to "same empty state" (simplest; consistent with LM's single "pick dept" prompt).
   - **RESOLVED:** Collapsed to the same empty-state branch per research recommendation — addressed in `49-02-PLAN.md`.

## Risk / Pitfall Matrix (planner-specific)

| Risk | Probability | Blast radius | Planner mitigation |
|------|:---:|:---:|---|
| Migration run corrupts dev Neon branch | Low | High | Snapshot Neon branch via Neon's "create branch" feature before running migrations |
| Persona-switcher regression — PM/staff dropdown breaks | Medium | Medium | Before merging, smoke-test switching to PM (existing flow) + staff (existing flow) on the branch |
| LM heatmap fetch fires before picker auto-selects | Medium | Low | Use `enabled: !!departmentId` guard (already in place at `line-manager/page.tsx:57`) — no regression. Visual: brief skeleton flash during first mount. |
| i18n key drift — new `departmentLabel` / `noDepartmentHint` added to sv.json but not en.json | Medium | Low | Use a single Edit that touches both locales in the same commit. |
| PersonaGate change breaks other gate consumers | Low | Medium | All 5 callsites verified to pass `allowed` correctly — no prop-shape change. |
| Production Neon branch also drifted — users see 500 post-deploy | Medium | High | Explicit deploy checklist step: run migrations on prod branch BEFORE flipping Phase 49 commit to live. |
| e2e specs still hit root `/` and Phase 50 hasn't landed — they stay on root for now | N/A | N/A | CONTEXT D-06 explicitly scopes Phase 49 spec updates to "survive current unbroken path" — root path unchanged in Phase 49, so no goto() changes needed in Phase 49. |

## Sources

### Primary (HIGH confidence)
- `src/components/persona/persona-switcher.tsx` (lines 1-140) — scaffold + fetch pattern — `[VERIFIED: Read tool]`
- `src/features/personas/persona-route-guard.ts` (lines 1-102) — PersonaGate implementation — `[VERIFIED]`
- `src/features/personas/persona.context.tsx` (lines 1-140) — departments already fetched — `[VERIFIED]`
- `src/app/api/departments/route.ts` — `/api/departments` GET handler — `[VERIFIED]`
- `src/features/departments/department.service.ts` — `listDepartments` query — `[VERIFIED]`
- `src/hooks/use-reference-data.ts:115-125` — `useDepartments()` hook — `[VERIFIED]`
- `src/db/schema.ts:131-147, 193-222` — departments + people tables — `[VERIFIED]`
- `drizzle/migrations/0003_busy_black_bird.sql`, `0007_register_archive.sql` — migration SQL — `[VERIFIED]`
- `drizzle/migrations/meta/_journal.json` — 9 entries — `[VERIFIED]`
- `.next/dev/logs/next-development.log` — 237 lines, 62+ ERROR entries, authenticated session — `[VERIFIED live capture]`
- Direct Neon Postgres probe — schema + `drizzle.__drizzle_migrations` state — `[VERIFIED via @neondatabase/serverless]`
- `.planning/pre-flight-report.md` — VERIFY-03, VERIFY-04, VERIFY-06, VERIFY-08 sections — `[CITED]`
- `.planning/REQUIREMENTS.md` — UNBREAK-01 through UNBREAK-09 — `[CITED]`
- `.planning/phases/49-unbreak-broken-persona-surfaces/49-CONTEXT.md` — locked decisions D-01 through D-06 — `[CITED]`

### Secondary (MEDIUM confidence)
- `src/messages/sv.json` line 437 — hardcoded "linjechefs-personan" — `[VERIFIED]`
- `src/messages/sv.json:492-500` — `v5.persona.kind.*` namespace — `[VERIFIED]`

### Tertiary (LOW confidence)
- Script name `pnpm db:migrate` for applying migrations — `[ASSUMED — A1]` — planner verifies in first task.
- Production Neon branch migration state — `[ASSUMED — A5]` — not verified in research; flagged for planner.

## Metadata

**Confidence breakdown:**
- Admin 500 root cause: **HIGH** — live Postgres error captured with code 42703; migration journal vs applied count proven via direct `drizzle.__drizzle_migrations` query.
- Department fetch architecture: **HIGH** — endpoint, service, hook, and context-level fetch all verified via source reads.
- PersonaGate rewire: **HIGH** — exact file, line, namespace, and minimal diff all verified; no-op transform confirmed by reading `PersonaKind` type definition.
- Playwright spec update scope: **HIGH** — all 12 specs enumerated in pre-flight, per-spec target confirmed.
- Production Neon branch state: **LOW** — assumed similar drift; explicitly flagged for planner.

**Research date:** 2026-04-15
**Valid until:** 30 days (stable — no fast-moving external deps in scope)
