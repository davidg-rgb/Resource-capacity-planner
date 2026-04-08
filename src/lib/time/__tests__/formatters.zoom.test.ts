/**
 * v5.0 — Phase 42 Wave 0 — formatQuarter / formatYear locale formatters.
 */

import { describe, expect, it } from 'vitest';

import { formatQuarter, formatYear } from '../formatters';

describe('formatQuarter', () => {
  it('Swedish: KV1..KV4 prefix', () => {
    expect(formatQuarter('2026-Q1', 'sv')).toBe('KV1 2026');
    expect(formatQuarter('2026-Q2', 'sv')).toBe('KV2 2026');
    expect(formatQuarter('2026-Q3', 'sv')).toBe('KV3 2026');
    expect(formatQuarter('2026-Q4', 'sv')).toBe('KV4 2026');
  });

  it('English: Q1..Q4 prefix', () => {
    expect(formatQuarter('2026-Q1', 'en')).toBe('Q1 2026');
    expect(formatQuarter('2026-Q2', 'en')).toBe('Q2 2026');
    expect(formatQuarter('2026-Q3', 'en')).toBe('Q3 2026');
    expect(formatQuarter('2026-Q4', 'en')).toBe('Q4 2026');
  });

  it('throws on malformed key', () => {
    expect(() => formatQuarter('2026-Q5', 'en')).toThrow();
    expect(() => formatQuarter('not-a-key', 'sv')).toThrow();
  });
});

describe('formatYear', () => {
  it('Swedish year is plain 4-digit', () => {
    expect(formatYear('2026', 'sv')).toBe('2026');
  });
  it('English year is plain 4-digit', () => {
    expect(formatYear('2026', 'en')).toBe('2026');
  });
  it('throws on malformed key', () => {
    expect(() => formatYear('20xx', 'en')).toThrow();
  });
});
