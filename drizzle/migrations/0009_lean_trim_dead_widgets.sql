-- Phase 51: Strip dead widget IDs from custom dashboard layouts (LEAN-05, LEAN-11)
-- Dead widgets: discipline-progress, discipline-demand, project-impact
-- These have 0 default layout placements but may exist in tenant custom layouts.
-- Production re-audit row count: 0 (no affected rows in current deployment)
-- Migration is idempotent — re-running on already-cleaned rows is a no-op.

UPDATE dashboard_layouts
SET layout = COALESCE(
  (
    SELECT jsonb_agg(placement)
    FROM jsonb_array_elements(layout) placement
    WHERE placement->>'widgetId' NOT IN (
      'discipline-progress', 'discipline-demand', 'project-impact'
    )
  ),
  '[]'::jsonb
)
WHERE layout::text ~* 'discipline-progress|discipline-demand|project-impact';
