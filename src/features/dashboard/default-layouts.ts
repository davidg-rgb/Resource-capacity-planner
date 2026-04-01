import type { WidgetPlacement } from './widget-registry.types';

// ---------------------------------------------------------------------------
// Default Layouts — built-in persona defaults (tier 4 in layout resolution)
// ---------------------------------------------------------------------------
// Key format: `${dashboardId}:${deviceClass}`
// These are the fallback layouts when no personal or tenant layout exists.
// ---------------------------------------------------------------------------

export const DEFAULT_LAYOUTS: Record<string, WidgetPlacement[]> = {
  // -----------------------------------------------------------------------
  // Manager — Desktop
  // -----------------------------------------------------------------------
  'manager:desktop': [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'utilization-heat-map', position: 1, colSpan: 12 },
    { widgetId: 'department-bar-chart', position: 2, colSpan: 6 },
    { widgetId: 'discipline-chart', position: 3, colSpan: 6 },
    { widgetId: 'strategic-alerts', position: 4, colSpan: 12 },
    { widgetId: 'discipline-progress', position: 5, colSpan: 4 },
    { widgetId: 'project-impact', position: 6, colSpan: 4 },
  ],

  // -----------------------------------------------------------------------
  // Manager — Mobile (all full-width, stacked vertically)
  // -----------------------------------------------------------------------
  'manager:mobile': [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'utilization-heat-map', position: 1, colSpan: 12 },
    { widgetId: 'department-bar-chart', position: 2, colSpan: 12 },
    { widgetId: 'discipline-chart', position: 3, colSpan: 12 },
    { widgetId: 'strategic-alerts', position: 4, colSpan: 12 },
    { widgetId: 'discipline-progress', position: 5, colSpan: 12 },
    { widgetId: 'project-impact', position: 6, colSpan: 12 },
  ],

  // -----------------------------------------------------------------------
  // Project Leader — Desktop
  // -----------------------------------------------------------------------
  'project-leader:desktop': [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'stacked-area-chart', position: 1, colSpan: 12 },
    { widgetId: 'availability-timeline', position: 2, colSpan: 12 },
    { widgetId: 'capacity-forecast', position: 3, colSpan: 12 },
    { widgetId: 'allocation-trends', position: 4, colSpan: 6 },
    { widgetId: 'discipline-distribution', position: 5, colSpan: 6 },
    { widgetId: 'availability-finder', position: 6, colSpan: 12 },
  ],

  // -----------------------------------------------------------------------
  // Project Leader — Mobile (all full-width, stacked vertically)
  // -----------------------------------------------------------------------
  'project-leader:mobile': [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'stacked-area-chart', position: 1, colSpan: 12 },
    { widgetId: 'availability-timeline', position: 2, colSpan: 12 },
    { widgetId: 'capacity-forecast', position: 3, colSpan: 12 },
    { widgetId: 'allocation-trends', position: 4, colSpan: 12 },
    { widgetId: 'discipline-distribution', position: 5, colSpan: 12 },
    { widgetId: 'availability-finder', position: 6, colSpan: 12 },
  ],
};

/**
 * Get the default layout for a dashboard and device class.
 * Falls back to manager desktop if no matching default exists.
 */
export function getDefaultLayout(dashboardId: string, deviceClass: string): WidgetPlacement[] {
  const key = `${dashboardId}:${deviceClass}`;
  return DEFAULT_LAYOUTS[key] ?? DEFAULT_LAYOUTS['manager:desktop'];
}
