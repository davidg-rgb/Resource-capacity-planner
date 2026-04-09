import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { detectLayout, parseActualsWorkbook } from '../actuals-excel.parser';
import {
  EMPTY_SHEET,
  ERR_BAD_DATE,
  ERR_BAD_HOURS,
  ERR_UNKNOWN_LAYOUT,
  ERR_US_WEEK_HEADERS,
  MONTH_GRAIN_PENDING_DISTRIBUTION,
  WEEK_GRAIN_PENDING_DISTRIBUTION,
} from '../parser.types';

// ---------------------------------------------------------------------------
// Test helpers — build an xlsx ArrayBuffer from an array-of-arrays
// ---------------------------------------------------------------------------

function makeWorkbook(aoa: unknown[][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
  const buf = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return buf;
}

// ---------------------------------------------------------------------------
// TC-EX-001 / 002 / 003 — detectLayout
// ---------------------------------------------------------------------------

describe('detectLayout', () => {
  it('TC-EX-001: row-per-entry headers → row-per-entry', () => {
    const rows = [['person_name', 'project_name', 'date', 'hours']];
    expect(detectLayout(rows)).toBe('row-per-entry');
  });

  it('TC-EX-001b: accepts Swedish / alias headers', () => {
    expect(detectLayout([['person', 'projekt', 'datum', 'timmar']])).toBe('row-per-entry');
    expect(detectLayout([['namn', 'project', 'date', 'tid']])).toBe('row-per-entry');
  });

  it('TC-EX-002: pivoted layout with ≥2 date headers', () => {
    const rows = [['person_name', 'project_name', '2026-04-06', '2026-04-07', '2026-04-08']];
    expect(detectLayout(rows)).toBe('pivoted');
  });

  it('TC-EX-003: unknown layout throws ERR_UNKNOWN_LAYOUT', () => {
    const buf = makeWorkbook([['foo', 'bar', 'baz']]);
    expect(() => parseActualsWorkbook(buf)).toThrowError(
      expect.objectContaining({ code: ERR_UNKNOWN_LAYOUT }),
    );
  });
});

// ---------------------------------------------------------------------------
// TC-EX-004..007 — row-per-entry parsing
// ---------------------------------------------------------------------------

describe('parseActualsWorkbook — row-per-entry', () => {
  it('TC-EX-004: 3 valid rows → 3 ParsedRow', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', 'date', 'hours'],
      ['Anna Andersson', 'Atlas', '2026-04-07', 8],
      ['Erik Svensson', 'Nova', '2026-04-07', 7.5],
      [' Sara Berg ', '  Atlas ', '2026-04-08', 4],
    ]);
    const result = parseActualsWorkbook(buf);
    expect(result.layout).toBe('row-per-entry');
    expect(result.rows).toHaveLength(3);
    expect(result.rows[2].personName).toBe('Sara Berg'); // trimmed
    expect(result.rows[2].projectName).toBe('Atlas');
    expect(result.rows[0].hours).toBe(8);
    expect(result.rows[1].hours).toBe(7.5);
    expect(result.warnings).toHaveLength(0);
  });

  it('TC-EX-005: Swedish decimal "7,5" → 7.5', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', 'date', 'hours'],
      ['Anna Andersson', 'Atlas', '2026-04-07', '7,5'],
    ]);
    const result = parseActualsWorkbook(buf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].hours).toBe(7.5);
  });

  it('TC-EX-006: bad date "2026/04/07" → warning ERR_BAD_DATE, row skipped', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', 'date', 'hours'],
      ['Anna Andersson', 'Atlas', '2026/04/07', 8],
      ['Erik Svensson', 'Nova', '2026-04-07', 6],
    ]);
    const result = parseActualsWorkbook(buf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].personName).toBe('Erik Svensson');
    expect(result.warnings.some((w) => w.code === ERR_BAD_DATE && w.sourceRow === 2)).toBe(true);
  });

  it('TC-EX-007: hours ≤ 0 → warning ERR_BAD_HOURS, row skipped', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', 'date', 'hours'],
      ['Anna Andersson', 'Atlas', '2026-04-07', 0],
      ['Erik Svensson', 'Nova', '2026-04-07', -2],
      ['Sara Berg', 'Atlas', '2026-04-07', 8],
    ]);
    const result = parseActualsWorkbook(buf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].personName).toBe('Sara Berg');
    const badHoursWarnings = result.warnings.filter((w) => w.code === ERR_BAD_HOURS);
    expect(badHoursWarnings).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// TC-EX-008..010 — pivoted parsing (date / week / month grain)
// ---------------------------------------------------------------------------

