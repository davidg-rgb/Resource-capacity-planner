-- v6.0 Phase 53 POLISH-03 / D-02
-- One-shot migration: re-point the legacy `discipline-chart` and
-- `discipline-distribution` widget IDs to the unified `discipline-breakdown`
-- ID inside any tenant-custom `dashboard_layouts.layout` jsonb row.
--
-- Idempotent: repeated executions produce no further changes because the
-- `jsonb_set` only fires on placements whose widgetId is one of the legacy
-- values, and the dedupe step keeps only the earliest (lowest position)
-- `discipline-breakdown` placement per layout.
--
-- Phase 53 REVIEW-VERIFY-FIX MN-01: if a tenant layout contains BOTH legacy
-- IDs, the rename would emit two `discipline-breakdown` placements side-by-
-- side and the widget registry would mount the chart twice. The dedupe pass
-- strips duplicates, keeping the first occurrence (lowest position) so the
-- visual anchor stays put.
--
-- Scope: per-tenant (UPDATE operates on rows already partitioned by
-- organization_id). No cross-tenant data movement.
--
-- NOT wired into drizzle-kit's journal. Operator applies this once manually
-- against the target environment (Phase 51 LEAN-11 precedent).

-- Pass 1: rename legacy IDs to discipline-breakdown.
-- audit-r1 / D-CR-12: WHERE clause uses EXISTS over jsonb_array_elements
-- instead of `layout::text ~* 'discipline-chart|discipline-distribution'`.
-- The text-cast regex is fragile — it would also match a layout that
-- happened to embed those tokens elsewhere (e.g. a metadata blob, or a
-- legacy widget whose name was a substring like 'discipline-chart-v2').
-- The structural EXISTS check matches only on actual widgetId placements
-- and stays idempotent (repeated executions match nothing after pass 1).
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

-- Pass 2: dedupe. Keep the first `discipline-breakdown` placement per layout
-- (lowest position, then stable ordinal order), drop subsequent duplicates.
-- Rows that contain zero or one `discipline-breakdown` placement are short-
-- circuited by the WHERE clause (no jsonb rewrite cost in the common case).
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
