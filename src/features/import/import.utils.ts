/**
 * Import utilities: SheetJS parsing, header detection, pivot detection, unpivoting, encoding.
 *
 * Server-side only -- these functions process Excel/CSV buffers using SheetJS.
 */

import * as XLSX from 'xlsx';

import type {
  ColumnMapping,
  FormatInfo,
  ImportRow,
  ParsedFile,
  TargetField,
} from './import.types';

// ---------------------------------------------------------------------------
// Header dictionaries
// ---------------------------------------------------------------------------

type HeaderMapEntry = { target: TargetField; label: string };

/** Swedish header name -> target field mapping */
export const SWEDISH_HEADER_MAP: Record<string, HeaderMapEntry> = {
  namn: { target: 'personName', label: 'Person name' },
  person: { target: 'personName', label: 'Person name' },
  resurs: { target: 'personName', label: 'Person name' },
  projekt: { target: 'projectName', label: 'Project name' },
  projektnamn: { target: 'projectName', label: 'Project name' },
  timmar: { target: 'hours', label: 'Hours' },
  tid: { target: 'hours', label: 'Hours' },
  manad: { target: 'month', label: 'Month' },
  period: { target: 'month', label: 'Month' },
  avdelning: { target: 'department', label: 'Department' },
  disciplin: { target: 'discipline', label: 'Discipline' },
  roll: { target: 'discipline', label: 'Discipline' },
};

/** English header name -> target field mapping */
export const ENGLISH_HEADER_MAP: Record<string, HeaderMapEntry> = {
  name: { target: 'personName', label: 'Person name' },
  person: { target: 'personName', label: 'Person name' },
  resource: { target: 'personName', label: 'Person name' },
  project: { target: 'projectName', label: 'Project name' },
  hours: { target: 'hours', label: 'Hours' },
  month: { target: 'month', label: 'Month' },
  department: { target: 'department', label: 'Department' },
  discipline: { target: 'discipline', label: 'Discipline' },
  role: { target: 'discipline', label: 'Discipline' },
};

// ---------------------------------------------------------------------------
// Month patterns for pivot detection
// ---------------------------------------------------------------------------

/** Regex patterns that identify a column header as a month */
export const MONTH_PATTERNS: RegExp[] = [
  /^\d{4}-\d{2}$/, // 2025-01
  /^(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\s*\d{4}$/i, // Swedish abbreviated
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4}$/i, // English abbreviated
  /^(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s*\d{4}$/i, // Swedish full
];

/** Swedish month name -> month number (1-indexed) */
const SWEDISH_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  mars: 3,
  april: 4,
  maj: 5,
  juni: 6,
  juli: 7,
  augusti: 8,
  september: 9,
  oktober: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  okt: 10,
  nov: 11,
  dec: 12,
};

/** English month name -> month number (1-indexed) */
const ENGLISH_MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// ---------------------------------------------------------------------------
// Header auto-detection
// ---------------------------------------------------------------------------

/**
 * Normalize a header string for dictionary lookup.
 * Strips whitespace, lowercases, and replaces Swedish chars.
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o');
}

/**
 * Auto-detect column mappings from headers.
 * Tries Swedish dictionary first, then English.
 * Skips columns already detected as month columns (pivot format).
 */
