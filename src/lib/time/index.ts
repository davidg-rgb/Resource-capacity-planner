/**
 * lib/time — single source of truth for ISO 8601 week math, Swedish holiday
 * detection, working-day counting, and Swedish week display formatting.
 *
 * **Date contract for callers:** Construct dates as
 * `new Date(Date.UTC(year, monthIndex, day))`. The module reads UTC fields
 * internally to avoid DST drift. See `iso-calendar.ts` JSDoc for full rationale.
 *
 * No file outside `src/lib/time/` may import `date-fns` week helpers or call
 * `Date#getDay()` for day-of-week decisions — both are blocked by lint
 * (`eslint.config.mjs`).
 */

export {
  getISOWeek,
  getISOWeekYear,
  getISOWeeksInYear,
  isISO53WeekYear,
  workingDaysInRange,
  countWorkingDays,
  isHistoricPeriod,
  distribute,
  workDaysInIsoWeek,
  workDaysInMonth,
} from './iso-calendar';

export { isSwedishHoliday, getSwedishHolidays } from './swedish-holidays';
export type { SwedishHoliday } from './swedish-holidays';

export { formatWeekShort, formatWeekLong, formatWeekRange } from './formatters';
