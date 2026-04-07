import { describe, it, expect } from 'vitest';
import {
  getISOWeek,
  getISOWeekYear,
  getISOWeeksInYear,
  isISO53WeekYear,
  workingDaysInRange,
  countWorkingDays,
} from '../iso-calendar';

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

  it('countWorkingDays edge cases: same-day Tuesday=1, Saturday=0, Good Friday=0', () => {
    // Tue 2026-04-07 (non-holiday)
    expect(countWorkingDays(utc(2026, 3, 7), utc(2026, 3, 7))).toBe(1);
    // Sat 2026-04-04
    expect(countWorkingDays(utc(2026, 3, 4), utc(2026, 3, 4))).toBe(0);
    // Good Fri 2026-04-03
    expect(countWorkingDays(utc(2026, 3, 3), utc(2026, 3, 3))).toBe(0);
  });
});
