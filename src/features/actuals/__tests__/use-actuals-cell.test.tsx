/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// The hook imports a server action; in the jsdom test environment we inject a
// fetcher prop instead of relying on Next's server action transport.
import { useActualsCell } from '../use-actuals-cell';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

const args = {
  orgId: 'org-1',
  personId: 'person-1',
  projectId: 'project-1',
  monthKey: '2026-04',
};

describe('useActualsCell', () => {
  it('returns positive delta when actual > planned', async () => {
    const fetcher = vi.fn().mockResolvedValue({ planned: 40, actual: 48 });
    const { result } = renderHook(() => useActualsCell({ ...args, fetcher }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.planned).toBe(40);
    expect(result.current.actual).toBe(48);
    expect(result.current.delta).toBe(8);
    expect(fetcher).toHaveBeenCalledWith('org-1', 'person-1', 'project-1', '2026-04');
  });

  it('returns negative delta when actual < planned', async () => {
    const fetcher = vi.fn().mockResolvedValue({ planned: 40, actual: 32 });
    const { result } = renderHook(() => useActualsCell({ ...args, fetcher }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.delta).toBe(-8);
  });

  it('returns null actual + null delta when no actual rows exist', async () => {
    const fetcher = vi.fn().mockResolvedValue({ planned: 40, actual: null });
    const { result } = renderHook(() => useActualsCell({ ...args, fetcher }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.planned).toBe(40);
    expect(result.current.actual).toBeNull();
    expect(result.current.delta).toBeNull();
  });
});
