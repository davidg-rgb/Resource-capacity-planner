/**
 * Hardcoded Swedish public holidays for 2026–2030.
 *
 * Why hardcoded? The client horizon is 2026–2030. Computing Easter dynamically
 * (Computus) is error-prone and provides no value over an explicit table for
 * the next 5 years. Range is enforced; out-of-range lookups via
 * `getSwedishHolidays` throw `ERR_HOLIDAY_YEAR_OUT_OF_RANGE`.
 *
 * **Asymmetric API:**
 *   - `getSwedishHolidays(year)` THROWS for out-of-range years (loud failure
 *     when callers explicitly enumerate).
 *   - `isSwedishHoliday(date)` returns FALSE for out-of-range years (defensive
 *     query — callers shouldn't have to wrap every check in try/catch).
 *
 * Source table: `.planning/v5.0-ARCHITECTURE.md` §6.1
 */

import { ValidationError, ERR_HOLIDAY_YEAR_OUT_OF_RANGE } from '@/lib/errors';

export interface SwedishHoliday {
  date: Date;
  name: string;
}

const MIN_YEAR = 2026;
const MAX_YEAR = 2030;

/** Easter-driven holidays per year. Each entry is [month0, day]. */
const EASTER_TABLE: Record<
  number,
  {
    goodFri: [number, number];
    easterSun: [number, number];
    easterMon: [number, number];
    ascension: [number, number];
    midsummerEve: [number, number];
  }
> = {
  2026: {
    goodFri: [3, 3],
    easterSun: [3, 5],
    easterMon: [3, 6],
    ascension: [4, 14],
    midsummerEve: [5, 19],
  },
  2027: {
    goodFri: [2, 26],
    easterSun: [2, 28],
    easterMon: [2, 29],
    ascension: [4, 6],
    midsummerEve: [5, 25],
  },
  2028: {
    goodFri: [3, 14],
    easterSun: [3, 16],
    easterMon: [3, 17],
    ascension: [4, 25],
    midsummerEve: [5, 23],
  },
  2029: {
    goodFri: [2, 30],
    easterSun: [3, 1],
    easterMon: [3, 2],
    ascension: [4, 10],
    midsummerEve: [5, 22],
  },
  2030: {
    goodFri: [3, 19],
    easterSun: [3, 21],
    easterMon: [3, 22],
    ascension: [4, 30],
    midsummerEve: [5, 21],
  },
};

/** Fixed-date holidays every year: [month0, day, swedishName]. */
const FIXED_HOLIDAYS: Array<[number, number, string]> = [
  [0, 1, 'Nyårsdagen'],
  [0, 6, 'Trettondedag jul'],
  [4, 1, 'Första maj'],
  [5, 6, 'Sveriges nationaldag'],
  [11, 24, 'Julafton'],
  [11, 25, 'Juldagen'],
  [11, 26, 'Annandag jul'],
  [11, 31, 'Nyårsafton'],
];

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

/**
 * Returns the full sorted list of Swedish public holidays for the given year.
 * THROWS `ValidationError` with code `ERR_HOLIDAY_YEAR_OUT_OF_RANGE` if the
 * year is outside 2026–2030.
 */
export function getSwedishHolidays(year: number): SwedishHoliday[] {
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new ValidationError(
      `Holiday data unavailable for year ${year} (supported range: ${MIN_YEAR}-${MAX_YEAR})`,
      ERR_HOLIDAY_YEAR_OUT_OF_RANGE,
      { year, minYear: MIN_YEAR, maxYear: MAX_YEAR },
    );
  }
  const easter = EASTER_TABLE[year];
  const list: SwedishHoliday[] = [];
  for (const [m, d, name] of FIXED_HOLIDAYS) {
    list.push({ date: utc(year, m, d), name });
  }
  list.push({ date: utc(year, easter.goodFri[0], easter.goodFri[1]), name: 'Långfredagen' });
  list.push({ date: utc(year, easter.easterSun[0], easter.easterSun[1]), name: 'Påskdagen' });
  list.push({ date: utc(year, easter.easterMon[0], easter.easterMon[1]), name: 'Annandag påsk' });
  list.push({
    date: utc(year, easter.ascension[0], easter.ascension[1]),
    name: 'Kristi himmelsfärdsdag',
  });
  list.push({
    date: utc(year, easter.midsummerEve[0], easter.midsummerEve[1]),
    name: 'Midsommarafton',
  });
  list.sort((a, b) => a.date.getTime() - b.date.getTime());
  return list;
}

/**
 * Defensive query: returns true iff the given date matches a Swedish holiday.
 * Returns FALSE (does not throw) for years outside the supported range — query
 * helpers should be safe to call from anywhere.
 */
export function isSwedishHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  // Fixed-date check
  for (const [m, d] of FIXED_HOLIDAYS) {
    if (m === month && d === day) return true;
  }
  // Easter-driven check
  const easter = EASTER_TABLE[year];
  const easterDates: Array<[number, number]> = [
    easter.goodFri,
    easter.easterSun,
    easter.easterMon,
    easter.ascension,
    easter.midsummerEve,
  ];
  for (const [m, d] of easterDates) {
    if (m === month && d === day) return true;
  }
  return false;
}
