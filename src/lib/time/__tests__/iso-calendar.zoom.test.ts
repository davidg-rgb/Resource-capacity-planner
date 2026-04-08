/**
 * v5.0 — Phase 42 Wave 0 — TC-CAL-003 + TC-CAL-006
 *
 * Quarter / year aggregation helpers for long-horizon zoom on the timeline.
 *
 * TC-CAL-003: quarter buckets snap on ISO-year boundary; Dec 2026 → '2026-Q4'.
 * TC-CAL-006: week 53 of 2026 (Dec 28–31, 4 working days) lives in Q4-2026 /
 *             year-2026 totals, NOT in 2027.
 */

import { describe, expect, it } from 'vitest';

import {
  quarterKeyForMonth,
  rangeQuarters,
  rangeYears,
  workDaysInMonth,
  workingDaysInRange,
  yearKeyForMonth,
} from '../iso-calendar';

function buildMonthRange(startYear: number, startMonth: number, count: number): string[] {
  const out: string[] = [];
  let y = startYear;
  let m = startMonth; // 1-based
  for (let i = 0; i < count; i++) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

describe('TC-CAL-003: quarter buckets snap on ISO-year boundary', () => {
  it('rangeQuarters for full 2026 → 4 quarters', () => {
    const range = buildMonthRange(2026, 1, 12);
    expect(rangeQuarters(range)).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
  });

  it("quarterKeyForMonth('2026-12') === '2026-Q4'", () => {
    expect(quarterKeyForMonth('2026-12')).toBe('2026-Q4');
  });

  it("yearKeyForMonth('2026-12') === '2026'", () => {
    expect(yearKeyForMonth('2026-12')).toBe('2026');
  });

  it('rangeYears across 2026-2027 → ["2026","2027"]', () => {
    const range = buildMonthRange(2026, 1, 18);
    expect(rangeYears(range)).toEqual(['2026', '2027']);
  });
});

describe('TC-CAL-006: week 53 of 2026 belongs to Q4-2026', () => {
  it('Dec 28–30 2026 are working days in December (3 days)', () => {
    // Week 53 of ISO-2026 spans Dec 28 (Mon) – Jan 1 2027 (Fri).
    // Dec 31 = Nyårsafton (Swedish holiday) and Jan 1 = Nyårsdagen (holiday).
    // → 3 working days (Mon Dec 28, Tue Dec 29, Wed Dec 30), all in Dec 2026.
    const week53Days = workingDaysInRange(
      new Date(Date.UTC(2026, 11, 28)),
      new Date(Date.UTC(2027, 0, 1)),
    );
    expect(week53Days).toHaveLength(3);
    // All four should be in Dec 2026.
    for (const d of week53Days) {
      expect(d.getUTCFullYear()).toBe(2026);
      expect(d.getUTCMonth()).toBe(11);
    }
  });

  it("December 2026 maps to '2026-Q4' (not 2027 anything)", () => {
    expect(quarterKeyForMonth('2026-12')).toBe('2026-Q4');
    expect(yearKeyForMonth('2026-12')).toBe('2026');
  });

  it('Property: sum(monthDays) === sum(quarterDays) === sum(yearDays) over 20-month range', () => {
    const range = buildMonthRange(2025, 6, 20); // Jun 2025 .. Jan 2027 — straddles week 53 of 2026
    const monthTotal = range.reduce((acc, mk) => {
      const [y, m] = mk.split('-').map(Number);
      return acc + workDaysInMonth(y, m - 1).length;
    }, 0);

    const quarterBuckets = rangeQuarters(range);
    const monthsByQuarter = new Map<string, string[]>();
    for (const mk of range) {
      const q = quarterKeyForMonth(mk);
      const list = monthsByQuarter.get(q) ?? [];
      list.push(mk);
      monthsByQuarter.set(q, list);
    }
    const quarterTotal = quarterBuckets.reduce((acc, q) => {
      const months = monthsByQuarter.get(q) ?? [];
      return (
        acc +
        months.reduce((a, mk) => {
          const [y, m] = mk.split('-').map(Number);
          return a + workDaysInMonth(y, m - 1).length;
        }, 0)
      );
    }, 0);

    const yearBuckets = rangeYears(range);
    const monthsByYear = new Map<string, string[]>();
    for (const mk of range) {
      const yk = yearKeyForMonth(mk);
      const list = monthsByYear.get(yk) ?? [];
      list.push(mk);
      monthsByYear.set(yk, list);
    }
    const yearTotal = yearBuckets.reduce((acc, yk) => {
      const months = monthsByYear.get(yk) ?? [];
      return (
        acc +
        months.reduce((a, mk) => {
          const [y, m] = mk.split('-').map(Number);
          return a + workDaysInMonth(y, m - 1).length;
        }, 0)
      );
    }, 0);

    expect(quarterTotal).toBe(monthTotal);
    expect(yearTotal).toBe(monthTotal);
  });
});
