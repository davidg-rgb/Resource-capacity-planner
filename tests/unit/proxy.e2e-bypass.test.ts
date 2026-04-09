import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

// Source-level invariant test: we do NOT import src/proxy.ts because importing
// triggers Clerk initialization in jsdom. Instead we read the file as a string
// and assert the E2E bypass guard is present and ordered correctly.
describe('proxy.ts E2E bypass invariant', () => {
  const src = readFileSync('src/proxy.ts', 'utf8');

  it('contains NODE_ENV=test short-circuit', () => {
    expect(src).toMatch(/process\.env\.NODE_ENV\s*===\s*['"]test['"]/);
  });

  it('contains E2E_TEST=1 short-circuit', () => {
    expect(src).toMatch(/process\.env\.E2E_TEST\s*===\s*['"]1['"]/);
  });

  it('bypass appears before auth.protect()', () => {
    const bypassIdx = src.indexOf('E2E_TEST');
    const protectIdx = src.indexOf('auth.protect()');
    expect(bypassIdx).toBeGreaterThan(0);
    expect(protectIdx).toBeGreaterThan(bypassIdx);
  });

  it('references ADR-004 or E2E rationale in a comment', () => {
    expect(src).toMatch(/ADR-004|E2E bypass/);
  });

  it('preserves public route matcher and config export', () => {
    expect(src).toMatch(/isPublicRoute/);
    expect(src).toMatch(/export const config/);
  });
});
