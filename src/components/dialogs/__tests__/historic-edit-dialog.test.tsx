/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 40 / Plan 40-05 Wave 4 (TC-PS-005): HistoricEditDialog.
 *
 * Asserts the hand-rolled `<div role="dialog" aria-modal="true">` primitive
 * (D-14 post-research), Escape/Enter keyboard handling, and the confirm/cancel
 * button round-trip. The PATCH round-trip itself with
 * `confirmHistoric: true` is covered by PmTimelineCell (Task 1b #4) and the
 * server-side contract in patch-allocation.contract.test.ts (TC-PS-006 from
 * Plan 40-01).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';

import sv from '@/messages/sv.json';

import { HistoricEditDialog } from '../historic-edit-dialog';

function renderDialog(props: Partial<React.ComponentProps<typeof HistoricEditDialog>> = {}) {
  const defaults: React.ComponentProps<typeof HistoricEditDialog> = {
    open: true,
    targetMonthKey: '2026-03',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  return {
    ...merged,
    ...render(
      <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
        <HistoricEditDialog {...merged} />
      </NextIntlClientProvider>,
    ),
  };
}

describe('HistoricEditDialog (TC-PS-005)', () => {
  beforeEach(() => {
    // user-event will simulate keyboard events on document
  });
  afterEach(() => {
    cleanup();
  });

  it('renders with role="dialog" and aria-modal="true"', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('body text contains the target month key (2026-03)', () => {
    renderDialog({ targetMonthKey: '2026-03' });
    expect(screen.getByText(/2026-03/)).toBeInTheDocument();
  });

  it('returns null when open=false', () => {
    const { onConfirm, onCancel } = renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('pressing Enter fires onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });
    await user.keyboard('{Enter}');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('pressing Escape fires onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderDialog({ onCancel });
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clicking the Cancel button fires onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderDialog({ onCancel });
    // sv: v5.historicEdit.cancel = "Avbryt"
    await user.click(screen.getByRole('button', { name: /avbryt/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clicking the Confirm button fires onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });
    // sv: v5.historicEdit.confirm = "Fortsätt"
    await user.click(screen.getByRole('button', { name: /fortsätt/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
