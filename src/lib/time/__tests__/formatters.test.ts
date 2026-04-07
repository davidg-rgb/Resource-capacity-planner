import { describe, it, expect } from 'vitest';
import { formatWeekShort, formatWeekLong, formatWeekRange } from '../formatters';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

describe('formatters', () => {
  it('TC-CAL-007: formatWeekShort 2026-06-15 returns "v.25"', () => {
    expect(formatWeekShort(utc(2026, 5, 15))).toBe('v.25');
  });

  it('formatWeekLong 2026-06-15 returns "vecka 25, 2026"', () => {
    expect(formatWeekLong(utc(2026, 5, 15))).toBe('vecka 25, 2026');
  });

  it('formatWeekLong handles 53-week year boundary: 2026-12-31 returns "vecka 53, 2026"', () => {
    expect(formatWeekLong(utc(2026, 11, 31))).toBe('vecka 53, 2026');
  });

  it('formatWeekLong handles year boundary: 2027-01-01 returns "vecka 53, 2026"', () => {
    expect(formatWeekLong(utc(2027, 0, 1))).toBe('vecka 53, 2026');
  });

  it('formatWeekRange single week returns "v.15"', () => {
    // Apr 6 2026 (Mon) – Apr 12 2026 (Sun) = ISO week 15
    expect(formatWeekRange(utc(2026, 3, 6), utc(2026, 3, 12))).toBe('v.15');
  });

  it('formatWeekRange cross-week returns "v.15–v.16"', () => {
    expect(formatWeekRange(utc(2026, 3, 6), utc(2026, 3, 13))).toBe('v.15\u2013v.16');
  });
});
