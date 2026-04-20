# Production Neon Branch Migration Checklist

**Phase:** 49 (Unbreak broken persona surfaces)
**Plan:** 03 (Admin 500 fix -- migration remediation)
**Created:** 2026-04-20
**Status:** NOT EXECUTED -- to be run at next production deploy

## Purpose

Apply the same Drizzle migrations (0005-0008) that fixed the dev Neon branch in Phase 49 to the production Neon branch. The root cause was environmental drift: the dev branch had only 5 of 9 tracked migrations applied, leaving `archived_at` columns absent on `departments`/`disciplines`/`programs` and the `change_log` table missing entirely.

This checklist is **NOT executed during Phase 49**. It is consumed at the next production deploy.

**Reference:** `.planning/phases/49-unbreak-broken-persona-surfaces/49-03-EVIDENCE.md` documents the identical procedure executed against the dev branch.

## Pre-deploy snapshot

- [ ] Identify the production Neon branch ID via Neon dashboard or CLI:
  ```bash
  neon branches list --project-id <project-id>
  ```

- [ ] Create a rollback branch before any changes:
  ```bash
  neon branches create \
    --name "pre-phase-49-migrate-$(date +%Y%m%d)" \
    --project-id <project-id> \
    --parent <prod-branch-id>
  ```
  Record the new rollback branch ID here: `___________`

