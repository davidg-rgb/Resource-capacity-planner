# Prod migration session — 2026-04-28

**Goal:** apply 4 outstanding operator-only migrations against production Neon DB in a single session.

**Time:** ~10-15 minutes including verification.

**Tools:** Neon console SQL editor (or `psql $PROD_DATABASE_URL`).

**Result table to fill in as you go:**

| # | Migration | Pre-count | Post-count | Re-run count | Status |
|---|---|---:|---:|---:|---|
| 1 | discipline rename | _____ | _____ | _____ | ☐ |
| 2 | strip widgets | _____ | _____ | _____ | ☐ |
| 3 | strip resource-conflicts | _____ | _____ | _____ | ☐ |
| 4 | hours CHECK constraint | _____ | n/a | n/a | ☐ |

---

## Step 0 — Connect

Open the Neon console for the prod project (the one with `DATABASE_URL` set in Vercel) and verify:

```sql
SELECT current_database(), current_user, version();
```

Confirm you're on prod, not a preview branch.

---

## Step 1 — Audit BEFORE applying anything

Run all 4 audit queries to capture the baseline counts. Record in the result table.

```sql
-- 1.1 discipline rename target rows
SELECT COUNT(*) AS rename_targets
FROM dashboard_layouts
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(layout) p
  WHERE p->>'widgetId' IN ('discipline-chart','discipline-distribution')
);

-- 1.2 strip-widgets target rows
SELECT COUNT(*) AS strip_widgets_targets
FROM dashboard_layouts
WHERE layout::text ~* 'bench-report|strategic-alerts';

-- 1.3 strip-resource-conflicts target rows
SELECT COUNT(*) AS strip_resource_conflicts_targets
FROM dashboard_layouts
WHERE layout::text ~* 'resource-conflicts';

-- 1.4 hours-CHECK pre-flight (must be 0)
SELECT COUNT(*) AS hours_violations
FROM allocations
WHERE hours < 0 OR hours > 744;
```

**Expected:**
- 1.1, 1.2, 1.3 → ≥ 0 (any value fine; 0 just means prod is already clean)
- **1.4 MUST be 0.** If non-zero, STOP — investigate violating rows before adding the CHECK constraint.

---

## Step 2 — Apply migration 1: discipline rename (POLISH-03)

```sql
-- Pass 1: rename legacy IDs to discipline-breakdown
UPDATE dashboard_layouts
SET layout = (
  SELECT jsonb_agg(
    CASE
      WHEN placement->>'widgetId' IN ('discipline-chart','discipline-distribution')
        THEN jsonb_set(placement, '{widgetId}', '"discipline-breakdown"')
      ELSE placement
    END
  )
  FROM jsonb_array_elements(layout) placement
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(layout) placement
  WHERE placement->>'widgetId' IN ('discipline-chart','discipline-distribution')
);

-- Pass 2: dedupe — if a layout had BOTH legacy IDs, keep the first
-- discipline-breakdown placement, drop the rest
UPDATE dashboard_layouts
SET layout = (
  SELECT jsonb_agg(placement ORDER BY ord)
  FROM (
    SELECT
      placement,
      ord,
      ROW_NUMBER() OVER (
        PARTITION BY placement->>'widgetId'
        ORDER BY
          COALESCE((placement->>'position')::int, ord),
          ord
      ) AS rn
    FROM jsonb_array_elements(layout) WITH ORDINALITY AS t(placement, ord)
  ) ranked
  WHERE placement->>'widgetId' <> 'discipline-breakdown' OR rn = 1
)
WHERE (
  SELECT COUNT(*)
  FROM jsonb_array_elements(layout) placement
  WHERE placement->>'widgetId' = 'discipline-breakdown'
) > 1;
```

Verify post-count returns 0:

```sql
SELECT COUNT(*) AS rename_targets_after
FROM dashboard_layouts
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(layout) p
  WHERE p->>'widgetId' IN ('discipline-chart','discipline-distribution')
);
```

---

## Step 3 — Apply migration 2: strip-widgets (POLISH-04 + POLISH-06)

```sql
UPDATE dashboard_layouts
SET layout = (
  SELECT jsonb_agg(placement)
  FROM jsonb_array_elements(layout) placement
  WHERE placement->>'widgetId' NOT IN ('bench-report', 'strategic-alerts')
)
WHERE layout::text ~* 'bench-report|strategic-alerts';
```

Verify post-count returns 0:

```sql
SELECT COUNT(*) AS strip_widgets_targets_after
FROM dashboard_layouts
WHERE layout::text ~* 'bench-report|strategic-alerts';
```

---

## Step 4 — Apply migration 3: strip-resource-conflicts (POLISH-05)

```sql
UPDATE dashboard_layouts
SET layout = (
  SELECT jsonb_agg(placement)
  FROM jsonb_array_elements(layout) placement
  WHERE placement->>'widgetId' NOT IN ('resource-conflicts')
)
WHERE layout::text ~* 'resource-conflicts';
```

Verify post-count returns 0:

```sql
SELECT COUNT(*) AS strip_resource_conflicts_targets_after
FROM dashboard_layouts
WHERE layout::text ~* 'resource-conflicts';
```

---

## Step 5 — Apply migration 4: hours CHECK constraint (R2-P1-10)

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'allocations_hours_within_month_max'
  ) THEN
    ALTER TABLE allocations
      ADD CONSTRAINT allocations_hours_within_month_max
      CHECK (hours >= 0 AND hours <= 744);
  END IF;
END
$$;
```

Verify the constraint exists:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'allocations_hours_within_month_max';
```

**Expected:** 1 row, definition `CHECK ((hours >= 0) AND (hours <= 744))`.

---

## Step 6 — Idempotence re-run

Run all of Steps 2-5 a SECOND time. The polish migrations should produce 0 row updates (their WHERE / EXISTS clauses short-circuit); the CHECK migration's `IF NOT EXISTS` guard short-circuits.

Re-run the audit queries from Step 1 — counts 1.1/1.2/1.3 should still be 0; constraint from 1.4 should still exist.

---

## Step 7 — Close out

After all 4 migrations apply cleanly:

1. Tell me the result table values (or paste them in chat).
2. I'll update `.planning/phases/53-chrome-polish/53-HUMAN-UAT.md` Test 3 from `pending` to `pass` with the operator name + date.
3. I'll update `.planning/STATE.md` Deferred Items table to drop the Test 3 row.
4. I'll add a one-line note to `.planning/MILESTONES.md` v6.0 entry confirming Test 3 closure.

---

## Rollback (only if something breaks)

- **Polish migrations:** Neon point-in-time recovery (7-day branch history) for full rollback. Per-tenant manual JSONB patches if you saved pre-state. The flag-off (`uiV6.polish=false`) code path renders pre-trim layouts from `LEGACY_LAYOUTS` — gives behavioral rollback even without DB rollback.
- **CHECK constraint:** `ALTER TABLE allocations DROP CONSTRAINT allocations_hours_within_month_max;`
