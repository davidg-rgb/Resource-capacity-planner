---
phase: 43-admin-register-maintenance
plan: 04
subsystem: admin-change-log-landing-and-tc-reg-integration
tags: [frontend, admin, change-log, integration-tests, persona-router, i18n]
requirements: [ADM-03, ADM-04]
dependency_graph:
  requires:
    - v5 admin register API routes (43-01)
    - register.service.ts dispatcher + dependents/audit (43-01)
    - ChangeLogFeed (Phase 41)
    - change_log entity enum incl. 'program' (43-01)
  provides:
    - /admin landing page with ChangeLogFeed (ADM-04)
    - /admin/change-log → /admin redirect
    - Persona default-landing: admin → /admin (D-19)
    - ChangeLogFeed entity filter incl. program (and full register set)
    - register.integration.test.ts (TC-REG-001..010, HTTP→route→service→db)
    - mutations-manifest.test.ts static check (register mutations present)
tech-stack:
  added: []
  patterns:
    - data-driven entity filter from changeLogEntityEnum
    - static manifest assertion as complement to runtime TC-CL-005
---

# Plan 43-04 — Summary

## Delivered
- **ADM-04** `/admin` landing page rendering global ChangeLogFeed; `/admin/change-log` now redirects to `/admin`.
- **D-19** admin persona default-landing switched from `/admin/change-log` → `/admin` (one-line change in the persona router, file located via Task 0 grep).
- **Entity filter** on ChangeLogFeed now includes `program` (and the other register entities) — the dropdown was data-driven from `changeLogEntityEnum.enumValues`, so 43-01's enum extension flowed through automatically. Verified by test, not speculation.
- **TC-REG-001..010** integration tests in `register.integration.test.ts` — full HTTP → route → service → db → change_log path across all 5 register entities (person, project, department, discipline, program). Uses `describe.each` for create/update/archive/un-archive and a dedicated block for HTTP-level DEPENDENT_ROWS_EXIST blockers.
- **TC-CL-005 static complement:** `src/features/change-log/__tests__/mutations-manifest.test.ts` (4 tests, green) asserts the three register mutations — `createRegisterRow`, `updateRegisterRow`, `archiveRegisterRow` — are present in `tests/invariants/mutations.json`.

## Commits
- `4051fc7` feat(43-04): /admin landing + change-log redirect + entity filter extension
- `ee529d9` feat(43-04): admin persona lands on /admin (D-19)
- `e27751f` test(43-04): TC-REG-001..010 integration tests + manifest static check

## Test run
`pnpm vitest run` → **467 passed / 6 failed / 473 total**.

All 6 failures are in `tests/invariants/change-log.coverage.test.ts` (TC-CL-005 runtime invariant) and are **pre-existing** at HEAD before 43-04 — confirmed via `git stash` check during execution. None were introduced by this plan. All 43-04 tests pass:
- `persona-landing.test.ts` 5/5
- `register.integration.test.ts` TC-REG-001..010 green
- `mutations-manifest.test.ts` 4/4 (static complement)
- `change-log-feed.test.tsx` (program filter assertion) green

See `deferred-items.md` for the TC-CL-005 root-cause analysis and recommended fix for a future phase. Deferral is justified under Rule 3 (scope discipline) — the runtime invariant's `@/db` stub lacks a `transaction` method, so every service that uses `db.transaction(...)` (all six listed mutations, not just 43's) throws before `recordChange` is reached. Fixing requires expanding the test harness, which is out-of-scope for 43-04. The static manifest check shipped here provides complementary coverage for the three register mutations.

## Goal closure
- **ADM-03** closed: every admin-driven register mutation writes `change_log` inside the same transaction (43-01), and the manifest static check guarantees the three mutations are enumerated where TC-CL-005 will pick them up once the harness is repaired.
- **ADM-04** closed: admin landing = global change-log feed, with the entity filter covering the full register entity set.
- **D-19** closed: admin persona lands on `/admin`.

## Follow-ups
- Repair TC-CL-005 harness in a future phase (Phase 44 API hardening or dedicated test-infrastructure plan) — see `deferred-items.md` for the exact fix.
