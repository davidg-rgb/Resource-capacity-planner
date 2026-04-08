/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 40 / Plan 40-05 Wave 4 (TC-PR-001): PmTimelineCell out-of-dept
 * edit opens the ProposalCell popover and submission invokes the mutation.
 *
 * Mocks:
 *   - @/features/personas/persona.context → PM persona w/ homeDepartmentId='dept-A'
 *   - @/features/proposals/ui/proposal-cell → lightweight stub that exposes a
 *     "Submit wish" button whose click calls a shared spy (which we assert).
 *   - @/components/timeline/PlanVsActualCell → stub that fires onCellEdit
 *     synchronously on a button click so we can drive the orchestrator
 *     without dealing with the internal 600ms debounce (covered separately
 *     in PlanVsActualCell.test.tsx).
 *   - @/components/dialogs/historic-edit-dialog → stub (not used in this
 *     non-historic path, but imported by the orchestrator module).
 *
 * Asserts:
 *   1. Out-of-dept persona (target dept 'dept-B') on a future month routes
 *      through the proposal branch → ProposalCell stub mounts after the edit
 *      event ("Submit wish" button appears).
 *   2. Clicking "Submit wish" invokes the mocked proposal-submit spy
 *      (proxy for useCreateProposal().mutateAsync).
 *   3. onAllocationPatch was NOT called (the direct/PATCH path never fired).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';

import sv from '@/messages/sv.json';
import type { CellView } from '@/features/planning/planning.read';

// Shared spy for the mocked ProposalCell submit.
const proposalSubmitSpy = vi.fn();

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

// Stub PlanVsActualCell: surface a "trigger-edit" button that fires
// onCellEdit(60) synchronously — bypasses the internal 600ms debounce
// which is already covered by its own test file.
vi.mock('@/components/timeline/PlanVsActualCell', () => ({
  PlanVsActualCell: (props: { onCellEdit?: (n: number) => void }) => (
    <button type="button" data-testid="trigger-edit" onClick={() => props.onCellEdit?.(60)}>
      trigger
    </button>
  ),
}));

// Stub ProposalCell so we do not exercise real fetch / react-query plumbing
// (that path is covered by proposal-cell.test.tsx). The stub exposes the
// mutateAsync spy via an onClick handler on "Submit wish".
vi.mock('@/features/proposals/ui/proposal-cell', () => ({
  ProposalCell: (props: {
    personId: string;
    projectId: string;
    month: string;
    initialHours: number;
    onSubmitted?: () => void;
  }) => (
    <div data-testid="proposal-cell-stub">
      <button
        type="button"
        onClick={async () => {
          await proposalSubmitSpy({
            projectId: props.projectId,
            personId: props.personId,
            month: props.month,
            proposedHours: props.initialHours,
            note: '',
          });
          props.onSubmitted?.();
        }}
      >
        Submit wish
      </button>
    </div>
  ),
}));

// HistoricEditDialog is not exercised on the non-historic path but the
// orchestrator imports it — a harmless stub avoids pulling in its i18n hook.
vi.mock('@/components/dialogs/historic-edit-dialog', () => ({
  HistoricEditDialog: () => null,
}));

const { PmTimelineCell } = await import('../pm-timeline-cell');

function baseCell(overrides: Partial<CellView> = {}): CellView {
  return {
    personId: 'p-sara',
    monthKey: '2099-06',
    allocationId: null,
    plannedHours: 40,
    actualHours: null,
    pendingProposal: null,
    ...overrides,
  };
}

describe('PmTimelineCell (TC-PR-001)', () => {
  beforeEach(() => {
    proposalSubmitSpy.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it('out-of-dept edit opens ProposalCell popover and submit calls mutateAsync with expected payload', async () => {
    const user = userEvent.setup();
    const onAllocationPatch = vi.fn();

    render(
      <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
        <PmTimelineCell
          cell={baseCell()}
          projectId="proj-1"
          currentMonth="2026-05"
          targetPerson={{ id: 'p-sara', departmentId: 'dept-B' }}
          onAllocationPatch={onAllocationPatch}
        />
      </NextIntlClientProvider>,
    );

    // Popover not visible yet.
    expect(screen.queryByTestId('proposal-cell-stub')).toBeNull();

    // Fire the edit event — the orchestrator should route to 'proposal'
    // because dept-B != dept-A (PM's homeDepartmentId).
    await user.click(screen.getByTestId('trigger-edit'));

    // Popover mounted.
    expect(screen.getByTestId('proposal-cell-stub')).toBeInTheDocument();

    // Submit the wish from the popover stub.
    await user.click(screen.getByRole('button', { name: /submit wish/i }));

    // The mocked mutateAsync received the expected payload.
    expect(proposalSubmitSpy).toHaveBeenCalledTimes(1);
    expect(proposalSubmitSpy).toHaveBeenCalledWith({
      projectId: 'proj-1',
      personId: 'p-sara',
      month: '2099-06',
      proposedHours: 60,
      note: '',
    });

    // Direct PATCH path must NOT have fired.
    expect(onAllocationPatch).not.toHaveBeenCalled();
  });
});
