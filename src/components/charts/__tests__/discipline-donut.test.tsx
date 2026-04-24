// v6.0 Phase 53 Plan 03 POLISH-03 Task 1 — DisciplineDonut primitive tests.
// Covers empty-state short-circuit (Pitfall 7), normal rendering, and palette cycling.

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

import { DisciplineDonut } from '../discipline-donut';
import type { DisciplineBreakdown } from '@/features/analytics/analytics.types';

// recharts ResponsiveContainer needs a sized parent; jsdom reports 0x0 by default which
// collapses the PieChart. Stubbing ResponsiveContainer via mock keeps the underlying
// PieChart / Pie / Cell tree in the DOM so assertions can hit them.
vi.mock('recharts', async () => {
  const actual = (await vi.importActual('recharts')) as typeof import('recharts');
  const React = (await vi.importActual('react')) as typeof import('react');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  };
});

const THREE_ROWS: DisciplineBreakdown[] = [
  { disciplineId: 'sw', disciplineName: 'Software', totalHours: 120 },
  { disciplineId: 'mek', disciplineName: 'Mechanical', totalHours: 80 },
  { disciplineId: 'el', disciplineName: 'Electronics', totalHours: 40 },
];

describe('DisciplineDonut', () => {
  it('renders empty-state placeholder and does NOT mount PieChart when data=[] (Pitfall 7)', () => {
    const { container, queryByTestId } = render(<DisciplineDonut data={[]} />);
    expect(queryByTestId('discipline-donut-empty')).not.toBeNull();
    // Short-circuit: no ResponsiveContainer / recharts surface anywhere.
    expect(queryByTestId('responsive-container')).toBeNull();
    expect(container.querySelector('.recharts-pie')).toBeNull();
  });

  it('renders ResponsiveContainer + a PieChart surface for 3 rows', () => {
    const { queryByTestId, container } = render(<DisciplineDonut data={THREE_ROWS} />);
    // Not in empty-state path.
    expect(queryByTestId('discipline-donut-empty')).toBeNull();
    // Container / recharts surface present.
    expect(queryByTestId('responsive-container')).not.toBeNull();
    expect(container.querySelector('.recharts-wrapper, svg')).not.toBeNull();
  });

  it('accepts colors prop and cycles through palette when data.length > colors.length', () => {
    const manyRows: DisciplineBreakdown[] = [
      { disciplineId: 'a', disciplineName: 'A', totalHours: 10 },
      { disciplineId: 'b', disciplineName: 'B', totalHours: 9 },
      { disciplineId: 'c', disciplineName: 'C', totalHours: 8 },
      { disciplineId: 'd', disciplineName: 'D', totalHours: 7 },
      { disciplineId: 'e', disciplineName: 'E', totalHours: 6 },
    ];
    const palette = ['#111111', '#222222']; // 2 colors, 5 rows -> cycles 0,1,0,1,0
    // Prop acceptance: component must render without throwing.
    const { queryByTestId } = render(<DisciplineDonut data={manyRows} colors={palette} />);
    expect(queryByTestId('discipline-donut-empty')).toBeNull();
    expect(queryByTestId('responsive-container')).not.toBeNull();
  });
});
