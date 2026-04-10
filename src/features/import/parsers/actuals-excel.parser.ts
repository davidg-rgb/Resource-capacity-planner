/**
 * Actuals Excel parser (Phase 38 / Plan 38-01).
 *
 * Pure in-memory parser — NO DB writes. Consumed by the Plan 38-02
 * parse→preview→commit service. Supports two layouts:
 *
 *   1. row-per-entry: columns [person_name, project_name, date, hours]
 *   2. pivoted: columns [person_name, project_name, <date|iso-week|iso-month>...]
 *
 * **Hard-stop (IMP-02):** US WEEKNUM() / Sunday-start weekly pivots are
 * rejected with ValidationError(ERR_US_WEEK_HEADERS). Never partial-parse —
 * ambiguous WEEKNUM semantics would silently corrupt plan-vs-actual math.
 *
 * **No date-fns. No Date#getDay().** All week/day-of-week logic routes through
 * `@/lib/time` (enforced by eslint.config.mjs).
 */

import * as XLSX from 'xlsx';

import { ValidationError } from '@/lib/errors';
import { getISOWeek, getISOWeekYear, workDaysInIsoWeek, workDaysInMonth } from '@/lib/time';

import {
  EMPTY_PERSON,
  EMPTY_SHEET,
  ERR_BAD_DATE,
  ERR_BAD_HOURS,
  ERR_MIXED_GRAIN_PIVOT,
  ERR_UNKNOWN_LAYOUT,
  ERR_US_WEEK_HEADERS,
  MONTH_GRAIN_PENDING_DISTRIBUTION,
  WEEK_GRAIN_PENDING_DISTRIBUTION,
  type ImportLayout,
  type ParseResult,
  type ParseWarning,
  type ParsedRow,
} from './parser.types';

// ---------------------------------------------------------------------------
// ISO Monday helper — pure UTC math, no getDay()
// ---------------------------------------------------------------------------

/**
 * Returns the ISO Monday (YYYY-MM-DD) of the given ISO week-numbering year +
 * week. Uses the Jan 4 anchor: Jan 4 always belongs to ISO week 1. We back up
 * to the Monday of that week via getISOWeek cross-referencing (no Date#getDay).
 */
