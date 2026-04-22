-- v6.0 Phase 53 POLISH-04 + POLISH-06
-- One-shot migration: strip the deleted `bench-report` and `strategic-alerts`
-- widget IDs from any tenant-custom `dashboard_layouts.layout` jsonb row.
--
-- Idempotent: repeated executions produce no further changes because the
-- WHERE clause short-circuits once the IDs are absent. Rows with no hits
-- are untouched.
--
-- Scope: per-tenant (UPDATE operates on rows already partitioned by
-- organization_id). No cross-tenant data movement.
--
-- NOT wired into drizzle-kit's journal. Operator applies this once manually
-- against the target environment (Phase 51 LEAN-11 precedent).
--
-- NOTE on empty result: when a layout contains ONLY the stripped IDs,
-- jsonb_agg over an empty set returns NULL. The widget-registry defensive
-- fallback (LEAN-08) treats null layouts as "render nothing" — tenants can
-- re-populate via edit-mode. See polish-strip-widgets.test.ts Test 2.

UPDATE dashboard_layouts
SET layout = (
  SELECT jsonb_agg(placement)
  FROM jsonb_array_elements(layout) placement
  WHERE placement->>'widgetId' NOT IN ('bench-report', 'strategic-alerts')
)
WHERE layout::text ~* 'bench-report|strategic-alerts';
