/**
 * Swedish week display helpers. The ONLY place in the codebase where week
 * strings are produced — keeps "v.14" / "vecka 14, 2026" formatting consistent
 * everywhere and lets us re-skin once.
 *
 * Note: `formatWeekLong` uses the ISO week-numbering YEAR, not the calendar
 * year. 2027-01-01 formats as "vecka 53, 2026" because Jan 1 2027 belongs to
 * ISO week 53 of 2026.
 */

import { getISOWeek, getISOWeekYear } from './iso-calendar';

/** "v.14" — short label, no year. */
export function formatWeekShort(date: Date): string {
  return `v.${getISOWeek(date)}`;
}

/** "vecka 14, 2026" — long label using ISO week year. */
export function formatWeekLong(date: Date): string {
  return `vecka ${getISOWeek(date)}, ${getISOWeekYear(date)}`;
}

/**
 * Format a date range as a week label.
 * - Same ISO week+year → "v.14"
 * - Cross-week → "v.14–v.16" (en-dash U+2013)
 */
export function formatWeekRange(start: Date, end: Date): string {
  const sw = getISOWeek(start);
  const sy = getISOWeekYear(start);
  const ew = getISOWeek(end);
  const ey = getISOWeekYear(end);
  if (sw === ew && sy === ey) return `v.${sw}`;
  return `v.${sw}\u2013v.${ew}`;
}
