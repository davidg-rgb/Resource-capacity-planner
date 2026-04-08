// v5.0 — Phase 40 / Plan 40-04 (Wave 3): ag-grid ColDef builder for the PM
// timeline grid. Produces one pinned-left person column plus one column per
// month / quarter / year in `monthRange`.
//
// Phase 42 / Plan 42-03 (Wave 2): quarter + year branches. Zoom is a
// presentation concern — the read model always returns month-grain data and
// the column builder aggregates client-side using the ISO-year-majority
// helpers from `src/lib/time/iso-calendar.ts` (Wave 0).

import type { ColDef, ValueGetterParams } from 'ag-grid-community';

import { formatMonthHeader } from '@/lib/date-utils';
import {
  quarterKeyForMonth,
  rangeQuarters,
  rangeYears,
  yearKeyForMonth,
} from '@/lib/time/iso-calendar';
import { formatQuarter, formatYear } from '@/lib/time/formatters';
import type { CellView } from '@/features/planning/planning.read';

export type TimelineZoom = 'month' | 'quarter' | 'year';

/**
 * Aggregate a set of month CellViews into a synthetic CellView for a quarter /
 * year column. Planned hours sum; actual hours sum iff at least one underlying
 * month has a non-null actual (else null = 'no-actual' state). Identity fields
 * (personId, monthKey) carry over from the first underlying month so the
 * existing drill-down drawer context stays populated.
 */
function aggregateCellViews(
  cells: Array<CellView | null | undefined>,
  bucketKey: string,
  underlyingMonths: string[],
): CellView | null {
  const present = cells.filter((c): c is CellView => !!c);
  if (present.length === 0) return null;
  let plannedSum = 0;
  let actualSum = 0;
  let anyActual = false;
  for (const c of present) {
    plannedSum += c.plannedHours;
    if (c.actualHours !== null) {
      anyActual = true;
      actualSum += c.actualHours;
    }
  }
  return {
    personId: present[0].personId,
    monthKey: bucketKey,
    allocationId: null,
    plannedHours: plannedSum,
    actualHours: anyActual ? actualSum : null,
    pendingProposal: null,
    aggregate: true,
    underlyingMonths,
  };
}

function personColumn(): ColDef {
  return {
    field: 'personName',
    headerName: 'Person',
    pinned: 'left',
    width: 200,
  };
}

function monthColumns(monthRange: string[]): ColDef[] {
  return monthRange.map((month) => ({
    field: `m_${month}`,
    headerName: formatMonthHeader(month),
    width: 140,
    cellRenderer: 'pmTimelineCellRenderer',
    cellRendererParams: { monthKey: month },
  }));
}

function quarterColumns(monthRange: string[]): ColDef[] {
  const quarters = rangeQuarters(monthRange);
  return quarters.map((quarterKey) => {
    const underlyingMonths = monthRange.filter((m) => quarterKeyForMonth(m) === quarterKey);
    return {
      field: `q_${quarterKey}`,
      headerName: formatQuarter(quarterKey, 'sv'),
      width: 160,
      cellRenderer: 'pmTimelineCellRenderer',
      cellRendererParams: { monthKey: quarterKey, underlyingMonths, aggregate: true },
      valueGetter: (params: ValueGetterParams) => {
        const row = params.data as Record<string, unknown> | undefined;
        if (!row) return null;
        const cells = underlyingMonths.map((mk) => row[`m_${mk}`] as CellView | null | undefined);
        return aggregateCellViews(cells, quarterKey, underlyingMonths);
      },
    };
  });
}

function yearColumns(monthRange: string[]): ColDef[] {
  const years = rangeYears(monthRange);
  return years.map((yearKey) => {
    const underlyingMonths = monthRange.filter((m) => yearKeyForMonth(m) === yearKey);
    return {
      field: `y_${yearKey}`,
      headerName: formatYear(yearKey, 'sv'),
      width: 180,
      cellRenderer: 'pmTimelineCellRenderer',
      cellRendererParams: { monthKey: yearKey, underlyingMonths, aggregate: true },
      valueGetter: (params: ValueGetterParams) => {
        const row = params.data as Record<string, unknown> | undefined;
        if (!row) return null;
        const cells = underlyingMonths.map((mk) => row[`m_${mk}`] as CellView | null | undefined);
        return aggregateCellViews(cells, yearKey, underlyingMonths);
      },
    };
  });
}

export function buildTimelineColumns(monthRange: string[], zoom: TimelineZoom = 'month'): ColDef[] {
  const pinned = personColumn();
  switch (zoom) {
    case 'month':
      return [pinned, ...monthColumns(monthRange)];
    case 'quarter':
      return [pinned, ...quarterColumns(monthRange)];
    case 'year':
      return [pinned, ...yearColumns(monthRange)];
    default: {
      const _exhaustive: never = zoom;
      throw new Error(`buildTimelineColumns: unknown zoom '${String(_exhaustive)}'`);
    }
  }
}
