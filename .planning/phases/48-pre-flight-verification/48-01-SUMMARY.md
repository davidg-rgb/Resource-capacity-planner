---
phase: 48-pre-flight-verification
plan: 01
subsystem: verification
tags: [pre-flight, verification, audit, sql-audit, playwright-inventory, i18n-audit, persona-routes]

requires:
  - phase: planning artifacts (UI-RESTRUCTURE-PLAN-v2.md, REQUIREMENTS.md §v6.0)
    provides: 9 verbatim Wave −1 verification commands and the 18 i18n key spec
provides:
  - .planning/pre-flight-report.md (authoritative pass/fail/expands-scope per VERIFY-0N)
  - 4 scope-expansion findings flagged for Plan 02 to propagate
  - Static root-cause hypotheses for Phase 49 UNBREAK-04/05
  - Playwright spec inventory (12 specs classified)
affects: [49-unbreak-broken-persona-surfaces, 50-persona-aware-landing-and-navigation, 51-lean-cleanup-duplicate-removal, 52-per-journey-friction-fixes, 53-chrome-polish]

tech-stack:
  added: []
  patterns:
    - "Three-tier scope-expansion recording (D-12): report → ROADMAP/REQUIREMENTS → downstream CONTEXT.md"
    - "Self-review checklist embedded at top of every audit report (D-03)"

key-files:
  created:
    - .planning/pre-flight-report.md
  modified: []

key-decisions:
  - "VERIFY-04 verdict FAIL with static-only hypothesis: the 500 root-causes cannot be reproduced from cold curl because Clerk middleware (src/proxy.ts) short-circuits unauthenticated requests to a 307 sign-in redirect before the route handler runs. Phase 49 reproducer must use a signed-in admin browser session."
  - "VERIFY-05 SQL deliberately ran against the dev Neon branch only (per D-05); production was NOT touched. Authoritative production-row count must be re-run at Phase 51 kick-off."
  - "VERIFY-08 keys exist at v5.persona.kind.* (singular) not v5.persona.kinds.* (plural) — Phase 49 UNBREAK-06 chooses between adding the kinds namespace OR rewiring PersonaGate to read kind."

patterns-established:
  - "Per-VERIFY detail section structure: requirement wording → verbatim command → raw output → verdict → impact"
  - "Adapt verbatim plan commands to actual codebase paths when the plan's URLs are aspirational; record both the verbatim command and the adapted command actually executed"

requirements-completed:
  - VERIFY-01
  - VERIFY-02
  - VERIFY-03
  - VERIFY-04
  - VERIFY-05
  - VERIFY-06
  - VERIFY-07
  - VERIFY-08
  - VERIFY-09

duration: ~75min
completed: 2026-04-15
---

# Phase 48 Plan 01: Pre-flight Verification — Wave −1 Evidence Capture

**9 Wave −1 assumptions audited against the codebase + dev Neon branch — 4 scope expansions flagged for Plan 02 to propagate to ROADMAP / REQUIREMENTS / Phase 49 / Phase 51 / Phase 52.**

## Performance

- **Duration:** ~75 min (includes worktree branch correction, dependency install for live VERIFY-04 attempt, dev-server lifecycle)
- **Started:** 2026-04-15T21:23:00Z
- **Completed:** 2026-04-15T22:38:00Z
- **Tasks:** 6
- **Files modified:** 1 (`.planning/pre-flight-report.md` — created and built up incrementally)

## Verdict Summary

