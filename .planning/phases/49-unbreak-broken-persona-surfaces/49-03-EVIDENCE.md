# Phase 49 Plan 03: Admin 500 Fix -- Migration Evidence

**Git commit SHA at migration time:** `10866d36262e3c745dcb51695d40aefbfc37276d`
**Timestamp:** 2026-04-20T09:05Z
**DATABASE_URL host:** `ep-raspy-sea-al5kxh7j-pooler.c-3.eu-central-1.aws.neon.tech` (dev branch -- confirmed)

## Pre-migration snapshot

### drizzle.__drizzle_migrations (5 rows -- expected per RESEARCH)

```json
[
  {
    "id": 1,
    "hash": "6221cce31084068823f6ca4af477820d16328497a60ead1e35929e29993336a9",
    "created_at": "1774518414872"
  },
  {
    "id": 2,
    "hash": "5ba054ac902f969fa9f49910cb3a2500c76abfea629aa75a87ea08b4a016fa69",
    "created_at": "1775573609283"
  },
  {
    "id": 3,
    "hash": "0ad79bd066ba3336a1af0f9a679848961513b2e870ce346f59f31ab4197e688e",
    "created_at": "1775573609411"
  },
  {
    "id": 4,
    "hash": "bd5d5976375cf65ea710aac4292cbc2003e9bb5e2a65f1e122be0d12cb5c5bf1",
    "created_at": "1775573609470"
  },
  {
    "id": 5,
    "hash": "52ef4d2091826611b387063034ea05eb6476162f58f99dfe041365be38d2694c",
    "created_at": "1775573609530"
  }
]
```

### departments columns (archived_at ABSENT -- confirms drift)

```json
[
  { "column_name": "id" },
  { "column_name": "organization_id" },
  { "column_name": "name" },
  { "column_name": "created_at" }
]
```

### disciplines columns (archived_at ABSENT)

```json
[
  { "column_name": "id" },
  { "column_name": "organization_id" },
  { "column_name": "name" },
  { "column_name": "abbreviation" },
  { "column_name": "created_at" }
]
```

### programs columns (archived_at ABSENT)

```json
[
  { "column_name": "id" },
  { "column_name": "organization_id" },
  { "column_name": "name" },
  { "column_name": "description" },
  { "column_name": "created_at" },
  { "column_name": "updated_at" }
]
```

### change_log table presence (ABSENT -- confirms drift)

```json
[]
```

## Migration 0003 idempotency check

**File inspected:** `drizzle/migrations/0003_busy_black_bird.sql`

**CREATE TABLE statement found (line 3):**
```sql
CREATE TABLE "change_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  ...
);
```

**IF NOT EXISTS present?** NO -- uses bare `CREATE TABLE`, not `CREATE TABLE IF NOT EXISTS`.

**Enum CREATE TYPE statements (lines 1-2):**
```sql
CREATE TYPE "public"."change_log_action" AS ENUM(...)
CREATE TYPE "public"."change_log_entity" AS ENUM(...)
```
Also bare `CREATE TYPE` without `IF NOT EXISTS`.

**Additional finding:** Both enums (`change_log_action`, `change_log_entity`) are ABSENT from the dev Neon branch (verified via `pg_enum` + `pg_type` query). The `change_log` table is also ABSENT. This is despite migration 0003 being tracked as "applied" (row 4 in `__drizzle_migrations`). The Neon branch was likely created from a snapshot before 0003's objects were committed, but the `__drizzle_migrations` tracker was populated from a different source.

**Consequence:** `pnpm db:migrate` will skip 0003 (already tracked) and attempt 0005-0008. Migration 0005 (`ALTER TYPE change_log_action ADD VALUE 'ACTUAL_UPSERTED'`) would FAIL because the enum doesn't exist.

**Decision:** Manually seed all 0003 objects (enums + table + FK + indexes) before running `pnpm db:migrate`.

## Pre-migrate change_log seed

**Executed SQL** (verbatim from `0003_busy_black_bird.sql`):

```sql
CREATE TYPE "public"."change_log_action" AS ENUM('ALLOCATION_EDITED', 'ALLOCATION_HISTORIC_EDITED', 'ALLOCATION_BULK_COPIED', 'PROPOSAL_SUBMITTED', 'PROPOSAL_APPROVED', 'PROPOSAL_REJECTED', 'PROPOSAL_WITHDRAWN', 'PROPOSAL_EDITED', 'ACTUALS_BATCH_COMMITTED', 'ACTUALS_BATCH_ROLLED_BACK', 'REGISTER_ROW_CREATED', 'REGISTER_ROW_UPDATED', 'REGISTER_ROW_DELETED');

CREATE TYPE "public"."change_log_entity" AS ENUM('allocation', 'proposal', 'actual_entry', 'person', 'project', 'department', 'discipline', 'import_batch');

CREATE TABLE "change_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "actor_persona_id" text NOT NULL,
  "entity" "change_log_entity" NOT NULL,
  "entity_id" uuid NOT NULL,
  "action" "change_log_action" NOT NULL,
  "previous_value" jsonb,
  "new_value" jsonb,
  "context" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "change_log" ADD CONSTRAINT "change_log_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");

CREATE INDEX "change_log_org_created_idx" ON "change_log" USING btree ("organization_id","created_at" DESC NULLS LAST);
CREATE INDEX "change_log_org_entity_idx" ON "change_log" USING btree ("organization_id","entity","entity_id");
CREATE INDEX "change_log_org_action_created_idx" ON "change_log" USING btree ("organization_id","action","created_at" DESC NULLS LAST);
CREATE INDEX "change_log_actor_idx" ON "change_log" USING btree ("actor_persona_id");
```

