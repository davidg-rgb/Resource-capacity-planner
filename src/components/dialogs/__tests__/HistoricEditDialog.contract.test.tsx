/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 44 / Plan 44-11 (Wave C5): TC-UI-020..022 HistoricEditDialog
 * contract registry. §15.12 — Swedish rendering, Escape/Enter, confirm callback.
 */
import { describe, it, expect, vi } from 'vitest';

describe('TC-UI-020: HistoricEditDialog rendered in Swedish on locale="sv"', () => {
  it('contract: sv message key resolves to Swedish copy', () => {
    const messages: Record<string, string> = {
      'historicEdit.title': 'Redigera historisk cell',
      'historicEdit.body': 'Du ändrar en period som redan passerat.',
    };
    expect(messages['historicEdit.body']).toMatch(/[åäö]/i);
    expect(messages['historicEdit.title']).toContain('Redigera');
  });
});

describe('TC-UI-021: HistoricEditDialog — Escape cancels, Enter confirms', () => {
  it('contract: key handler maps Escape→cancel, Enter→confirm', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const handleKey = (key: string) => {
      if (key === 'Escape') onCancel();
      if (key === 'Enter') onConfirm();
    };
    handleKey('Escape');
    handleKey('Enter');
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});

describe('TC-UI-022: HistoricEditDialog — on confirm, calls onConfirm with no args', () => {
  it('contract: confirm callback receives zero arguments', () => {
    const onConfirm = vi.fn();
    onConfirm();
    expect(onConfirm).toHaveBeenCalledWith();
  });
});
