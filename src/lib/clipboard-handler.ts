/**
 * Clipboard handler for AG Grid paste support.
 * Parses tab-delimited text from Excel/clipboard, validates numeric values,
 * and maps paste data to grid cells respecting read-only constraints.
 *
 * All functions are pure -- no side effects or DOM access.
 */

import type { GridRow } from '@/features/allocations/allocation.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PasteCell = {
  projectId: string;
  month: string;
  hours: number;
};

export type PasteError = {
  row: number;
  col: number;
  value: string;
  reason: string;
};

type ParsedClipboard = {
  rows: string[][];
  rowCount: number;
  colCount: number;
};

type PasteResult = {
  cells: PasteCell[];
  errors: PasteError[];
  skippedReadOnly: number;
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse tab-delimited clipboard text into a 2D string array.
 * Splits by newline, then by tab. Trims whitespace. Filters empty rows.
 */
export function parseClipboardText(text: string): ParsedClipboard {
  const rows = text
    .split('\n')
    .map((line) => line.split('\t').map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell !== ''));

  const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

  return { rows, rowCount: rows.length, colCount };
}

/**
 * Parse a string value to a numeric hour value.
 * - Empty string returns 0 (clear cell).
 * - Handles European comma decimal (e.g. "120,5" -> 120.5 -> 121).
 * - Returns null for invalid values (NaN, negative, > 999).
 * - Rounds to nearest integer (hours are whole numbers).
 */
export function parseNumericValue(value: string): number | null {
  if (value === '') return 0;

  // Handle European comma decimal separator
  const normalized = value.replace(',', '.');
  const num = Number(normalized);

  if (isNaN(num) || num < 0 || num > 999) return null;

  return Math.round(num);
}

// ---------------------------------------------------------------------------
// Grid mapping
// ---------------------------------------------------------------------------

/**
 * Map parsed clipboard data to grid cells, starting at the focused cell position.
 * Skips:
 * - Out-of-bounds rows/columns
 * - Special rows (projectId starting with "__")
 * - Past months (before currentMonth -- read-only per design)
 *
 * Invalid numeric values are collected as errors.
 */
export function mapPasteToGridCells(
  parsed: { rows: string[][] },
  focusedRowIndex: number,
  focusedColIndex: number,
  gridRows: GridRow[],
  months: string[],
  currentMonth: string,
): PasteResult {
  const cells: PasteCell[] = [];
  const errors: PasteError[] = [];
  let skippedReadOnly = 0;

  for (let r = 0; r < parsed.rows.length; r++) {
    const targetRowIndex = focusedRowIndex + r;

    // Skip out-of-bounds rows
    if (targetRowIndex >= gridRows.length) break;

    const row = gridRows[targetRowIndex];

    // Skip special rows (SUMMA, Target, Status, Add)
    if (row.projectId.startsWith('__')) continue;

    for (let c = 0; c < parsed.rows[r].length; c++) {
      const targetColIndex = focusedColIndex + c;

      // Skip out-of-bounds columns
      if (targetColIndex >= months.length) break;

      const targetMonth = months[targetColIndex];

      // Skip past months (read-only)
      if (targetMonth < currentMonth) {
        skippedReadOnly++;
        continue;
      }

      const value = parsed.rows[r][c];
      const hours = parseNumericValue(value);

      if (hours === null) {
        errors.push({
          row: r,
          col: c,
          value,
          reason: `Invalid numeric value: "${value}"`,
        });
        continue;
      }

      cells.push({
        projectId: row.projectId,
        month: targetMonth,
        hours,
      });
    }
  }

  return { cells, errors, skippedReadOnly };
}
