/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 52 / Plan 52-04 (STAFF-01 / D-10): contract tests for the
 * new read-only path on PlanVsActualCell + StaffTimelineCell.
 *
 * Behaviors:
 *   T1  default (onCellEdit provided)          → data-editable="true"
 *   T2a editable=false explicit                 → data-editable="false"
 *   T2b no onCellEdit (current Phase 37 path)   → data-editable="false"
 *   T3  StaffTimelineCell always renders        → data-editable="false"
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import sv from '@/messages/sv.json';

import { PlanVsActualCell } from '../PlanVsActualCell';
import { StaffTimelineCell } from '../staff-timeline-cell';
import type { CellView } from '@/features/planning/planning.read';

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('PlanVsActualCell / StaffTimelineCell read-only contract (STAFF-01 / D-10)', () => {
  it('T1: editable path (onCellEdit provided) → data-editable="true"', () => {
    renderWithIntl(
      <PlanVsActualCell
        planned={40}
        actual={32}
        delta={-8}
        personId="p1"
        projectId="pr1"
        monthKey="2026-04"
        onCellEdit={vi.fn()}
      />,
    );
    const cell = screen.getByTestId('plan-vs-actual-cell');
    expect(cell.getAttribute('data-editable')).toBe('true');
  });

  it('T2a: explicit editable=false → data-editable="false" and renders as <button> (no inline <input>)', () => {
    renderWithIntl(
      <PlanVsActualCell
        planned={40}
        actual={32}
        delta={-8}
        personId="p1"
        projectId="pr1"
        monthKey="2026-04"
        editable={false}
        onCellEdit={vi.fn()}
      />,
    );
    const cell = screen.getByTestId('plan-vs-actual-cell');
    expect(cell.getAttribute('data-editable')).toBe('false');
    // No inline <input> renders in the read-only path
    expect(cell.querySelector('input')).toBeNull();
  });

  it('T2b: no onCellEdit → data-editable="false" (Phase 37 back-compat)', () => {
    renderWithIntl(
      <PlanVsActualCell
        planned={40}
        actual={32}
        delta={-8}
        personId="p1"
        projectId="pr1"
        monthKey="2026-04"
      />,
    );
    const cell = screen.getByTestId('plan-vs-actual-cell');
    expect(cell.getAttribute('data-editable')).toBe('false');
  });

  it('T3: StaffTimelineCell always emits data-editable="false"', () => {
    const view: CellView = {
      personId: 'p1',
      monthKey: '2026-04',
      allocationId: null,
      plannedHours: 40,
      actualHours: 32,
      pendingProposal: null,
    };
    renderWithIntl(<StaffTimelineCell view={view} projectId="pr1" />);
    const cell = screen.getByTestId('plan-vs-actual-cell');
    expect(cell.getAttribute('data-editable')).toBe('false');
  });
});
