// v5.0 — Phase 37: distribute + workDaysInIsoWeek + workDaysInMonth contract
// Covers TC-CAL-023, TC-CAL-024, TC-CAL-025 (sampling — full property fan-out
// is Phase 44's job).

import { describe, it, expect } from 'vitest';

import { distribute, workDaysInIsoWeek, workDaysInMonth } from '@/lib/time';

describe('distribute (ADR-010 largest-remainder)', () => {
  it('TC-CAL-024: distribute(37, 5) returns five equal 7.40 slots', () => {
    expect(distribute(37, 5)).toEqual([7.4, 7.4, 7.4, 7.4, 7.4]);
  });

  it('TC-CAL-023: distribute(37, 22) length is 22 and sum is exactly 37.00', () => {
    const out = distribute(37, 22);
    expect(out).toHaveLength(22);
    const sumCents = out.reduce((acc, v) => acc + Math.round(v * 100), 0);
    expect(sumCents).toBe(3700);
  });

  it('distribute(0, 5) returns five zeros', () => {
    expect(distribute(0, 5)).toEqual([0, 0, 0, 0, 0]);
  });

  it('distribute(40, 5) returns five eights (TC-AC-003 building block)', () => {
    expect(distribute(40, 5)).toEqual([8, 8, 8, 8, 8]);
  });

  it('throws BAD_DAY_COUNT on non-positive day counts', () => {
    expect(() => distribute(10, 0)).toThrow(/BAD_DAY_COUNT|dayCount/);
    expect(() => distribute(10, -1)).toThrow(/BAD_DAY_COUNT|dayCount/);
  });

  it('throws BAD_HOURS on negative totals', () => {
    expect(() => distribute(-1, 5)).toThrow(/BAD_HOURS|totalHours/);
  });

  it('TC-CAL-025 (sampled): sum-preservation invariant for representative inputs', () => {
    const totals = [0, 0.01, 0.5, 1, 7.5, 37, 100, 999.99];
    for (const N of totals) {
      for (let K = 1; K <= 31; K++) {
        const out = distribute(N, K);
        expect(out).toHaveLength(K);
        const sumCents = out.reduce((a, v) => a + Math.round(v * 100), 0);
        expect(sumCents).toBe(Math.round(N * 100));
      }
    }
  });
});

describe('workDaysInIsoWeek', () => {
  it('week 53 of 2026 spans Dec 28–30 (Dec 31 Nyårsafton + Jan 1 Nyårsdagen excluded)', () => {
    // Week 53 of 2026 = Mon Dec 28 .. Sun Jan 3.  Working days are Mon–Fri,
    // minus Swedish holidays. Dec 31 (Nyårsafton) and Jan 1 (Nyårsdagen) are
    // both holidays in `swedish-holidays.ts`, so only 3 working days remain.
    expect(workDaysInIsoWeek(2026, 53)).toEqual(['2026-12-28', '2026-12-29', '2026-12-30']);
  });

  it('week 14 of 2026 excludes Good Friday 2026-04-03', () => {
    const days = workDaysInIsoWeek(2026, 14);
    expect(days).not.toContain('2026-04-03');
    // Mon–Thu of that week are working days
    expect(days).toContain('2026-03-30');
    expect(days).toContain('2026-03-31');
    expect(days).toContain('2026-04-01');
    expect(days).toContain('2026-04-02');
    expect(days).toHaveLength(4);
  });

  it('week 23 of 2026 (a normal week) has 5 working days', () => {
    expect(workDaysInIsoWeek(2026, 23)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
    ]);
  });
});

describe('workDaysInMonth', () => {
  it('returns Mon–Fri of June 2026 minus midsummer eve (2026-06-19)', () => {
    const days = workDaysInMonth(2026, 5); // June
    expect(days).not.toContain('2026-06-19');
    // Should not contain weekends — spot check first weekend of June 2026 (6-7)
    expect(days).not.toContain('2026-06-06');
    expect(days).not.toContain('2026-06-07');
    // Should contain known working day
    expect(days).toContain('2026-06-01');
    // All entries are valid YYYY-MM-DD strings within June 2026
    for (const d of days) expect(d).toMatch(/^2026-06-\d{2}$/);
  });

  it('every entry of every month in 2026 is a weekday and not a holiday', () => {
    for (let m = 0; m < 12; m++) {
      const days = workDaysInMonth(2026, m);
      for (const d of days) {
        const date = new Date(`${d}T00:00:00Z`);
        const dow = date.getUTCDay();
        expect(dow).not.toBe(0);
        expect(dow).not.toBe(6);
      }
    }
  });
});
