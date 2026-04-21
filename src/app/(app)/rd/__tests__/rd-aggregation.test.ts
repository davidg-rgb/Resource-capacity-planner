/**
 * v6.0 — Phase 52 / Plan 52-04 (RD-01 / D-08): unit tests for /rd zoom
 * aggregation. Covers 2026 (53-week ISO year — Pitfall #4 avoidance),
 * 2027, 2028 × month/quarter/year zoom combos.
 */

import { describe, expect, it } from 'vitest';

import type { TimelineZoom } from '@/components/timeline/timeline-columns';
import { aggregateRdRowMonths, rdColumnKeys } from '../rd-aggregation';

function genMonthRange(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}

function denseMonths(monthRange: string[], planned: number, actual: number) {
  return Object.fromEntries(monthRange.map((m) => [m, { plannedHours: planned, actualHours: actual }]));
}

describe('RD-01: rdColumnKeys — zoom-aware column enumeration', () => {
  it('zoom=month 2026 → 12 calendar months', () => {
    const monthRange = genMonthRange(2026);
    expect(rdColumnKeys(monthRange, 'month')).toEqual(monthRange);
  });

  it('zoom=quarter 2026 → 4 ISO-year-majority quarters', () => {
    const monthRange = genMonthRange(2026);
    const qs = rdColumnKeys(monthRange, 'quarter');
    expect(qs).toEqual(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4']);
  });

  it('zoom=year 2026 → exactly 1 year column (not 2 — Pitfall #4: Dec 2026 majority ISO year is 2026)', () => {
    const monthRange = genMonthRange(2026);
    const years = rdColumnKeys(monthRange, 'year');
    expect(years).toEqual(['2026']);
    expect(years).toHaveLength(1);
  });

  it('zoom=year 2027 → 1 year column, no spill', () => {
    const monthRange = genMonthRange(2027);
    const years = rdColumnKeys(monthRange, 'year');
    expect(years).toEqual(['2027']);
  });

  it('zoom=year 2028 → 1 year column, no spill', () => {
    const monthRange = genMonthRange(2028);
    const years = rdColumnKeys(monthRange, 'year');
    expect(years).toEqual(['2028']);
  });

  it('zoom=year spanning 2026-01..2028-12 → 3 year columns', () => {
    const monthRange = [
      ...genMonthRange(2026),
      ...genMonthRange(2027),
      ...genMonthRange(2028),
    ];
    expect(rdColumnKeys(monthRange, 'year')).toEqual(['2026', '2027', '2028']);
  });
});

describe('RD-01: aggregateRdRowMonths — summing month-grain cells into zoom buckets', () => {
  it('month zoom is identity (plus immutability copy)', () => {
    const monthRange = genMonthRange(2026);
    const months = denseMonths(monthRange, 10, 8);
    const keys = rdColumnKeys(monthRange, 'month');
    const agg = aggregateRdRowMonths(months, keys, 'month');
    expect(agg['2026-01']).toEqual({ plannedHours: 10, actualHours: 8 });
    expect(Object.keys(agg)).toHaveLength(12);
    // immutability: returned object is a copy
    expect(agg['2026-01']).not.toBe(months['2026-01']);
  });

  it('quarter zoom sums 3 months into each quarter', () => {
    const monthRange = genMonthRange(2026);
    const months = denseMonths(monthRange, 10, 8);
    const keys = rdColumnKeys(monthRange, 'quarter');
    const agg = aggregateRdRowMonths(months, keys, 'quarter');
    // 3 months × 10 planned / 3 months × 8 actual per quarter
    expect(agg['2026-Q1']).toEqual({ plannedHours: 30, actualHours: 24 });
    expect(agg['2026-Q4']).toEqual({ plannedHours: 30, actualHours: 24 });
  });

  it('year zoom sums 12 months into one year bucket (2026 case — 53-week ISO year)', () => {
    const monthRange = genMonthRange(2026);
    const months = denseMonths(monthRange, 10, 8);
    const keys = rdColumnKeys(monthRange, 'year');
    const agg = aggregateRdRowMonths(months, keys, 'year');
    expect(agg['2026']).toEqual({ plannedHours: 120, actualHours: 96 });
    // exactly 1 bucket, not 2
    expect(Object.keys(agg)).toEqual(['2026']);
  });

  it('uneven distribution aggregates correctly per quarter', () => {
    const months: Record<string, { plannedHours: number; actualHours: number }> = {
      '2026-01': { plannedHours: 10, actualHours: 5 },
      '2026-02': { plannedHours: 20, actualHours: 15 },
      '2026-03': { plannedHours: 30, actualHours: 20 },
      '2026-04': { plannedHours: 5, actualHours: 4 },
      '2026-05': { plannedHours: 5, actualHours: 4 },
      '2026-06': { plannedHours: 5, actualHours: 4 },
    };
    const monthRange = Object.keys(months);
    const keys = rdColumnKeys(monthRange, 'quarter');
    const agg = aggregateRdRowMonths(months, keys, 'quarter');
    expect(agg['2026-Q1']).toEqual({ plannedHours: 60, actualHours: 40 });
    expect(agg['2026-Q2']).toEqual({ plannedHours: 15, actualHours: 12 });
  });

  it('missing months buckets to zero (sparse input)', () => {
    const monthRange = genMonthRange(2026);
    const months = { '2026-01': { plannedHours: 10, actualHours: 5 } };
    const keys = rdColumnKeys(monthRange, 'quarter');
    const agg = aggregateRdRowMonths(months, keys, 'quarter');
    expect(agg['2026-Q1']).toEqual({ plannedHours: 10, actualHours: 5 });
    expect(agg['2026-Q2']).toEqual({ plannedHours: 0, actualHours: 0 });
  });

  it('flag-off parity: caller uses month-zoom fast path and monthRange passes through', () => {
    // This test documents the contract that `/rd` leans on when
    // `uiV6PerJourney === false`: the page pins zoom to 'month', so
    // aggregation is a no-op structural copy and rendering matches Phase 51.
    const monthRange = genMonthRange(2026);
    const months = denseMonths(monthRange, 10, 8);
    const result: string[] = rdColumnKeys(monthRange, 'month');
    expect(result).toEqual(monthRange);
    const agg = aggregateRdRowMonths(months, result, 'month');
    // same plan/actual per month, same keys, same length
    expect(Object.keys(agg)).toEqual(monthRange);
  });

  it('throws on unknown zoom', () => {
    expect(() => rdColumnKeys([], 'weekly' as unknown as TimelineZoom)).toThrow(
      /unknown zoom/,
    );
  });
});
