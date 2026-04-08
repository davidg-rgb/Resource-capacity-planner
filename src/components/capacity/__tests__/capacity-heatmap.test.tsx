/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 41 / Plan 41-02 Task 2 — CapacityHeatmap RTL coverage.
 *
 * Asserts v5 threshold colors (distinct from v4 analytics):
 *   - ok    → bg-green-200
 *   - under → bg-amber-200
 *   - over  → bg-red-300
 *   - absent/missing → bg-neutral-200
 * Plus: targetIsDefault adds title attribute; 2 people × 3 months renders 6 cells.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import { CapacityHeatmap } from '../capacity-heatmap';
import { CapacityHeatmapLegend } from '../capacity-heatmap-legend';
import type { UtilizationMap } from '@/features/capacity/capacity.types';

const messages = {
  v5: {
    lineManager: {
      heatmap: {
        legend: { ok: 'Ok', under: 'Under', over: 'Over', absent: 'Absent' },
      },
    },
  },
};

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

const months = ['2026-04', '2026-05', '2026-06'];

const fixture: UtilizationMap = {
  people: [
    { id: 'p-1', name: 'Anna Andersson', departmentId: 'dept-A' },
    { id: 'p-2', name: 'Bo Berg', departmentId: 'dept-A' },
  ],
  cells: [
    // Anna: ok, over, under
    {
      personId: 'p-1',
      monthKey: '2026-04',
      plannedHours: 120,
      targetHours: 160,
      targetIsDefault: false,
      utilizationPct: 75,
      status: 'ok',
    },
    {
      personId: 'p-1',
      monthKey: '2026-05',
      plannedHours: 200,
      targetHours: 160,
      targetIsDefault: false,
      utilizationPct: 125,
      status: 'over',
    },
    {
      personId: 'p-1',
      monthKey: '2026-06',
      plannedHours: 60,
      targetHours: 160,
      targetIsDefault: true,
      utilizationPct: 37,
      status: 'under',
    },
    // Bo: absent, (missing 05), ok
    {
      personId: 'p-2',
      monthKey: '2026-04',
      plannedHours: 0,
      targetHours: 0,
      targetIsDefault: false,
      utilizationPct: 0,
      status: 'absent',
    },
    {
      personId: 'p-2',
      monthKey: '2026-06',
      plannedHours: 140,
      targetHours: 160,
      targetIsDefault: false,
      utilizationPct: 87,
      status: 'ok',
    },
  ],
};

describe('<CapacityHeatmap />', () => {
  it('renders 2 people × 3 months = 6 data cells', () => {
    render(
      <Wrap>
        <CapacityHeatmap data={fixture} months={months} />
      </Wrap>,
    );

    const row1 = screen.getByText('Anna Andersson').closest('tr')!;
    const row2 = screen.getByText('Bo Berg').closest('tr')!;
    // 3 data cells per row (excluding the sticky person <th>)
    expect(within(row1).getAllByRole('cell')).toHaveLength(3);
    expect(within(row2).getAllByRole('cell')).toHaveLength(3);
  });

  it('applies bg-green-200 to ok cell', () => {
    render(
      <Wrap>
        <CapacityHeatmap data={fixture} months={months} />
      </Wrap>,
    );
    const row = screen.getByText('Anna Andersson').closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(cells[0].className).toContain('bg-green-200');
    expect(cells[0].getAttribute('data-status')).toBe('ok');
  });

  it('applies bg-red-300 to over cell', () => {
    render(
      <Wrap>
        <CapacityHeatmap data={fixture} months={months} />
      </Wrap>,
    );
    const row = screen.getByText('Anna Andersson').closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(cells[1].className).toContain('bg-red-300');
  });

  it('applies bg-amber-200 to under cell AND title attr when targetIsDefault', () => {
    render(
      <Wrap>
        <CapacityHeatmap data={fixture} months={months} />
      </Wrap>,
    );
    const row = screen.getByText('Anna Andersson').closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(cells[2].className).toContain('bg-amber-200');
    expect(cells[2].getAttribute('title')).toBe('using default 160h');
  });

  it('applies bg-neutral-200 to absent cell AND to missing-cell fallback', () => {
    render(
      <Wrap>
        <CapacityHeatmap data={fixture} months={months} />
      </Wrap>,
    );
    const row = screen.getByText('Bo Berg').closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    // 2026-04 is explicit absent
    expect(cells[0].className).toContain('bg-neutral-200');
    // 2026-05 is missing → fallback absent
    expect(cells[1].className).toContain('bg-neutral-200');
    // 2026-06 ok
    expect(cells[2].className).toContain('bg-green-200');
  });

  it('legend renders four threshold swatches', () => {
    render(
      <Wrap>
        <CapacityHeatmapLegend />
      </Wrap>,
    );
    const legend = screen.getByTestId('capacity-heatmap-legend');
    expect(legend.querySelectorAll('li')).toHaveLength(4);
  });
});
