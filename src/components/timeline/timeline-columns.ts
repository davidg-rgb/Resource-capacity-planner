// v5.0 — Phase 40 / Plan 40-04 (Wave 3): ag-grid ColDef builder for the PM
// timeline grid. Produces one pinned-left person column plus one column per
// month in `monthRange`. The cell renderer is wired by name
// (`pmTimelineCellRenderer`) — the TimelineGrid wrapper registers the
// framework component.

import type { ColDef } from 'ag-grid-community';

import { formatMonthHeader } from '@/lib/date-utils';

export type TimelineZoom = 'month';

export function buildTimelineColumns(monthRange: string[], zoom: TimelineZoom = 'month'): ColDef[] {
  void zoom; // future: 'quarter' | 'year' land in Phase 42
  const personCol: ColDef = {
    field: 'personName',
    headerName: 'Person',
    pinned: 'left',
    width: 200,
  };

  const monthCols: ColDef[] = monthRange.map((month) => ({
    field: `m_${month}`,
    headerName: formatMonthHeader(month),
    width: 140,
    cellRenderer: 'pmTimelineCellRenderer',
    cellRendererParams: { monthKey: month },
  }));

  return [personCol, ...monthCols];
}
