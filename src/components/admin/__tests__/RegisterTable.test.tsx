/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 43 / Plan 43-02 — Task 2 (TDD)
 * RegisterTable covers: loading, error, empty, populated, banner,
 * archive-confirm flow (accept + cancel), and archived-row rendering.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RegisterTable, type RegisterTableColumn } from '../RegisterTable';

type Row = { id: string; name: string; archivedAt: string | null };

const columns: ReadonlyArray<RegisterTableColumn<Row>> = [
  { key: 'name', header: 'Namn', cell: (r) => r.name },
];

const labels = {
  newButton: 'Ny',
  showArchived: 'Visa arkiverade',
  edit: 'Redigera',
  archive: 'Arkivera',
  unarchive: 'Återställ',
  archiveConfirm: (name: string) => `Arkivera ${name}? Raden göms från standardvyn.`,
  empty: 'Inga rader.',
  addFirst: 'Lägg till',
  loading: 'Laddar…',
  errorTitle: 'Något gick fel. Försök igen.',
  retry: 'Försök igen',
  actionsColumn: 'Åtgärder',
  archivedBadge: 'arkiverad',
};

function baseProps(overrides: Partial<React.ComponentProps<typeof RegisterTable<Row>>> = {}) {
  return {
    title: 'Avdelningar',
    description: 'Hantera avdelningar',
    columns,
    rows: [] as Row[],
    isLoading: false,
    error: null as Error | null,
    onRetry: vi.fn(),
    onCreate: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    includeArchived: false,
    onToggleArchived: vi.fn(),
    banner: null,
    labels,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RegisterTable', () => {
  it('renders rows from props', () => {
    const rows: Row[] = [
      { id: 'a', name: 'Mekanik', archivedAt: null },
      { id: 'b', name: 'El', archivedAt: null },
    ];
    render(<RegisterTable {...baseProps({ rows })} />);
    const bodyRows = screen.getAllByTestId('register-row');
    expect(bodyRows).toHaveLength(2);
    expect(within(bodyRows[0]).getByText('Mekanik')).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText('El')).toBeInTheDocument();
  });

  it('loading state shows 3 skeleton rows', () => {
    render(<RegisterTable {...baseProps({ isLoading: true })} />);
    expect(screen.getAllByTestId('register-skeleton-row')).toHaveLength(3);
  });

  it('error state shows banner + retry button', async () => {
    const props = baseProps({ error: new Error('boom') });
    render(<RegisterTable {...props} />);
    expect(screen.getByTestId('register-error-banner')).toBeInTheDocument();
    const retry = screen.getByTestId('register-retry-button');
    await userEvent.click(retry);
    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });

  it('empty state shows "Lägg till" CTA that calls onCreate', async () => {
    const props = baseProps({ rows: [] });
    render(<RegisterTable {...props} />);
    expect(screen.getByText('Inga rader.')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('register-empty-add-button'));
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it('Trash2 → window.confirm true → onArchive called with row', async () => {
    const rows: Row[] = [{ id: 'a', name: 'Mekanik', archivedAt: null }];
    const props = baseProps({ rows });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<RegisterTable {...props} />);
    await userEvent.click(screen.getByTestId('register-archive-button'));
    expect(confirmSpy).toHaveBeenCalledWith('Arkivera Mekanik? Raden göms från standardvyn.');
    expect(props.onArchive).toHaveBeenCalledWith(rows[0]);
  });

  it('Trash2 → window.confirm false → onArchive NOT called', async () => {
    const rows: Row[] = [{ id: 'a', name: 'Mekanik', archivedAt: null }];
    const props = baseProps({ rows });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<RegisterTable {...props} />);
    await userEvent.click(screen.getByTestId('register-archive-button'));
    expect(props.onArchive).not.toHaveBeenCalled();
  });

  it('archived rows render with archived badge + Återställ action', async () => {
    const rows: Row[] = [{ id: 'a', name: 'Mekanik', archivedAt: '2026-04-01T00:00:00Z' }];
    const props = baseProps({ rows, includeArchived: true });
    render(<RegisterTable {...props} />);
    const row = screen.getByTestId('register-row');
    expect(row.getAttribute('data-archived')).toBe('true');
    expect(row.className).toContain('opacity-50');
    expect(screen.getByTestId('register-unarchive-button')).toBeInTheDocument();
    expect(screen.queryByTestId('register-archive-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('register-edit-button')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('register-unarchive-button'));
    expect(props.onUnarchive).toHaveBeenCalledWith(rows[0]);
  });

  it('banner prop renders dependent-rows message', () => {
    const props = baseProps({
      rows: [{ id: 'a', name: 'Mekanik', archivedAt: null }],
      banner: {
        tone: 'error',
        message: 'Kan inte arkivera: 3 aktiva allokeringar.',
      },
    });
    render(<RegisterTable {...props} />);
    const banner = screen.getByTestId('register-banner');
    expect(banner).toHaveTextContent('Kan inte arkivera: 3 aktiva allokeringar.');
  });

  it('toggle-archived checkbox fires onToggleArchived', async () => {
    const props = baseProps();
    render(<RegisterTable {...props} />);
    await userEvent.click(screen.getByTestId('register-toggle-archived'));
    expect(props.onToggleArchived).toHaveBeenCalledWith(true);
  });

  it('Ny button fires onCreate', async () => {
    const props = baseProps();
    render(<RegisterTable {...props} />);
    await userEvent.click(screen.getByTestId('register-new-button'));
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it('edit button fires onEdit with row', async () => {
    const rows: Row[] = [{ id: 'a', name: 'Mekanik', archivedAt: null }];
    const props = baseProps({ rows });
    render(<RegisterTable {...props} />);
    await userEvent.click(screen.getByTestId('register-edit-button'));
    expect(props.onEdit).toHaveBeenCalledWith(rows[0]);
  });
});