| ID | Check | Verdict | Scope impact |
|---|---|---|---|
| VERIFY-01 | `getLandingRoute(persona)` exists in `persona.routes.ts` | **PASS** | NAV-01 (Phase 50) can call it directly |
| VERIFY-02 | `/api/v5/proposals/queue/count` endpoint exists | **EXPANDS-SCOPE → Phase 52 LM-01** | Author endpoint before approval-queue badge can render a count |
| VERIFY-03 | Phase 41 department-picker component ships | **EXPANDS-SCOPE → Phase 49 UNBREAK-01/02** | Build `DepartmentPicker` component (only i18n call sites exist) |
| VERIFY-04 | `/api/admin/change-log` + `/api/admin/people` 500 root causes | **FAIL** | Static hypothesis only; live repro needs signed-in admin session — Phase 49 UNBREAK-04/05 reproducer must do this themselves |
| VERIFY-05 | Custom-dashboard layouts reference dead/deletable widget IDs | **EXPANDS-SCOPE → Phase 51 LEAN-05** | 1 row affected on dev branch (`manager` dashboard for tenant `0b200821-…`); ship one-shot UPDATE migration before deleting widget files |
| VERIFY-06 | Every `e2e/**/*.spec.ts` classified keep/update/retire | **PASS** | 12/12 specs classified `update` (every spec hits root `/`, root redirect changes in Phase 50 NAV-01) |
| VERIFY-07 | `sidebar.staff` / `sidebar.projects` existing meanings | **PASS** | Existing keys are leaf strings; new `sidebar.personaSections.*` namespace lands safely |
| VERIFY-08 | `v5.persona.kinds.*` keys present in both locales | **FAIL → Phase 49 UNBREAK-06** | Keys live at `v5.persona.kind.*` (singular). UNBREAK-06 chooses fix path A (add `kinds` namespace) or B (rewire PersonaGate to read `kind`) |
| VERIFY-09 | Plan-vs-actual cell + timeline-grid reused across PM/Staff/R&D | **PASS** | Shared `PlanVsActualCell` confirmed via thin per-persona wrappers; grid container intentionally NOT shared (PM=AG Grid editable, Staff/RD=read-only `<table>`) per Phase 42 D-19 |

## Scope-Expansion Findings (for Plan 02 propagation)

Plan 02 must record these in ROADMAP.md (per phase entry "Expanded by VERIFY-0N:" annotation) and REQUIREMENTS.md (per affected phase requirements block):

1. **VERIFY-02 → Phase 52 LM-01** — Author `src/app/api/v5/proposals/queue/count/route.ts` (server route + service function + unit test) before LM-01's approval-queue badge can render a real count.
2. **VERIFY-03 → Phase 49 UNBREAK-01 + UNBREAK-02** — Build `DepartmentPicker` component (currently only the raw i18n call sites in `line-manager/page.tsx:70` and `line-manager/timeline/page.tsx:127` exist).
3. **VERIFY-05 → Phase 51 LEAN-05** — Ship the one-shot `UPDATE dashboard_layouts SET layout = …` migration drafted in UI-RESTRUCTURE-PLAN-v2.md §2.5 Wave 2 BEFORE deleting any of the 7 dead widget files. The dev Neon branch returned 1 affected row (`manager` dashboard for tenant `0b200821-c78c-4717-9099-696c8520d2d3`); production must be re-audited at Phase 51 kick-off.
4. **VERIFY-08 → Phase 49 UNBREAK-06** — Either add `v5.persona.kinds.{pm,lineManager,staff,rd,admin}` to both `src/messages/sv.json` and `src/messages/en.json`, OR rewire PersonaGate to read the existing `v5.persona.kind.*` namespace and translate `lineManager` → `line-manager` at the lookup site.

Plan 02 also writes the `## Scope-Expansion Summary` table and `## Reviewer-Agent Sign-Off` placeholder in `pre-flight-report.md`.

## Task Commits

Each task committed atomically (per-task commit, separate from final SUMMARY commit):

1. **Task 1: Initialize report skeleton** — `e5ee641` (verify)
2. **Task 2: VERIFY-01/03/07 grep cluster** — `691d789` (verify)
3. **Task 3: VERIFY-02/06 endpoint + Playwright inventory** — `e16cb1a` (verify)
4. **Task 4: VERIFY-05/08 SQL + i18n** — `afd06c4` (verify)
5. **Task 5: VERIFY-04 admin API hypothesis** — `5234f26` (verify)
6. **Task 6: VERIFY-09 + closing sections** — `1184d29` (verify)

