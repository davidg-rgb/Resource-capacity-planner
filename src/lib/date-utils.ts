/**
 * Date utilities for month-based allocation grids.
 * All months represented as YYYY-MM strings.
 */

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * Generate an array of consecutive month strings starting from `startMonth`.
 * @param startMonth - YYYY-MM format (e.g. "2026-03")
 * @param count - Number of months to generate
 */
export function generateMonthRange(startMonth: string, count: number): string[] {
  let [year, month] = startMonth.split('-').map(Number);
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    result.push(`${year}-${String(month).padStart(2, '0')}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return result;
}

/**
 * Returns the current month as a YYYY-MM string.
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Converts "2026-03" to "Mar 2026" for grid column headers.
 */
export function formatMonthHeader(month: string): string {
  const [yearStr, monthStr] = month.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  return `${MONTH_ABBR[monthIndex]} ${yearStr}`;
}

/**
 * Normalizes a date string to YYYY-MM by slicing to first 7 characters.
 * Drizzle date({ mode: 'string' }) stores as YYYY-MM-DD; we need YYYY-MM for grid field keys.
 */
export function normalizeMonth(dateString: string): string {
  return dateString.slice(0, 7);
}
