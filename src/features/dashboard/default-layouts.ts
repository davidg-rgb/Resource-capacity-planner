// v6.0 Phase 53 Plan 03 POLISH-03 / D-02 / D-07 — DEFAULT_LAYOUTS now references
// the unified 'discipline-breakdown' widget in 3 slots (manager:desktop[5],
// manager:mobile[6], project-leader:desktop[3]) replacing the legacy
// 'discipline-chart' + 'discipline-distribution' IDs. LEGACY_LAYOUTS is
// unchanged — flag-off / rollback still renders the legacy widgets (D-FLAG).
// Per D-06 the legacy widget files remain registered; physical deletion is
// deferred to a post-rollout cleanup phase.
//
// v6.0 Phase 53 Plan 04 POLISH-04 + POLISH-06 — bench-report removed from
// manager:desktop (availability-finder slides 8 -> 7); strategic-alerts removed
// from manager:mobile (replaced by inline <StrategicAlertsBanner> above the
// manager dashboard grid). LEGACY_LAYOUTS preserved verbatim for flag-off
// rollback; physical widget files stay on disk per D-06.
//
// v6.0 Phase 53 Plan 05 POLISH-05 — resource-conflicts removed from 3 slots
// (manager:mobile[4], project-leader:desktop[5], project-leader:mobile[2]);
// moved to /alerts?tab=conflicts. LEGACY_LAYOUTS preserves the 3 placements
// for flag-off rollback; widget file stays registered per D-06.
import type { WidgetPlacement } from './widget-registry.types';

// ---------------------------------------------------------------------------
// Default Layouts — built-in persona defaults (tier 4 in layout resolution)
// ---------------------------------------------------------------------------
// Key format: `${dashboardId}:${deviceClass}`
// These are the fallback layouts when no personal or tenant layout exists.
// ---------------------------------------------------------------------------

/**
 * LEGACY_LAYOUTS — original layouts preserved for flag-off rollback.
 * When uiV6LeanTrim is OFF, callers pass useLegacy=true to get these.
 */
export const LEGACY_LAYOUTS: Record<string, WidgetPlacement[]> = {
  // -----------------------------------------------------------------------
  // Manager — Desktop (Legacy)
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
  // Manager — Mobile (Legacy)
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
  // Project Leader — Desktop (Legacy)
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
  // Project Leader — Mobile (Legacy)
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

// ---------------------------------------------------------------------------
// Trimmed Layouts (Phase 51 — uiV6LeanTrim ON)
// ---------------------------------------------------------------------------

export const DEFAULT_LAYOUTS: Record<string, WidgetPlacement[]> = {
  // -----------------------------------------------------------------------
  // Manager — Desktop (trimmed: utilization-heat-map -> heat-map-summary-card;
  // Phase 53 POLISH-03: discipline-chart -> discipline-breakdown;
  // Phase 53 POLISH-04: bench-report removed, availability-finder slid 8 -> 7)
  // -----------------------------------------------------------------------
  'manager:desktop': [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'heat-map-summary-card', position: 1, colSpan: 12 },
    { widgetId: 'capacity-gauges', position: 2, colSpan: 6 },
    { widgetId: 'department-bar-chart', position: 3, colSpan: 6 },
    { widgetId: 'utilization-sparklines', position: 4, colSpan: 6 },
    { widgetId: 'discipline-breakdown', position: 5, colSpan: 6 },
    { widgetId: 'capacity-forecast', position: 6, colSpan: 12 },
    { widgetId: 'availability-finder', position: 7, colSpan: 12 },
  ],

  // -----------------------------------------------------------------------
  // Manager — Mobile (trimmed: utilization-heat-map -> heat-map-summary-card;
  // Phase 53 POLISH-03: discipline-chart -> discipline-breakdown;
  // Phase 53 POLISH-06: strategic-alerts removed — replaced by inline
  // <StrategicAlertsBanner> above the manager dashboard grid;
  // Phase 53 POLISH-05: resource-conflicts removed at position 4 — moved to
  // /alerts?tab=conflicts; positions re-numbered contiguously)
  // -----------------------------------------------------------------------
  'manager:mobile': [
    { widgetId: 'kpi-cards', position: 0, colSpan: 12 },
    { widgetId: 'heat-map-summary-card', position: 1, colSpan: 12 },
    { widgetId: 'capacity-forecast', position: 2, colSpan: 12 },
    { widgetId: 'capacity-gauges', position: 3, colSpan: 12 },
    { widgetId: 'department-bar-chart', position: 4, colSpan: 12 },
    { widgetId: 'discipline-breakdown', position: 5, colSpan: 12 },
  ],

  // -----------------------------------------------------------------------
  // Project Leader — Desktop (trimmed: removed kpi-cards, capacity-forecast, availability-finder;
  // Phase 53 POLISH-03: discipline-distribution -> discipline-breakdown;
  // Phase 53 POLISH-05: resource-conflicts removed at position 5 — moved to
  // /alerts?tab=conflicts; period-comparison slides 6 -> 5)
  // -----------------------------------------------------------------------
  'project-leader:desktop': [
    { widgetId: 'capacity-distribution', position: 0, colSpan: 12 },
    { widgetId: 'availability-timeline', position: 1, colSpan: 12 },
    { widgetId: 'allocation-trends', position: 2, colSpan: 6 },
    { widgetId: 'discipline-breakdown', position: 3, colSpan: 6 },
    { widgetId: 'program-rollup', position: 4, colSpan: 12 },
    { widgetId: 'period-comparison', position: 5, colSpan: 12 },
  ],

  // -----------------------------------------------------------------------
  // Project Leader — Mobile (trimmed: removed kpi-cards, capacity-forecast, availability-finder;
  // Phase 53 POLISH-05: resource-conflicts removed at position 2 — moved to
  // /alerts?tab=conflicts; program-rollup slides 3 -> 2)
  // -----------------------------------------------------------------------
  'project-leader:mobile': [
    { widgetId: 'capacity-distribution', position: 0, colSpan: 12 },
    { widgetId: 'availability-timeline', position: 1, colSpan: 12 },
    { widgetId: 'program-rollup', position: 2, colSpan: 12 },
  ],
};

/**
 * Get the default layout for a dashboard and device class.
 * Falls back to manager desktop if no matching default exists.
 *
 * @param useLegacy - When true, returns original (pre-trim) layouts for rollback.
 *                    Callers pass `!flags.uiV6LeanTrim` as this argument.
 */
export function getDefaultLayout(
  dashboardId: string,
  deviceClass: string,
  useLegacy?: boolean,
): WidgetPlacement[] {
  const key = `${dashboardId}:${deviceClass}`;
  const source = useLegacy ? LEGACY_LAYOUTS : DEFAULT_LAYOUTS;
  return source[key] ?? source['manager:desktop'];
}
