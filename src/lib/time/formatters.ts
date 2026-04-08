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

// ---------------------------------------------------------------------------
// v5.0 — Phase 42 Wave 0: quarter / year display formatters.
// Swedish prefix "KV" (kvartal); English prefix "Q".
// ---------------------------------------------------------------------------

const QUARTER_KEY_RE = /^(\d{4})-Q([1-4])$/;
const YEAR_KEY_RE = /^\d{4}$/;

/**
 * Format a quarter key like '2026-Q1' as a localized label.
 *   sv → 'KV1 2026'
 *   en → 'Q1 2026'
 */
export function formatQuarter(quarterKey: string, locale: 'sv' | 'en'): string {
  const m = QUARTER_KEY_RE.exec(quarterKey);
  if (!m) {
    throw new Error(`formatQuarter: invalid quarterKey '${quarterKey}'`);
  }
  const year = m[1];
  const q = m[2];
  const prefix = locale === 'sv' ? 'KV' : 'Q';
  return `${prefix}${q} ${year}`;
}

/**
 * Format a year key like '2026' as a localized label. Both locales return '2026'.
 */
export function formatYear(yearKey: string, _locale: 'sv' | 'en'): string {
  if (!YEAR_KEY_RE.test(yearKey)) {
    throw new Error(`formatYear: invalid yearKey '${yearKey}'`);
  }
  return yearKey;
}
