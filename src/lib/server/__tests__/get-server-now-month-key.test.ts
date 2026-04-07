import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('drizzle-orm', () => ({
  // Capture template literal as a plain string so the test can inspect it.
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    __sql: strings.reduce(
      (acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ''),
      '',
    ),
  }),
}));

import { getServerNowMonthKey, type TxLike } from '../get-server-now-month-key';

describe('getServerNowMonthKey (FOUND-V5-06)', () => {
  const ORIG_ENV = process.env.NC_TEST_NOW;

  beforeEach(() => {
    delete process.env.NC_TEST_NOW;
  });
  afterEach(() => {
    if (ORIG_ENV === undefined) delete process.env.NC_TEST_NOW;
    else process.env.NC_TEST_NOW = ORIG_ENV;
  });

  it('FOUND-V5-06-a: returns process.env.NC_TEST_NOW when set', async () => {
    process.env.NC_TEST_NOW = '2026-04';
    const execute = vi.fn(async () => {
      throw new Error('execute should not be called when env override is set');
    });
    const tx: TxLike = { execute };
    const result = await getServerNowMonthKey(tx);
    expect(result).toBe('2026-04');
    expect(execute).not.toHaveBeenCalled();
  });

  it('FOUND-V5-06-b: returns cached tx.__nowMonthKey on second call', async () => {
    const execute = vi.fn(async () => ({ rows: [{ month_key: '2026-04' }] }));
    const tx: TxLike = { execute };
    const a = await getServerNowMonthKey(tx);
    const b = await getServerNowMonthKey(tx);
    expect(a).toBe('2026-04');
    expect(b).toBe('2026-04');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(tx.__nowMonthKey).toBe('2026-04');
  });

  it("FOUND-V5-06-c: runs SELECT to_char(CURRENT_DATE,'YYYY-MM') when no cache and no env override", async () => {
    const calls: unknown[] = [];
    const execute = async (q: unknown) => {
      calls.push(q);
      return { rows: [{ month_key: '2026-04' }] };
    };
    const tx: TxLike = { execute };
    await getServerNowMonthKey(tx);
    expect(calls.length).toBe(1);
    const arg = calls[0] as { __sql: string };
    expect(arg.__sql).toContain('CURRENT_DATE');
    expect(arg.__sql).toContain('YYYY-MM');
  });

  it('FOUND-V5-06-d: NC_TEST_NOW is validated (rejects malformed)', async () => {
    process.env.NC_TEST_NOW = 'bogus';
    const execute = vi.fn(async () => ({ rows: [{ month_key: '2026-04' }] }));
    const tx: TxLike = { execute };
    const result = await getServerNowMonthKey(tx);
    // Bogus value ignored — fell through to DB query
    expect(result).toBe('2026-04');
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
