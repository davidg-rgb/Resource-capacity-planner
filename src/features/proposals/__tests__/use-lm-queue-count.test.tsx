/**
 * @vitest-environment jsdom
 *
 * v6.0 — Phase 52 / Plan 52-04 (LM-01 / D-06):
 * Unit tests for useLmQueueCount — the shared TanStack hook behind the
 * LM home approval-queue badge and the persona-switcher count suffix.
 *
 * Tests 1-4 from 52-04-PLAN.md Task 1 <behavior>:
 *   1. enabled=true + departmentId set → fetches /api/v5/proposals/queue/count
 *   2. departmentId=null → not fetched
 *   3. enabled=false → not fetched
 *   4. query-key invalidation: dept switch triggers a second fetch
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { useLmQueueCount } from '../use-lm-queue-count';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const originalFetch = globalThis.fetch;

describe('useLmQueueCount', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string) => {
      // Emulate the LM-03 endpoint contract: { count, departmentId }
      const u = new URL(url, 'http://localhost');
      const deptId = u.searchParams.get('departmentId') ?? '';
      const count = deptId === 'dept-1' ? 3 : deptId === 'dept-2' ? 7 : 0;
      return new Response(JSON.stringify({ count, departmentId: deptId }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('enabled + dept set → fetches and returns count (selector unwraps to number)', async () => {
    const { result } = renderHook(() => useLmQueueCount('dept-1', true), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v5/proposals/queue/count');
    expect(fetchMock.mock.calls[0][0]).toContain('departmentId=dept-1');
  });

  it('departmentId=null → not fetched (enabled guard)', async () => {
    const { result } = renderHook(() => useLmQueueCount(null, true), { wrapper: makeWrapper() });
    // Give TanStack a microtask chance to have scheduled anything.
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
  });

  it('enabled=false → not fetched even with departmentId set', async () => {
    renderHook(() => useLmQueueCount('dept-1', false), { wrapper: makeWrapper() });
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('query-key changes on dept switch → second fetch fires', async () => {
    const { result, rerender } = renderHook(
      ({ deptId }: { deptId: string }) => useLmQueueCount(deptId, true),
      { wrapper: makeWrapper(), initialProps: { deptId: 'dept-1' } },
    );
    await waitFor(() => expect(result.current.data).toBe(3));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender({ deptId: 'dept-2' });
    await waitFor(() => expect(result.current.data).toBe(7));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('departmentId=dept-2');
  });
});
