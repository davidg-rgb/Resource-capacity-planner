/**
 * Per-request cached server clock source for historic-edit guards (FOUND-V5-06).
 *
 * Resolution order:
 *   1. process.env.NC_TEST_NOW if it matches /^\d{4}-(0[1-9]|1[0-2])$/ (test injection).
 *      MALFORMED NC_TEST_NOW is IGNORED, not returned — poisoning the clock with
 *      garbage would cascade into silent historic-check bugs across the suite.
 *   2. tx.__nowMonthKey if already populated on this transaction (cache hit).
 *   3. SELECT to_char(CURRENT_DATE, 'YYYY-MM') AS month_key via tx.execute,
 *      then cache on tx.__nowMonthKey and return.
 *
 * Why not Node `new Date()`? See ARCHITECTURE §6.3 CLOCK SOURCE — production
 * MUST use the database clock to avoid Node/DB drift at midnight CET.
 *
 * @param tx — anything with an `.execute()` method (Drizzle transaction shape).
 *             The helper attaches `__nowMonthKey` to it as a side effect for caching.
 */

import { sql } from 'drizzle-orm';

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type TxLike = {
  __nowMonthKey?: string;
  execute: (query: unknown) => Promise<unknown>;
};

export async function getServerNowMonthKey(tx: TxLike): Promise<string> {
  const envOverride = process.env.NC_TEST_NOW;
  if (envOverride && MONTH_KEY_RE.test(envOverride)) {
    return envOverride;
  }

  if (tx.__nowMonthKey && MONTH_KEY_RE.test(tx.__nowMonthKey)) {
    return tx.__nowMonthKey;
  }

  const result = (await tx.execute(
    sql`SELECT to_char(CURRENT_DATE, 'YYYY-MM') AS month_key`,
  )) as unknown;

  // Drizzle's .execute() may return { rows: [...] } or an array depending on driver.
  const row: Record<string, unknown> | undefined = Array.isArray(result)
    ? (result[0] as Record<string, unknown> | undefined)
    : (result as { rows?: Array<Record<string, unknown>> })?.rows?.[0];

  const monthKey = (row?.month_key ?? row?.monthKey) as unknown;
  if (typeof monthKey !== 'string' || !MONTH_KEY_RE.test(monthKey)) {
    throw new Error(
      `getServerNowMonthKey: unexpected DB result shape: ${JSON.stringify(result).slice(0, 200)}`,
    );
  }
  tx.__nowMonthKey = monthKey;
  return monthKey;
}
