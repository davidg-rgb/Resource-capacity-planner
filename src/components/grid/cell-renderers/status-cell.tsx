'use client';

import type { ICellRendererParams } from 'ag-grid-community';
import { getStatusColor } from '@/lib/capacity';
import type { CapacityStatus } from '@/lib/capacity';

/** Renders a color-coded dot for the capacity status pinned row. */
export function StatusCell(props: ICellRendererParams) {
  const status = props.value as CapacityStatus | undefined;
  if (!status || status === 'empty') {
    return (
      <span
        className="inline-block h-3 w-3 rounded-full bg-gray-300"
        title="No allocations"
      />
    );
  }
  const { bg } = getStatusColor(status);
  const labels: Record<string, string> = {
    healthy: 'Under capacity (<85%)',
    warning: 'Near capacity (85-99%)',
    overloaded: 'Over capacity (>=100%)',
  };
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${bg}`}
      title={labels[status] ?? ''}
    />
  );
}
