/**
 * Capacity calculation utilities used across views.
 *
 * Two status systems:
 * 1. calculateStatus() — person input form status dots (green/amber/red/gray)
 * 2. calculateHeatMapStatus() — team overview heat map (over/healthy/under/idle)
 */

// ---------------------------------------------------------------------------
// Input Form Status (person sidebar dots, grid status row)
// ---------------------------------------------------------------------------

export type CapacityStatus = 'healthy' | 'warning' | 'overloaded' | 'empty';

/**
 * Calculate capacity status for a person in a given month.
 * Per ARCHITECTURE.md Section 6.14:
 * - empty: totalHours = 0
 * - healthy: utilization < 85%
 * - warning: utilization 85-99%
 * - overloaded: utilization >= 100%
 */
export function calculateStatus(sumHours: number, targetHours: number): CapacityStatus {
  if (sumHours === 0) return 'empty';
  if (targetHours === 0) return 'overloaded'; // hours with no target = overloaded

  const ratio = sumHours / targetHours;

  if (ratio >= 1.0) return 'overloaded';
  if (ratio >= 0.85) return 'warning';
  return 'healthy';
}

/**
 * Map a capacity status to Tailwind CSS color classes.
 */
export function getStatusColor(status: CapacityStatus): { bg: string; text: string; dot: string } {
  const colors: Record<CapacityStatus, { bg: string; text: string; dot: string }> = {
    healthy:    { bg: 'bg-green-50', text: 'text-emerald-800', dot: 'bg-green-500' },
    warning:    { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
    overloaded: { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-500' },
    empty:      { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300' },
  };
  return colors[status];
}

// ---------------------------------------------------------------------------
// Heat map status (TEAM-01 thresholds — different from input form above)
// ---------------------------------------------------------------------------

export type HeatMapStatus = 'over' | 'healthy' | 'under' | 'idle';

/**
 * Heat map status per TEAM-01 specification.
 * Different thresholds from the input form's calculateStatus():
 *   over: >100% (red), healthy: 80-100% (green), under: 50-79% (yellow), idle: <50% (grey)
 */
export function calculateHeatMapStatus(hours: number, targetHours: number): HeatMapStatus {
  if (targetHours === 0) return 'idle';
  const ratio = hours / targetHours;
  if (ratio > 1.0) return 'over';
  if (ratio >= 0.8) return 'healthy';
  if (ratio >= 0.5) return 'under';
  return 'idle';
}

export const HEAT_MAP_COLORS: Record<HeatMapStatus, string> = {
  over:    'bg-red-500/80 text-white',
  healthy: 'bg-green-500/60 text-green-950',
  under:   'bg-amber-400/60 text-amber-950',
  idle:    'bg-gray-200 text-gray-500',
};
