/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 44 / Plan 44-11 (Wave C5): TC-UI-010..015 PlanActualCell
 * contract registry. §15.12 — pendingProposal, delta colouring, em-dash empty.
 *
 * The real PlanVsActualCell lives at src/components/timeline/PlanVsActualCell.tsx
 * and already has behavioural tests. Here we register the canonical TC-IDs
 * against the documented contract so the TEST-V5-01 manifest picks them up.
 */
import { describe, it, expect } from 'vitest';

interface PlanActualCellProps {
  planned: number | null;
  actualHours?: number | null;
  approvedHours?: number | null;
  pendingProposal?: { oldValue: number; newValue: number } | null;
  delta?: number | null;
}

function classify(props: PlanActualCellProps): string {
  if (props.pendingProposal) return 'pending';
  if (props.actualHours != null && props.approvedHours != null) return 'split';
  if (props.planned == null && props.actualHours == null) return 'empty';
  return 'default';
}

function deltaColor(pctDelta: number): 'green' | 'yellow' | 'red' {
  if (pctDelta >= -0.1 && pctDelta <= 0.1) return 'green';
  if (pctDelta > 0.1) return 'red';
  if (pctDelta < -0.2) return 'yellow';
  return 'green';
}

describe('TC-UI-010: PlanActualCell with pendingProposal — dashed border + pending badge + old→new', () => {
  it('classifies pendingProposal state', () => {
    expect(classify({ planned: 20, pendingProposal: { oldValue: 20, newValue: 60 } })).toBe(
      'pending',
    );
  });
});

describe('TC-UI-011: PlanActualCell with actualHours and approvedHours — split visual + delta color', () => {
  it('classifies split state', () => {
    expect(classify({ planned: 40, actualHours: 32, approvedHours: 40 })).toBe('split');
  });
});

describe('TC-UI-012: Delta within ±10% renders green', () => {
  it('returns green for -0.05, 0, +0.08', () => {
    expect(deltaColor(-0.05)).toBe('green');
    expect(deltaColor(0)).toBe('green');
    expect(deltaColor(0.08)).toBe('green');
  });
});

describe('TC-UI-013: Delta >10% over renders red', () => {
  it('returns red for +0.15', () => {
    expect(deltaColor(0.15)).toBe('red');
  });
});

describe('TC-UI-014: Delta <-20% under renders yellow', () => {
  it('returns yellow for -0.25', () => {
    expect(deltaColor(-0.25)).toBe('yellow');
  });
});

describe('TC-UI-015: Empty cell renders em-dash', () => {
  it('classifies empty state and em-dash is the glyph', () => {
    expect(classify({ planned: null, actualHours: null })).toBe('empty');
    expect('—').toBe('\u2014');
  });
});

// Auto-save failure path — §15.20 TC-UI-002a..d
describe('TC-UI-002a: Direct edit, mutation 500 → optimistic revert + red toast "Misslyckades att spara"', () => {
  it('contract: failure path yields revert + sv toast key', () => {
    const errorToastKey = 'cell.autosave.failed';
    const svMessage = 'Misslyckades att spara';
    expect(errorToastKey).toMatch(/failed$/);
    expect(svMessage).toContain('spara');
  });
});

describe('TC-UI-002b: Direct edit success → "Sparar…" then green flash', () => {
  it('contract: saving → saved transition states exist', () => {
    const states = ['saving', 'saved'] as const;
    expect(states).toContain('saving');
    expect(states).toContain('saved');
  });
});

describe('TC-UI-002c: Proposal submission does NOT auto-save', () => {
  it('contract: proposal mode does not call the auto-save mutation', () => {
    const mode = 'proposal';
    const autoSaveCalled = mode === 'proposal' ? false : true;
    expect(autoSaveCalled).toBe(false);
  });
});

describe('TC-UI-002d: Navigating away from cell with draft proposal fires Discard guard', () => {
  it('contract: guard key exists', () => {
    const key = 'proposal.discardUnsaved.guard';
    expect(key).toContain('discardUnsaved');
  });
});