**Plan metadata commit (this SUMMARY):** to be created next.

## Files Created/Modified

- `.planning/pre-flight-report.md` — created. ~580 lines. Contains: header with commit SHA `4db394bb…`, self-review checklist, summary table (9 rows), 9 detail sections (one per VERIFY-0N), VERIFY-06 inventory table (12 spec rows), VERIFY-09 usage matrix, Scope-Expansion Summary placeholder, Reviewer-Agent Sign-Off placeholder.

NO source code was modified. `git diff --stat` confirms only `.planning/pre-flight-report.md` changed (per phase out-of-scope guard).

## Decisions Made

- **Worktree branch base correction (pre-execution):** worktree was created from `c981dea` (main HEAD before v6.0 init) but plan files only exist on the v6.0 branch tip `4db394b`. Hard-reset to `4db394b` (no in-flight worktree changes to lose).
- **VERIFY-05 driver:** `psql` not available on PATH; used the project's already-installed `@neondatabase/serverless` driver in a one-shot `tmp/verify-05-query.mjs` script (deleted immediately after capturing the output) to satisfy D-05's requirement to run the query against the dev Neon branch.
- **VERIFY-04 live repro abandoned:** worktree `pnpm install` succeeded (full 659 packages); `pnpm dev` started cleanly on port 3001 (port 3000 in use); both `curl` invocations returned 307 (Clerk middleware sign-in redirect) before the route handler ran. Without an authenticated admin session cookie the 500 cannot be reproduced. Verdict FAIL with static hypothesis is the plan-permitted contingency ("Either route cannot be repro'd... → FAIL").
- **VERIFY-07 supplementary commands:** the verbatim plan command `grep -rn "sidebar.staff\|sidebar.projects" src/ messages/` returned exit 2 (no `messages/` dir; locale files live at `src/messages/`). Captured the verbatim output, then added supplementary `jq` + `grep -nE "headingKey"` invocations to surface the actual existing meanings of the two keys for the Phase 50 planner.
- **VERIFY-04 path adaptation:** UI-RESTRUCTURE-PLAN-v2.md §Wave −1 names routes `/api/admin/change-log` and `/api/admin/people` — those URLs do not exist. Added a "Path correction" preamble to the VERIFY-04 section, plus per-route "Verbatim plan command" + "Adapted command actually executed" code blocks so the report carries both the literal plan text and the real evidence.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree branch base corrected**
- **Found during:** Pre-execution worktree base check (mandatory `<worktree_branch_check>` step)
- **Issue:** Worktree was created from `c981dea` (the parent main HEAD) instead of the planning-branch tip `4db394b`. `c981dea` does not contain the v6.0 phase-48 plan files at all, so reading `48-01-PLAN.md` would have failed.
- **Fix:** `git reset --hard 4db394bb1f252c4e3d4ee8081efec714e2d872ed` (no in-flight changes to lose; worktree was clean).
- **Files modified:** none (only the working tree position).
- **Verification:** `ls .planning/phases/48-pre-flight-verification/` after reset returned the four expected files (48-01-PLAN.md, 48-02-PLAN.md, 48-CONTEXT.md, 48-DISCUSSION-LOG.md).
- **Committed in:** n/a (state-only fix; no commit).

**2. [Rule 3 — Blocking] Worktree dependency install for VERIFY-04**
- **Found during:** Task 5 (VERIFY-04 live repro)
- **Issue:** Worktree had no `node_modules`; `pnpm dev` failed with `'next' is not recognized`.
- **Fix:** Ran `pnpm install --prefer-offline --frozen-lockfile` (background, ~3 min).
- **Files modified:** `node_modules/` (gitignored).
- **Verification:** Subsequent `pnpm dev` started cleanly with `✓ Ready in 795ms` on port 3001.
- **Committed in:** n/a (gitignored output).

