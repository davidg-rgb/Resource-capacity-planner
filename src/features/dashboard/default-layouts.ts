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
    { widgetId: 'capacity-gauges', position: 2, colSpan: 6 },
    { widgetId: 'department-bar-chart', position: 3, colSpan: 6 },
    { widgetId: 'utilization-sparklines', position: 4, colSpan: 6 },
    { widgetId: 'discipline-chart', position: 5, colSpan: 6 },
    { widgetId: 'capacity-forecast', position: 6, colSpan: 12 },
    { widgetId: 'bench-report', position: 7, colSpan: 12 },
    { widgetId: 'availability-finder', position: 8, colSpan: 12 },
  ],

  // -----------------------------------------------------------------------
  // Manager — Mobile (essential widgets, all full-width)
  // -----------------------------------------------------------------------
  'manager:mobile': [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'utilization-heat-map', position: 1, colSpan: 12 },
    { widgetId: 'capacity-forecast', position: 2, colSpan: 12 },
    { widgetId: 'capacity-gauges', position: 3, colSpan: 12 },
    { widgetId: 'resource-conflicts', position: 4, colSpan: 12 },
    { widgetId: 'department-bar-chart', position: 5, colSpan: 12 },
    { widgetId: 'discipline-chart', position: 6, colSpan: 12 },
    { widgetId: 'strategic-alerts', position: 7, colSpan: 12 },
  ],

  // -----------------------------------------------------------------------
  // Project Leader — Desktop
  // -----------------------------------------------------------------------
  'project-leader:desktop': [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'capacity-distribution', position: 1, colSpan: 12 },
    { widgetId: 'availability-timeline', position: 2, colSpan: 12 },
    { widgetId: 'capacity-forecast', position: 3, colSpan: 12 },
    { widgetId: 'allocation-trends', position: 4, colSpan: 6 },
    { widgetId: 'discipline-distribution', position: 5, colSpan: 6 },
    { widgetId: 'program-rollup', position: 6, colSpan: 12 },
    { widgetId: 'resource-conflicts', position: 7, colSpan: 12 },
    { widgetId: 'availability-finder', position: 8, colSpan: 12 },
    { widgetId: 'period-comparison', position: 9, colSpan: 12 },
  ],

  // -----------------------------------------------------------------------
  // Project Leader — Mobile (essential widgets, all full-width)
  // -----------------------------------------------------------------------
  'project-leader:mobile': [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'capacity-distribution', position: 1, colSpan: 12 },
    { widgetId: 'availability-timeline', position: 2, colSpan: 12 },
    { widgetId: 'capacity-forecast', position: 3, colSpan: 12 },
    { widgetId: 'resource-conflicts', position: 4, colSpan: 12 },
    { widgetId: 'availability-finder', position: 5, colSpan: 12 },
    { widgetId: 'program-rollup', position: 6, colSpan: 12 },
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
