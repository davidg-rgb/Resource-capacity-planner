/**
 * @vitest-environment jsdom
 *
 * v5.0 — Phase 43 / Plan 43-02 — Task 1 (TDD)
 *
 * Tests for src/hooks/use-admin-registers.ts:
 *  - useRegisterList: fetches + returns rows keyed on
 *    ['admin-registers', entity, { includeArchived }]
 *  - useCreateRegisterRow: POSTs, invalidates
 *    ['admin-registers', entity] AND ['change-log']
 *  - useArchiveRegisterRow: on 409 DEPENDENT_ROWS_EXIST the rejection is a
 *    DependentRowsError exposing `.blockers`.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DependentRowsError,
  useArchiveRegisterRow,
  useCreateRegisterRow,
  useRegisterList,
  useUpdateRegisterRow,
} from '../use-admin-registers';

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('useRegisterList', () => {
  it('fetches /api/v5/admin/registers/:entity and returns rows', async () => {
    const rows = [
      { id: 'd1', name: 'Mekanik', archivedAt: null },
      { id: 'd2', name: 'El', archivedAt: null },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ rows }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = makeClient();
    const { result } = renderHook(() => useRegisterList('department', { includeArchived: false }), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(rows);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v5/admin/registers/department?includeArchived=false',
      expect.any(Object),
    );
  });

  it('uses queryKey shape [admin-registers, entity, { includeArchived }]', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ rows: [] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = makeClient();
    const { result } = renderHook(() => useRegisterList('person', { includeArchived: true }), {
      wrapper: makeWrapper(client),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const cacheKeys = client
      .getQueryCache()
      .getAll()
      .map((q) => q.queryKey);
    expect(cacheKeys).toContainEqual(['admin-registers', 'person', { includeArchived: true }]);
  });
});

describe('useCreateRegisterRow', () => {
  it('POSTs and invalidates [admin-registers, entity] AND [change-log]', async () => {
    const created = { id: 'new1', name: 'Ny Avdelning' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ row: created }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateRegisterRow('department'), {
      wrapper: makeWrapper(client),
    });

    const row = await result.current.mutateAsync({ name: 'Ny Avdelning' });
    expect(row).toEqual(created);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v5/admin/registers/department',
      expect.objectContaining({ method: 'POST' }),
    );

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(invalidatedKeys).toContainEqual(['admin-registers', 'department']);
    expect(invalidatedKeys).toContainEqual(['change-log']);
  });
});

describe('useUpdateRegisterRow', () => {
  it('PATCHes /:entity/:id and invalidates admin-registers + change-log', async () => {
    const updated = { id: 'p1', name: 'Uppdaterad', archivedAt: null };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ row: updated }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateRegisterRow('person'), {
      wrapper: makeWrapper(client),
    });

    const row = await result.current.mutateAsync({ id: 'p1', data: { archivedAt: null } });
    expect(row).toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v5/admin/registers/person/p1',
      expect.objectContaining({ method: 'PATCH' }),
    );

    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(invalidatedKeys).toContainEqual(['admin-registers', 'person']);
    expect(invalidatedKeys).toContainEqual(['change-log']);
  });
});

describe('useArchiveRegisterRow', () => {
  it('DELETEs /:entity/:id and invalidates on success', async () => {
    const archived = { id: 'x1', name: 'Arkiv', archivedAt: new Date().toISOString() };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ row: archived }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useArchiveRegisterRow('discipline'), {
      wrapper: makeWrapper(client),
    });

    await result.current.mutateAsync('x1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v5/admin/registers/discipline/x1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    const invalidatedKeys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(invalidatedKeys).toContainEqual(['admin-registers', 'discipline']);
    expect(invalidatedKeys).toContainEqual(['change-log']);
  });

  it('throws DependentRowsError with blockers map on 409 DEPENDENT_ROWS_EXIST', async () => {
    const body = {
      error: {
        code: 'ERR_CONFLICT',
        message: 'DEPENDENT_ROWS_EXIST',
        details: {
          entity: 'person',
          id: 'p1',
          blockers: { allocations: 3, proposals: 1 },
        },
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => body,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = makeClient();
    const { result } = renderHook(() => useArchiveRegisterRow('person'), {
      wrapper: makeWrapper(client),
    });

    let caught: unknown = null;
    try {
      await result.current.mutateAsync('p1');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DependentRowsError);
    const err = caught as DependentRowsError;
    expect(err.blockers.allocations).toBe(3);
    expect(err.blockers.proposals).toBe(1);
    expect(err.entity).toBe('person');
    expect(err.id).toBe('p1');
  });

  it('throws a generic Error on non-409 failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: 'ERR_INTERNAL', message: 'boom' } }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = makeClient();
    const { result } = renderHook(() => useArchiveRegisterRow('program'), {
      wrapper: makeWrapper(client),
    });

    let caught: unknown = null;
    try {
      await result.current.mutateAsync('z1');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(DependentRowsError);
  });
});
