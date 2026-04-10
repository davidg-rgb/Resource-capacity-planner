import { describe, it, expect } from 'vitest';
import {
  getISOWeek,
  getISOWeekYear,
  getISOWeeksInYear,
  isISO53WeekYear,
  workingDaysInRange,
  countWorkingDays,
  isHistoricPeriod,
  isoWeek,
  isoDate,
  parseIsoDate,
  monthKey,
  quarterKey,
  rangeMonths,
  rangeWeeks,
  formatWeekLabel,
} from '../iso-calendar';
import { ValidationError } from '@/lib/errors';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

describe('iso-calendar', () => {
  it('TC-CAL-001: 2026 is a 53-week ISO year', () => {
    expect(getISOWeeksInYear(2026)).toBe(53);
    expect(isISO53WeekYear(2026)).toBe(true);
    expect(getISOWeeksInYear(2025)).toBe(52);
    expect(getISOWeeksInYear(2027)).toBe(52);
    expect(getISOWeeksInYear(2032)).toBe(53);
    expect(getISOWeeksInYear(2037)).toBe(53);
    // Leap year vs 53-week year are independent
    expect(getISOWeeksInYear(2024)).toBe(52); // leap but 52-week
  });

  it('TC-CAL-002: Week 1 of 2027 starts Mon Jan 4 (2026-12-31 in W53)', () => {
    expect(getISOWeek(utc(2026, 11, 31))).toBe(53);
    expect(getISOWeekYear(utc(2026, 11, 31))).toBe(2026);
    expect(getISOWeek(utc(2027, 0, 1))).toBe(53);
    expect(getISOWeekYear(utc(2027, 0, 1))).toBe(2026);
    expect(getISOWeek(utc(2027, 0, 3))).toBe(53);
    expect(getISOWeekYear(utc(2027, 0, 3))).toBe(2026);
    expect(getISOWeek(utc(2027, 0, 4))).toBe(1);
    expect(getISOWeekYear(utc(2027, 0, 4))).toBe(2027);
  });

  it('TC-CAL-005: workingDaysInRange April 2026 excludes Good Fri and Easter Mon', () => {
    // April 2026: 30 days, weekdays Mon-Fri = 22
    // Holidays in range: Good Fri Apr 3, Easter Mon Apr 6 → 22 - 2 = 20
    const days = workingDaysInRange(utc(2026, 3, 1), utc(2026, 3, 30));
    expect(days.length).toBe(20);
    expect(countWorkingDays(utc(2026, 3, 1), utc(2026, 3, 30))).toBe(20);
    // May Day (May 1) is outside range — boundary test
    // Verify Apr 3 (Good Fri) and Apr 6 (Easter Mon) NOT in result
    const dayStrs = days.map((d) => d.toISOString().slice(0, 10));
    expect(dayStrs).not.toContain('2026-04-03');
    expect(dayStrs).not.toContain('2026-04-06');
  });

  it('TC-PS-005: isHistoricPeriod returns true when monthKey < nowMonthKey', () => {
    expect(isHistoricPeriod('2026-03', '2026-04')).toBe(true);
    expect(isHistoricPeriod('2025-12', '2026-01')).toBe(true);
    // Current month is NOT historic
    expect(isHistoricPeriod('2026-04', '2026-04')).toBe(false);
    // Future month is NOT historic
    expect(isHistoricPeriod('2026-05', '2026-04')).toBe(false);
  });

  it('TC-PS-006: isHistoricPeriod throws ValidationError INVALID_DATE for malformed inputs', () => {
    const bad = ['2026-3', '2026/03', '26-03', '', 'not-a-date', '2026-13', '2026-00'];
    for (const v of bad) {
      let err: unknown;
      try {
        isHistoricPeriod(v, '2026-04');
      } catch (e) {
        err = e;
      }
      expect(err, `expected throw on monthKey="${v}"`).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).code).toBe('INVALID_DATE');
    }
    expect(() => isHistoricPeriod('2026-03', 'bogus')).toThrow(ValidationError);
  });

  it('countWorkingDays edge cases: same-day Tuesday=1, Saturday=0, Good Friday=0', () => {
    // Tue 2026-04-07 (non-holiday)
    expect(countWorkingDays(utc(2026, 3, 7), utc(2026, 3, 7))).toBe(1);
    // Sat 2026-04-04
    expect(countWorkingDays(utc(2026, 3, 4), utc(2026, 3, 4))).toBe(0);
    // Good Fri 2026-04-03
    expect(countWorkingDays(utc(2026, 3, 3), utc(2026, 3, 3))).toBe(0);
  });

  // -----------------------------------------------------------------------
  // v5.0 convenience wrappers (ARCHITECTURE §6.1)
  // -----------------------------------------------------------------------

  it('TC-CAL-001: isoWeek(2026-01-01) → { year: 2026, week: 1 }', () => {
    expect(isoWeek(utc(2026, 0, 1))).toEqual({ year: 2026, week: 1 });
  });

  it('TC-CAL-001b: isoWeek(2025-12-28) → { year: 2025, week: 52 }', () => {
    expect(isoWeek(utc(2025, 11, 28))).toEqual({ year: 2025, week: 52 });
  });

  it('TC-CAL-002: isoWeek(2025-12-29) → { year: 2026, week: 1 }', () => {
    expect(isoWeek(utc(2025, 11, 29))).toEqual({ year: 2026, week: 1 });
  });

  it('TC-CAL-009: rangeWeeks(2026-01-01, 2026-12-31) returns 53 entries', () => {
    const weeks = rangeWeeks(utc(2026, 0, 1), utc(2026, 11, 31));
    expect(weeks.length).toBe(53);
    expect(weeks[0]).toEqual({ year: 2026, week: 1 });
    expect(weeks[52]).toEqual({ year: 2026, week: 53 });
  });

  it('TC-CAL-010: rangeMonths(2026-01-01, 2026-12-31) returns 12 entries', () => {
    const months = rangeMonths(utc(2026, 0, 1), utc(2026, 11, 31));
    expect(months.length).toBe(12);
    expect(months[0]).toBe('2026-01');
    expect(months[11]).toBe('2026-12');
  });

  it('TC-CAL-013: monthKey(2026-03-15) → "2026-03"', () => {
    expect(monthKey(utc(2026, 2, 15))).toBe('2026-03');
  });

  it('TC-CAL-014: quarterKey(2026-05-20) → "2026-Q2"', () => {
    expect(quarterKey(utc(2026, 4, 20))).toBe('2026-Q2');
  });

  it('TC-CAL-015: parseIsoDate("not a date") throws ValidationError', () => {
    expect(() => parseIsoDate('not a date')).toThrow(ValidationError);
    expect(() => parseIsoDate('not a date')).toThrow(/INVALID_DATE|Invalid ISO date/);
  });

  it('parseIsoDate round-trips with isoDate', () => {
    const d = utc(2026, 5, 15);
    expect(isoDate(d)).toBe('2026-06-15');
    expect(parseIsoDate('2026-06-15').getTime()).toBe(d.getTime());
  });

  it('formatWeekLabel Swedish and English', () => {
    // When year differs from current, year is appended
    expect(formatWeekLabel(2020, 14, 'sv')).toBe('v.14 2020');
    expect(formatWeekLabel(2020, 14, 'en')).toBe('W14 2020');
  });
});
