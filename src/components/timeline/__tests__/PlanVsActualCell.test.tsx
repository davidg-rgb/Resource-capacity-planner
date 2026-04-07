/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';

import sv from '@/messages/sv.json';

import { PlanVsActualCell } from '../PlanVsActualCell';

function renderCell(props: Partial<React.ComponentProps<typeof PlanVsActualCell>> = {}) {
  const defaults = {
    planned: 40,
    actual: 32 as number | null,
    delta: -8 as number | null,
    personId: 'p1',
    projectId: 'pr1',
    monthKey: '2026-04',
  };
  return render(
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      <PlanVsActualCell {...defaults} {...props} />
    </NextIntlClientProvider>,
  );
}

describe('PlanVsActualCell', () => {
  it("data-state='under' when actual < planned", () => {
    renderCell({ planned: 40, actual: 32, delta: -8 });
    const cell = screen.getByTestId('plan-vs-actual-cell');
    expect(cell.getAttribute('data-state')).toBe('under');
    expect(screen.getByTestId('cell-delta').textContent).toContain('8.0');
  });

  it("data-state='over' when actual > planned", () => {
    renderCell({ planned: 40, actual: 48, delta: 8 });
    expect(screen.getByTestId('plan-vs-actual-cell').getAttribute('data-state')).toBe('over');
  });

  it("data-state='on-plan' when actual === planned", () => {
    renderCell({ planned: 40, actual: 40, delta: 0 });
    expect(screen.getByTestId('plan-vs-actual-cell').getAttribute('data-state')).toBe('on-plan');
  });

  it("data-state='no-actual' when actual is null", () => {
    renderCell({ planned: 40, actual: null, delta: null });
    expect(screen.getByTestId('plan-vs-actual-cell').getAttribute('data-state')).toBe('no-actual');
  });

  it('uses i18n labels (sv) — Planerat appears', () => {
    renderCell();
    expect(screen.getAllByText('Planerat').length).toBeGreaterThan(0);
  });

  it('TC-UI-001 / TC-UI-003: read-only click fires onCellClick with context', async () => {
    const user = userEvent.setup();
    const onCellClick = vi.fn();
    renderCell({ onCellClick });
    await user.click(screen.getByTestId('plan-vs-actual-cell'));
    expect(onCellClick).toHaveBeenCalledWith({
      personId: 'p1',
      projectId: 'pr1',
      monthKey: '2026-04',
    });
  });

  describe('TC-UI-002: 600ms debounced edit', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('fires onCellEdit once after 600ms with the new value', () => {
      const onCellEdit = vi.fn();
      renderCell({ onCellEdit });

      const input = screen.getByLabelText('Planerat') as HTMLInputElement;
      // Simulate a few rapid keystrokes — only the last value should trigger
      // exactly one onCellEdit after the 600ms debounce window.
      fireEvent.change(input, { target: { value: '4' } });
      fireEvent.change(input, { target: { value: '41' } });
      fireEvent.change(input, { target: { value: '42' } });

      vi.advanceTimersByTime(599);
      expect(onCellEdit).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onCellEdit).toHaveBeenCalledTimes(1);
      expect(onCellEdit).toHaveBeenCalledWith(42);
    });
  });
});
