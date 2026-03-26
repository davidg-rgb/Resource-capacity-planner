'use client';

import type { ICellRendererParams } from 'ag-grid-community';
import { getStatusColor } from '@/lib/capacity';
import type { CapacityStatus } from '@/lib/capacity';

/** Renders a color-coded dot for the capacity status pinned row. */
export function StatusCell(props: ICellRendererParams) {
  const status = props.value as CapacityStatus | undefined;
  if (!status || status === 'gray') {
    return (
      <span
        className="inline-block h-3 w-3 rounded-full bg-gray-300"
        title="No allocations"
      />
    );
  }
  const colorClass = getStatusColor(status);
  const labels: Record<string, string> = {
    green: 'Under capacity (<90%)',
    amber: 'Near capacity (90-100%)',
    red: 'Over capacity (>100%)',
  };
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${colorClass}`}
      title={labels[status] ?? ''}
    />
  );
}
