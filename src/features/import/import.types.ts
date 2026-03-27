/**
 * Import wizard domain types.
 *
 * Defines the complete type system for the 4-step import wizard:
 * Upload -> Map -> Validate -> Import.
 *
 * These types are the contract for the entire import feature module.
 */

/** Target fields that imported columns can map to */
export type TargetField =
  | 'personName'
  | 'projectName'
  | 'month'
  | 'hours'
  | 'department'
  | 'discipline';

/** Required target fields -- import cannot proceed without these mapped */
export const REQUIRED_TARGET_FIELDS: TargetField[] = [
  'personName',
  'projectName',
  'month',
  'hours',
];

/** Optional target fields -- nice to have but not blocking */
export const OPTIONAL_TARGET_FIELDS: TargetField[] = ['department', 'discipline'];

/** Info about detected file format */
export type FormatInfo = {
  isPivot: boolean;
  monthColumns: number[]; // Column indices that contain month headers
  confirmedByUser?: boolean;
};

/** A single column mapping: source column index -> target field */
export type ColumnMapping = {
  sourceIndex: number;
  sourceHeader: string;
  targetField: TargetField | null; // null = ignored
  autoDetected: boolean;
  swedish: boolean; // true if detected via Swedish header
};

/** Result of parsing an uploaded file */
export type ParsedFile = {
  headers: string[];
  sampleRows: unknown[][]; // First 5 data rows for preview
  allRows: unknown[][]; // All data rows (without header)
  totalRows: number;
  formatInfo: FormatInfo;
  sheetName: string;
  encodingWarning?: string; // Set if Swedish chars look garbled
  hiddenRowsSkipped?: number; // Count of hidden rows filtered out
};

/** A single flat import row after mapping + unpivoting */
export type ImportRow = {
  rowIndex: number; // Original row number for error reporting
  personName: string;
  projectName: string;
  month: string; // YYYY-MM format
  hours: number;
  department?: string;
  discipline?: string;
};

/** Validation status for a single row */
export type RowStatus = 'ready' | 'warning' | 'error';

/** A single fuzzy match suggestion */
export type FuzzyMatch = {
  matchedId: string;
  matchedName: string;
  score: number; // 0-1 similarity score
};

/** Validation result for a single row */
export type ValidationRow = {
  rowIndex: number;
  status: RowStatus;
  data: ImportRow;
  personMatch: {
    status: 'exact' | 'fuzzy' | 'unknown';
    matchId?: string;
    matchName?: string;
    score?: number;
    suggestions?: FuzzyMatch[];
  };
  projectMatch: {
    status: 'exact' | 'fuzzy' | 'unknown';
    matchId?: string;
    matchName?: string;
    score?: number;
    suggestions?: FuzzyMatch[];
  };
  errors: string[]; // Blocking errors (e.g., "Person not found", "Invalid hours")
  warnings: string[]; // Non-blocking warnings (e.g., "Fuzzy match applied")
};

/** Aggregate validation result */
export type ValidationResult = {
  rows: ValidationRow[];
  summary: {
    total: number;
    ready: number;
    warnings: number;
    errors: number;
  };
};

/** User fixes applied during validation step */
export type UserFixes = Record<
  number,
  {
    personId?: string; // User picked a person from fuzzy suggestions
    projectId?: string; // User picked a project from fuzzy suggestions
    hours?: number; // User corrected invalid hours
  }
>;

/** Final import execution result */
export type ImportResult = {
  imported: number;
  skipped: number;
  warnings: string[];
  error?: string; // Set if transaction rolled back
};

/** Client-side wizard step identifiers */
export type WizardStep = 'upload' | 'map' | 'validate' | 'import';

/** Client-side wizard state */
export type WizardState = {
  step: WizardStep;
  // Step 1: Upload
  file: File | null;
  parsedFile: ParsedFile | null;
  // Step 2: Map
  columnMappings: ColumnMapping[];
  // Step 3: Validate
  validationResult: ValidationResult | null;
  userFixes: UserFixes;
  // Step 4: Import
  importStatus: 'idle' | 'importing' | 'success' | 'error';
  importResult: ImportResult | null;
};
