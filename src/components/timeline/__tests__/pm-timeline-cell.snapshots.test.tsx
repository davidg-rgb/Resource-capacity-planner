/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 52 Plan 03 (PM-04 / Q2 split): proposal-state visual snapshots.
 *
 * 3 cell states snapshotted here: draft / proposed / approved.
 * The 4th state (rejected) has NO cell visual — `pendingProposal` is cleared
 * on rejection — so its snapshot lives in
 * src/components/wishes/__tests__/my-wishes-panel.test.tsx instead.
 *
 * Unlike pm-timeline-cell.test.tsx, this file does NOT stub PlanVsActualCell —
 * snapshots exist to diff the real rendered markup, so any downstream visual
 * changes (dashed borders, pending badges, dual-value rendering) show up on
 * a PR review as snapshot diffs.
 *
 * ProposalCell / HistoricEditDialog are still stubbed because they pull in
 * i18n keys / mutations that are out of scope for visual snapshots.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

import sv from '@/messages/sv.json';
import type { CellView } from '@/features/planning/planning.read';

vi.mock('@/features/personas/persona.context', () => ({
  usePersona: () => ({
    persona: {
      kind: 'pm',
      personId: 'p-anna',
      displayName: 'Anna',
      homeDepartmentId: 'dept-A',
    },
    setPersona: vi.fn(),
  }),
}));

vi.mock('@/features/flags/flag.context', () => ({
  useFlags: () => ({
    dashboards: false,
    pdfExport: false,
    alerts: false,
    onboarding: false,
    scenarios: false,
    uiV6Landing: false,
    uiV6LeanTrim: false,
    uiV6PerJourney: false,
  }),
}));

vi.mock('@/features/proposals/ui/proposal-cell', () => ({
  ProposalCell: () => null,
}));

vi.mock('@/components/dialogs/historic-edit-dialog', () => ({
  HistoricEditDialog: () => null,
}));

const { PmTimelineCell } = await import('../pm-timeline-cell');

function baseCell(overrides: Partial<CellView> = {}): CellView {
  return {
    personId: 'p-sara',
    monthKey: '2026-06',
    allocationId: 'alloc-1',
    plannedHours: 40,
    actualHours: null,
    pendingProposal: null,
    ...overrides,
  };
}

function renderState(cell: CellView) {
  return render(
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      <PmTimelineCell
        cell={cell}
        projectId="proj-1"
        currentMonth="2026-06"
        targetPerson={{ id: 'p-sara', departmentId: 'dept-A' }}
        onAllocationPatch={vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

describe('PmTimelineCell — PM-04 proposal-state snapshots (Phase 52 Plan 03)', () => {
  afterEach(() => {
    cleanup();
  });

  it('Snap 1: draft (plannedHours=40, no pendingProposal) matches snapshot', () => {
    const { container } = renderState(baseCell({ plannedHours: 40, pendingProposal: null }));
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('Snap 2: proposed (plannedHours=40, pendingProposal present) matches snapshot', () => {
    const { container } = renderState(
      baseCell({
        plannedHours: 40,
        pendingProposal: { id: 'p1', proposedHours: 60, proposerId: 'u1' },
      }),
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('Snap 3: approved (plannedHours=60, pendingProposal null — approved merged) matches snapshot', () => {
    const { container } = renderState(baseCell({ plannedHours: 60, pendingProposal: null }));
    expect(container.innerHTML).toMatchSnapshot();
  });
});
