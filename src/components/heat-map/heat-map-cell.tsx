'use client';

import { calculateHeatMapStatus, HEAT_MAP_COLORS } from '@/lib/capacity';

interface HeatMapCellProps {
  hours: number;
  targetHours: number;
  isCurrentMonth?: boolean;
}

export function HeatMapCell({ hours, targetHours, isCurrentMonth }: HeatMapCellProps) {
  const status = calculateHeatMapStatus(hours, targetHours);

  return (
    <td
      className={`px-4 py-3 text-center text-xs tabular-nums ${HEAT_MAP_COLORS[status]} ${isCurrentMonth ? 'border-primary/10 border-x' : ''}`}
    >
      {hours}
    </td>
  );
}