- [ ] Capture pre-migration state by running the snapshot script against the production `DATABASE_URL`:
  ```javascript
  // tmp/prod-pre-snapshot.mjs
  import { neon } from '@neondatabase/serverless';
  const sql = neon(process.env.DATABASE_URL);

  console.log('=== drizzle.__drizzle_migrations ===');
  console.log(JSON.stringify(await sql`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`, null, 2));

  console.log('=== departments columns ===');
  console.log(JSON.stringify(await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='departments'`, null, 2));

  console.log('=== change_log table presence ===');
  console.log(JSON.stringify(await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='change_log'`, null, 2));
  ```
  ```bash
  DATABASE_URL="<prod-connection-string>" node tmp/prod-pre-snapshot.mjs
  ```

- [ ] Record the pre-migration `__drizzle_migrations` row count: `___`
- [ ] Verify no in-flight admin-page traffic by checking Vercel function logs for the last 5 minutes

## Migration 0003 idempotency (carry-over from dev)

**IMPORTANT:** On the dev branch, migration 0003 (`0003_busy_black_bird.sql`) was tracked as "applied" in `__drizzle_migrations` but its objects (enums `change_log_action`, `change_log_entity` and table `change_log`) were absent. This happened because the Neon branch was created from a snapshot before 0003's DDL was committed, while the `__drizzle_migrations` tracker was populated from a different source.

**The same situation may exist on the production branch.** Check:

- [ ] Query for enum existence:
  ```sql
  SELECT typname FROM pg_type WHERE typname IN ('change_log_action', 'change_log_entity');
  ```
- [ ] Query for table existence:
  ```sql
  SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='change_log';
  ```

**If enums and table are ABSENT but 0003 shows as applied in `__drizzle_migrations`:**

Manually seed the 0003 objects before running `pnpm db:migrate`. Execute the following SQL against the production branch:

```sql
CREATE TYPE "public"."change_log_action" AS ENUM(
  'ALLOCATION_EDITED', 'ALLOCATION_HISTORIC_EDITED', 'ALLOCATION_BULK_COPIED',
  'PROPOSAL_SUBMITTED', 'PROPOSAL_APPROVED', 'PROPOSAL_REJECTED',
  'PROPOSAL_WITHDRAWN', 'PROPOSAL_EDITED',
  'ACTUALS_BATCH_COMMITTED', 'ACTUALS_BATCH_ROLLED_BACK',
  'REGISTER_ROW_CREATED', 'REGISTER_ROW_UPDATED', 'REGISTER_ROW_DELETED'
);

CREATE TYPE "public"."change_log_entity" AS ENUM(
  'allocation', 'proposal', 'actual_entry', 'person', 'project',
  'department', 'discipline', 'import_batch'
);

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

- [ ] Verify the manual seed succeeded: `SELECT COUNT(*) FROM change_log;` (expected: 0)

**If enums and table ARE present:** Skip this section -- `pnpm db:migrate` will handle 0005-0008 cleanly.

## Execute

- [ ] Set `DATABASE_URL` environment variable to the **production** connection string (NOT dev)
- [ ] Verify the host in `DATABASE_URL` is the production identifier (NOT `ep-raspy-sea-al5kxh7j-pooler` which is dev)
- [ ] Note: `drizzle.config.ts` reads from `dotenv/config` (`.env` file, not `.env.local`). Either:
  - Temporarily set `.env` with the production `DATABASE_URL`, or
  - Export `DATABASE_URL` as an environment variable before running
- [ ] Run the migration:
  ```bash
  pnpm db:migrate
  ```
- [ ] Capture stdout/stderr verbatim: `___________`
- [ ] Confirm exit code: `___` (expected: 0)
- [ ] If exit code is non-zero, **STOP** and consult the error handling guide below

### Error handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `relation "change_log" already exists` | 0003 objects present but tracker says unapplied | Verify with `SELECT * FROM drizzle.__drizzle_migrations` -- if 0003 is missing from tracker but objects exist, manually INSERT the 0003 row into `__drizzle_migrations` |
| `column "archived_at" already exists` | Partial previous migration attempt | Check which migrations are tracked; manually apply only the missing ones |
| `duplicate enum value 'ACTUAL_UPSERTED'` | 0005 partially applied | Check `SELECT unnest(enum_range(NULL::change_log_action))` -- if value present, manually INSERT the 0005 row into `__drizzle_migrations` and skip |

## Post-deploy verification

- [ ] Re-run the three snapshot queries from pre-deploy and record results:

  | Check | Expected | Actual |
  |-------|----------|--------|
  | `__drizzle_migrations` row count | 9 | ___ |
  | `departments.archived_at` column | PRESENT | ___ |
  | `disciplines.archived_at` column | PRESENT | ___ |
  | `programs.archived_at` column | PRESENT | ___ |
  | `change_log` table | PRESENT | ___ |
  | `change_log_action` includes `ACTUAL_UPSERTED` | YES | ___ |
  | `change_log_entity` includes `program` | YES | ___ |

- [ ] Sign in as admin in production
- [ ] Navigate to each admin page and confirm it loads without error:
  - [ ] `/admin` (Andringslogg) -- renders change-log entries or empty state
  - [ ] `/admin/people` -- renders people list
  - [ ] `/admin/departments` -- renders departments list
  - [ ] `/admin/disciplines` -- renders disciplines list
  - [ ] `/admin/programs` -- renders programs list
- [ ] Tail Vercel function logs for 5 minutes after verification
  - [ ] Zero `Unhandled API error` entries mentioning `archived_at` or `change_log`
  - [ ] Zero `42703` (missing column) or `42P01` (missing relation) Postgres error codes

## Rollback

If post-deploy verification fails:

1. **Preferred: Neon branch restore**
   - Go to Neon dashboard > Project > Branches
   - Select the rollback branch created in pre-deploy snapshot
   - Promote it to replace the production branch
   - This restores the exact pre-migration state

2. **Alternative: Manual reverse SQL** (UNSAFE if application wrote data to new tables/columns)
   ```sql
   -- Only use if no data was written to change_log or archived_at columns
   ALTER TABLE departments DROP COLUMN IF EXISTS archived_at;
   ALTER TABLE disciplines DROP COLUMN IF EXISTS archived_at;
   ALTER TABLE programs DROP COLUMN IF EXISTS archived_at;
   DROP TABLE IF EXISTS change_log;
   DROP TYPE IF EXISTS change_log_action;
   DROP TYPE IF EXISTS change_log_entity;
   -- Remove migration tracker rows for 0005-0008
   DELETE FROM drizzle.__drizzle_migrations WHERE id > 5;
   ```

3. **Revert application deploy** if the migration rollback is performed -- the application code expects the new columns/tables to exist.

## Sign-off

- Operator: ___________
- Date: ___________
- Production verified: [ ]
- Rollback branch ID: ___________
- Notes: ___________