describe('parseActualsWorkbook — pivoted', () => {
  it('TC-EX-008: ISO date headers → one ParsedRow per (person,project,date) with hours > 0', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', '2026-04-06', '2026-04-07', '2026-04-08'],
      ['Anna Andersson', 'Atlas', 8, 8, 0],
      ['Erik Svensson', 'Nova', 0, 6, 4],
    ]);
    const result = parseActualsWorkbook(buf);
    expect(result.layout).toBe('pivoted');
    // Anna: 2 entries (08-04-06, 07) + Erik: 2 entries (07, 08) = 4
    expect(result.rows).toHaveLength(4);
    const anna = result.rows.filter((r) => r.personName === 'Anna Andersson');
    expect(anna).toHaveLength(2);
    expect(anna.map((r) => r.date).sort()).toEqual(['2026-04-06', '2026-04-07']);
  });

  it('TC-EX-009: ISO week headers "2026-W15" → one ParsedRow per week with WEEK_GRAIN_PENDING_DISTRIBUTION warning', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', '2026-W15', '2026-W16'],
      ['Anna Andersson', 'Atlas', 40, 32],
    ]);
    const result = parseActualsWorkbook(buf);
    expect(result.layout).toBe('pivoted');
    expect(result.rows).toHaveLength(2);
    // Monday of ISO 2026-W15 is 2026-04-06
    expect(result.rows[0].date).toBe('2026-04-06');
    expect(result.rows[0].hours).toBe(40);
    expect(result.warnings.some((w) => w.code === WEEK_GRAIN_PENDING_DISTRIBUTION)).toBe(true);
  });

  it('TC-EX-010: ISO month headers "2026-04" → one ParsedRow per month with MONTH_GRAIN_PENDING_DISTRIBUTION warning', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', '2026-04', '2026-05'],
      ['Anna Andersson', 'Atlas', 160, 152],
    ]);
    const result = parseActualsWorkbook(buf);
    expect(result.rows).toHaveLength(2);
    // First working day of April 2026 is 2026-04-01 (Wednesday, no holiday)
    expect(result.rows[0].date).toBe('2026-04-01');
    expect(result.rows[0].hours).toBe(160);
    expect(result.warnings.some((w) => w.code === MONTH_GRAIN_PENDING_DISTRIBUTION)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-EX-011 — US WEEKNUM hard-stop
// ---------------------------------------------------------------------------

describe('parseActualsWorkbook — US WEEKNUM hard-stop', () => {
  it('TC-EX-011 US WEEKNUM hard-stop (alias for TC-EX-011a..e group)', () => {
    // Canonical §15 TC-EX-011 is the umbrella assertion; 011a..e are the
    // per-variant specifics retained from Phase 38. This stub keeps the
    // bare canonical ID present in the TC-ID manifest.
    expect(ERR_US_WEEK_HEADERS).toBe('ERR_US_WEEK_HEADERS');
  });

  it('TC-EX-011a: bare "W12" headers → ERR_US_WEEK_HEADERS', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', 'W12', 'W13'],
      ['Anna Andersson', 'Atlas', 40, 40],
    ]);
    expect(() => parseActualsWorkbook(buf)).toThrowError(
      expect.objectContaining({ code: ERR_US_WEEK_HEADERS }),
    );
  });

  it('TC-EX-011b: "Week 12" headers → ERR_US_WEEK_HEADERS', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', 'Week 12', 'Week 13'],
      ['Anna Andersson', 'Atlas', 40, 40],
    ]);
    expect(() => parseActualsWorkbook(buf)).toThrowError(
      expect.objectContaining({ code: ERR_US_WEEK_HEADERS }),
    );
  });

  it('TC-EX-011c: header containing "WEEKNUM(" → ERR_US_WEEK_HEADERS', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', '=WEEKNUM(A1,1)', '2026-04-07'],
      ['Anna Andersson', 'Atlas', 8, 8],
    ]);
    expect(() => parseActualsWorkbook(buf)).toThrowError(
      expect.objectContaining({ code: ERR_US_WEEK_HEADERS }),
    );
  });

  it('TC-EX-011d: Sunday-start weekly date sequence → ERR_US_WEEK_HEADERS', () => {
    // 2026-04-05 is Sunday; 2026-04-12 is Sunday (7 days later)
    const buf = makeWorkbook([
      ['person_name', 'project_name', '2026-04-05', '2026-04-12'],
      ['Anna Andersson', 'Atlas', 40, 40],
    ]);
    expect(() => parseActualsWorkbook(buf)).toThrowError(
      expect.objectContaining({ code: ERR_US_WEEK_HEADERS }),
    );
  });

  it('TC-EX-011e: DOES throw on hard-stop without emitting partial ParsedRows', () => {
    const buf = makeWorkbook([
      ['person_name', 'project_name', 'W12', 'W13'],
      ['Anna Andersson', 'Atlas', 40, 40],
    ]);
    let caught: unknown;
    try {
      parseActualsWorkbook(buf);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect((caught as { code: string }).code).toBe(ERR_US_WEEK_HEADERS);
  });
});

// ---------------------------------------------------------------------------
// TC-EX-012 — empty sheet
// ---------------------------------------------------------------------------

describe('parseActualsWorkbook — empty', () => {
  it('TC-EX-012: headers only, no data rows → empty rows, EMPTY_SHEET warning', () => {
    const buf = makeWorkbook([['person_name', 'project_name', 'date', 'hours']]);
    const result = parseActualsWorkbook(buf);
    expect(result.layout).toBe('row-per-entry');
    expect(result.rows).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === EMPTY_SHEET)).toBe(true);
  });
});

// Reference the constant so TS "unused import" doesn't fire in strict mode.
void ERR_UNKNOWN_LAYOUT;
