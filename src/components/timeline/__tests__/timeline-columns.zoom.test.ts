/**
 * v5.0 — Phase 42 / Plan 42-03 Task 1: buildTimelineColumns quarter + year branches.
 *
 * TC-ZOOM-001 — month zoom produces 1 pinned col + N month cols
 * TC-ZOOM-002 — quarter zoom produces 1 pinned col + ceil(N/3) quarter cols with KV/Q labels
 * TC-ZOOM-003 — year zoom produces 1 pinned col + unique ISO-year cols
 * TC-ZOOM-004 — Q4-2026 column exposes underlyingMonths = ['2026-10','2026-11','2026-12']
 *               (indirectly validates TC-CAL-006: week 53 of 2026's working days
 *                belong to ISO 2026, so Dec 2026 lives in 2026-Q4, not 2027-Q1)
 */

import { describe, it, expect } from 'vitest';

import { buildTimelineColumns } from '../timeline-columns';

const YEAR_2026 = [
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
  '2026-07',
  '2026-08',
  '2026-09',
  '2026-10',
  '2026-11',
  '2026-12',
];

describe('buildTimelineColumns — zoom', () => {
  it('TC-ZOOM-001: month zoom returns 1 pinned + 12 month cols', () => {
    const cols = buildTimelineColumns(YEAR_2026, 'month');
    expect(cols).toHaveLength(1 + 12);
    expect(cols[0]?.pinned).toBe('left');
    const monthCols = cols.slice(1);
    expect(monthCols.every((c) => typeof c.field === 'string' && c.field!.startsWith('m_'))).toBe(
      true,
    );
  });

  it('TC-ZOOM-002: quarter zoom returns 1 pinned + 4 quarter cols with KV labels (sv default)', () => {
    const cols = buildTimelineColumns(YEAR_2026, 'quarter');
    expect(cols).toHaveLength(1 + 4);
    const qCols = cols.slice(1);
    const headers = qCols.map((c) => c.headerName);
    expect(headers).toEqual(['KV1 2026', 'KV2 2026', 'KV3 2026', 'KV4 2026']);
    expect(qCols.every((c) => typeof c.field === 'string' && c.field!.startsWith('q_'))).toBe(
      true,
    );
  });

  it('TC-ZOOM-003: year zoom returns 1 pinned + 1 year col for a single-year range', () => {
    const cols = buildTimelineColumns(YEAR_2026, 'year');
    expect(cols).toHaveLength(1 + 1);
    expect(cols[1]?.headerName).toBe('2026');
    expect(cols[1]?.field).toBe('y_2026');
  });

  it('TC-ZOOM-003b: year zoom across two years returns two year cols', () => {
    const range = [...YEAR_2026, '2027-01', '2027-02', '2027-03'];
    const cols = buildTimelineColumns(range, 'year');
    expect(cols).toHaveLength(1 + 2);
    expect(cols[1]?.headerName).toBe('2026');
    expect(cols[2]?.headerName).toBe('2027');
  });

  it('TC-ZOOM-004: Q4-2026 column exposes underlyingMonths = Oct/Nov/Dec 2026 (TC-CAL-006 gate)', () => {
    const cols = buildTimelineColumns(YEAR_2026, 'quarter');
    const q4 = cols.find((c) => c.field === 'q_2026-Q4');
    expect(q4).toBeDefined();
    const params = q4!.cellRendererParams as { underlyingMonths: string[] } | undefined;
    expect(params?.underlyingMonths).toEqual(['2026-10', '2026-11', '2026-12']);
  });

  it('year col for 2026 exposes all 12 months as underlyingMonths', () => {
    const cols = buildTimelineColumns(YEAR_2026, 'year');
    const y = cols.find((c) => c.field === 'y_2026');
    const params = y!.cellRendererParams as { underlyingMonths: string[] } | undefined;
    expect(params?.underlyingMonths).toEqual(YEAR_2026);
  });
});