**Post-creation verification:**
- `change_log` row count: `0` (empty table, as expected)
- `change_log` in `information_schema.tables`: `[{"table_name":"change_log"}]` -- PRESENT

**Go/no-go:** Manual change_log + enums seeded; safe to proceed with `pnpm db:migrate`.

## Migration execution

**Command:** `pnpm db:migrate` (via temporary `.env` copy from `.env.local`)
**Exit code:** 0

**Verbatim stdout:**
```
No config path provided, using default 'drizzle.config.ts'
Reading config file '...\drizzle.config.ts'
Using '@neondatabase/serverless' driver for database querying
 Warning  '@neondatabase/serverless' can only connect to remote Neon/Vercel Postgres/Supabase instances through a websocket
[✓] migrations applied successfully!
```

**Note:** `drizzle.config.ts` uses `import 'dotenv/config'` which reads `.env` (not `.env.local`). Temporarily copied `.env.local` to `.env` for the migration run, then removed `.env` immediately after. The `.env.local` file was NOT modified.

## Post-migration snapshot

### drizzle.__drizzle_migrations (9 rows -- CORRECT)

```json
[
  { "id": 1, "hash": "6221cce3...", "created_at": "1774518414872" },
  { "id": 2, "hash": "5ba054ac...", "created_at": "1775573609283" },
  { "id": 3, "hash": "0ad79bd0...", "created_at": "1775573609411" },
  { "id": 4, "hash": "bd5d5976...", "created_at": "1775573609470" },
  { "id": 5, "hash": "52ef4d20...", "created_at": "1775573609530" },
  { "id": 6, "hash": "dac84677...", "created_at": "1775575413153" },
  { "id": 7, "hash": "a5317c33...", "created_at": "1775580352132" },
  { "id": 8, "hash": "0764ac2d...", "created_at": "1775944800000" },
  { "id": 9, "hash": "0807c443...", "created_at": "1775944800001" }
]
```

Row count: **9** (matches `_journal.json` -- all 9 migrations now tracked)

### departments columns (archived_at PRESENT -- FIXED)

```json
[
  { "column_name": "id" },
  { "column_name": "organization_id" },
  { "column_name": "name" },
  { "column_name": "created_at" },
  { "column_name": "archived_at" }
]
```

### disciplines columns (archived_at PRESENT -- FIXED)

```json
[
  { "column_name": "id" },
  { "column_name": "organization_id" },
  { "column_name": "name" },
  { "column_name": "abbreviation" },
  { "column_name": "created_at" },
  { "column_name": "archived_at" }
]
```

### programs columns (archived_at PRESENT -- FIXED)

```json
[
  { "column_name": "id" },
  { "column_name": "organization_id" },
  { "column_name": "name" },
  { "column_name": "description" },
  { "column_name": "created_at" },
  { "column_name": "updated_at" },
  { "column_name": "archived_at" }
]
```

### change_log table presence (PRESENT -- FIXED)

```json
[{ "table_name": "change_log" }]
```

### change_log_action enum (14 values -- includes ACTUAL_UPSERTED from 0005)

```
ALLOCATION_EDITED, ALLOCATION_HISTORIC_EDITED, ALLOCATION_BULK_COPIED,
PROPOSAL_SUBMITTED, PROPOSAL_APPROVED, PROPOSAL_REJECTED, PROPOSAL_WITHDRAWN,
PROPOSAL_EDITED, ACTUALS_BATCH_COMMITTED, ACTUALS_BATCH_ROLLED_BACK,
REGISTER_ROW_CREATED, REGISTER_ROW_UPDATED, REGISTER_ROW_DELETED,
ACTUAL_UPSERTED
```

### change_log_entity enum (9 values -- includes 'program' from 0008)

```
allocation, proposal, actual_entry, person, project, department, discipline,
import_batch, program
```

## Post-migration verification summary

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| `__drizzle_migrations` row count | 9 | 9 | PASS |
| `departments.archived_at` | PRESENT | PRESENT | PASS |
| `disciplines.archived_at` | PRESENT | PRESENT | PASS |
| `programs.archived_at` | PRESENT | PRESENT | PASS |
| `change_log` table | PRESENT | PRESENT | PASS |
| `change_log_action` includes `ACTUAL_UPSERTED` | YES | YES | PASS |
| `change_log_entity` includes `program` | YES | YES | PASS |
| `pnpm db:migrate` exit code | 0 | 0 | PASS |

## Rollback branch

Neon CLI not available locally -- rollback via Neon dashboard's branch-restore feature using the `created_at` timestamp captured above (earliest migration: `1774518414872`). Manual `psql` revert of 0005-0008 is the fallback. The Neon dashboard supports point-in-time restore on the dev branch `ep-raspy-sea-al5kxh7j-pooler` to any timestamp before the migration run.

## Smoke test evidence

**Verified:** 2026-04-20 via `claude-in-chrome` browser automation (GIF: `phase-49-admin-verification.gif`)

| Page | Verdict | Notes |
|------|---------|-------|
| `/admin` (Ändringslogg) | PASS | Change log with filter controls + data table renders. No error banner. |
| `/admin/people` | PASS | Person register table populates with rows. No error banner. |
| `/admin/departments` | PASS | 5 departments listed with Edit/Archive actions. |
| `/admin/disciplines` | PASS | 6 disciplines with abbreviations render correctly. |
| `/admin/programs` | PASS | 3 programs with descriptions render correctly. |

## Dev log tail

Console errors during smoke window: **0 NeonDbError or 500 errors**. Only message was a harmless React hydration mismatch from a browser extension (`cz-shortcut-listen` attribute).
