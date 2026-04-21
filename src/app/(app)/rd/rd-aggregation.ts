// v6.0 — Phase 52 / Plan 52-04 (RD-01 / D-08): zoom-aware column aggregator
// for /rd's HTML-table path (PortfolioGridResult → projects|departments × months).
//
// Distinct from `src/components/timeline/timeline-columns.ts` which handles
// ag-grid-based PM TimelineGrid zoom; that module operates on `CellView`
// (person × month) and emits ag-grid ColDefs. /rd uses a different read-model
// (`PortfolioGridRow.months: Record<string, {plannedHours, actualHours}>`) and
// a plain HTML `<table>`, so it gets its own aggregation path — but uses the
// SAME ISO-year-majority helpers from `src/lib/time/iso-calendar.ts`
// (Pitfall #4: NO `monthKey.slice(0,4)`; use `yearKeyForMonth`).

import {
  quarterKeyForMonth,
  rangeQuarters,
  rangeYears,
  yearKeyForMonth,
} from '@/lib/time/iso-calendar';
import type { TimelineZoom } from '@/components/timeline/timeline-columns';

export interface RdCellAgg {
  plannedHours: number;
  actualHours: number;
}

/**
 * Enumerate the unique column keys covering `monthRange` at the given zoom.
 *   - 'month'   → monthRange itself (identity)
 *   - 'quarter' → rangeQuarters(monthRange)    ['2026-Q1','2026-Q2',...]
 *   - 'year'    → rangeYears(monthRange)       ['2026','2027',...]
 *
 * Pitfall #4: calendar year !== ISO year. Dec 2026 has majority ISO-year 2026
 * (week 53 spans Dec 28–31 2026 + Jan 1 2027), so December 2026 buckets into
 * '2026', NOT '2027'. `yearKeyForMonth` handles this — see `iso-calendar.ts`.
 */
export function rdColumnKeys(monthRange: string[], zoom: TimelineZoom): string[] {
  switch (zoom) {
    case 'month':
      return [...monthRange];
    case 'quarter':
      return rangeQuarters(monthRange);
    case 'year':
      return rangeYears(monthRange);
    default: {
      const _exhaustive: never = zoom;
      throw new Error(`rdColumnKeys: unknown zoom '${String(_exhaustive)}'`);
    }
  }
}

/**
 * Sum `months` values into `zoom` buckets.
 *
 * Contract:
 *   - planned + actual are summed over all month-grain cells whose bucket key
 *     equals the target bucket.
 *   - Missing months are treated as zero (no allocation row).
 *   - Result shape matches input cell shape for uniform rendering.
 */
export function aggregateRdRowMonths(
  months: Record<string, RdCellAgg>,
  columnKeys: string[],
  zoom: TimelineZoom,
): Record<string, RdCellAgg> {
  if (zoom === 'month') {
    // Fast path — caller can just re-use the input, but we copy for immutability.
    const out: Record<string, RdCellAgg> = {};
    for (const key of columnKeys) {
      const cell = months[key];
      out[key] = cell ? { ...cell } : { plannedHours: 0, actualHours: 0 };
    }
    return out;
  }

  const keyFn = zoom === 'quarter' ? quarterKeyForMonth : yearKeyForMonth;
  const out: Record<string, RdCellAgg> = Object.fromEntries(
    columnKeys.map((k) => [k, { plannedHours: 0, actualHours: 0 }]),
  );
  for (const [monthKey, cell] of Object.entries(months)) {
    const bucket = keyFn(monthKey);
    const slot = out[bucket];
    if (!slot) continue; // month lies outside the enumerated range; skip
    slot.plannedHours += cell.plannedHours;
    slot.actualHours += cell.actualHours;
  }
  return out;
}
