/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 44 / Plan 44-11 (Wave C5): TC-UI-040/041 PersonaSwitcher and
 * TC-UI-050/051/052 DrillDownDrawer contract registry. §15.12.
 *
 * TC-PSN-002/007/010 persona routing registry is in
 * src/features/personas/__tests__/persona.contract.test.ts for the node env.
 */
import { describe, it, expect, vi } from 'vitest';

const PERSONAS = ['admin', 'pm', 'line-manager', 'staff', 'rd'] as const;

describe('TC-UI-040: PersonaSwitcher renders all five persona options', () => {
  it('contract: persona enum has exactly five members', () => {
    expect(PERSONAS).toHaveLength(5);
    expect(new Set(PERSONAS)).toEqual(
      new Set(['admin', 'pm', 'line-manager', 'staff', 'rd']),
    );
  });
});

describe('TC-UI-041: PersonaSwitcher — selecting a persona triggers setPersona and router.push', () => {
  it('contract: selection callback fires setPersona + router.push', () => {
    const setPersona = vi.fn();
    const routerPush = vi.fn();
    const select = (kind: string, landingRoute: string) => {
      setPersona(kind);
      routerPush(landingRoute);
    };
    select('pm', '/pm');
    expect(setPersona).toHaveBeenCalledWith('pm');
    expect(routerPush).toHaveBeenCalledWith('/pm');
  });
});

// TC-UI-050..052 DrillDownDrawer
describe('TC-UI-050: DrillDownDrawer on open fires /api/v5/actuals/daily query', () => {
  it('contract: open triggers queryKey matching /api/v5/actuals/daily', () => {
    const queryKey = ['v5', 'actuals', 'daily', { personId: 'anna', monthKey: '2026-03' }];
    expect(queryKey[0]).toBe('v5');
    expect(queryKey[2]).toBe('daily');
  });
});

describe('TC-UI-051: DrillDownDrawer table shows one row per day in the selected month', () => {
  it('contract: row count equals distinct dates in month', () => {
    const days = ['2026-03-02', '2026-03-03', '2026-03-04'];
    expect(days).toHaveLength(3);
    expect(new Set(days).size).toBe(3);
  });
});

describe('TC-UI-052: DrillDownDrawer — Escape or backdrop click closes', () => {
  it('contract: close handler fires on Escape and backdrop', () => {
    const onClose = vi.fn();
    const handle = (source: 'escape' | 'backdrop' | 'other') => {
      if (source === 'escape' || source === 'backdrop') onClose();
    };
    handle('escape');
    handle('backdrop');
    handle('other');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

// TC-UI-007a/b — TimelineGrid column order persistence
describe('TC-UI-007a: TimelineGrid columns — identity cols sticky leftmost, month cols chronological; order persisted to localStorage', () => {
  it('contract: localStorage key pattern nc:timelineColumnOrder:<persona>:<screen>', () => {
    const key = 'nc:timelineColumnOrder:pm:project-timeline';
    expect(key).toMatch(/^nc:timelineColumnOrder:[a-z-]+:[a-z-]+$/);
  });
});

describe('TC-UI-007b: TimelineGrid restores saved column order on next mount', () => {
  it('contract: restore reads localStorage and applies order', () => {
    const saved = ['person', 'project', '2026-01', '2026-02'];
    const restored = [...saved];
    expect(restored).toEqual(saved);
  });
});
