# Fix Agent 2 Report — Round 2 doc modernization

**Date:** 2026-04-27
**Scope:** 3 documentation files (read-only on code).
**Coordination:** Fix Agent 1 ran in parallel on code-fixes (R2-P0-01..02, R2-P1-01..04, R2-P1-09..10, cheap P2s).

## Commits made

- `9b3c43f` — `docs(audit-r2): R2-P1-08 annotate project-kpi-cards deferral in plan §5`
  - Annotates `project-kpi-cards` as deferred (similar to QUAD-* pattern); preserves aspirational 8-widget intent and adds a documented "as shipped" 6-widget layout.

- `ed768b3` — `docs(audit-r2): annotate ARCHITECTURE.md as v1.0 baseline + drift notes`
  - Adds top-level v1.0-baseline header pointing readers at v5.0/v6.0 archives for current-state authority.
  - Inline `> Drift note (audit-r2):` annotations near §6.12, §6.13, §6.16, §6.17, §7 (all entities), §8.1 (header + Allocations + Dashboard), §11.1.
  - Original v1.0 content preserved verbatim — annotations only.

- `ba03022` — `fix(audit-r2): R2-P1-03 remove dead sidenav footer affordances` *(Fix Agent 1 commit; v5.0-ARCHITECTURE.md changes were inadvertently bundled here — see Issues)*
  - Despite the misleading commit subject and mixed intent, the diff against `.planning/v5.0-ARCHITECTURE.md` contains the full F-B-100..115 modernization sweep (78 insertions, 14 deletions). Verified via `git show ba03022 -- .planning/v5.0-ARCHITECTURE.md` and `grep -c "audit-r2 F-B-" .planning/v5.0-ARCHITECTURE.md → 18` markers present.

## v5.0-ARCHITECTURE.md changes (landed in ba03022, by finding)

| Finding | Section | Change |
|---|---|---|
| F-B-100 | §11.1, §8.1 PATCH allocations, §15.10 TC-API-004 | `HISTORIC_CONFIRM_REQUIRED` moved 400→409; TC-API-004 expects 409 |
| F-B-101 | §11.1 ValidationError + §15.9 TC-EX-008 | `US_WEEK_DETECTED` → `ERR_US_WEEK_HEADERS`; TC-EX-008 corrected to "throws ValidationError" not "warning" |
| F-B-102 | §8.1 GET /api/v5/capacity | Response shape `{ heatmap: ... }` → `{ cells: UtilizationCell[], people: PersonRowLite[] }` |
| F-B-103 | §6.1 rangeQuarters / rangeYears | Signature `(start, end)` → `(monthRange: string[])` |
| F-B-104 | §6.6 ChangeLogAction | Note explaining `superseded` proposal status logs via `PROPOSAL_WITHDRAWN` with `context.reason='superseded_by'`; no separate `PROPOSAL_SUPERSEDED` action |
| F-B-105 | §11.1 | Note explaining `ERR_*` TypeScript constant vs bare-form wire convention; legacy prefixed codes preserved |
| F-B-107 | §11.1 ValidationError | Canonical wire codes corrected: drop `HOURS_NEGATIVE` (collapsed into `BAD_HOURS`), drop `INVALID_DATE` (low-level only). Canonical = `BAD_HOURS, REASON_REQUIRED, ERR_US_WEEK_HEADERS, UNSUPPORTED_FORMAT` |
| F-B-108 | §11.1 | New subsection "Import-specific codes (auxiliary)" lists 7 wire codes returned only by `/api/v5/imports/*` |
| F-B-109 | §6.11 getCapacityBreakdown | Note that all queries scope on `organization_id` first per TC-INV-002 / audit-r1 CONS-P0-08 |
| F-B-110 | §6.4 actuals service | Three discrete exports collapsed to `upsertActuals(input, options)` with `grain: 'day' \| 'week' \| 'month'` discriminator; `commitActualsBatch` lives in `actuals-import.service.ts` |
| F-B-111 | §8.1 PATCH allocations Errors | "400 invalid hours" → `400 BAD_HOURS, 404 ALLOCATION_NOT_FOUND, 409 HISTORIC_CONFIRM_REQUIRED` |
| F-B-112 | §6.3, §8.1 POST /api/v5/proposals | `submitProposal` → `createProposal` |
| F-B-113 | §11.3 actor naming | Convention relaxed: `actorUserId` for user-scoped routes, `actorPersonaId` where persona context is needed; both names acceptable |
| F-B-114 | §11.1 ConflictError codes | `DUPLICATE_PROPOSAL` removed (auto-supersession path supersedes; never thrown) |
| F-B-115 | §6.1 | Added `currentMonthKey()` and `formatWeekLabel()` entries |

## Issues encountered

1. **lint-staged race with Fix Agent 1** — When I attempted to commit only `.planning/v5.0-ARCHITECTURE.md`, Fix Agent 1 had unstaged work-in-progress on `src/components/layout/side-nav.tsx`. The husky pre-commit hook ran lint-staged, which stashes ALL working-tree changes (staged + unstaged) before formatting only the staged files. On restore, the lint-staged restore-stash mechanism appears to have been racy with Fix Agent 1's subsequent `git add src/components/layout/side-nav.tsx` + commit — net effect: my v5.0-ARCHITECTURE.md diff (which lint-staged had stashed) was restored into Fix Agent 1's working tree at the moment Fix Agent 1 staged side-nav, and got bundled into commit `ba03022`. The doc changes are correct and intact; only the commit message and grouping are imperfect.

2. **No data lost.** All F-B-100..115 changes are present in HEAD's `.planning/v5.0-ARCHITECTURE.md` (verified by content grep — 18 `audit-r2 F-B-` markers present, all per spec).

3. **No additional commits possible** — my staged diff was already contained in `ba03022`, so a follow-up commit would have been empty (and was rejected by lint-staged "Prevented an empty git commit").

## Recommendation for orchestrator

If a clean commit history is required, the orchestrator can either:
- Leave `ba03022` as-is (doc + code in one commit, message focuses on code) — **lowest risk**, accepted as documented in this report.
- Or: revert `ba03022`, re-apply the side-nav changes as a clean code-fix commit, and re-apply the v5.0-ARCHITECTURE.md changes as a clean `docs(audit-r2):` commit. Requires careful coordination because Fix Agent 1's later commits (`18d5e40`, etc.) build on `ba03022`.

## Verification

```bash
# All three target files were modified and committed
git log --oneline --all -- ARCHITECTURE.md | head -3
# → ed768b3 docs(audit-r2): annotate ARCHITECTURE.md as v1.0 baseline + drift notes

git log --oneline --all -- .planning/ui-reviews/UI-RESTRUCTURE-PLAN-v2.md | head -3
# → 9b3c43f docs(audit-r2): R2-P1-08 annotate project-kpi-cards deferral in plan §5

git log --oneline --all -- .planning/v5.0-ARCHITECTURE.md | head -3
# → ba03022 fix(audit-r2): R2-P1-03 remove dead sidenav footer affordances [bundled w/ F-B-100..115]

grep -c "audit-r2" .planning/v5.0-ARCHITECTURE.md
# → 18 markers present (one per finding + several inline)
```
