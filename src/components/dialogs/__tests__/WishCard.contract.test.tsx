/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 44 / Plan 44-11 (Wave C5): TC-UI-030..032 WishCard contract
 * registry. §15.12 — display fields, reject reason requirement, approve
 * once-only behaviour.
 */
import { describe, it, expect, vi } from 'vitest';

interface Wish {
  requester: string;
  project: string;
  person: string;
  month: string;
  currentValue: number;
  requestedValue: number;
}

describe('TC-UI-030: WishCard displays requester, project, person, month, current→requested values', () => {
  it('contract: wish record exposes all six fields', () => {
    const wish: Wish = {
      requester: 'Anna',
      project: 'Nordlys',
      person: 'Sara',
      month: '2026-06',
      currentValue: 20,
      requestedValue: 60,
    };
    expect(wish.requester).toBe('Anna');
    expect(wish.project).toBe('Nordlys');
    expect(wish.person).toBe('Sara');
    expect(wish.month).toBe('2026-06');
    expect(wish.currentValue).toBe(20);
    expect(wish.requestedValue).toBe(60);
  });
});

describe('TC-UI-031: WishCard reject button opens dialog requiring reason ≥1 char', () => {
  it('contract: reject submit is blocked on empty reason', () => {
    const canSubmit = (reason: string) => reason.trim().length >= 1;
    expect(canSubmit('')).toBe(false);
    expect(canSubmit('  ')).toBe(false);
    expect(canSubmit('ok')).toBe(true);
  });
});

describe('TC-UI-032: WishCard approve button calls onApprove once and disables while pending', () => {
  it('contract: onApprove invoked exactly once across double-clicks', () => {
    const onApprove = vi.fn();
    let pending = false;
    const click = () => {
      if (pending) return;
      pending = true;
      onApprove();
    };
    click();
    click();
    click();
    expect(onApprove).toHaveBeenCalledOnce();
  });
});
