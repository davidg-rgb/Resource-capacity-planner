-- v6.0 Phase 53 POLISH-03 / D-02
-- One-shot migration: re-point the legacy `discipline-chart` and
-- `discipline-distribution` widget IDs to the unified `discipline-breakdown`
-- ID inside any tenant-custom `dashboard_layouts.layout` jsonb row.
--
-- Idempotent: repeated executions produce no further changes because the
-- `jsonb_set` only fires on placements whose widgetId is one of the legacy
-- values. Rows without those IDs are short-circuited by the WHERE clause.
--
-- Scope: per-tenant (UPDATE operates on rows already partitioned by
-- organization_id). No cross-tenant data movement.
--
-- NOT wired into drizzle-kit's journal. Operator applies this once manually
-- against the target environment (Phase 51 LEAN-11 precedent).

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
WHERE layout::text ~* 'discipline-chart|discipline-distribution';
