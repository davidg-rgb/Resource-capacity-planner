/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { PersonaProvider, usePersona } from '../persona.context';
import { getLandingRoute } from '../persona.routes';
import type { Persona } from '../persona.types';

/**
 * Plan 40-03 added `useQueryClient()` to PersonaProvider for D-20 persona-scoped
 * query-key invalidation. All tests must therefore be wrapped in a
 * QueryClientProvider (Rule 1 fix — pre-existing tests broke silently until
 * Plan 40-05 Task 1b forced a rerun).
 */
function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function Wrap({ qc, children }: { qc?: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={qc ?? makeQc()}>{children}</QueryClientProvider>;
}

function Probe({ onReady }: { onReady?: (api: ReturnType<typeof usePersona>) => void }) {
  const api = usePersona();
  if (onReady) onReady(api);
  return (
    <div>
      <span data-testid="kind">{api.persona.kind}</span>
      <span data-testid="name">{api.persona.displayName}</span>
    </div>
  );
}

describe('persona.context', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('TC-PSN-001: defaults to admin when localStorage is empty', () => {
    render(
      <Wrap>
        <PersonaProvider>
          <Probe />
        </PersonaProvider>
      </Wrap>,
    );
    expect(screen.getByTestId('kind').textContent).toBe('admin');
  });

  it("TC-PSN-002: setPersona persists to localStorage under key 'nc:persona'", () => {
    let api: ReturnType<typeof usePersona> | undefined;
    render(
      <Wrap>
        <PersonaProvider>
          <Probe onReady={(a) => (api = a)} />
        </PersonaProvider>
      </Wrap>,
    );
    const next: Persona = { kind: 'pm', personId: 'p1', displayName: 'Anna' };
    act(() => {
      api!.setPersona(next);
    });
    const stored = JSON.parse(window.localStorage.getItem('nc:persona') ?? 'null');
    expect(stored).toEqual(next);
  });

  it('hydrates persona from localStorage on mount', () => {
    const stored: Persona = { kind: 'line-manager', departmentId: 'd1', displayName: 'Bo' };
    window.localStorage.setItem('nc:persona', JSON.stringify(stored));
    render(
      <Wrap>
        <PersonaProvider>
          <Probe />
        </PersonaProvider>
      </Wrap>,
    );
    expect(screen.getByTestId('kind').textContent).toBe('line-manager');
    expect(screen.getByTestId('name').textContent).toBe('Bo');
  });

  it('TC-PSN-004: getLandingRoute returns the correct path for each kind', () => {
    expect(getLandingRoute({ kind: 'pm', personId: 'x', displayName: 'X' })).toBe('/pm');
    expect(getLandingRoute({ kind: 'line-manager', departmentId: 'x', displayName: 'X' })).toBe(
      '/line-manager',
    );
    expect(getLandingRoute({ kind: 'staff', personId: 'x', displayName: 'X' })).toBe('/staff');
    expect(getLandingRoute({ kind: 'rd', displayName: 'X' })).toBe('/rd');
    expect(getLandingRoute({ kind: 'admin', displayName: 'X' })).toBe('/admin');
  });

  it('usePersona throws outside provider', () => {
    // Suppress React's error boundary noise
    const orig = console.error;
    console.error = () => {};
    try {
      expect(() =>
        render(
          <Wrap>
            <Probe />
          </Wrap>,
        ),
      ).toThrow(/usePersona must be used inside PersonaProvider/);
    } finally {
      console.error = orig;
    }
  });

  it('corrupt localStorage falls back to admin and clears the key', () => {
    window.localStorage.setItem('nc:persona', '{not json');
    render(
      <Wrap>
        <PersonaProvider>
          <Probe />
        </PersonaProvider>
      </Wrap>,
    );
    expect(screen.getByTestId('kind').textContent).toBe('admin');
    expect(window.localStorage.getItem('nc:persona')).toBeNull();
  });

  /**
   * TC-PSN-003 (Plan 40-05 Wave 4): setPersona invalidates every persona-scoped
   * query key (D-20 in Plan 40-03). Router.push on persona change is covered
   * separately by persona-switcher.test.tsx TC-PSN-006.
   */
  it('TC-PSN-003: setPersona invalidates persona-scoped query keys (incl. pm-home)', () => {
    const qc = makeQc();
    const spy = vi.spyOn(qc, 'invalidateQueries');

    let api: ReturnType<typeof usePersona> | undefined;
    render(
      <Wrap qc={qc}>
        <PersonaProvider>
          <Probe onReady={(a) => (api = a)} />
        </PersonaProvider>
      </Wrap>,
    );

    spy.mockClear();
    act(() => {
      api!.setPersona({
        kind: 'pm',
        personId: 'p-anna',
        displayName: 'Anna',
        homeDepartmentId: 'dept-A',
      });
    });

    expect(spy).toHaveBeenCalled();
    // pm-home must be one of the invalidated keys (Plan 40-03 D-20 allow-list).
    const invalidatedKeys = spy.mock.calls
      .map((call) => {
        const arg = call[0] as { queryKey?: unknown[] } | undefined;
        return Array.isArray(arg?.queryKey) ? arg.queryKey[0] : undefined;
      })
      .filter((k) => typeof k === 'string');
    expect(invalidatedKeys).toContain('pm-home');
  });
});
