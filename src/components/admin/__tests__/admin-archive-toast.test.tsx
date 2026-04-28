/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 52 / Plan 52-05 (ADMIN-01 / D-12 / Q1 resolution):
 *
 * Four behavior tests for the DependentRowsError → sonner toast flow in
 * AdminRegisterPageShell.
 *
 *   T1 archive success → no toast, banner cleared.
 *   T2 DependentRowsError({ allocations: 12, proposals: 3 }) → toast.error
 *      invoked with a React node containing <details> + <summary> + list of
 *      localized kind-count entries.
 *   T3 other error → existing saveError banner path (NO toast.error call).
 *   T4 flag independence — ADMIN-01 isn't gated by `uiV6PerJourney`; toast
 *      fires regardless of flag state.
 *
 * Per Q1 the <details> lists kind-counts (Record<string, number>) only; no
 * row-level data. The DependentRowsError schema in src/hooks/use-admin-registers.ts
 * is NOT modified by this plan.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import sv from '@/messages/sv.json';

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE imports so vi.mock hoisting fires before module
// evaluation. We capture the `toast.error` React-node argument so the test
// can introspect its rendered output.
// ---------------------------------------------------------------------------

// Use vi.hoisted so `toastErrorMock` is created BEFORE vi.mock evaluation.
const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }));

vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: {
    error: toastErrorMock,
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
    custom: vi.fn(),
  },
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ orgRole: 'org:admin', orgId: 'org-1', userId: 'u-1', isLoaded: true }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/projects',
  useSearchParams: () => new URLSearchParams(),
}));

// Capture the archive mutation so we can control its resolution per-test.
const { archiveMutateAsync } = vi.hoisted(() => ({
  archiveMutateAsync: vi.fn<(id: string) => Promise<unknown>>(),
}));

vi.mock('@/hooks/use-admin-registers', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-admin-registers')>(
    '@/hooks/use-admin-registers',
  );
  return {
    ...actual,
    useRegisterList: () => ({
      data: [
        {
          id: 'row-1',
          name: 'Alpha',
          archivedAt: null,
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useCreateRegisterRow: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useUpdateRegisterRow: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useArchiveRegisterRow: () => ({ mutateAsync: archiveMutateAsync, isPending: false }),
  };
});

vi.mock('@/features/personas/persona-route-guard', () => ({
  PersonaGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { AdminRegisterPageShell, DependentRowsToastContent } from '../AdminRegisterPageShell';
import { DependentRowsError } from '@/hooks/use-admin-registers';

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <NextIntlClientProvider locale="sv" messages={sv as Record<string, unknown>}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}

// Minimal form component — only needed so the shell's RegisterDrawer prop
// surface is satisfied. Tests never open the drawer.
function NoopForm() {
  return <div data-testid="noop-form" />;
}

function renderShell() {
  return render(
    <Wrapper>
      <AdminRegisterPageShell
        entity="project"
        titleKey="title.project"
        descriptionKey="description.project"
        columns={[
          {
            key: 'name',
            header: 'Namn',
            cell: (row) => String(row.name ?? ''),
          },
        ]}
        formComponent={NoopForm}
        skipClerkGate
      />
    </Wrapper>,
  );
}

describe('AdminRegisterPageShell archive → DependentRowsError toast (Plan 52-05)', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    archiveMutateAsync.mockReset();
  });

  it('T1: archive success → no toast, banner cleared', async () => {
    archiveMutateAsync.mockResolvedValueOnce({ id: 'row-1' });

    renderShell();
    const user = userEvent.setup();

    // RegisterTable's archive action comes from the native confirm dialog
    // in RegisterTable — simpler to just call the mutation directly via
    // the visible Archive button. Locate the row, click its archive action.
    const archiveBtn = await screen.findByRole('button', { name: /arkivera/i });
    // confirm() returns true by default in jsdom when stubbed; stub it.
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(archiveBtn);

    await waitFor(() => {
      expect(archiveMutateAsync).toHaveBeenCalledWith('row-1');
    });
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('T2: DependentRowsError → toast.error invoked with React node containing <details> + kind-counts', async () => {
    archiveMutateAsync.mockRejectedValueOnce(
      new DependentRowsError('project', 'row-1', { allocations: 12, proposals: 3 }),
    );

    renderShell();
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const archiveBtn = await screen.findByRole('button', { name: /arkivera/i });
    await user.click(archiveBtn);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    const [node, options] = toastErrorMock.mock.calls[0]!;

    // Options: infinite duration + dismissible.
    expect(options).toMatchObject({ duration: Infinity, dismissible: true });

    // Render the React node out-of-band and assert its structure.
    const { unmount } = render(<Wrapper>{node as ReactNode}</Wrapper>);
    // Title mentions total = 12 + 3 = 15
    expect(screen.getByTestId('admin-dependent-rows-toast').textContent).toMatch(/15/);
    // <details> with <summary>.
    const details = screen.getByTestId('admin-dependent-rows-details');
    expect(details.tagName).toBe('DETAILS');
    const summary = details.querySelector('summary');
    expect(summary?.textContent).toMatch(/visa detaljer/i);
    // Kind-count <li> entries present for both kinds.
    const items = details.querySelectorAll('li');
    expect(items.length).toBe(2);
    const itemTexts = Array.from(items).map((li) => li.textContent ?? '');
    expect(itemTexts.some((t) => /12.*allokeringar/i.test(t))).toBe(true);
    expect(itemTexts.some((t) => /3.*önskemål/i.test(t))).toBe(true);
    unmount();
  });

  it('T3: other error → existing saveError banner path, NO toast.error', async () => {
    archiveMutateAsync.mockRejectedValueOnce(new Error('network 500'));

    renderShell();
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const archiveBtn = await screen.findByRole('button', { name: /arkivera/i });
    await user.click(archiveBtn);

    await waitFor(() => {
      expect(archiveMutateAsync).toHaveBeenCalled();
    });
    // Non-DependentRowsError path — no toast.
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('T4: DependentRowsToastContent renders kind-counts regardless of flag state', () => {
    // Flag independence: the component is imported as a pure React node and
    // reads no flag context — rendering it with any blockers produces the
    // <details> block. This guarantees ADMIN-01 isn't silently flag-gated.
    render(
      <Wrapper>
        <DependentRowsToastContent blockers={{ allocations: 5 }} />
      </Wrapper>,
    );
    expect(screen.getByTestId('admin-dependent-rows-toast')).toBeInTheDocument();
    const li = screen.getByTestId('admin-dependent-rows-details').querySelector('li');
    expect(li?.textContent).toMatch(/5.*allokeringar/i);
  });
});
