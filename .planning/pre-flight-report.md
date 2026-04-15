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
| [VERIFY-02](#verify-02-proposalsqueuecount-endpoint) | `/api/v5/proposals/queue/count` endpoint exists | *TBD* | — |
| [VERIFY-03](#verify-03-phase-41-department-picker) | Phase 41 department-picker component ships | `EXPANDS-SCOPE` | Phase 49 scope expands: build the department picker (UNBREAK-01/02). |
| [VERIFY-04](#verify-04-admin-api-500-root-causes) | `/api/admin/change-log` + `/api/admin/people` 500 root causes | *TBD* | — |
| [VERIFY-05](#verify-05-custom-dashboard-dead-widget-references) | Custom-dashboard layouts reference dead/deletable widget IDs | *TBD* | — |
| [VERIFY-06](#verify-06-playwright-spec-inventory) | Every `e2e/**/*.spec.ts` classified keep/update/retire | *TBD* | — |
| [VERIFY-07](#verify-07-sidebar-i18n-collision-check) | `sidebar.staff` / `sidebar.projects` existing meanings | `PASS` | New keys land safely under `sidebar.personaSections.*` — no collision with existing leaf-string section headings. |
| [VERIFY-08](#verify-08-v5personakinds-keys-present) | `v5.persona.kinds.*` keys present in both locales | *TBD* | — |
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
