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
    healthy: {
      bg: 'bg-success-container/40',
      text: 'text-on-success-container',
      dot: 'bg-success',
    },
    warning: {
      bg: 'bg-warning-container/40',
      text: 'text-on-warning-container',
      dot: 'bg-warning',
    },
    overloaded: { bg: 'bg-error-container/40', text: 'text-on-error-container', dot: 'bg-error' },
    empty: {
      bg: 'bg-surface-container-low',
      text: 'text-on-surface-variant',
      dot: 'bg-outline-variant',
    },
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
  over: 'bg-error-container/60 text-on-error-container font-semibold',
  healthy: 'bg-success-container/60 text-on-success-container',
  under: 'bg-warning-container/60 text-on-warning-container',
  idle: 'bg-surface-container-low text-outline-variant',
};