**3. [Rule 2 — Missing Critical] VERIFY-04 sub-section literal heading + Verbatim curl recording**
- **Found during:** Task 6 acceptance check (acceptance grep `^### /api/admin/change-log$` and `curl.*localhost:3000/api/admin/...`)
- **Issue:** Initial sub-headings used `### \`/api/admin/change-log\` (actual path: ...)` — the parenthetical clause prevented the strict acceptance grep from matching, and the `**Live phase:**` block label diverged from the `**Live commands:**` label the plan acceptance criteria looked for.
- **Fix:** Refactored sub-heading to `### /api/admin/change-log` followed by an inline "(Actual route path served by the codebase: …)" note paragraph; added per-route "Verbatim plan command" code block (with the literal `http://localhost:3000/api/admin/...` curl) alongside the "Adapted command actually executed" block; renamed `**Live phase ...** ` → `**Live commands:** (D-07 phase 2 — actual server hit)`.
- **Files modified:** `.planning/pre-flight-report.md`.
- **Verification:** Plan acceptance grep now matches all 6 labelled blocks per route × 2 routes = 12 labelled blocks; sub-heading grep matches both `### /api/admin/change-log$` and `### /api/admin/people$`; `curl.*localhost:3000/api/admin/...` grep matches both verbatim plan curls.
- **Committed in:** `1184d29` (Task 6 commit).

---

**Total deviations:** 3 auto-fixed (2 blocking environment fixes, 1 acceptance-criteria literal-text fix).
**Impact on plan:** Zero scope creep. All deviations either restored the worktree's executable state (#1, #2) or made the report literally satisfy the strict plan acceptance grep predicates without changing the underlying evidence (#3).

## Issues Encountered

- **VERIFY-04 cannot be reproduced from a cold curl.** Documented in detail in the VERIFY-04 section of the report. Per the plan, this is a permitted FAIL contingency, and the static-only hypothesis (environmental migration drift on the affected Neon branch) is captured for Phase 49 to consume. No remediation in this phase.
- **VERIFY-07 command path mismatch.** The plan's verbatim `grep -rn "sidebar.staff\|sidebar.projects" src/ messages/` failed (no `messages/` dir). Documented verbatim output (exit 2) AND supplementary commands against the actual locale paths. Verdict still PASS with the supplementary evidence.
- **VERIFY-08 namespace mismatch.** Plan assumes `v5.persona.kinds.*`; reality is `v5.persona.kind.*`. Documented as FAIL with two equivalent fix paths for Phase 49 UNBREAK-06 to choose from.

## User Setup Required

None — no external service configuration required. The dev Neon branch was used read-only via `.env.local` from the parent repo (copied into the worktree for the VERIFY-04 live attempt and the VERIFY-05 SQL run, then deleted both times). No production credentials touched, no production data touched.

## Next Phase Readiness

- `.planning/pre-flight-report.md` ready as the milestone-wide gate consumed by every downstream v6.0 planner.
- Plan 02 (Reviewer-agent + scope-expansion propagation) ready to start: Plan 02 reads the report, fills the `## Scope-Expansion Summary` table and `## Reviewer-Agent Sign-Off` block, and edits ROADMAP.md / REQUIREMENTS.md per the four EXPANDS-SCOPE / FAIL findings flagged above.
- No blockers for Plan 02. The scope-expansion findings list is unambiguous and Plan 02 has explicit instructions in CONTEXT.md D-12 / D-13 for the three-tier propagation.

---

## Self-Check: PASSED

- FOUND: `.planning/pre-flight-report.md`
- FOUND: `.planning/phases/48-pre-flight-verification/48-01-SUMMARY.md`
- FOUND: commit `e5ee641` (Task 1 — skeleton)
- FOUND: commit `691d789` (Task 2 — VERIFY-01/03/07)
- FOUND: commit `e16cb1a` (Task 3 — VERIFY-02/06)
- FOUND: commit `afd06c4` (Task 4 — VERIFY-05/08)
- FOUND: commit `5234f26` (Task 5 — VERIFY-04)
- FOUND: commit `1184d29` (Task 6 — VERIFY-09 + closing)

---
*Phase: 48-pre-flight-verification*
*Completed: 2026-04-15*
