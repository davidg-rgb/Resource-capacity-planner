import { describe, it, expect } from 'vitest';
import { isSwedishHoliday, getSwedishHolidays } from '../swedish-holidays';
import { getISOWeek } from '../iso-calendar';
import { ValidationError } from '@/lib/errors';

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

describe('swedish-holidays', () => {
  it('TC-CAL-003: Midsummer Eve 2026-06-19 is a Swedish holiday', () => {
    expect(isSwedishHoliday(utc(2026, 5, 19))).toBe(true);
  });

  it('TC-CAL-004: Jan 1 2026 is a holiday and in ISO week 1', () => {
    expect(isSwedishHoliday(utc(2026, 0, 1))).toBe(true);
    expect(getISOWeek(utc(2026, 0, 1))).toBe(1);
  });

  it('TC-CAL-006: getSwedishHolidays(2031) throws ERR_HOLIDAY_YEAR_OUT_OF_RANGE', () => {
    expect(() => getSwedishHolidays(2031)).toThrow(ValidationError);
    try {
      getSwedishHolidays(2031);
    } catch (e) {
      expect((e as ValidationError).code).toBe('ERR_HOLIDAY_YEAR_OUT_OF_RANGE');
    }
    expect(() => getSwedishHolidays(2025)).toThrow(ValidationError);
    try {
      getSwedishHolidays(2025);
    } catch (e) {
      expect((e as ValidationError).code).toBe('ERR_HOLIDAY_YEAR_OUT_OF_RANGE');
    }
  });

  it('2026 has all 13 expected Swedish holidays', () => {
    const holidays = getSwedishHolidays(2026);
    expect(holidays.length).toBe(13);
    // 5 Easter-driven: Good Fri Apr 3, Easter Sun Apr 5, Easter Mon Apr 6, Ascension May 14, Midsummer Eve Jun 19
    // 8 fixed: Jan 1, Jan 6, May 1, Jun 6, Dec 24, Dec 25, Dec 26, Dec 31
    const dates = holidays.map((h) => h.date.toISOString().slice(0, 10));
    expect(dates).toContain('2026-01-01');
    expect(dates).toContain('2026-01-06');
    expect(dates).toContain('2026-04-03');
    expect(dates).toContain('2026-04-05');
    expect(dates).toContain('2026-04-06');
    expect(dates).toContain('2026-05-01');
    expect(dates).toContain('2026-05-14');
    expect(dates).toContain('2026-06-06');
    expect(dates).toContain('2026-06-19');
    expect(dates).toContain('2026-12-24');
    expect(dates).toContain('2026-12-25');
    expect(dates).toContain('2026-12-26');
    expect(dates).toContain('2026-12-31');
  });

  it('Easter spot-check 2027-2030', () => {
    expect(isSwedishHoliday(utc(2027, 2, 28))).toBe(true); // Easter Sun 2027
    expect(isSwedishHoliday(utc(2028, 3, 16))).toBe(true); // Easter Sun 2028
    expect(isSwedishHoliday(utc(2029, 3, 1))).toBe(true); // Easter Sun 2029
    expect(isSwedishHoliday(utc(2030, 3, 21))).toBe(true); // Easter Sun 2030
  });

  it('isSwedishHoliday returns false for non-holiday and out-of-range years', () => {
    // Apr 2 2026 is Thu, not a holiday
    expect(isSwedishHoliday(utc(2026, 3, 2))).toBe(false);
    // Out-of-range year does NOT throw — returns false
    expect(isSwedishHoliday(utc(2031, 0, 1))).toBe(false);
  });
});
