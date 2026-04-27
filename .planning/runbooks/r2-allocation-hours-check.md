# Allocation Hours CHECK Constraint — Operator Runbook (R2-P1-10)

**Status:** Pending operator execution against production Neon DB.
**Owner:** Operator (David).
**Created:** 2026-04-27 (Round-2 audit fix-pass).
**Source:** Round-2 audit finding F-A-105 / R2-P1-10.
**Migration under test:** `src/db/migrations/20260427_audit_allocation_hours_check.sql`

This is an **operator-applied** one-shot migration — not wired into drizzle-kit's journal. Idempotent via a `DO` block that checks `pg_constraint` before adding the constraint.

## Goal

Add a defense-in-depth `CHECK (hours >= 0 AND hours <= 744)` to the
`allocations` table so the database itself rejects out-of-range hours
even if a future code path (ad-hoc SQL, alternative bulk-import,
buggy migration) bypasses the application-layer validation. The
[0, 744] range matches ARCHITECTURE.md §7 (744 = 31 days × 24 hours,
the ceiling for a single calendar month).

R1 fix F-A-011 closed the application-side gap; this migration closes
the DB-side gap. Together they form an end-to-end contract.

## Pre-flight

1. Connect to the production Neon DB via the Neon console SQL editor
   (or `psql $PROD_DATABASE_URL` if you have direct access — production
   URL lives in Vercel env vars under `DATABASE_URL`).
2. Verify the connection points at the correct project (not a preview
   branch). Check `current_database()` and the Neon project name in
   the console.
3. Open a transaction window. The migration is small and idempotent;
   running it inside `BEGIN; ... COMMIT;` is recommended but optional.

## Audit query (run BEFORE apply)

Verify no existing rows would violate the new constraint. If this
query returns >0 rows, the constraint will fail to add — investigate
and fix the offending data first.

```sql
SELECT id, person_id, project_id, month, hours
FROM allocations
WHERE hours < 0 OR hours > 744;
```

Expected: **0 rows** (the application has been enforcing the bound
since R1 / F-A-011).

If non-zero, file a follow-up ticket: each violating row needs a
manual decision (was it a clock skew, a buggy import, a one-off
demo fixture?). Do not proceed until the table is clean.

## Apply

Run the migration:

```sql
\i src/db/migrations/20260427_audit_allocation_hours_check.sql
```

Or paste its contents directly into the SQL editor. The `DO` block
makes it safe to run multiple times — the `IF NOT EXISTS` guard
short-circuits subsequent runs.

## Verify (run AFTER apply)

Confirm the constraint exists:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'allocations_hours_within_month_max';
```

Expected: **1 row**, with `pg_get_constraintdef` returning
`CHECK ((hours >= 0::numeric) AND (hours <= 744::numeric))` (PG may
inject explicit casts based on the column type).

Smoke-test the rejection path:

```sql
-- This INSERT should fail with `new row for relation "allocations"
-- violates check constraint "allocations_hours_within_month_max"`.
BEGIN;
INSERT INTO allocations (id, person_id, project_id, month, hours, ...)
VALUES (gen_random_uuid(), '<some-person>', '<some-project>',
        '2026-04', 999, ...);
ROLLBACK;
```

(Substitute valid FK values — the test only proves the CHECK fires,
not that the row is otherwise valid.)

## Rollback

If the constraint causes unexpected production breakage:

```sql
ALTER TABLE allocations DROP CONSTRAINT allocations_hours_within_month_max;
```

Then file a ticket to investigate. The application-layer guard
(BadHoursError) will continue to enforce the bound for any code path
flowing through the planning service.
