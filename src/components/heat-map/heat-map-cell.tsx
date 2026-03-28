'use client';

import { calculateHeatMapStatus, HEAT_MAP_COLORS } from '@/lib/capacity';

interface HeatMapCellProps {
  hours: number;
  targetHours: number;
}

export function HeatMapCell({ hours, targetHours }: HeatMapCellProps) {
  const status = calculateHeatMapStatus(hours, targetHours);

  return (
    <td
      className={`px-2 py-1 text-center text-xs tabular-nums ${HEAT_MAP_COLORS[status]}`}
    >
      {hours}
    </td>
  );
}
