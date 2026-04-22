-- v6.0 Phase 53 POLISH-05 (Plan 53-05)
-- One-shot migration: strip the `resource-conflicts` widget ID from any
-- tenant-custom `dashboard_layouts.layout` jsonb row. The panel moves to
-- /alerts?tab=conflicts; the widget remains registered for LEGACY_LAYOUTS
-- rollback (D-06), but tenants on DEFAULT_LAYOUTS should no longer carry
-- the widget in their layout blob.
--
-- Idempotent: repeated executions produce no further changes because the
-- WHERE clause short-circuits once the ID is absent. Rows with no hits
-- are untouched.
--
-- Scope: per-tenant (UPDATE operates on rows already partitioned by
-- organization_id). No cross-tenant data movement.
--
-- NOT wired into drizzle-kit's journal. Operator applies this once manually
-- against the target environment (Phase 51 LEAN-11 precedent).
--
-- NOTE on empty result: when a layout contains ONLY `resource-conflicts`,
-- jsonb_agg over an empty set returns NULL. The widget-registry defensive
-- fallback (LEAN-08) treats null layouts as "render nothing" — tenants can
-- re-populate via edit-mode. See polish-strip-resource-conflicts.test.ts
-- Test 2.

UPDATE dashboard_layouts
SET layout = (
  SELECT jsonb_agg(placement)
  FROM jsonb_array_elements(layout) placement
  WHERE placement->>'widgetId' NOT IN ('resource-conflicts')
)
WHERE layout::text ~* 'resource-conflicts';
