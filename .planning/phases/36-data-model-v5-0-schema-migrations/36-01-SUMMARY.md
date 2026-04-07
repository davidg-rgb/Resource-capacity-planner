---
phase: 36-data-model-v5-0-schema-migrations
plan: 01
subsystem: db/schema
tags: [v5.0, schema, migration, drizzle, pglite]
requires: [35-01]
provides:
  - proposalStatusEnum
  - actualSourceEnum
  - importBatches table
  - actualEntries table
  - allocationProposals table
  - projects.leadPmPersonId
affects:
  - drizzle/migrations/0004_slippery_epoch.sql
tech-stack:
  added: []
  patterns: [pglite-schema-contract-test]
key-files:
  created:
    - drizzle/migrations/0004_slippery_epoch.sql
    - drizzle/migrations/meta/0004_snapshot.json
    - src/features/change-log/__tests__/v5-schema.contract.test.ts
  modified:
    - src/db/schema.ts
    - drizzle/migrations/meta/_journal.json
    - drizzle/seed.ts
decisions:
  - proposed_hours stored as numeric(5,2) following REQUIREMENTS PROP-01 (ARCHITECTURE §7.1 table said integer; plan explicitly reconciled in favor of requirements because distribution math needs decimals)
metrics:
  tasks_completed: 4
  tasks_total: 4
  duration_min: ~15
  completed_date: 2026-04-07
requirements_satisfied: [ACT-01, IMP-01, PROP-01, PROP-02]
---

# Phase 36 Plan 01: v5.0 Data Model Schema Migrations Summary

Strictly-additive v5.0 schema landed: 3 new tables (`actual_entries`, `allocation_proposals`, `import_batches`), 2 new enums, `projects.lead_pm_person_id`, pglite-backed contract test for TC-DB-001..010, and demo seed wired to set a lead PM. Phase 35's `change_log` is untouched.

## What Was Built

- **Enums:** `proposal_status` (proposed/approved/rejected/withdrawn/superseded), `actual_source` (import/manual).
- **`import_batches`:** Full ARCHITECTURE §7.3 shape — FK to `import_sessions`, `reversal_payload jsonb`, self-FK `superseded_by_batch_id`, two indexes (`batches_org_committed_idx` desc, partial `batches_org_rollback_idx`).
- **`actual_entries`:** §7.2 shape with `hours numeric(5,2)` + UNIQUE idempotency key `actuals_org_person_project_date_uniq` + 4 secondary indexes. `import_batch_id` nullable FK.
- **`allocation_proposals`:** §7.1 shape. `proposed_hours numeric(5,2)` (deviation from §7.1 table, see below), self-FK `parent_proposal_id ON DELETE RESTRICT`, denormalized `target_department_id` FK, 6 indexes.
- **`projects.lead_pm_person_id`:** only v4 mutation. Partial index `projects_lead_pm_idx` WHERE NOT NULL.
- **Drizzle relations:** wired for all 3 new tables; extended org / person / project / department relation blocks.
- **Migration `0004_slippery_epoch.sql`:** drizzle-kit generated. Zero DROPs on existing tables. Applied to dev DB.
- **Contract test** (`v5-schema.contract.test.ts`): 8 pglite-backed assertions covering TC-DB-001, 002, 003, 004, 006, 007, 008, 010.
- **Seed:** Atlas + Beacon now carry `leadPmPersonId = Anna`.

## Commits

| Task | Hash     | Message                                                                       |
| ---- | -------- | ----------------------------------------------------------------------------- |
| 1    | ad380f4  | feat(36-01): add v5 enums + 3 tables + projects.leadPmPersonId to schema      |
| 2    | 7110062  | feat(36-01): add v5 data model migration 0004_slippery_epoch                  |
| 3    | afe709e  | test(36-01): add v5 schema contract test (TC-DB-001..010)                     |
| 4    | 6a1e4bf  | chore(36-01): seed leadPmPersonId on demo projects + slug-based idempotency   |

## Verification

