/**
 * ISO 8601 calendar math + Swedish working-day helpers.
 *
 * **Date contract:** This module operates on calendar dates, not instants.
 * Internally we read UTC fields (`getUTCFullYear`, `getUTCMonth`, `getUTCDate`,
 * `getUTCDay`) so that DST transitions cannot drift the result by ±1 hour.
 *
 * **Caller contract:** Pass dates constructed from year/month/day numbers via
 * `new Date(Date.UTC(y, m, d))`. Local-time `new Date(y, m, d)` works for most
 * days but is not guaranteed on DST transition days. The barrel index re-states
 * this contract.
 *
 * **53-week ISO years are NOT the same as Gregorian leap years.** They are
 * independent concepts:
 *   - 2024: leap year (366 days), 52 ISO weeks
 *   - 2026: NOT leap (365 days), 53 ISO weeks
 *   - 2032: leap year, 53 ISO weeks
 * Do not conflate the two.
 */

import { ValidationError } from '@/lib/errors';

import { isSwedishHoliday } from './swedish-holidays';

const MS_PER_DAY = 86400000;

/**
 * Returns the ISO 8601 week number (1–53) for the given date.
 * Standard algorithm: shift to the Thursday of the same ISO week, then count
 * days from Jan 1 of that Thursday's year.
 */
export function getISOWeek(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = target.getUTCDay() || 7; // Sun=0 → 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum); // Thu of this ISO week
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
}

/**
 * Returns the ISO week-numbering year (the year of the Thursday of this ISO
 * week). For 2026-12-31 this returns 2026; for 2027-01-01..03 this also returns
 * 2026 (those days belong to ISO week 53 of 2026).
 */
export function getISOWeekYear(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  return target.getUTCFullYear();
}

/**
 * Returns 52 or 53 — the number of ISO weeks in the given year.
 *
 * Rule: a year has 53 ISO weeks iff Jan 1 is a Thursday OR (it's a leap year
 * AND Jan 1 is a Wednesday).
 */
export function getISOWeeksInYear(year: number): 52 | 53 {
  const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay() || 7; // 1=Mon..7=Sun
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (jan1 === 4 || (isLeap && jan1 === 3)) return 53;
  return 52;
}

/** Convenience predicate. */
export function isISO53WeekYear(year: number): boolean {
  return getISOWeeksInYear(year) === 53;
}

/**
 * Returns the array of working dates (Mon–Fri, excluding Swedish holidays)
 * between `start` and `end`, inclusive on both ends.
 */
export function workingDaysInRange(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor.getTime() <= stop.getTime()) {
    const dow = cursor.getUTCDay(); // 0=Sun..6=Sat
    if (dow !== 0 && dow !== 6 && !isSwedishHoliday(cursor)) {
      out.push(new Date(cursor.getTime()));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** Count of working days in the inclusive range. */
export function countWorkingDays(start: Date, end: Date): number {
  return workingDaysInRange(start, end).length;
}

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Returns true iff `monthKey` is strictly before `nowMonthKey`.
 *
 * Both arguments MUST be `YYYY-MM` strings (validated). Lexical compare is
 * correct because YYYY-MM is fixed-width and zero-padded.
 *
 * The current month is NOT historic — only months strictly before the clock
 * month. Per ARCHITECTURE §6.3, `nowMonthKey` MUST come from
 * `getServerNowMonthKey(tx)`, never from Node `new Date()` (avoids midnight
 * CET drift between Node and the database clock).
 *
 * @throws ValidationError(code='INVALID_DATE') on malformed inputs.
 */
export function isHistoricPeriod(monthKey: string, nowMonthKey: string): boolean {
  if (!MONTH_KEY_RE.test(monthKey)) {
    throw new ValidationError(`Invalid monthKey: ${monthKey}`, 'INVALID_DATE');
  }
  if (!MONTH_KEY_RE.test(nowMonthKey)) {
    throw new ValidationError(`Invalid nowMonthKey: ${nowMonthKey}`, 'INVALID_DATE');
  }
  return monthKey < nowMonthKey;
}
