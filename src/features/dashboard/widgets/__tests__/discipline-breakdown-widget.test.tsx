// v6.0 Phase 53 Plan 03 POLISH-03 Task 2 — Unified discipline-breakdown widget tests.
// Covers: scope inference (org vs project), chart-type toggle + default per D-07,
// progress-bar small-N fallback per D-02, and normalizeProjectStaffing unit test
// (Pitfall 5 — wrong totals).

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

// ---- Mocks (must be declared before importing the module under test) --------

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const useDisciplineBreakdownMock = vi.fn();
vi.mock('@/hooks/use-dashboard', () => ({
  useDisciplineBreakdown: (...args: unknown[]) => useDisciplineBreakdownMock(...args),
}));

const useProjectStaffingMock = vi.fn();
vi.mock('@/hooks/use-project-staffing', () => ({
  useProjectStaffing: (...args: unknown[]) => useProjectStaffingMock(...args),
}));

vi.mock('@/components/charts/discipline-chart', () => ({
  DisciplineChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="bar-chart" data-rowcount={data.length} />
  ),
}));

vi.mock('@/components/charts/discipline-donut', () => ({
  DisciplineDonut: ({ data }: { data: unknown[] }) => (
    <div data-testid="donut-chart" data-rowcount={data.length} />
  ),
}));

vi.mock('@/components/project-view/discipline-distribution', () => ({
  DisciplineDistribution: ({ people }: { people: unknown[] }) => (
    <div data-testid="progress-bar-fallback" data-peoplecount={people.length} />
  ),
}));

import {
  DisciplineBreakdownWidget,
  normalizeProjectStaffing,
} from '../discipline-breakdown-widget';

const TIME_RANGE = { from: '2026-01', to: '2026-06' };

function renderWidget(config: Record<string, unknown>) {
  return render(
    <DisciplineBreakdownWidget config={config} timeRange={TIME_RANGE} isEditMode={false} />,
  );
}

beforeEach(() => {
  useDisciplineBreakdownMock.mockReset();
  useProjectStaffingMock.mockReset();
  // Default: both hooks return empty success.
  useDisciplineBreakdownMock.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
  useProjectStaffingMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
  });
});

