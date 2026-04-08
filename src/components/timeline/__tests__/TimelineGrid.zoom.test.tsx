/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 42 / Plan 42-03 Task 2: ZoomControls + TimelineGrid zoom re-aggregation.
 *
 * We don't mount the real ag-grid runtime — instead we assert:
 *   1. ZoomControls renders 3 buttons with aria-pressed on the active one and
 *      calls onChange with the correct level on click.
 *   2. buildTimelineColumns('quarter') returned column's valueGetter re-
 *      aggregates month-grain row data into a synthetic CellView whose
 *      plannedHours/actualHours are summed across the underlying months
 *      (TC-ZOOM RTL equivalent — the load-bearing claim is that switching
 *      zoom causes month-grain data to be re-aggregated on the fly).
 */

import { describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';

import { ZoomControls } from '../zoom-controls';
import { buildTimelineColumns } from '../timeline-columns';
import type { CellView } from '@/features/planning/planning.read';

afterEach(() => cleanup());

const messages = {
  v5: {
    timeline: {
      zoom: { month: 'Månad', quarter: 'Kvartal', year: 'År' },
    },
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="sv" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('ZoomControls', () => {
  it('renders 3 buttons labeled Månad/Kvartal/År and marks the active one pressed', () => {
    renderWithIntl(<ZoomControls value="month" onChange={() => {}} />);
    const monthBtn = screen.getByTestId('zoom-month');
    const quarterBtn = screen.getByTestId('zoom-quarter');
    const yearBtn = screen.getByTestId('zoom-year');
    expect(monthBtn).toHaveTextContent('Månad');
    expect(quarterBtn).toHaveTextContent('Kvartal');
    expect(yearBtn).toHaveTextContent('År');
    expect(monthBtn.getAttribute('aria-pressed')).toBe('true');
    expect(quarterBtn.getAttribute('aria-pressed')).toBe('false');
    expect(yearBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange with the clicked level', async () => {
    const onChange = vi.fn();
    renderWithIntl(<ZoomControls value="month" onChange={onChange} />);
    await userEvent.click(screen.getByTestId('zoom-quarter'));
    expect(onChange).toHaveBeenCalledWith('quarter');
    await userEvent.click(screen.getByTestId('zoom-year'));
    expect(onChange).toHaveBeenCalledWith('year');
  });
});

describe('TimelineGrid re-aggregation via buildTimelineColumns valueGetter', () => {
  const YEAR = [
    '2026-01',
    '2026-02',
    '2026-03',
    '2026-04',
    '2026-05',
    '2026-06',
    '2026-07',
    '2026-08',
    '2026-09',
    '2026-10',
    '2026-11',
    '2026-12',
  ];

  function cell(monthKey: string, planned: number, actual: number | null): CellView {
    return {
      personId: 'p1',
      monthKey,
      allocationId: `a-${monthKey}`,
      plannedHours: planned,
      actualHours: actual,
      pendingProposal: null,
    };
  }

  it('switching from month to quarter reduces column count from 12 to 4', () => {
    const monthCols = buildTimelineColumns(YEAR, 'month');
    const quarterCols = buildTimelineColumns(YEAR, 'quarter');
    // 1 pinned + N data cols
    expect(monthCols.length - 1).toBe(12);
    expect(quarterCols.length - 1).toBe(4);
  });

  it('Q4-2026 valueGetter sums planned+actual across Oct/Nov/Dec month-grain row data', () => {
    const cols = buildTimelineColumns(YEAR, 'quarter');
    const q4 = cols.find((c) => c.field === 'q_2026-Q4')!;
    const row: Record<string, CellView | string | null> = {
      personId: 'p1',
      personName: 'Alice',
    };
    for (const mk of YEAR) row[`m_${mk}`] = null;
    row['m_2026-10'] = cell('2026-10', 10, 8);
    row['m_2026-11'] = cell('2026-11', 20, null);
    row['m_2026-12'] = cell('2026-12', 15, 17);

    // ag-grid ValueGetterParams stub — only .data is used by our valueGetter
    const getter = q4.valueGetter as unknown as (p: { data: typeof row }) => CellView | null;
    const agg = getter({ data: row });
    expect(agg).not.toBeNull();
    expect(agg!.aggregate).toBe(true);
    expect(agg!.plannedHours).toBe(45); // 10 + 20 + 15
    expect(agg!.actualHours).toBe(25); // 8 + 17 (null skipped but anyActual=true)
    expect(agg!.underlyingMonths).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(agg!.monthKey).toBe('2026-Q4');
  });

  it('year valueGetter returns null when no underlying cells exist', () => {
    const cols = buildTimelineColumns(YEAR, 'year');
    const y = cols.find((c) => c.field === 'y_2026')!;
    const row: Record<string, CellView | string | null> = {
      personId: 'p1',
      personName: 'Alice',
    };
    for (const mk of YEAR) row[`m_${mk}`] = null;
    const getter = y.valueGetter as (p: { data: typeof row }) => CellView | null;
    expect(getter({ data: row })).toBeNull();
  });
});
