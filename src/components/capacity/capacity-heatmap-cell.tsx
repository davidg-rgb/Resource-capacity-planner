// v5.0 — Phase 41 / Plan 41-02 Task 2 (D-11, UX-V5-04):
// Presentational capacity-heatmap cell. Pure <td> — parent handles layout.
// Color tokens per v5 thresholds (NOT the v4 analytics thresholds).

import type { UtilizationCell, CapacityStatus } from '@/features/capacity/capacity.types';

const STATUS_CLASS: Record<CapacityStatus, string> = {
  ok: 'bg-green-200 dark:bg-green-900/40',
  under: 'bg-amber-200 dark:bg-amber-900/40',
  over: 'bg-red-300 dark:bg-red-900/60',
  absent: 'bg-neutral-200 dark:bg-neutral-800',
};

export interface CapacityHeatmapCellProps {
  cell: UtilizationCell | null;
}

export function CapacityHeatmapCell({ cell }: CapacityHeatmapCellProps) {
  if (!cell) {
    // Missing cell — render as absent.
    return (
      <td
        className={`${STATUS_CLASS.absent} border-outline-variant/20 border px-3 py-2 text-center text-sm tabular-nums`}
      >
        —
      </td>
    );
  }

  const className = `${STATUS_CLASS[cell.status]} border-outline-variant/20 border px-3 py-2 text-center text-sm tabular-nums`;
  const label = cell.status === 'absent' ? '—' : `${Math.round(cell.utilizationPct)}%`;
  const title = cell.targetIsDefault ? 'using default 160h' : undefined;

  return (
    <td className={className} title={title} data-status={cell.status}>
      {label}
    </td>
  );
}