function isoMondayString(isoYear: number, isoWeek: number): string {
  const MS = 86400000;
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  // Walk back at most 6 days until we find the Monday of ISO W1 of isoYear.
  // Monday of W1 is the day d ≤ jan4 with getISOWeek(d) === 1 and
  // getISOWeek(d - 1 day) !== 1.
  let w1Monday = jan4;
  for (let i = 0; i < 6; i++) {
    const prev = new Date(w1Monday.getTime() - MS);
    if (getISOWeek(prev) !== 1 || getISOWeekYear(prev) !== isoYear) break;
    w1Monday = prev;
  }
  const target = new Date(w1Monday.getTime() + (isoWeek - 1) * 7 * MS);
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, '0');
  const d = String(target.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Column alias maps for row-per-entry layout detection
// ---------------------------------------------------------------------------

// Phase 44-09 / TC-IMP-013, 013b, 013c — Swedish column synonym coverage.
const PERSON_ALIASES = new Set([
  'person_name',
  'person',
  'namn',
  'name',
  'medarbetare',
  'anställd',
]);
const PROJECT_ALIASES = new Set(['project_name', 'project', 'projekt']);
const DATE_ALIASES = new Set(['date', 'datum', 'dag']);
const HOURS_ALIASES = new Set(['hours', 'timmar', 'tid', 'tim', 'h', 'timme']);

// ---------------------------------------------------------------------------
// Header classification
// ---------------------------------------------------------------------------

type HeaderKind = 'date' | 'iso-week' | 'iso-month' | 'us-week' | 'other';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_WEEK_RE = /^\d{4}-W\d{2}$/;
const ISO_MONTH_RE = /^\d{4}-\d{2}$/;
// Bare US-week patterns: "W12", "Week 12", or just a number "12"
const US_WEEK_RE = /^(w(eek)?)?\s*\d{1,2}$/i;

function normalizeHeader(raw: unknown): string {
  if (raw == null) return '';
  return String(raw).trim();
}

/** Strict YYYY-MM-DD → UTC Date. Returns null on malformed input. */
function parseIsoDateStrict(s: string): Date | null {
  if (!ISO_DATE_RE.test(s)) return null;
  const [y, m, d] = s.split('-').map((p) => Number(p));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return dt;
}

export function classifyHeader(label: string): HeaderKind {
  const trimmed = label.trim();
  if (!trimmed) return 'other';

  // Explicit WEEKNUM formula leakage is always us-week.
  if (/WEEKNUM\(/i.test(trimmed)) return 'us-week';

  if (ISO_WEEK_RE.test(trimmed)) return 'iso-week';
  if (ISO_DATE_RE.test(trimmed)) {
    return parseIsoDateStrict(trimmed) ? 'date' : 'other';
  }
  if (ISO_MONTH_RE.test(trimmed)) {
    // Validate month range 01..12
    const mm = Number(trimmed.slice(5, 7));
    if (mm >= 1 && mm <= 12) return 'iso-month';
    return 'other';
  }
  if (US_WEEK_RE.test(trimmed)) return 'us-week';
  return 'other';
}

// ---------------------------------------------------------------------------
// Layout detection
// ---------------------------------------------------------------------------

interface RowPerEntryColumnMap {
  person: number;
  project: number;
  date: number;
  hours: number;
}

function tryRowPerEntryMap(headers: string[]): RowPerEntryColumnMap | null {
  const lower = headers.map((h) => h.toLocaleLowerCase());
  const map: Partial<RowPerEntryColumnMap> = {};
  for (let i = 0; i < lower.length; i++) {
    const h = lower[i];
    if (PERSON_ALIASES.has(h) && map.person === undefined) map.person = i;
    else if (PROJECT_ALIASES.has(h) && map.project === undefined) map.project = i;
    else if (DATE_ALIASES.has(h) && map.date === undefined) map.date = i;
    else if (HOURS_ALIASES.has(h) && map.hours === undefined) map.hours = i;
  }
  if (
    map.person !== undefined &&
    map.project !== undefined &&
    map.date !== undefined &&
    map.hours !== undefined
  ) {
    return map as RowPerEntryColumnMap;
  }
  return null;
}

export function detectLayout(rows: unknown[][]): ImportLayout {
  if (rows.length === 0) {
    throw new ValidationError('Workbook contains no sheets with data', ERR_UNKNOWN_LAYOUT);
  }
  const headers = (rows[0] ?? []).map(normalizeHeader);

  if (tryRowPerEntryMap(headers)) return 'row-per-entry';

  // Pivoted layout: leftmost person_name + project_name (any alias) followed by
  // ≥2 date-like column headers.
  if (headers.length >= 4) {
    const lowerLeft = headers.slice(0, 2).map((h) => h.toLocaleLowerCase());
    const leftIsPerson = PERSON_ALIASES.has(lowerLeft[0]);
    const leftIsProject = PROJECT_ALIASES.has(lowerLeft[1]);
    if (leftIsPerson && leftIsProject) {
      const dateHeaders = headers.slice(2);
      const classified = dateHeaders.map(classifyHeader);
      const dateLike = classified.filter(
        (c) => c === 'date' || c === 'iso-week' || c === 'iso-month' || c === 'us-week',
      );
      if (dateLike.length >= 2) return 'pivoted';
    }
  }

  throw new ValidationError(
    `Unrecognized sheet layout (headers: ${JSON.stringify(headers)})`,
    ERR_UNKNOWN_LAYOUT,
  );
}

// ---------------------------------------------------------------------------
// Hours parsing (Swedish decimal)
// ---------------------------------------------------------------------------

function parseHours(cell: unknown): number | null {
  if (cell == null || cell === '') return null;
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;
  const str = String(cell).trim().replace(',', '.');
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Row-per-entry parser
// ---------------------------------------------------------------------------

export function parseRowPerEntry(rows: unknown[][]): {
  rows: ParsedRow[];
  warnings: ParseWarning[];
} {
  const headers = (rows[0] ?? []).map(normalizeHeader);
  const map = tryRowPerEntryMap(headers);
  if (!map) {
    throw new ValidationError('Row-per-entry column map missing', ERR_UNKNOWN_LAYOUT);
  }

  const out: ParsedRow[] = [];
  const warnings: ParseWarning[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const sourceRow = i + 1; // 1-based including header row
    const personName = String(row[map.person] ?? '').trim();
    const projectName = String(row[map.project] ?? '').trim();
    const dateRaw = String(row[map.date] ?? '').trim();
    const hoursRaw = row[map.hours];

    // Skip fully empty trailing rows silently
    if (!personName && !projectName && !dateRaw && (hoursRaw == null || hoursRaw === '')) {
      continue;
    }

    // Emit warning and skip when person column is empty but row is not fully empty
    if (!personName) {
      warnings.push({
        code: EMPTY_PERSON,
        message: `Row ${sourceRow}: person column is empty — row skipped`,
        sourceRow,
      });
      continue;
    }

    const dateOk = parseIsoDateStrict(dateRaw);
    if (!dateOk) {
      warnings.push({
        code: ERR_BAD_DATE,
        message: `Row ${sourceRow}: invalid date "${dateRaw}" (expected YYYY-MM-DD)`,
        sourceRow,
      });
      continue;
    }

    const hours = parseHours(hoursRaw);
    if (hours == null || hours <= 0) {
      warnings.push({
        code: ERR_BAD_HOURS,
        message: `Row ${sourceRow}: invalid hours "${String(hoursRaw)}" (must be > 0)`,
        sourceRow,
      });
      continue;
    }

    out.push({ personName, projectName, date: dateRaw, hours, sourceRow });
  }

  if (rows.length <= 1) {
    warnings.push({ code: EMPTY_SHEET, message: 'Sheet contains no data rows after header' });
  }

  return { rows: out, warnings };
}

// ---------------------------------------------------------------------------
// Pivoted parser + US-WEEK hard-stop
// ---------------------------------------------------------------------------

/**
 * Reject US WEEKNUM / Sunday-start pivots. Must be called BEFORE any row
 * iteration so we never emit partial ParsedRows from an ambiguous sheet.
 */
function assertNoUsWeekHeaders(headers: string[], dateCols: string[]): void {
  const offending: string[] = [];

  for (const h of dateCols) {
    const kind = classifyHeader(h);
    if (kind === 'us-week') offending.push(h);
    // Raw formula leakage check (belt + braces on top of classifyHeader).
    if (/WEEKNUM\(/i.test(h)) offending.push(h);
  }

  if (offending.length > 0) {
    throw new ValidationError(
      `US WEEKNUM() / bare week headers are not supported. Use ISO week format "YYYY-Www". Offending columns: ${JSON.stringify(
        offending,
      )}`,
      ERR_US_WEEK_HEADERS,
      { offendingColumns: offending },
    );
  }

  // Sunday-start sequence check: if all dateCols are ISO dates AND consecutive
  // columns are spaced exactly 7 days apart AND the first column is a Sunday,
  // this is a US-week layout masquerading as daily columns.
  const parsed = dateCols.map(parseIsoDateStrict);
  if (parsed.every((d) => d !== null) && parsed.length >= 2) {
    const dates = parsed as Date[];
    const deltas: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      deltas.push((dates[i].getTime() - dates[i - 1].getTime()) / 86400000);
    }
    const allSevenApart = deltas.every((d) => d === 7);
    if (allSevenApart) {
      // Determine day-of-week of first date via ISO-week math (no getDay).
      // Monday's ISO-week number equals that of the Thursday of the same week.
      // Simpler: compute isoWeek + isoWeekYear of first date and of first date
      // + k days; the shift by which the ISO week rolls tells us DoW.
      // Direct approach: Monday is the date d for which getISOWeek(d) ===
      // getISOWeek(d+6) and the previous day belongs to the previous ISO week.
      const first = dates[0];
      const prevDay = new Date(first.getTime() - 86400000);
      const sameWeekAsPrev =
        getISOWeek(first) === getISOWeek(prevDay) &&
        getISOWeekYear(first) === getISOWeekYear(prevDay);
      // Sunday is the last day of an ISO week, so Sunday and (Sunday-1=Saturday)
      // share the same ISO week. Monday starts a new ISO week, so Mon and
      // (Mon-1=Sun) differ in ISO week. Thus:
      //   first is Monday  ⇔ !sameWeekAsPrev
      //   first is Sunday  ⇔ sameWeekAsPrev AND (first+1) starts a new ISO week
      const nextDay = new Date(first.getTime() + 86400000);
      const nextStartsNewWeek =
        getISOWeek(first) !== getISOWeek(nextDay) ||
        getISOWeekYear(first) !== getISOWeekYear(nextDay);
      const isSunday = sameWeekAsPrev && nextStartsNewWeek;
      if (isSunday) {
        throw new ValidationError(
          `Weekly date headers start on Sunday (${dateCols[0]}). This looks like a US-week (Sunday-start) sequence. ISO weeks start on Monday.`,
          ERR_US_WEEK_HEADERS,
          { offendingColumns: dateCols },
        );
      }
    }
  }

  // Silence unused-parameter lint — headers param kept for future diagnostics.
  void headers;
}

export function parsePivoted(rows: unknown[][]): {
  rows: ParsedRow[];
  warnings: ParseWarning[];
} {
  const headers = (rows[0] ?? []).map(normalizeHeader);
  const dateCols = headers.slice(2);

  assertNoUsWeekHeaders(headers, dateCols);

  // Phase 44-09 / TC-IMP-011: reject pivoted sheets that mix grain kinds
  // (e.g. one column is an ISO-week and another is an ISO-month). US_WEEK
  // detection above takes precedence per TC-IMP-012 (checked first).
  {
    const kinds = new Set<string>();
    for (const h of dateCols) {
      const k = classifyHeader(h);
      if (k === 'date' || k === 'iso-week' || k === 'iso-month') kinds.add(k);
    }
    if (kinds.size > 1) {
      throw new ValidationError(
        `Mixed grain in pivoted sheet: ${[...kinds].join(', ')}. Use a single grain per sheet.`,
        ERR_MIXED_GRAIN_PIVOT,
        { grainsFound: [...kinds] },
      );
    }
  }

  const out: ParsedRow[] = [];
  const warnings: ParseWarning[] = [];
  const warnedWeek = new Set<number>();
  const warnedMonth = new Set<number>();

  // Classify each date column once.
  const colMeta: Array<
    | { kind: 'date'; date: string }
    | { kind: 'iso-week'; date: string }
    | { kind: 'iso-month'; date: string }
    | { kind: 'other' }
  > = dateCols.map((h) => {
    const k = classifyHeader(h);
    if (k === 'date') return { kind: 'date', date: h };
    if (k === 'iso-week') {
      const [yStr, wStr] = h.split('-W');
      const isoYear = Number(yStr);
      const isoWeek = Number(wStr);
      // Validate the week exists (throws via workDaysInIsoWeek if not).
      workDaysInIsoWeek(isoYear, isoWeek);
      // Anchor = ISO Monday of that week (even if the Monday is a holiday —
      // e.g. 2026-W15 Monday is Easter Monday). Plan 38-02 distributes across
      // the working days at commit time.
      const anchor = isoMondayString(isoYear, isoWeek);
      return { kind: 'iso-week', date: anchor };
    }
    if (k === 'iso-month') {
      const [yStr, mStr] = h.split('-');
      const year = Number(yStr);
      const monthIndex = Number(mStr) - 1;
      const workdays = workDaysInMonth(year, monthIndex);
      return { kind: 'iso-month', date: workdays[0] };
    }
    return { kind: 'other' };
  });

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const sourceRow = i + 1;
    const personName = String(row[0] ?? '').trim();
    const projectName = String(row[1] ?? '').trim();
    if (!personName && !projectName) continue;

    for (let c = 0; c < colMeta.length; c++) {
      const meta = colMeta[c];
      if (meta.kind === 'other') continue;
      const cell = row[c + 2];
      const hours = parseHours(cell);
      if (hours == null || hours <= 0) continue;

      out.push({ personName, projectName, date: meta.date, hours, sourceRow });

      if (meta.kind === 'iso-week' && !warnedWeek.has(c)) {
        warnings.push({
          code: WEEK_GRAIN_PENDING_DISTRIBUTION,
          message: `Column "${dateCols[c]}" is ISO-week grain; distribution across working days happens at commit.`,
          cell: dateCols[c],
        });
        warnedWeek.add(c);
      } else if (meta.kind === 'iso-month' && !warnedMonth.has(c)) {
        warnings.push({
          code: MONTH_GRAIN_PENDING_DISTRIBUTION,
          message: `Column "${dateCols[c]}" is ISO-month grain; distribution across working days happens at commit.`,
          cell: dateCols[c],
        });
        warnedMonth.add(c);
      }
    }
  }

  if (rows.length <= 1) {
    warnings.push({ code: EMPTY_SHEET, message: 'Sheet contains no data rows after header' });
  }

  return { rows: out, warnings };
}

// ---------------------------------------------------------------------------
// Top-level entry
// ---------------------------------------------------------------------------

export function parseActualsWorkbook(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new ValidationError('Workbook contains no sheets', ERR_UNKNOWN_LAYOUT);
  }
  const sheet = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  const layout = detectLayout(aoa);
  if (layout === 'row-per-entry') {
    const { rows, warnings } = parseRowPerEntry(aoa);
    return { layout, rows, warnings };
  }

  const { rows, warnings } = parsePivoted(aoa);
  return { layout, rows, warnings };
}
