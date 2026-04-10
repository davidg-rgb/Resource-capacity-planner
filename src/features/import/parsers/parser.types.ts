/**
 * Parser types for the v5.0 actuals Excel import pipeline (Phase 38).
 *
 * Pure data shapes — no SheetJS or DB dependencies. Consumed by:
 *   - actuals-excel.parser.ts (produces ParseResult)
 *   - Plan 38-02 parse→preview→commit service
 *   - Plan 38-03 preview UI
 */

export type ImportLayout = 'row-per-entry' | 'pivoted';

export interface ParsedRow {
  personName: string;
  projectName: string;
  /** ISO YYYY-MM-DD. For week/month grain rows this is the anchor (ISO Monday / first working day). */
  date: string;
  hours: number;
  /** 1-based source row index in the original sheet (for preview error surfacing). */
  sourceRow: number;
}

export interface ParseWarning {
  code: ParseWarningCode;
  message: string;
  sourceRow?: number;
  cell?: string;
}

export interface ParseResult {
  layout: ImportLayout;
  rows: ParsedRow[];
  warnings: ParseWarning[];
}

// ---------------------------------------------------------------------------
// Error / warning code constants
// ---------------------------------------------------------------------------

/** Hard-stop: US WEEKNUM() / Sunday-start weekly pivot detected. Never partial-parse. */
export const ERR_US_WEEK_HEADERS = 'ERR_US_WEEK_HEADERS' as const;

/** Hard-stop: sheet headers match neither the row-per-entry nor pivoted layout. */
export const ERR_UNKNOWN_LAYOUT = 'ERR_UNKNOWN_LAYOUT' as const;

/** Hard-stop (Phase 44-09 / TC-IMP-011): pivoted sheet mixes grain kinds. */
export const ERR_MIXED_GRAIN_PIVOT = 'ERR_MIXED_GRAIN_PIVOT' as const;

/** Preview-surfaced count: hidden source rows silently skipped. TC-IMP-007 / TC-IMP-014. */
export const HIDDEN_ROWS_SKIPPED = 'HIDDEN_ROWS_SKIPPED' as const;

/** Preview-surfaced count: merged cells forward-filled in person/project columns. TC-IMP-008. */
export const MERGED_CELLS_FORWARD_FILLED = 'MERGED_CELLS_FORWARD_FILLED' as const;

/** Row-level warning: hours cell was NaN, zero, or negative. Row is skipped. */
export const ERR_BAD_HOURS = 'ERR_BAD_HOURS' as const;

/** Row-level warning: date cell failed ISO YYYY-MM-DD validation. Row is skipped. */
export const ERR_BAD_DATE = 'ERR_BAD_DATE' as const;

/** Pivoted week-grain placeholder — final distribution happens in Plan 38-02 commit. */
export const WEEK_GRAIN_PENDING_DISTRIBUTION = 'WEEK_GRAIN_PENDING_DISTRIBUTION' as const;

/** Pivoted month-grain placeholder — final distribution happens in Plan 38-02 commit. */
export const MONTH_GRAIN_PENDING_DISTRIBUTION = 'MONTH_GRAIN_PENDING_DISTRIBUTION' as const;

/** Sheet parsed successfully but contained no data rows after the header. */
export const EMPTY_SHEET = 'EMPTY_SHEET' as const;

/** Row-level warning: person column was empty. Row is skipped. */
export const EMPTY_PERSON = 'EMPTY_PERSON' as const;

export type ParseErrorCode =
  | typeof ERR_US_WEEK_HEADERS
  | typeof ERR_UNKNOWN_LAYOUT
  | typeof ERR_MIXED_GRAIN_PIVOT;

export type ParseWarningCode =
  | typeof ERR_BAD_HOURS
  | typeof ERR_BAD_DATE
  | typeof WEEK_GRAIN_PENDING_DISTRIBUTION
  | typeof MONTH_GRAIN_PENDING_DISTRIBUTION
  | typeof EMPTY_SHEET
  | typeof EMPTY_PERSON
  | typeof HIDDEN_ROWS_SKIPPED
  | typeof MERGED_CELLS_FORWARD_FILLED;
