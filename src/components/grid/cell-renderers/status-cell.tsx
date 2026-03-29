'use client';

import type { ICellRendererParams } from 'ag-grid-community';
import { getStatusColor } from '@/lib/capacity';
import type { CapacityStatus } from '@/lib/capacity';

/** Background color map for status cells matching design spec. */
const statusBg: Record<string, string> = {
  healthy: 'bg-green-50',
  warning: 'bg-amber-50',
  overloaded: 'bg-error-container/10',
};

/** Renders a color-coded dot for the capacity status pinned row. */
export function StatusCell(props: ICellRendererParams) {
  const status = props.value as CapacityStatus | undefined;
  if (!status || status === 'empty') {
    return (
      <div className="flex h-full w-full items-center justify-end">
        <span className="inline-block h-3 w-3 rounded-full bg-gray-300" title="No allocations" />
      </div>
    );
  }
  const { dot } = getStatusColor(status);
  const bg = statusBg[status] ?? '';
  const labels: Record<string, string> = {
    healthy: 'Under capacity (<85%)',
    warning: 'Near capacity (85-99%)',
    overloaded: 'Over capacity (>=100%)',
  };
  return (
    <div
      className={`-mx-4 -my-2 flex h-[calc(100%+16px)] w-[calc(100%+32px)] items-center justify-end px-4 ${bg}`}
    >
      <span className={`inline-block h-3 w-3 rounded-full ${dot}`} title={labels[status] ?? ''} />
    </div>
  );
}