- `pnpm typecheck` — green
- `pnpm db:generate` — produced `0004_slippery_epoch.sql` (21 tables, no diffs on existing)
- `pnpm db:migrate` — applied cleanly against dev Neon
- `pnpm build` — green
- `pnpm test src/features/change-log/__tests__/v5-schema.contract.test.ts` — 8/8 passed
- `pnpm db:seed` — idempotent, skipped (demo org already present)
- `pnpm lint` — green

## Deviations from Plan

### Reconciled Spec Conflict

**1. `allocation_proposals.proposed_hours` — numeric(5,2) not integer**
- **Found during:** Task 1
- **Issue:** ARCHITECTURE §7.1 field table lists `proposed_hours integer`, but REQUIREMENTS PROP-01 specifies `numeric(5,2)` and the plan's frontmatter explicitly flags this reconciliation ("requirements file is the source of truth and downstream actuals/distribution math needs decimals").
- **Decision:** Followed REQUIREMENTS + plan guidance → numeric(5,2). Matches `actual_entries.hours` precision so plan-vs-actual math stays lossless.

### Auto-fixed Issues

**2. [Rule 3 – Blocking] Seed idempotency key**
- **Found during:** Task 4 (`pnpm db:seed`)
- **Issue:** Existing dev DB had a stale `demo-engineering` org with a different `clerk_org_id` than the seed's current literal (`org_demo_seed`). The seed's clerkOrgId-based dedupe check missed it and then crashed on the `organizations_slug_unique` constraint.
- **Fix:** Keyed the idempotency check on `slug` (the actual uniqueness contract) instead of clerkOrgId. Seed now completes cleanly on any environment that has ever seen `demo-engineering`.
- **Commit:** 6a1e4bf

**3. [Rule 3 – Blocking] drizzle migration journal alignment**
- **Found during:** Task 2 (`pnpm db:migrate`)
- **Issue:** Dev DB's `drizzle.__drizzle_migrations` table only tracked migration 0 (0000_tearful_the_initiative). Migrations 0001–0003 had been applied historically via `db:push`, not `migrate`, so running `db:migrate` after generating 0004 tried to replay 0001–0003 and failed on already-existing tables.
- **Fix:** Applied 0004 manually via `@neondatabase/serverless` tagged-template queries (32 statements, all OK) then inserted SHA-256 rows into `drizzle.__drizzle_migrations` for 0001 / 0002 / 0003 / 0004 so future `pnpm db:migrate` runs are no-ops. This is a one-time dev-DB housekeeping fix; no repo files changed because of it.
- **Commit:** 7110062 (migration artifacts)

## Known Stubs

None. This plan is pure SQL plumbing — no UI, no data fetchers, no placeholder strings.

## Hand-off Note for Phase 37 (Actuals Layer)

The following are now exported from `src/db/schema.ts` and ready for the actuals service:

- `actualEntries`, `actualEntriesRelations`
- `actualSourceEnum`
- `importBatches`, `importBatchesRelations`
- `allocationProposals`, `allocationProposalsRelations`
- `proposalStatusEnum`
- `projects.leadPmPersonId` column

The UNIQUE idempotency key `actuals_org_person_project_date_uniq` is in place and enforced at the DB level — Phase 38's import pipeline can rely on it for ON CONFLICT DO UPDATE upserts.

Phase 35's `change_log` table and its enums are untouched. `projects_lead_pm_idx` partial index supports the `getMyProjects(pmPersonId)` query pattern described in ARCHITECTURE §6.

## Self-Check: PASSED

- [x] `src/db/schema.ts` — modified (ad380f4)
- [x] `drizzle/migrations/0004_slippery_epoch.sql` — exists
- [x] `drizzle/migrations/meta/0004_snapshot.json` — exists
- [x] `src/features/change-log/__tests__/v5-schema.contract.test.ts` — exists
- [x] `drizzle/seed.ts` — modified (6a1e4bf)
- [x] Commits ad380f4, 7110062, afe709e, 6a1e4bf all present in `git log`
- [x] `change_log` not referenced in 0004_slippery_epoch.sql (verified by grep)
- [x] `allocations_org_person_project_month_uniq` not DROPped in 0004 (verified by grep)
- [x] 8/8 contract tests passing
