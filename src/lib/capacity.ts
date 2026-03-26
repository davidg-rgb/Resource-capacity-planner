/**
 * Capacity status calculation for person allocation grids.
 * Thresholds per INPUT-05: green (<90%), amber (90-100%), red (>100%), gray (no data).
 */

export type CapacityStatus = 'green' | 'amber' | 'red' | 'gray';

/**
 * Calculate capacity status based on allocated hours vs target hours.
 * - gray: no allocations or no target
 * - green: utilization below 90%
 * - amber: utilization between 90% and 100% (inclusive)
 * - red: utilization above 100%
 */
export function calculateStatus(sumHours: number, targetHours: number): CapacityStatus {
  if (targetHours === 0 || sumHours === 0) return 'gray';

  const ratio = sumHours / targetHours;

  if (ratio < 0.9) return 'green';
  if (ratio <= 1.0) return 'amber';
  return 'red';
}

/**
 * Map a capacity status to a Tailwind CSS background class.
 */
export function getStatusColor(status: CapacityStatus): string {
  const colors: Record<CapacityStatus, string> = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    gray: 'bg-gray-300',
  };
  return colors[status];
}
