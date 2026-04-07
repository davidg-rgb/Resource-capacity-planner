/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { PersonaProvider, usePersona } from '../persona.context';
import { getLandingRoute } from '../persona.routes';
import type { Persona } from '../persona.types';

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
      <PersonaProvider>
        <Probe />
      </PersonaProvider>,
    );
    expect(screen.getByTestId('kind').textContent).toBe('admin');
  });

  it("TC-PSN-002: setPersona persists to localStorage under key 'nc:persona'", () => {
    let api: ReturnType<typeof usePersona> | undefined;
    render(
      <PersonaProvider>
        <Probe onReady={(a) => (api = a)} />
      </PersonaProvider>,
    );
    const next: Persona = { kind: 'pm', personId: 'p1', displayName: 'Anna' };
    act(() => {
      api!.setPersona(next);
    });
    const stored = JSON.parse(window.localStorage.getItem('nc:persona') ?? 'null');
    expect(stored).toEqual(next);
  });

  it('TC-PSN-003: hydrates persona from localStorage on mount', () => {
    const stored: Persona = { kind: 'line-manager', departmentId: 'd1', displayName: 'Bo' };
    window.localStorage.setItem('nc:persona', JSON.stringify(stored));
    render(
      <PersonaProvider>
        <Probe />
      </PersonaProvider>,
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
    expect(getLandingRoute({ kind: 'admin', displayName: 'X' })).toBe('/admin/change-log');
  });

  it('usePersona throws outside provider', () => {
    // Suppress React's error boundary noise
    const orig = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow(/usePersona must be used inside PersonaProvider/);
    } finally {
      console.error = orig;
    }
  });

  it('corrupt localStorage falls back to admin and clears the key', () => {
    window.localStorage.setItem('nc:persona', '{not json');
    render(
      <PersonaProvider>
        <Probe />
      </PersonaProvider>,
    );
    expect(screen.getByTestId('kind').textContent).toBe('admin');
    expect(window.localStorage.getItem('nc:persona')).toBeNull();
  });
});