describe('DisciplineBreakdownWidget — scope inference', () => {
  it('config={} -> org scope: useDisciplineBreakdown called, default chart = bar (D-07)', () => {
    const orgRows = [
      { disciplineId: 'sw', disciplineName: 'Software', totalHours: 120 },
      { disciplineId: 'mek', disciplineName: 'Mechanical', totalHours: 80 },
      { disciplineId: 'el', disciplineName: 'Electronics', totalHours: 40 },
    ];
    useDisciplineBreakdownMock.mockReturnValue({
      data: orgRows,
      isLoading: false,
      error: null,
    });

    const { queryByTestId } = renderWidget({});

    // Hook was invoked.
    expect(useDisciplineBreakdownMock).toHaveBeenCalled();
    // Default for org = bar.
    expect(queryByTestId('bar-chart')).not.toBeNull();
    expect(queryByTestId('donut-chart')).toBeNull();
    expect(queryByTestId('progress-bar-fallback')).toBeNull();
  });

  it('config={projectId} -> project scope: useProjectStaffing called with projectId, default chart = donut (D-07)', () => {
    useProjectStaffingMock.mockReturnValue({
      data: {
        projectId: 'abc',
        projectName: 'Project',
        programName: null,
        people: [
          {
            personId: 'p1',
            firstName: 'A',
            lastName: 'A',
            discipline: 'SW',
            targetHoursPerMonth: 160,
            months: { '2026-01': 60, '2026-02': 40 },
          },
          {
            personId: 'p2',
            firstName: 'B',
            lastName: 'B',
            discipline: 'SW',
            targetHoursPerMonth: 160,
            months: { '2026-01': 80 },
          },
          {
            personId: 'p3',
            firstName: 'C',
            lastName: 'C',
            discipline: 'Mek',
            targetHoursPerMonth: 160,
            months: { '2026-01': 50 },
          },
          {
            personId: 'p4',
            firstName: 'D',
            lastName: 'D',
            discipline: 'Elnik',
            targetHoursPerMonth: 160,
            months: { '2026-01': 30 },
          },
        ],
        months: ['2026-01', '2026-02'],
        generatedAt: '2026-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    });

    const { queryByTestId } = renderWidget({ projectId: 'abc' });

    expect(useProjectStaffingMock).toHaveBeenCalled();
    const callArgs = useProjectStaffingMock.mock.calls[0];
    expect(callArgs[0]).toBe('abc');
    // Default for project with >=3 disciplines = donut.
    expect(queryByTestId('donut-chart')).not.toBeNull();
    expect(queryByTestId('bar-chart')).toBeNull();
    expect(queryByTestId('progress-bar-fallback')).toBeNull();
  });

  it('org scope, click Donut toggle -> donut chart renders; click Bar -> bar chart', () => {
    useDisciplineBreakdownMock.mockReturnValue({
      data: [
        { disciplineId: 'sw', disciplineName: 'Software', totalHours: 120 },
        { disciplineId: 'mek', disciplineName: 'Mechanical', totalHours: 80 },
        { disciplineId: 'el', disciplineName: 'Electronics', totalHours: 40 },
      ],
      isLoading: false,
      error: null,
    });

    const { queryByTestId, getByRole } = renderWidget({});
    // Default bar.
    expect(queryByTestId('bar-chart')).not.toBeNull();

    // Toggle to donut.
    const donutTab = getByRole('tab', { name: /toggleDonut|Donut/i });
    fireEvent.click(donutTab);
    expect(queryByTestId('donut-chart')).not.toBeNull();
    expect(queryByTestId('bar-chart')).toBeNull();

    // Toggle back to bar.
    const barTab = getByRole('tab', { name: /toggleBar|Bar/i });
    fireEvent.click(barTab);
    expect(queryByTestId('bar-chart')).not.toBeNull();
    expect(queryByTestId('donut-chart')).toBeNull();
  });

  it('project scope with 2 disciplines -> progress-bar fallback (D-02 small-N)', () => {
    useProjectStaffingMock.mockReturnValue({
      data: {
        projectId: 'abc',
        projectName: 'Small',
        programName: null,
        people: [
          {
            personId: 'p1',
            firstName: 'A',
            lastName: 'A',
            discipline: 'SW',
            targetHoursPerMonth: 160,
            months: { '2026-01': 100 },
          },
          {
            personId: 'p2',
            firstName: 'B',
            lastName: 'B',
            discipline: 'Mek',
            targetHoursPerMonth: 160,
            months: { '2026-01': 50 },
          },
        ],
        months: ['2026-01'],
        generatedAt: '2026-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    });

    const { queryByTestId } = renderWidget({ projectId: 'abc' });
    expect(queryByTestId('progress-bar-fallback')).not.toBeNull();
    expect(queryByTestId('bar-chart')).toBeNull();
    expect(queryByTestId('donut-chart')).toBeNull();
  });

  it('project scope with 5 disciplines -> donut by default, toggleable to bar', () => {
    useProjectStaffingMock.mockReturnValue({
      data: {
        projectId: 'abc',
        projectName: 'Big',
        programName: null,
        people: Array.from({ length: 5 }).map((_, i) => ({
          personId: `p${i}`,
          firstName: `F${i}`,
          lastName: `L${i}`,
          discipline: `DISC_${i}`,
          targetHoursPerMonth: 160,
          months: { '2026-01': 40 },
        })),
        months: ['2026-01'],
        generatedAt: '2026-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    });

    const { queryByTestId, getByRole } = renderWidget({ projectId: 'abc' });
    expect(queryByTestId('donut-chart')).not.toBeNull();
    expect(queryByTestId('progress-bar-fallback')).toBeNull();

    const barTab = getByRole('tab', { name: /toggleBar|Bar/i });
    fireEvent.click(barTab);
    expect(queryByTestId('bar-chart')).not.toBeNull();
    expect(queryByTestId('donut-chart')).toBeNull();
  });
});

import type { ProjectStaffingResponse } from '@/features/analytics/analytics.types';

describe('normalizeProjectStaffing', () => {
  it('aggregates hours per discipline across people and months, ordered desc', () => {
    const data: ProjectStaffingResponse = {
      projectId: 'abc',
      projectName: 'P',
      programName: null,
      people: [
        {
          personId: 'p1',
          firstName: 'A',
          lastName: 'A',
          discipline: 'SW',
          targetHoursPerMonth: 160,
          months: { '2026-01': 60, '2026-02': 40 },
        },
        {
          personId: 'p2',
          firstName: 'B',
          lastName: 'B',
          discipline: 'SW',
          targetHoursPerMonth: 160,
          months: { '2026-01': 30 },
        },
        {
          personId: 'p3',
          firstName: 'C',
          lastName: 'C',
          discipline: 'Mek',
          targetHoursPerMonth: 160,
          months: { '2026-01': 200 },
        },
      ],
      months: ['2026-01', '2026-02'],
      generatedAt: '',
    };

    const rows = normalizeProjectStaffing(data);
    // SW = 60+40+30 = 130, Mek = 200. Ordered by hours desc: Mek, SW.
    expect(rows).toEqual([
      { disciplineId: 'Mek', disciplineName: 'Mek', totalHours: 200 },
      { disciplineId: 'SW', disciplineName: 'SW', totalHours: 130 },
    ]);
  });
});
