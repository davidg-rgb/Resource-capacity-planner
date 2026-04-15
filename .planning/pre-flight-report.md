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
| [VERIFY-04](#verify-04-admin-api-500-root-causes) | `/api/admin/change-log` + `/api/admin/people` 500 root causes | *TBD* | — |
| [VERIFY-05](#verify-05-custom-dashboard-dead-widget-references) | Custom-dashboard layouts reference dead/deletable widget IDs | `EXPANDS-SCOPE` | Phase 51 LEAN-05 scope expands: ship the one-shot `UPDATE dashboard_layouts` migration BEFORE deleting widget files. 1 row affected on dev branch. |
| [VERIFY-06](#verify-06-playwright-spec-inventory) | Every `e2e/**/*.spec.ts` classified keep/update/retire | `PASS` | 12/12 specs classified `update` (Wave 1 owns root-redirect change). 0 `retire`, 0 `keep`. |
| [VERIFY-07](#verify-07-sidebar-i18n-collision-check) | `sidebar.staff` / `sidebar.projects` existing meanings | `PASS` | New keys land safely under `sidebar.personaSections.*` — no collision with existing leaf-string section headings. |
| [VERIFY-08](#verify-08-v5personakinds-keys-present) | `v5.persona.kinds.*` keys present in both locales | `FAIL` | Phase 49 UNBREAK-06 scope expands: keys live at `v5.persona.kind.*` (singular). UNBREAK-06 must add `kinds` namespace OR wire PersonaGate to read `kind`. |
| [VERIFY-09](#verify-09-plan-vs-actual-cell-reuse) | Plan-vs-actual cell + timeline-grid reused across PM/Staff/R&D | *TBD* | — |

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
