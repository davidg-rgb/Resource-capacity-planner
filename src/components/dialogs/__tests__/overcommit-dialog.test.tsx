/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 52 / Plan 52-04 (RD-02 / D-09 / Q3):
 * Contract tests for OvercommitDialog — the red-cell drill-down dialog on /rd.
 *
 * Tests 1-4 from 52-04-PLAN.md Task 4 <behavior>:
 *   T1 open=false → renders nothing
 *   T2 open=true  → role="dialog" + both sections
 *   T3 mock data  → project rows link to /projects/<id> with data-clicks;
 *                   person rows link to /staff/<id>?month=<key> with data-clicks
 *   T4 ESC        → onClose called once
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

// next/link in jsdom — use the default component; no router mock needed for
// <a href> behavior.
import { OvercommitDialog } from '../overcommit-dialog';
import type { OvercommitBreakdownResponse } from '../overcommit-dialog';

function makeBreakdown(): OvercommitBreakdownResponse {
  return {
    rows: [],
    projects: [
      { id: 'proj-atlas', name: 'Atlas', plannedHours: 120, pctOfTotalPlanned: 0.6 },
      { id: 'proj-bravo', name: 'Bravo', plannedHours: 80, pctOfTotalPlanned: 0.4 },
    ],
    people: [
      {
        id: 'pers-anna',
        name: 'Anna Tester',
        plannedHours: 120,
        capacityHours: 100,
        deltaHours: 20,
      },
      {
        id: 'pers-bob',
        name: 'Bob Builder',
        plannedHours: 80,
        capacityHours: 160,
        deltaHours: -80,
      },
    ],
  };
}

function renderDialog(
  props: Partial<React.ComponentProps<typeof OvercommitDialog>> & { open: boolean },
  payload: OvercommitBreakdownResponse = makeBreakdown(),
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const onClose = props.onClose ?? vi.fn();
  const full = {
    open: props.open,
    onClose,
    scope: (props.scope ?? 'department') as 'department' | 'project',
    scopeId: props.scopeId ?? 'dept-electronics',
    monthKey: props.monthKey ?? '2026-06',
  };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  }

  return {
    ...render(<OvercommitDialog {...full} />, { wrapper: Wrapper }),
    onClose,
    fetchMock,
  };
}

describe('OvercommitDialog (RD-02 / D-09)', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  it('T1: open=false → renders nothing', () => {
    renderDialog({ open: false });
    expect(screen.queryByTestId('overcommit-dialog')).toBeNull();
  });

  it('T2: open=true → role="dialog" aria-modal + both sections', async () => {
    renderDialog({ open: true });
    const dialog = await screen.findByTestId('overcommit-dialog');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    // Sections render by testid even before data arrives
    expect(screen.getByTestId('overcommit-section-projects')).toBeTruthy();
    expect(screen.getByTestId('overcommit-section-people')).toBeTruthy();
  });

  it('T3: rows render with correct href + data-clicks attribute', async () => {
    renderDialog({ open: true });
    await waitFor(() => {
      const projectLink = screen.getByTestId('overcommit-project-proj-atlas') as HTMLAnchorElement;
      expect(projectLink.getAttribute('href')).toBe('/projects/proj-atlas');
      expect(projectLink.getAttribute('data-clicks')).toBe('true');
      expect(projectLink.textContent ?? '').toContain('Atlas');
      expect(projectLink.textContent ?? '').toContain('120');
      expect(projectLink.textContent ?? '').toContain('60%');

      const personLink = screen.getByTestId('overcommit-person-pers-anna') as HTMLAnchorElement;
      expect(personLink.getAttribute('href')).toBe('/staff/pers-anna?month=2026-06');
      expect(personLink.getAttribute('data-clicks')).toBe('true');
      expect(personLink.textContent ?? '').toContain('Anna Tester');
      expect(personLink.textContent ?? '').toContain('+20');
    });
  });

  it('T4: ESC keydown calls onClose', async () => {
    const { onClose } = renderDialog({ open: true });
    await screen.findByTestId('overcommit-dialog');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('T3b: empty breakdown shows no-projects + no-people hints (i18n)', async () => {
    renderDialog({ open: true }, { rows: [], projects: [], people: [] });
    await waitFor(() => {
      const dialog = screen.getByTestId('overcommit-dialog');
      // Check that hints render — we don't assert exact text to keep i18n-agnostic
      expect(dialog.textContent ?? '').toMatch(/Inga projekt|No projects/);
      expect(dialog.textContent ?? '').toMatch(/Inga överbokade|No overbooked/);
    });
  });
});
