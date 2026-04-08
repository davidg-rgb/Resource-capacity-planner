// v5.0 — Phase 43 / Plan 43-04 (D-19): regression test for persona default
// landing routes. Guards against accidental regressions of the admin →
// /admin consolidation and, by extension, the four other persona landings.

import { describe, it, expect } from 'vitest';

import { getLandingRoute } from '@/features/personas/persona.routes';

describe('Phase 43 — persona default landing routes', () => {
  it('admin persona lands on /admin (D-19)', () => {
    expect(getLandingRoute({ kind: 'admin', displayName: 'A' })).toBe('/admin');
  });

  it('pm persona lands on /pm', () => {
    expect(getLandingRoute({ kind: 'pm', personId: 'p1', displayName: 'PM' })).toBe('/pm');
  });

  it('line-manager persona lands on /line-manager', () => {
    expect(getLandingRoute({ kind: 'line-manager', departmentId: 'd1', displayName: 'LM' })).toBe(
      '/line-manager',
    );
  });

  it('staff persona lands on /staff', () => {
    expect(getLandingRoute({ kind: 'staff', personId: 'p1', displayName: 'S' })).toBe('/staff');
  });

  it('rd persona lands on /rd', () => {
    expect(getLandingRoute({ kind: 'rd', displayName: 'R' })).toBe('/rd');
  });
});
