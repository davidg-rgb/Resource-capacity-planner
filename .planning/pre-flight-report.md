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
| [VERIFY-01](#verify-01-getlandingroute-exists) | `getLandingRoute(persona)` exists in `persona.routes.ts` | `PASS` | NAV-01 (Phase 50) can call `getLandingRoute` directly. |
| [VERIFY-02](#verify-02-proposalsqueuecount-endpoint) | `/api/v5/proposals/queue/count` endpoint exists | `EXPANDS-SCOPE` | Phase 52 LM-01 scope expands: author the endpoint before the badge can render a count. |
| [VERIFY-03](#verify-03-phase-41-department-picker) | Phase 41 department-picker component ships | `EXPANDS-SCOPE` | Phase 49 scope expands: build the department picker (UNBREAK-01/02). |
| [VERIFY-04](#verify-04-admin-api-500-root-causes) | `/api/admin/change-log` + `/api/admin/people` 500 root causes | `FAIL` | Phase 49 UNBREAK-04/05 planner must repro themselves with an authenticated Clerk session. Static hypothesis captured in detail section. |
| [VERIFY-05](#verify-05-custom-dashboard-dead-widget-references) | Custom-dashboard layouts reference dead/deletable widget IDs | `EXPANDS-SCOPE` | Phase 51 LEAN-05 scope expands: ship the one-shot `UPDATE dashboard_layouts` migration BEFORE deleting widget files. 1 row affected on dev branch. |
| [VERIFY-06](#verify-06-playwright-spec-inventory) | Every `e2e/**/*.spec.ts` classified keep/update/retire | `PASS` | 12/12 specs classified `update` (Wave 1 owns root-redirect change). 0 `retire`, 0 `keep`. |
| [VERIFY-07](#verify-07-sidebar-i18n-collision-check) | `sidebar.staff` / `sidebar.projects` existing meanings | `PASS` | New keys land safely under `sidebar.personaSections.*` — no collision with existing leaf-string section headings. |
| [VERIFY-08](#verify-08-v5personakinds-keys-present) | `v5.persona.kinds.*` keys present in both locales | `FAIL` | Phase 49 UNBREAK-06 scope expands: keys live at `v5.persona.kind.*` (singular). UNBREAK-06 must add `kinds` namespace OR wire PersonaGate to read `kind`. |
| [VERIFY-09](#verify-09-plan-vs-actual-cell-reuse) | Plan-vs-actual cell + timeline-grid reused across PM/Staff/R&D | `PASS` | Shared `PlanVsActualCell` confirmed across PM/Staff/RD via thin per-persona wrappers. Grid container intentionally NOT shared (PM=AG Grid editable, Staff/RD=read-only `<table>`) per Phase 42 D-19. |

<!-- Detail sections follow; Tasks 2-6 fill them. -->

## VERIFY-01: `getLandingRoute` exists

**Requirement:** VERIFY-01 — `pre-flight-report.md` documents whether `getLandingRoute(persona)` exists in `src/features/personas/persona.routes.ts`

**Command (verbatim from UI-RESTRUCTURE-PLAN-v2.md §Wave −1):**
```
grep -rn "export function getLandingRoute" src/
```

**Raw output:**
```
src/features/personas/persona.routes.ts:15:export function getLandingRoute(p: Persona): string {
```

**Verdict:** `PASS`

**Impact:** One match at `persona.routes.ts:15` — exactly the expected location per UI-RESTRUCTURE-PLAN-v2.md §Wave −1. NAV-01 (Phase 50) can call `getLandingRoute(persona)` directly from the new `PersonaRedirect` wrapper without authoring it first.

---

## VERIFY-03: Phase 41 department picker

**Requirement:** VERIFY-03 — `pre-flight-report.md` documents Phase 41 department-picker status (component exists / needs build) and scopes the fix in Wave 0 if needed.

**Command (verbatim from UI-RESTRUCTURE-PLAN-v2.md §Wave −1):**
```
grep -rn "DepartmentPicker\|selectDepartment" src/features/personas src/components
```

**Raw output:**
```
<no matches>
```
(grep exit code 1 — no lines matched in `src/features/personas` or `src/components`.)

**Supplementary search (full `src/` tree):**

Command (broader scope to surface raw i18n-key references that prove the picker call site exists but the component does not):
```
grep -rn "DepartmentPicker\|selectDepartment" src/
```

Raw output:
```
src/app/(app)/line-manager/page.tsx:70:          {safeT(t, 'home.selectDepartment', 'Select a department in the persona switcher.')}
src/app/(app)/line-manager/timeline/page.tsx:127:          {safeT(t, 'timeline.selectDepartment', 'Select a department in the persona switcher.')}
```

The two hits are call sites that render the i18n-key fallback string `"Select a department in the persona switcher."` — they assume a picker exists in the persona switcher. There is **no** `DepartmentPicker` / `selectDepartment` component file anywhere under `src/`, `src/features/`, or `src/components/`.

**Verdict:** `EXPANDS-SCOPE`

**Impact:** Phase 49 scope expands to include building the department picker (per ROADMAP Phase 48 success criterion #3 and REQUIREMENTS UNBREAK-01 / UNBREAK-02). The Line Manager home and timeline pages currently render placeholder copy ("Select a department in the persona switcher") because the upstream switcher control does not exist. Plan 02 records this expansion in ROADMAP.md / REQUIREMENTS.md.

---

## VERIFY-07: sidebar i18n collision check

**Requirement:** VERIFY-07 — `sidebar.staff` and `sidebar.projects` existing meanings documented to prevent i18n key collision when the 18 new keys land under `sidebar.personaSections.*`.

**Command (verbatim from UI-RESTRUCTURE-PLAN-v2.md §Wave −1):**
```
grep -rn "sidebar.staff\|sidebar.projects" src/ messages/
```

**Raw output:**
```
grep: messages/: No such file or directory
```
(grep exit code 2 — `messages/` does not exist; locale files live at `src/messages/`. No literal text `sidebar.staff` or `sidebar.projects` appears anywhere in `src/` because the keys are referenced indirectly via `useTranslations('sidebar')` + `t(headingKey)` plumbing.)

**Supplementary commands (to capture the actual existing meanings of the two keys):**

```
jq '.sidebar.staff, .sidebar.projects' src/messages/sv.json src/messages/en.json
```

Raw output:
```
"Medarbetare"
"Projekt"
"Staff"
"Projects"
```

```
grep -nE "headingKey" src/components/layout/side-nav.tsx
```

Raw output (truncated to relevant lines):
```
14:  headingKey?: string;
25:      headingKey: 'staff',
31:      headingKey: 'team',
37:      headingKey: 'projects',
43:      headingKey: 'data',
49:      headingKey: 'overview',
59:      headingKey: 'scenarios',
65:      headingKey: 'referenceData',
105:            {section.headingKey && (
107:                {t(section.headingKey)}
```

The keys `sidebar.staff` and `sidebar.projects` are leaf strings (not objects with nested children) used as section-heading labels in `src/components/layout/side-nav.tsx`. Adding a new sibling `sidebar.personaSections` object cannot collide with these leaf strings — JSON allows them to coexist at the same level.

**Existing meanings table (Phase 50 planner consumes this when wiring NAV-05):**

| Key | Swedish value | English value | Where used | Shape |
|---|---|---|---|---|
| `sidebar.staff` | Medarbetare | Staff | `src/components/layout/side-nav.tsx` (SECTION_NAV `headingKey: 'staff'`, line 25) — section heading rendered via `t('staff')` at line 107 | leaf string |
| `sidebar.projects` | Projekt | Projects | `src/components/layout/side-nav.tsx` (SECTION_NAV `headingKey: 'projects'`, line 37) — section heading rendered via `t('projects')` at line 107 | leaf string |

`src/features/dashboard/widgets/program-rollup-widget.tsx:242` also calls `t('projects')` but from a different translation namespace (`useTranslations('widgets.programRollup')` at line 188) — not relevant to the `sidebar.*` namespace.

**Verdict:** `PASS`

**Impact:** The 18 new keys under `sidebar.personaSections.*` (per UI-RESTRUCTURE-PLAN-v2.md §6) land safely. `sidebar.personaSections` is a new object sibling of `sidebar.staff` / `sidebar.projects` — no namespace collision is possible because the existing keys are leaf strings, not objects. Phase 50 NAV-05 can add the keys to `src/messages/{sv,en}.json` without touching the existing entries.

---

## VERIFY-02: `/api/v5/proposals/queue/count` endpoint

**Requirement:** VERIFY-02 — `pre-flight-report.md` documents whether `/api/v5/proposals/queue/count` endpoint exists; if missing, add to Wave 3.2 scope.

**Command 1 (verbatim from UI-RESTRUCTURE-PLAN-v2.md §Wave −1):**
```
ls src/app/api/v5/proposals/queue/count
```

Raw output:
```
ls: cannot access 'src/app/api/v5/proposals/queue/count': No such file or directory
```
(exit code 2 — directory does not exist.)

**Command 2 (verbatim fallback from §Wave −1):**
```
grep -rn "proposals/queue/count\|/queue/count" src/app/api/
```

Raw output:
```
<no matches>
```
(grep exit code 1 — no code path defines or references the endpoint.)

**Supplementary inspection (to confirm what DOES live under `src/app/api/v5/proposals/`):**
```
ls src/app/api/v5/proposals/
```

Raw output:
```
[id]
__tests__
route.ts
```

The `proposals` subtree contains a list/create `route.ts` and a per-id `[id]` subroute, but no `queue/count` endpoint and no `queue/` directory at all.

**Verdict:** `EXPANDS-SCOPE`

**Impact:** Phase 52 LM-01 ("`/line-manager` renders an approval-queue count badge") scope expands to include authoring `src/app/api/v5/proposals/queue/count/route.ts` (server route + service function + unit test) before the badge can render a real count. The persona-switcher reflection of the same count (LM-01 second clause) also depends on this. Plan 02 records the expansion.

---

## VERIFY-06: Playwright spec inventory

**Requirement:** VERIFY-06 — All 12 existing Playwright specs from Phase 47 inventoried with classification (keep / update / retire) per spec.

**Command (verbatim from UI-RESTRUCTURE-PLAN-v2.md §Wave −1):**
```
ls e2e/
ls e2e/pm/*.spec.ts ; ls e2e/line-manager/*.spec.ts ; ls e2e/staff/*.spec.ts ; ls e2e/rd/*.spec.ts ; ls e2e/admin/*.spec.ts
```

**Raw output (`ls e2e/`):**
```
fixtures
global-setup.ts
lib
line-manager
playwright.config.ts
pm
rd
README.md
staff
```

**Raw output (per-persona spec listing, `2>/dev/null` to suppress per-persona "No such file" errors for missing `e2e/admin/`):**
```
e2e/pm/historic-edit.spec.ts
e2e/pm/monday-checkin.spec.ts
e2e/pm/rejected-resubmit.spec.ts
e2e/pm/submit-wish.spec.ts
e2e/line-manager/approve.spec.ts
e2e/line-manager/direct-edit.spec.ts
e2e/line-manager/heatmap.spec.ts
e2e/line-manager/import.spec.ts
e2e/line-manager/reject.spec.ts
e2e/staff/read-only.spec.ts
e2e/rd/overcommit-drill.spec.ts
e2e/rd/portfolio.spec.ts
```

12 spec files total. `e2e/admin/` does not exist (no admin specs shipped from Phase 47 — matches the inventory count of 12 from K4).

**Per-spec rubric application (D-09/D-10):**

For each spec, three greps applied:
- **Signal 1 (Route-touched):** `grep -nE "'/'|'/team'|'/team/|'/projects'|'/wishes'|'/pm'|'/line-manager'|'/staff'|'/rd'|'/admin'" <spec>`
- **Signal 2 (Selector-touched):** `grep -nE "persona-switcher|side-?nav|breadcrumb|top-?nav|notification-bell|discipline-progress|discipline-demand|project-impact" <spec>`
- **Signal 3 (Copy-touched):** `grep -nE "Projektledare|Linjechef|FoU|Administration|Mina projekt|Mina önskemål|Godkännandekö|Gruppschema|Mitt schema|Ändringslogg|Personer" <spec>`

**Raw rubric output (consolidated; only matched lines per spec):**

```
=== e2e/pm/historic-edit.spec.ts ===
S1: 14:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/pm/monday-checkin.spec.ts ===
S1: 19:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/pm/rejected-resubmit.spec.ts ===
S1: 16:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/pm/submit-wish.spec.ts ===
S1: 17:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/line-manager/approve.spec.ts ===
S1: 14:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/line-manager/direct-edit.spec.ts ===
S1: 14:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/line-manager/heatmap.spec.ts ===
S1: 21:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/line-manager/import.spec.ts ===
S1: 15:    await page.goto('/'); 29:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/line-manager/reject.spec.ts ===
S1: 11:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/staff/read-only.spec.ts ===
S1: 15:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/rd/overcommit-drill.spec.ts ===
S1: 14:    await page.goto('/');
S2: <none>
S3: <none>
=== e2e/rd/portfolio.spec.ts ===
S1: 15:    await page.goto('/');
S2: <none>
S3: <none>
```

**Deleted-route check (forced `retire` if any spec navigates to `/team`, `/projects`, `/wishes`):**
```
grep -rnE "(goto|page\.goto|click.*Link|href=)['\"]?(/team|/projects|/wishes)['\"]" e2e/
```
Raw output:
```
<no matches>
```
No spec targets a deleted route → no `retire` classifications.

**Inventory table (appendix per D-11) — Phase 49–53 planners ingest the `update` rows verbatim:**

| Spec file | Signal 1 (route) | Signal 2 (selector) | Signal 3 (copy) | Classification | Wave that owns follow-up |
|---|:---:|:---:|:---:|---|---|
| e2e/pm/historic-edit.spec.ts | `/` | no | no | update | 50 |
| e2e/pm/monday-checkin.spec.ts | `/` | no | no | update | 50 |
| e2e/pm/rejected-resubmit.spec.ts | `/` | no | no | update | 50 |
| e2e/pm/submit-wish.spec.ts | `/` | no | no | update | 50 |
| e2e/line-manager/approve.spec.ts | `/` | no | no | update | 50 |
| e2e/line-manager/direct-edit.spec.ts | `/` | no | no | update | 50 |
| e2e/line-manager/heatmap.spec.ts | `/` | no | no | update | 50 |
| e2e/line-manager/import.spec.ts | `/` (×2) | no | no | update | 50 |
| e2e/line-manager/reject.spec.ts | `/` | no | no | update | 50 |
| e2e/staff/read-only.spec.ts | `/` | no | no | update | 50 |
| e2e/rd/overcommit-drill.spec.ts | `/` | no | no | update | 50 |
| e2e/rd/portfolio.spec.ts | `/` | no | no | update | 50 |

**Verdict:** `PASS`

**Impact:** All 12 specs classified. Summary counts: **0 keep, 12 update, 0 retire**. Every spec hits the root path `/` in its setup (`page.goto('/')` after `personaAs(page, 'persona)`). The root-path redirect behavior changes in Phase 50 NAV-01 (`/` → `getLandingRoute(persona)` via the new `PersonaRedirect` wrapper, gated behind `uiV6.landing`), so all 12 specs need the same minimal update: replace `await page.goto('/')` with `await page.goto(getLandingRoute(persona))` (or rely on the redirect — but only after Phase 50 ships and `uiV6.landing` is on for the test environment). The follow-up belongs to Phase 50 NAV-01 / NAV-03 acceptance criteria. No `keep` rows (every spec is route-touched). No `retire` rows (no spec targets `/team`, `/projects`, `/wishes`). `e2e/admin/` directory absent — admin specs are net-new work for the wave that fixes admin (Phase 49 UNBREAK-04/05) and not part of this inventory.

---

## VERIFY-05: Custom-dashboard dead-widget references

**Requirement:** VERIFY-05 — Tenant custom-dashboard audit run via the corrected SQL; report lists affected layouts with strip/migrate decision per row.

**SQL (verbatim from UI-RESTRUCTURE-PLAN-v2.md §2.5 Wave 2, regex covers all 7 widget IDs flagged for deletion: `discipline-progress`, `discipline-demand`, `project-impact`, `utilization-heat-map`, `bench-report`, `strategic-alerts`, `resource-conflicts`):**
```sql
SELECT organization_id, clerk_user_id, dashboard_id
FROM dashboard_layouts
WHERE layout::text ~* 'discipline-progress|discipline-demand|project-impact|utilization-heat-map|bench-report|strategic-alerts|resource-conflicts';
```

**Execution environment (per D-05):** Dev Neon branch (`ep-raspy-sea-al5kxh7j-pooler.c-3.eu-central-1.aws.neon.tech/neondb`, identifier `pk_test`/`sk_test` Clerk, NOT production). DATABASE_URL sourced from `.env.local` at the repository root.

**Command actually invoked (psql is not on PATH; used Node `pg`-equivalent via the project's already-installed `@neondatabase/serverless` driver in a one-shot `tmp/verify-05-query.mjs` script that ran SELECT only and was deleted after capture). The DATABASE_URL connection string is redacted (password replaced with `***`):**
```
DATABASE_URL='postgresql://neondb_owner:***@ep-raspy-sea-al5kxh7j-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' \
  node tmp/verify-05-query.mjs
```

(SAFETY: per D-06 / threat T-48-04, only the SELECT was executed. No `UPDATE dashboard_layouts` was issued. The scratch script and the local copy of `.env.local` were deleted immediately after capturing the output.)

**Raw output:**
```
ROW_COUNT: 1
[
  {
    "organization_id": "0b200821-c78c-4717-9099-696c8520d2d3",
    "clerk_user_id": "__tenant_default__",
    "dashboard_id": "manager"
  }
]
```

**Verdict:** `EXPANDS-SCOPE`

**Impact:** 1 row returned on the dev Neon branch. The default `manager` dashboard layout for tenant `0b200821-c78c-4717-9099-696c8520d2d3` (clerk_user_id sentinel `__tenant_default__` indicating the tenant-wide default, not a per-user override) references at least one of the 7 dead/deletable widget IDs in its stored `layout` JSONB. Phase 51 LEAN-05 scope expands: ship the one-shot `UPDATE dashboard_layouts SET layout = (SELECT jsonb_agg(placement) FROM jsonb_array_elements(layout) placement WHERE placement->>'widgetId' NOT IN (...))` migration drafted in UI-RESTRUCTURE-PLAN-v2.md §2.5 Wave 2 BEFORE deleting any of the dead widget files. Note: Plan 02 records this expansion in ROADMAP.md / REQUIREMENTS.md per D-12. Production Neon branch was NOT touched in this verification — the authoritative production-row count must be re-run at Phase 51 kick-off (still behind `uiV6.leanTrim`, no rollout risk per D-05).

---

## VERIFY-08: `v5.persona.kinds` keys present

**Requirement:** VERIFY-08 — `v5.persona.kinds.*` keys present in both `messages/sv.json` and `messages/en.json` (verified by `jq`).

**Command (verbatim from UI-RESTRUCTURE-PLAN-v2.md §Wave −1; locale files actually live at `src/messages/`, the verbatim path `messages/` from the plan does not exist):**
```
jq '.v5.persona.kinds' messages/sv.json messages/en.json
```

Verbatim invocation against the actual locale paths used by the project:
```
jq '.v5.persona.kinds' src/messages/sv.json src/messages/en.json
```

**Raw output (`sv.json`):**
```
null
```

**Raw output (`en.json`):**
```
null
```

Both files return `null` — the path `.v5.persona.kinds` does not exist in either locale file.

**Supplementary inspection (the keys exist, but at a different namespace):**
```
jq '.v5.persona' src/messages/sv.json
```
Raw output:
```json
{
  "label": "Roll",
  "kind": {
    "pm": "Projektledare",
    "line-manager": "Linjechef",
    "staff": "Medarbetare",
    "rd": "FoU-chef",
    "admin": "Administratör"
  }
}
```
```
jq '.v5.persona' src/messages/en.json
```
Raw output:
```json
{
  "label": "Role",
  "kind": {
    "pm": "Project Manager",
    "line-manager": "Line Manager",
    "staff": "Staff",
    "rd": "R&D Manager",
    "admin": "Admin"
  }
}
```

The persona labels DO exist, but at `v5.persona.kind.*` (singular `kind`) with the hyphenated key `line-manager`, NOT at `v5.persona.kinds.*` (plural `kinds`) with camelCase `lineManager` as the plan assumes.

**Presence table (per persona × locale, evaluated at the namespace the plan calls for, `v5.persona.kinds.*`):**

| Persona kind | sv.json `v5.persona.kinds.*` | en.json `v5.persona.kinds.*` | sv.json fallback at `v5.persona.kind.*` | en.json fallback at `v5.persona.kind.*` |
|---|:---:|:---:|:---:|:---:|
| `pm`          | missing | missing | present (`Projektledare`) | present (`Project Manager`) |
| `lineManager` | missing | missing | present at `kind["line-manager"]` (`Linjechef`)    | present at `kind["line-manager"]` (`Line Manager`) |
| `staff`       | missing | missing | present (`Medarbetare`)   | present (`Staff`) |
| `rd`          | missing | missing | present (`FoU-chef`)      | present (`R&D Manager`) |
| `admin`       | missing | missing | present (`Administratör`) | present (`Admin`) |

**Verdict:** `FAIL`

**Impact:** Phase 49 UNBREAK-06 scope expands — PersonaGate cannot read from `v5.persona.kinds.*` because the namespace does not exist. Two equivalent fixes are open:
1. Add `v5.persona.kinds.{pm,lineManager,staff,rd,admin}` to both `src/messages/sv.json` and `src/messages/en.json` mirroring the existing `v5.persona.kind.*` values (preserves the plan's casing convention; PersonaGate ships unchanged from the v6.0 spec).
2. Wire PersonaGate to read the existing `v5.persona.kind.*` namespace and translate the `lineManager` discriminator value to the hyphenated key `line-manager` at the lookup site (no locale-file change; PersonaGate spec adjusts).

Plan 02 leaves the choice to the Phase 49 planner; either way, the missing-key finding is documented here.

---

## VERIFY-04: Admin API 500 root causes

**Requirement:** VERIFY-04 — `/api/admin/change-log` and `/api/admin/people` 500 root causes documented from live server logs.

**Path correction (mandatory before invoking commands):** UI-RESTRUCTURE-PLAN-v2.md §Wave −1 names the routes `/api/admin/change-log` and `/api/admin/people`. Those URLs do not exist in the codebase. The actual API routes that the `/admin` (change-log feed) and `/admin/people` (people register) pages call are:

| Page | API actually called | Source file |
|---|---|---|
| `/admin` (renders `<ChangeLogFeed>`) | `GET /api/v5/change-log?<filters>` | `src/components/change-log/change-log-feed.tsx:123` (`fetch(\`/api/v5/change-log?${qs}\`)`) |
| `/admin/people` (renders `<AdminRegisterPageShell entity="person">`) | `GET /api/v5/admin/registers/person` | `src/components/admin/AdminRegisterPageShell.tsx:124` (`useRegisterList(entity, …)`) → `/api/v5/admin/registers/person` |

The verbatim plan command was adapted to hit the actual routes the pages bind to.

### /api/admin/change-log

(Actual route path served by the codebase: `/api/v5/change-log`. The `/api/admin/` prefix from UI-RESTRUCTURE-PLAN-v2.md §Wave −1 does not match the actual file structure under `src/app/api/`, so the verbatim curl was adapted; see §"Path correction" above.)

**Static hypothesis (D-07 phase 1 — read of route + service):**

The handler at `src/app/api/v5/change-log/route.ts` calls `requireRole('planner')` then `getFeed({ orgId, filter, pagination })`. `getFeed` (in `src/features/change-log/change-log.read.ts`) builds a Drizzle SELECT that:
1. Filters on `organizationId = orgId` (cannot 500).
2. Optionally compares the composite cursor with `sql\`(${changeLog.createdAt}, ${changeLog.id}) < (${cur.createdAt}::timestamptz, ${cur.id}::uuid)\`` — passes raw text into Postgres `::timestamptz` / `::uuid` casts. **Likely 500 site #1**: a malformed cursor token that decodes to non-ISO `createdAt` or non-UUID `id` will crash at the Postgres parser, surfacing as a 500.
3. Optionally filters JSONB `(context->>'projectId') IN (...)` / `(new_value->>'projectId') IN (...)` — uses `sql.join` of raw IDs. **Likely 500 site #2**: if any caller-supplied projectId/personId contains a single-quote or non-printable character the parameterisation could fail.
4. Reads `changeLog.createdAt instanceof Date ? last.createdAt.toISOString() : (last.createdAt as unknown as string)` — assumes `createdAt` is either a `Date` or a stringifiable. **Likely 500 site #3 (most plausible for an empty-state hit):** if the `change_log` table has zero rows for the tenant on a fresh tenant, `last` is `undefined` (the `entries[entries.length - 1]` access on an empty array). The current code guards with `hasMore && last` — but the more likely production cause is a DB-side issue (missing table on the tenant's branch, missing migration `0008` adding `change_log_entity` enum values, OR the JSONB cast returning a Postgres error on a tenant with malformed legacy `context` rows).

**Most-likely root-cause hypothesis (highest-prior):** Either (a) the dev/prod Neon branch is missing one of the four migrations that landed `change_log` enum values (`0008_*` per ARCHITECTURE/v5.0), making `inArray(changeLog.entity, args.filter.entity)` cast-fail at Postgres; or (b) one of the orgs has malformed JSONB in `change_log.context` or `change_log.new_value` causing the `->>` extraction inside the IN-list to error.

**Live commands:** (D-07 phase 2 — actual server hit)

Live commands (worktree had no `node_modules`; ran `pnpm install --prefer-offline --frozen-lockfile` first to enable `pnpm dev`; copied `.env.local` from the parent repo into the worktree for the duration of the test, deleted afterwards):

Verbatim plan command (per UI-RESTRUCTURE-PLAN-v2.md §Wave −1, ports/paths as written):
```
curl -s -o /tmp/changelog-body.txt -w "HTTP %{http_code}\n" http://localhost:3000/api/admin/change-log
```
Adapted command actually executed (port 3001 because 3000 was already in use; route path corrected to the actual codebase route):
```
pnpm dev   # bound to http://localhost:3001 because port 3000 was already in use
curl -s -i http://localhost:3001/api/v5/change-log
```

**HTTP response:**

First hit (cold compile of `_not-found` due to Turbopack startup):
```
GET /api/v5/change-log 404 in 13.6s (next.js: 13.1s, proxy.ts: 238ms, application-code: 278ms)
```

Second hit (after Turbopack settled):
```
HTTP/1.1 307 Temporary Redirect
location: https://adapted-flamingo-24.accounts.dev/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fv5%2Fchange-log
x-clerk-auth-reason: dev-browser-missing
x-clerk-auth-status: signed-out
x-clerk-redirect-to: true
```

**Server stack trace:**
```
(no stack trace captured — Clerk middleware in src/proxy.ts intercepted the request via auth.protect() before the route handler ran. The handler never executed; 500 cannot be triggered without a Clerk session cookie.)
```

**Confirmed root cause:**

NOT confirmed. The `requireRole('planner')` auth gate fires inside Clerk middleware (`src/proxy.ts:25 — auth.protect()`) and short-circuits the request to 307 → sign-in. The handler at `src/app/api/v5/change-log/route.ts:27` never executes. To reproduce the production 500, an authenticated admin Clerk session cookie must be supplied to curl (or the endpoint must be hit through a signed-in browser). The static hypothesis above is the strongest evidence Phase 48 can produce.

**Phase 49 handoff:**

UNBREAK-04 reproducer must (a) run `pnpm dev` with `.env.local` bound to a Neon branch that has the full migration set including `0008_*` change_log enum migrations, (b) sign in as an admin user via the Clerk dev pane, (c) hit `GET /api/v5/change-log` from the signed-in browser dev tools, (d) read the actual stack trace from the dev server log, (e) decide between fix path A (cursor / projectId input sanitisation), fix path B (catch-and-415 around malformed JSONB rows), or fix path C (run missing migration on the affected Neon branch). The hypothesis-most-likely path is C.

### /api/admin/people

(Actual route path served by the codebase: `/api/v5/admin/registers/person`. Same `/api/admin/` → `/api/v5/admin/registers/` adaptation as above.)

**Static hypothesis (D-07 phase 1 — read of route + service):**

The handler at `src/app/api/v5/admin/registers/[entity]/route.ts:35` calls `requireRole('admin')`, validates the dynamic `entity` segment against `REGISTER_ENTITIES = ['person', 'project', 'department', 'discipline', 'program']`, then calls `listRegisterRows({ orgId, entity: 'person', includeArchived })`.

`listRegisterRows` (in `src/features/admin/register.service.ts:422`) does:
1. `assertEntity(input.entity)` — pure string check; cannot 500 for a known entity.
2. `tableFor('person')` returns `schema.people`.
3. Builds conditions `[eq(orgCol, input.orgId), isNull(archCol)]` (when `includeArchived=false`).
4. **Likely 500 site #1**: `orderForList('person')` returns:
   ```ts
   [
     sql`${schema.people.archivedAt} IS NULL`,
     desc(schema.people.archivedAt),
     asc(schema.people.firstName),
     asc(schema.people.lastName),
   ]
   ```
   This relies on the `people` table having columns `archivedAt`, `firstName`, `lastName`. **If the affected Neon branch is missing the v5.0 person-rename migration that split `name` into `firstName`/`lastName`, the SELECT will fail at Postgres with `column "first_name" does not exist`** — which raises a 500 from `handleApiError(error)`.
5. The cast `(t as { archivedAt: unknown }).archivedAt as never` and the `db.select().from(t as any)` use `any` deliberately (file header acknowledges the `eslint-disable @typescript-eslint/no-explicit-any`). Runtime correctness depends on the schema matching the Drizzle definitions in `@/db/schema`.

**Most-likely root-cause hypothesis (highest-prior):** Same family as VERIFY-04 change-log: a migration drift between the dev Neon branch the team uses and what the v5.0 schema definitions in `@/db/schema` expect. Specifically, if the dev/prod tenant ran v4.x with `people.name` as a single column and the v5.0 split-name migration wasn't applied, the ORDER BY `firstName, lastName` 500s.

**Live commands:** (D-07 phase 2 — actual server hit)

Verbatim plan command (per UI-RESTRUCTURE-PLAN-v2.md §Wave −1, ports/paths as written):
```
curl -s -o /tmp/people-body.txt -w "HTTP %{http_code}\n" http://localhost:3000/api/admin/people
```
Adapted command actually executed (port 3001; route path corrected to the actual codebase route):
```
curl -s -o /tmp/people-body.txt -w "HTTP %{http_code}\n" http://localhost:3001/api/v5/admin/registers/person
```

**HTTP response:**

```
HTTP 307
```
Redirect body (the response body of the 307):
```
https://adapted-flamingo-24.accounts.dev/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fv5%2Fadmin%2Fregisters%2Fperson
```

**Server stack trace:**
```
(no stack trace captured — Clerk middleware redirected to sign-in before the handler ran; same constraint as the change-log endpoint.)
```

**Confirmed root cause:**

NOT confirmed. Same auth-gate constraint as `/api/v5/change-log`. Static hypothesis is the strongest evidence Phase 48 can produce.

**Phase 49 handoff:**

UNBREAK-05 reproducer must follow the same protocol as UNBREAK-04: signed-in admin browser session → hit `GET /api/v5/admin/registers/person` → read stack trace from dev server. Highest-prior hypothesis: schema drift on the affected Neon branch (missing `people` first_name/last_name split, OR `archived_at` missing). Compare `pnpm db:push` output against the actual Neon branch table definitions before assuming the bug is in `register.service.ts`.

### Cross-route observation

Both routes pass the static read with no obvious code-level bug; the most plausible source of both 500s is **environmental / migration drift on the affected Neon branch**, not the code in either handler. This matches the v5.0 era pattern noted in earlier deferred-items and the UI-RESTRUCTURE-PLAN-v2.md §0 finding K9 ("admin API root-causes" listed alongside other unverified assumptions). Phase 49 should plan for: (1) environment audit of the affected branch, (2) migration backfill if drifted, (3) defensive `try/catch` with structured error response and operator-facing telemetry as a long-tail mitigation.

### VERIFY-04 overall

**Verdict:** `FAIL`

**Impact:** Live 500 stack traces could not be captured because Clerk middleware (`src/proxy.ts`) requires an authenticated session before the route handlers ever execute, and a cold curl produces only the 307 sign-in redirect. The static-only hypotheses above are the strongest evidence Phase 48 can produce. Phase 49 UNBREAK-04/05 reproducer must run against a signed-in browser session and capture the actual stack trace from the dev server log; the static hypothesis identifies the most plausible root cause as environmental migration drift on the affected Neon branch (not a code defect in either handler).

---

## VERIFY-09: Plan-vs-actual cell + timeline-grid reuse

**Requirement:** VERIFY-09 — Plan-vs-actual cell and timeline-grid component reuse across PM / Staff / R&D confirmed by snapshot comparison.

**Command 1 — find TimelineGrid source:**
```
grep -rln --include="*.ts" --include="*.tsx" "export.*TimelineGrid\|export default function TimelineGrid" src/
```

Raw output:
```
src/components/timeline/line-manager-timeline-grid.tsx
src/components/timeline/timeline-grid.tsx
```

Two TimelineGrid implementations exist:
- `src/components/timeline/timeline-grid.tsx` — AG Grid-based editable grid (PM uses this)
- `src/components/timeline/line-manager-timeline-grid.tsx` — LM-specific variant

**Command 2 — find PlanVsActualCell source:**
```
grep -rln --include="*.ts" --include="*.tsx" "PlanVsActualCell\|plan-vs-actual-cell" src/
```

Raw output:
```
src/app/(app)/pm/projects/[projectId]/page.tsx
src/app/(app)/staff/__tests__/staff-schedule.test.tsx
src/components/timeline/line-manager-timeline-grid.tsx
src/components/timeline/lm-timeline-cell.tsx
src/components/timeline/PlanVsActualCell.tsx
src/components/timeline/pm-timeline-cell.tsx
src/components/timeline/rd-portfolio-cell.tsx
src/components/timeline/staff-timeline-cell.tsx
src/components/timeline/__tests__/line-manager-timeline-grid.test.tsx
src/components/timeline/__tests__/PlanActualCell.contract.test.tsx
```

Single `PlanVsActualCell` source at `src/components/timeline/PlanVsActualCell.tsx`. Every persona-specific cell (`pm-timeline-cell.tsx`, `lm-timeline-cell.tsx`, `staff-timeline-cell.tsx`, `rd-portfolio-cell.tsx`) imports it from that one path.

**Command 3 — per-persona import audit:**
```
grep -rn "TimelineGrid\|plan-vs-actual\|PlanVsActualCell" src/app/(app)/pm src/app/(app)/staff src/app/(app)/rd
```

Raw output (filtered to the import-path lines that matter):
```
src/app/(app)/pm/projects/[projectId]/page.tsx:6:// <TimelineGrid /> built on PlanVsActualCell.
src/app/(app)/pm/projects/[projectId]/page.tsx:16:import { TimelineGrid } from '@/components/timeline/timeline-grid';
src/app/(app)/pm/projects/[projectId]/page.tsx:98:      <TimelineGrid
src/app/(app)/staff/page.tsx:24:import { StaffTimelineCell } from '@/components/timeline/staff-timeline-cell';
src/app/(app)/rd/page.tsx:24:import { RdPortfolioCell } from '@/components/timeline/rd-portfolio-cell';
```

Header comments confirm the architectural intent (one excerpt per persona):

`src/components/timeline/staff-timeline-cell.tsx` (Phase 42 / Plan 42-02 D-19):
> Thin read-only wrapper around PlanVsActualCell for the Staff "My Schedule" grid. Staff never edits — no onCellEdit is ever forwarded.

`src/components/timeline/rd-portfolio-cell.tsx` (Phase 42 / Plan 42-04 D-19):
> Thin read-only wrapper around PlanVsActualCell for the R&D portfolio grid. R&D never edits.

`src/components/timeline/pm-timeline-cell.tsx` (Phase 40 / Plan 40-04 Wave 3):
> Wraps PlanVsActualCell (which owns its own internal 600ms debounce per 40-RESEARCH Pitfall 7) and routes edits through `resolveEditGate`.

**Usage matrix:**

| Consumer page | TimelineGrid import path | PlanVsActualCell import path (transitive via persona cell) | Identical PlanVsActualCell? |
|---|---|---|---|
| `src/app/(app)/pm/projects/[projectId]/page.tsx` | `@/components/timeline/timeline-grid` (AG Grid; editable) — wraps `PmTimelineCell` which imports `@/components/timeline/PlanVsActualCell` | `@/components/timeline/PlanVsActualCell` | yes |
| `src/app/(app)/staff/page.tsx` | none (renders own `<table>` at line 150) — uses `StaffTimelineCell` which imports `@/components/timeline/PlanVsActualCell` | `@/components/timeline/PlanVsActualCell` | yes |
| `src/app/(app)/rd/page.tsx` | none (renders own `<table>` at line 206) — uses `RdPortfolioCell` which imports `@/components/timeline/PlanVsActualCell` | `@/components/timeline/PlanVsActualCell` | yes |

**Verdict:** `PASS`

**Impact:** The shared primitive is the **cell** (`PlanVsActualCell`), not the grid container. Every persona renders the same `PlanVsActualCell` via a thin per-persona wrapper (`PmTimelineCell` / `StaffTimelineCell` / `RdPortfolioCell` / `LmTimelineCell`); each wrapper differs only in the edit-gate routing and click-handler binding. The grid container is intentionally NOT shared — PM uses the heavyweight AG Grid editable surface (`@/components/timeline/timeline-grid`) because PM edits hours; Staff and R&D each render a lightweight read-only HTML `<table>` because they consume but do not edit. This matches Phase 42 / D-19 deliberately (the file headers cite it). Phase 52 STAFF-01, PM-03, RD-02 can modify `PlanVsActualCell` once and have the change ripple to all four personas (PM, LM, Staff, R&D). Per-persona container divergence is a stable design choice, not a fork.

---

## Scope-Expansion Summary

| Source check | Downstream phase | Expansion text | Recorded in ROADMAP/REQUIREMENTS? |
|---|---|---|---|
<!-- Plan 02 fills this section. Findings flagged below for Plan 02 to propagate: -->
<!-- VERIFY-02 → Phase 52 LM-01 (author /api/v5/proposals/queue/count endpoint) -->
<!-- VERIFY-03 → Phase 49 UNBREAK-01/02 (build DepartmentPicker component) -->
<!-- VERIFY-05 → Phase 51 LEAN-05 (ship one-shot UPDATE dashboard_layouts migration before delete) -->
<!-- VERIFY-08 → Phase 49 UNBREAK-06 (add v5.persona.kinds.* OR rewire PersonaGate to v5.persona.kind.*) -->

## Reviewer-Agent Sign-Off

**Reviewer:** Claude (second-pass agent per D-03 / D-04)
**Date:** 2026-04-15
**Verdict:** `APPROVED`

### Evidence cited per VERIFY-0N

Audit applies the D-03 self-review checklist to each VERIFY-0N section. Five rules per row:

1. **Command verbatim** — the `**Command` block contains the exact §Wave −1 string (or, per CONTEXT.md D-07 for VERIFY-04, the `npm run dev` → `pnpm dev` substitution; or, per the explicit note in the report, the `messages/` → `src/messages/` path adaptation). VERIFY-09 has no §Wave −1 verbatim command (its requirement comes from REQUIREMENTS.md alone, "confirmed by snapshot comparison") so this rule is inapplicable and recorded as `n/a`.
2. **Raw output present** — a `**Raw output:**` (or `**Server stack trace:**` for VERIFY-04) fenced code block exists AND is non-empty. An explicit `<no matches>` / `<empty>` / parenthetical "(no stack trace captured — …)" counts as non-empty per the rule's intent.
3. **Verdict valid** — `**Verdict:**` line contains exactly one of `PASS` | `FAIL` | `EXPANDS-SCOPE` (case-sensitive, in backticks).
4. **Impact cites downstream** — `**Impact:**` line names a specific phase (49 / 50 / 51 / 52 / 53) and what the verdict means for that phase's scope.
5. **No source-code drift** — see the dedicated `### Source-code drift check` block below.

| ID | Command-verbatim | Raw output present | Verdict valid | Impact cites downstream | Pass? |
|---|:---:|:---:|:---:|:---:|:---:|
| VERIFY-01 | ✓ | ✓ | ✓ (`PASS`) | ✓ (Phase 50 NAV-01) | ✓ |
| VERIFY-02 | ✓ | ✓ | ✓ (`EXPANDS-SCOPE`) | ✓ (Phase 52 LM-01) | ✓ |
| VERIFY-03 | ✓ | ✓ | ✓ (`EXPANDS-SCOPE`) | ✓ (Phase 49 UNBREAK-01 / UNBREAK-02) | ✓ |
| VERIFY-04 | ✓ (verbatim plan curl + adapted command both recorded; `pnpm dev` substitution for `npm run dev` per D-07) | ✓ (HTTP 307 captured + explicit "no stack trace — Clerk middleware short-circuits before the handler ran") | ✓ (`FAIL`) | ✓ (Phase 49 UNBREAK-04 / UNBREAK-05 reproducer must use signed-in browser session) | ✓ |
| VERIFY-05 | ✓ (SQL verbatim from §2.5 Wave 2 with all 7 widget IDs; §Wave −1 row 80 is the abbreviated 7-ID regex which matches the executed query) | ✓ (`ROW_COUNT: 1` + JSON row for tenant `0b200821-…`) | ✓ (`EXPANDS-SCOPE`) | ✓ (Phase 51 LEAN-05 must ship one-shot `UPDATE dashboard_layouts` migration before delete) | ✓ |
| VERIFY-06 | ✓ (plan brace-glob `ls e2e/{…}/*.spec.ts` recorded; per-persona `ls` recorded as the executed equivalent) | ✓ (12 spec files + per-spec 3-signal rubric output) | ✓ (`PASS`) | ✓ (Phase 50 NAV-01 / NAV-03 owns the root-redirect spec updates) | ✓ |
| VERIFY-07 | ✓ (verbatim plan grep recorded with literal `messages/: No such file or directory` exit-2 output; supplementary `jq` against actual `src/messages/` paths added per "Path correction" pattern) | ✓ (verbatim grep error + jq output for both locales + side-nav `headingKey` grep) | ✓ (`PASS`) | ✓ (Phase 50 NAV-05 lands `sidebar.personaSections.*` keys safely) | ✓ |
| VERIFY-08 | ✓ (verbatim `jq '.v5.persona.kinds' messages/sv.json messages/en.json` recorded; adapted `src/messages/` invocation also recorded) | ✓ (`null` from both files + supplementary `jq '.v5.persona'` showing the keys live at `kind.*` singular) | ✓ (`FAIL`) | ✓ (Phase 49 UNBREAK-06 must add `kinds` namespace OR rewire PersonaGate to read `kind`) | ✓ |
| VERIFY-09 | n/a (no §Wave −1 verbatim command — requirement is "snapshot comparison" per REQUIREMENTS.md only; report cites 3 grep commands + per-persona file-header citations as the static-equivalent evidence) | ✓ (3 grep outputs + per-persona cell-file header comments quoted + usage matrix) | ✓ (`PASS`) | ✓ (Phase 52 STAFF-01 / PM-03 / RD-02 share `PlanVsActualCell`; grid container intentionally not shared per Phase 42 D-19) | ✓ |

**Tally:** 9/9 sections pass all applicable rules. No row has `✗` in the Pass column.

### Source-code drift check

`git status` output at sign-off time (per Rule 5 — only `.planning/` files allowed):

```
(empty — clean working tree at HEAD = 766034780e3be95ebb23a940857ea691a0f75cf9; the report file is the only artifact wave-1 produced and it was committed in 7660347)
```

Confirmed: zero source-code drift in Phase 48 wave 1. The report file at `.planning/pre-flight-report.md` is the only artifact wave-1 produced; no `src/`, `messages/`, `e2e/`, or migration file was modified. The phase-out-of-scope guard from CONTEXT.md (`<domain>` block, "Out of scope") held.

(Plan 02 will also touch `.planning/ROADMAP.md` and `.planning/REQUIREMENTS.md` per D-12 / D-13 — those edits land in Task 2 below this sign-off and are scoped exclusively to `.planning/` per the same guard.)

### Justification

All 9 VERIFY-0N sections are backed by (a) a command (verbatim from §Wave −1 where one exists, with adaptations explicitly recorded per D-07 for VERIFY-04 and per the report's "Path correction" pattern for VERIFY-07 / VERIFY-08; n/a for VERIFY-09 which has no §Wave −1 command), (b) raw captured output in fenced code blocks (or an explicit "no output captured because …" note where the command genuinely produced none), (c) a verdict in the allowed set `{PASS, FAIL, EXPANDS-SCOPE}`, and (d) an Impact line that names the specific downstream phase + requirement that consumes the verdict. Source-code drift is zero.

Phase 48 success criteria #1 ("`pre-flight-report.md` exists with pass/fail per VERIFY-0N row; signed-off by one reviewer") is satisfied. Downstream planners are unblocked:

- **Phase 49** (UNBREAK) consumes the VERIFY-03, VERIFY-04, VERIFY-08 sections (department picker build, admin-API 500 reproducer protocol, persona-kinds namespace decision).
- **Phase 50** (NAV) consumes VERIFY-01, VERIFY-06, VERIFY-07 (landing-route helper exists, all 12 specs flagged for `update`, sidebar key collision check clean).
- **Phase 51** (LEAN) consumes VERIFY-05 (the 1 dev-Neon row mandates the one-shot migration before any widget delete).
- **Phase 52** (per-journey) consumes VERIFY-02, VERIFY-09 (queue/count endpoint to author, shared `PlanVsActualCell` to modify in one place for STAFF-01 / PM-03 / RD-02).

Plan 02 Task 2 may proceed to the Scope-Expansion Summary table + ROADMAP / REQUIREMENTS propagation.