export function autoDetectMappings(headers: string[]): ColumnMapping[] {
  // Track which target fields have been assigned to avoid duplicates
  const assignedTargets = new Set<TargetField>();

  return headers.map((header, index): ColumnMapping => {
    const normalized = normalizeHeader(header);

    // Try Swedish first (project targets Swedish users)
    const swedishMatch = SWEDISH_HEADER_MAP[normalized];
    if (swedishMatch && !assignedTargets.has(swedishMatch.target)) {
      assignedTargets.add(swedishMatch.target);
      return {
        sourceIndex: index,
        sourceHeader: header,
        targetField: swedishMatch.target,
        autoDetected: true,
        swedish: true,
      };
    }

    // Try English
    const englishMatch = ENGLISH_HEADER_MAP[normalized];
    if (englishMatch && !assignedTargets.has(englishMatch.target)) {
      assignedTargets.add(englishMatch.target);
      return {
        sourceIndex: index,
        sourceHeader: header,
        targetField: englishMatch.target,
        autoDetected: true,
        swedish: false,
      };
    }

    // No match -- ignored column
    return {
      sourceIndex: index,
      sourceHeader: header,
      targetField: null,
      autoDetected: false,
      swedish: false,
    };
  });
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Detect whether headers indicate a pivot (grid) format.
 * Pivot format has 3+ columns that match month patterns.
 */
export function detectFormat(headers: string[]): FormatInfo {
  const monthColumns: number[] = [];

  headers.forEach((h, i) => {
    const trimmed = String(h).trim();
    if (MONTH_PATTERNS.some((p) => p.test(trimmed))) {
      monthColumns.push(i);
    }
  });

  return {
    isPivot: monthColumns.length >= 3,
    monthColumns,
  };
}

// ---------------------------------------------------------------------------
// Month header parsing
// ---------------------------------------------------------------------------

/**
 * Convert a month header string to YYYY-MM format.
 *
 * Handles:
 * - "2025-01" (passthrough)
 * - "Jan 2025" / "Jan2025" (English abbreviated)
 * - "Januari 2025" / "Januari2025" (Swedish full)
 * - "Okt 2025" (Swedish abbreviated)
 */
export function parseMonthHeader(header: string): string {
  const trimmed = header.trim();

  // Already YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Extract month name and year from patterns like "Jan 2025" or "Januari2025"
  const match = trimmed.match(/^([a-zA-ZåäöÅÄÖ]+)\s*(\d{4})$/);
  if (!match) {
    return trimmed; // Can't parse, return as-is
  }

  const monthName = match[1].toLowerCase();
  const year = match[2];

  // Try Swedish first, then English
  const monthNum = SWEDISH_MONTHS[monthName] ?? ENGLISH_MONTHS[monthName];
  if (monthNum) {
    return `${year}-${String(monthNum).padStart(2, '0')}`;
  }

  return trimmed; // Unknown month name, return as-is
}

// ---------------------------------------------------------------------------
// Unpivoting
// ---------------------------------------------------------------------------

/**
 * Transform pivot (grid) format data into flat ImportRow arrays.
 *
 * For each data row and each month column, extracts one ImportRow
 * with the person, project, month, and hours. Skips zero/empty/NaN hours.
 */
export function unpivotData(
  allRows: unknown[][],
  headers: string[],
  formatInfo: FormatInfo,
  mappings: ColumnMapping[],
): ImportRow[] {
  const personColIdx = mappings.find((m) => m.targetField === 'personName')?.sourceIndex;
  const projectColIdx = mappings.find((m) => m.targetField === 'projectName')?.sourceIndex;
  const deptColIdx = mappings.find((m) => m.targetField === 'department')?.sourceIndex;
  const discColIdx = mappings.find((m) => m.targetField === 'discipline')?.sourceIndex;

  if (personColIdx === undefined || projectColIdx === undefined) {
    return []; // Can't unpivot without person and project columns
  }

  const result: ImportRow[] = [];

  for (let r = 0; r < allRows.length; r++) {
    const row = allRows[r];
    const personName = String(row[personColIdx] ?? '').trim();
    const projectName = String(row[projectColIdx] ?? '').trim();

    if (!personName || !projectName) continue;

    const department = deptColIdx !== undefined ? String(row[deptColIdx] ?? '').trim() || undefined : undefined;
    const discipline = discColIdx !== undefined ? String(row[discColIdx] ?? '').trim() || undefined : undefined;

    for (const mc of formatInfo.monthColumns) {
      const rawValue = row[mc];
      const hours = Number(rawValue);

      // Skip zero, empty, or non-numeric values
      if (!rawValue || isNaN(hours) || hours === 0) continue;

      result.push({
        rowIndex: r + 2, // +2: 1-indexed + header row
        personName,
        projectName,
        month: parseMonthHeader(String(headers[mc])),
        hours,
        department,
        discipline,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Encoding detection
// ---------------------------------------------------------------------------

/** Garbled UTF-8-as-CP1252 patterns that indicate wrong codepage */
const GARBLED_PATTERNS = [/Ã¤/, /Ã¶/, /Ã¥/, /Ã\u0084/, /Ã\u0096/, /Ã\u0085/];

/**
 * Check if cell values contain garbled Swedish characters.
 * This happens when UTF-8 encoded files are read as CP1252.
 */
function hasGarbledSwedish(cells: string[]): boolean {
  return cells.some((cell) => GARBLED_PATTERNS.some((p) => p.test(cell)));
}

// ---------------------------------------------------------------------------
// Merged cell forward-fill
// ---------------------------------------------------------------------------

/**
 * Forward-fill merged cell values in a SheetJS worksheet.
 * Merged cells in SheetJS only store the value in the top-left cell.
 * This copies that value to all cells in the merge range.
 */
function forwardFillMergedCells(sheet: XLSX.WorkSheet): void {
  const merges = sheet['!merges'];
  if (!merges || merges.length === 0) return;

  for (const merge of merges) {
    // Get the value from the top-left cell of the merge range
    const topLeftRef = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    const topLeftCell = sheet[topLeftRef];
    if (!topLeftCell) continue;

    // Copy value to all other cells in the merge range
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (r === merge.s.r && c === merge.s.c) continue; // Skip the source cell
        const ref = XLSX.utils.encode_cell({ r, c });
        sheet[ref] = { ...topLeftCell };
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Hidden row filtering
// ---------------------------------------------------------------------------

/**
 * Get set of hidden row indices from sheet metadata.
 */
function getHiddenRows(sheet: XLSX.WorkSheet): Set<number> {
  const hidden = new Set<number>();
  const rows = sheet['!rows'];
  if (!rows) return hidden;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.hidden) {
      hidden.add(i);
    }
  }
  return hidden;
}

// ---------------------------------------------------------------------------
// Core parsing
// ---------------------------------------------------------------------------

/** Maximum number of data rows allowed in an import file */
const MAX_ROWS = 5000;

/**
 * Parse an Excel or CSV buffer into a ParsedFile structure.
 *
 * Handles:
 * - .xlsx, .xls, .csv formats via SheetJS
 * - Swedish CP1252 encoding with fallback to UTF-8
 * - Merged cell forward-fill
 * - Hidden row filtering
 * - Pivot format detection
 * - Row limit enforcement (5000 max)
 */
export function parseExcelBuffer(buffer: Buffer, codepage?: number): ParsedFile {
  const effectiveCodepage = codepage ?? 1252;

  let workbook = XLSX.read(buffer, {
    type: 'buffer',
    codepage: effectiveCodepage,
    cellFormula: false,
    cellHTML: false,
    sheetRows: MAX_ROWS + 1, // +1 for header row
  });

  const sheetName = workbook.SheetNames[0];
  let sheet = workbook.Sheets[sheetName];

  // Forward-fill merged cells before converting to JSON
  forwardFillMergedCells(sheet);

  // Get hidden rows for filtering
  const hiddenRows = getHiddenRows(sheet);

  // Convert to array-of-arrays
  let jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  // Filter out hidden rows
  if (hiddenRows.size > 0) {
    jsonData = jsonData.filter((_, idx) => !hiddenRows.has(idx));
  }

  if (jsonData.length === 0) {
    return {
      headers: [],
      sampleRows: [],
      allRows: [],
      totalRows: 0,
      formatInfo: { isPivot: false, monthColumns: [] },
      sheetName,
    };
  }

  // Check for garbled Swedish encoding
  let encodingWarning: string | undefined;
  const sampleCells = jsonData
    .slice(0, Math.min(20, jsonData.length))
    .flat()
    .filter((v): v is string => typeof v === 'string');

  if (hasGarbledSwedish(sampleCells) && effectiveCodepage === 1252) {
    // Re-parse with UTF-8
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      codepage: 65001,
      cellFormula: false,
      cellHTML: false,
      sheetRows: MAX_ROWS + 1,
    });
    sheet = workbook.Sheets[workbook.SheetNames[0]];
    forwardFillMergedCells(sheet);

    const newHiddenRows = getHiddenRows(sheet);
    jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });
    if (newHiddenRows.size > 0) {
      jsonData = jsonData.filter((_, idx) => !newHiddenRows.has(idx));
    }

    // Check if re-parse fixed the issue
    const reParsedCells = jsonData
      .slice(0, Math.min(20, jsonData.length))
      .flat()
      .filter((v): v is string => typeof v === 'string');

    if (hasGarbledSwedish(reParsedCells)) {
      encodingWarning =
        'Swedish characters (a, a, o) may appear garbled. Try saving the file as UTF-8 CSV and re-uploading.';
    }
  }

  // Extract headers and data rows
  const headers = (jsonData[0] as unknown[]).map((h) => String(h ?? ''));
  const allRows = jsonData.slice(1) as unknown[][];
  const totalRows = allRows.length;

  // Enforce row limit
  if (totalRows > MAX_ROWS) {
    throw new Error(`File exceeds ${MAX_ROWS.toLocaleString()} row limit. Found ${totalRows.toLocaleString()} data rows.`);
  }

  const sampleRows = allRows.slice(0, 5);
  const formatInfo = detectFormat(headers);

  return {
    headers,
    sampleRows,
    allRows,
    totalRows,
    formatInfo,
    sheetName,
    encodingWarning,
  };
}
