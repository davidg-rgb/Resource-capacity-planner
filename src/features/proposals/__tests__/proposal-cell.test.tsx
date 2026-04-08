/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { ProposalCell } from '../ui/proposal-cell';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const baseProps = {
  personId: 'person-1',
  projectId: 'project-1',
  month: '2026-05',
  initialHours: 40,
};

describe('ProposalCell', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders with dashed border and initial hours', () => {
    render(<ProposalCell {...baseProps} />, { wrapper: makeWrapper() });
    const root = screen.getByTestId('proposal-cell');
    expect(root.className).toContain('border-dashed');
    expect(screen.getByLabelText('Proposed hours')).toHaveValue(40);
    expect(screen.getByRole('button', { name: /submit wish/i })).toBeInTheDocument();
  });

  it('POSTs to /api/v5/proposals with edited hours + note and fires onSubmitted', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'p-new', status: 'proposed' }),
    });
    const onSubmitted = vi.fn();
    const user = userEvent.setup();

    render(<ProposalCell {...baseProps} onSubmitted={onSubmitted} />, { wrapper: makeWrapper() });

    const input = screen.getByLabelText('Proposed hours');
    await user.clear(input);
    await user.type(input, '56');
    await user.type(screen.getByLabelText('Note'), 'Need this spec');
    await user.click(screen.getByRole('button', { name: /submit wish/i }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v5/proposals');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      personId: 'person-1',
      projectId: 'project-1',
      month: '2026-05',
      proposedHours: 56,
      note: 'Need this spec',
    });
  });

  it('does NOT call onSubmitted when the API returns an error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'server_error' }),
    });
    const onSubmitted = vi.fn();
    const user = userEvent.setup();

    render(<ProposalCell {...baseProps} onSubmitted={onSubmitted} />, { wrapper: makeWrapper() });
    await user.click(screen.getByRole('button', { name: /submit wish/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('calls onCancelled when Cancel is clicked', async () => {
    const onCancelled = vi.fn();
    const user = userEvent.setup();
    render(<ProposalCell {...baseProps} onCancelled={onCancelled} />, { wrapper: makeWrapper() });
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancelled).toHaveBeenCalledTimes(1);
  });
});
