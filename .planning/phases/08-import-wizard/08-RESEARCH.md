# Phase 8: Import Wizard - Research

**Researched:** 2026-03-27
**Domain:** File upload, Excel/CSV parsing, data validation wizard, fuzzy matching
**Confidence:** HIGH

## Summary

This phase implements a 4-step import wizard (Upload, Map, Validate, Import) for allocation data from Excel/CSV files. The core technical challenges are: (1) server-side Excel parsing with Swedish encoding support, (2) pivot/grid format detection and unpivoting, (3) fuzzy name matching against existing people/projects, and (4) transactional import with rollback. The existing `batchUpsertAllocations()` service handles the final import step with transaction support, but the batch size limit (max 100) needs lifting for bulk imports.

SheetJS (xlsx) is the standard library for Excel processing in Node.js. The npm registry version (0.18.5) is outdated and has vulnerabilities -- the current version (0.20.3) must be installed from SheetJS CDN. For fuzzy matching, `string-similarity` (Dice coefficient) is the right choice: lightweight, focused on string comparison scoring, and perfect for name matching where we need a similarity score rather than full-text search.

**Primary recommendation:** Use SheetJS 0.20.3 from CDN for server-side Excel/CSV parsing, `string-similarity` for fuzzy name matching, and build the wizard as a feature module at `src/features/import/` with a multi-step client-side wizard at `/data/import`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Horizontal stepper bar across the top -- numbered steps (1. Upload -> 2. Map -> 3. Validate -> 4. Import) with back/next buttons. Steps lock until reached, no jumping ahead.
- D-02: Full back navigation -- returning to a previous step preserves all choices. Re-advancing re-validates.
- D-03: Final step shows a progress indicator during import, then a results summary (X rows imported, Y skipped, Z warnings). Stay on page with "Done" button that returns to /data.
- D-04: Wizard lives at `/data/import` route -- button on `/data` page says "Import data".
- D-05: Dropdown table layout for column mapping -- rows: Source Column | Maps To (dropdown) | Sample Data. Auto-detected mappings pre-filled with green checkmarks.
- D-06: Unmapped/extra source columns shown as "Ignored" (grayed out) with option to assign.
- D-07: Target fields: Person name, Project name, Month, Hours (required). Optional: Department, Discipline.
- D-08: Swedish header detection shown inline per column: "Namn -> Person name (Swedish detected)".
- D-09: Summary cards at top (ready/warnings/errors counts) + scrollable row table with filter tabs (All/Ready/Warnings/Errors).
- D-10: Inline fixes for simple issues -- fuzzy-matched names show dropdown, invalid hours editable. Structural issues require re-upload.
- D-11: Fuzzy name matching shows inline dropdown on warning rows with match percentage.
- D-12: Errors block import. Warnings are informational -- import proceeds.
- D-13: Auto-detect pivot vs flat format with confirmation and before/after preview.
- D-14: Template downloads on Upload step AND on /data page. Two templates: flat format and grid/pivot format.
- D-15: File limits: max 10MB, max 5,000 rows.
- D-16: Encoding: SheetJS auto-detect codepage. If garbled, try Swedish codepages (1252, 65001). Warning with manual codepage selection.

### Claude's Discretion
- Stepper bar visual design (colors, checkmarks, animations)
- Exact fuzzy matching algorithm and threshold
- Loading states and skeleton UIs between steps
- Upload area design (drag-and-drop zone styling)
- Error/warning icon design and color coding
- How "before/after" pivot preview is rendered
- Template file content (example data, header names)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMPEX-01 | 4-step import wizard: Upload -> Map -> Validate -> Import | Wizard component architecture with step state management, stepper bar pattern |
| IMPEX-02 | Upload accepts .xlsx, .xls, and .csv files | SheetJS 0.20.3 handles all three formats with `XLSX.read()` |
| IMPEX-03 | Column mapping with auto-detection of Swedish and English headers | Header dictionary mapping Swedish->English, auto-match algorithm |
| IMPEX-04 | Validation step shows ready/warning/error counts with suggestions | Row-level validation with categorized results, filter UI |
| IMPEX-05 | Name fuzzy matching -- suggest corrections for typos | `string-similarity` library with Dice coefficient, threshold ~0.8 |
| IMPEX-06 | Pivot/grid format detection and automatic unpivoting | Heuristic detection (date-like column headers), unpivot transform |
| IMPEX-07 | Import in single database transaction with rollback | Existing `batchUpsertAllocations()` uses `db.transaction()`, needs batch size increase |
| IMPEX-08 | Server-side Excel processing | Next.js API route handler receives FormData, parses with SheetJS on server |
| IMPEX-09 | Handle Swedish character encoding in .xls files | SheetJS codepage option, fallback to 1252/65001 |
| IMPEX-10 | Handle merged cells, hidden rows, formula cells gracefully | SheetJS `!merges` array, `!rows` hidden property, formula cell `v` values |
| IMPEX-13 | Downloadable import templates with headers and example data | Server-generated .xlsx files using SheetJS `XLSX.write()` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| xlsx (SheetJS CE) | 0.20.3 | Excel/CSV parsing and writing | Only maintained Excel parser for Node.js. Handles .xlsx, .xls, .csv, codepages, merged cells, formulas |
| string-similarity | 4.0.4 | Fuzzy string matching for names | Lightweight Dice coefficient scoring. No dependencies. Perfect for name comparison (not search) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod (already installed) | 4.3.6 | Validation schemas for import rows | Validate parsed rows before import |
| @tanstack/react-query (already installed) | 5.95.2 | Server state for wizard API calls | Upload, validate, import mutations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| string-similarity | fuse.js | Fuse.js is a full search engine; overkill for pairwise name comparison. string-similarity returns a simple 0-1 score |
| string-similarity | @leeoniya/ufuzzy | Designed for search filtering, not similarity scoring between two strings |
| SheetJS CE | exceljs | ExcelJS is streaming-capable but heavier, less format support, no codepage handling for legacy .xls |

**Installation:**
```bash
pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz string-similarity
pnpm add -D @types/string-similarity
```

**CRITICAL: Do NOT `pnpm add xlsx`** -- the npm registry version is 0.18.5, outdated with known vulnerabilities. Always install from SheetJS CDN.

## Architecture Patterns

### Recommended Project Structure
```
src/
  features/
    import/
      import.service.ts       # Server-side: parse Excel, detect format, validate, execute import
      import.types.ts          # ImportRow, ImportResult, ColumnMapping, ValidationResult, etc.
      import.schema.ts         # Zod schemas for import payloads
      import.templates.ts      # Template generation (SheetJS XLSX.write)
      import.utils.ts          # Header detection, unpivot logic, encoding helpers
  components/
    import/
      import-wizard.tsx        # Main wizard container with step state
      wizard-stepper.tsx       # Horizontal step indicator bar
      step-upload.tsx          # File upload with drag-and-drop
      step-map.tsx             # Column mapping table with dropdowns
      step-validate.tsx        # Validation results with filters
      step-import.tsx          # Progress + results summary
  hooks/
    use-import.ts              # TanStack Query mutations for import API
  app/
    (app)/
      data/
        import/
          page.tsx             # Wizard page at /data/import
    api/
      import/
        upload/route.ts        # POST: receive file, parse, return headers + preview rows
        validate/route.ts      # POST: validate mapped data, return row-level results
        execute/route.ts       # POST: execute import with transaction
        templates/route.ts     # GET: download template files
```

### Pattern 1: Multi-Step Server-Side Processing
**What:** Split import into 3 API calls (upload/parse -> validate -> execute) rather than a single upload-and-import call.
**When to use:** Always. Each step returns data the client needs for UI before proceeding.
**Example:**
```typescript
// API: /api/import/upload (POST)
// Receives FormData with file, returns parsed headers + sample rows
export async function POST(request: NextRequest) {
  const { orgId } = await requireRole('planner');
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // Size check
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    codepage: 1252,  // Default Swedish codepage
    cellFormula: false,  // We only need values
    cellHTML: false,
  });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Detect format (flat vs pivot), detect headers, return preview
  const formatInfo = detectFormat(jsonData);
  const headers = extractHeaders(jsonData, formatInfo);
  const sampleRows = jsonData.slice(1, 6); // First 5 data rows

  return NextResponse.json({ headers, sampleRows, formatInfo, totalRows: jsonData.length - 1 });
}
```

### Pattern 2: Swedish Header Auto-Detection Dictionary
**What:** Map common Swedish header names to target fields.
**When to use:** During column mapping step to pre-fill mappings.
**Example:**
```typescript
// Source: project-specific domain knowledge
const SWEDISH_HEADER_MAP: Record<string, { target: string; label: string }> = {
  'namn': { target: 'personName', label: 'Person name' },
  'person': { target: 'personName', label: 'Person name' },
  'resurs': { target: 'personName', label: 'Person name' },
  'projekt': { target: 'projectName', label: 'Project name' },
  'projektnamn': { target: 'projectName', label: 'Project name' },
  'timmar': { target: 'hours', label: 'Hours' },
  'tid': { target: 'hours', label: 'Hours' },
  'manad': { target: 'month', label: 'Month' },
  'manad': { target: 'month', label: 'Month' },
  'period': { target: 'month', label: 'Month' },
  'avdelning': { target: 'department', label: 'Department' },
  'disciplin': { target: 'discipline', label: 'Discipline' },
  'roll': { target: 'discipline', label: 'Discipline' },
};

const ENGLISH_HEADER_MAP: Record<string, { target: string; label: string }> = {
  'name': { target: 'personName', label: 'Person name' },
  'person': { target: 'personName', label: 'Person name' },
  'resource': { target: 'personName', label: 'Person name' },
  'project': { target: 'projectName', label: 'Project name' },
  'hours': { target: 'hours', label: 'Hours' },
  'month': { target: 'month', label: 'Month' },
  'department': { target: 'department', label: 'Department' },
  'discipline': { target: 'discipline', label: 'Discipline' },
  'role': { target: 'discipline', label: 'Discipline' },
};

function autoDetectMapping(header: string): { target: string; label: string; swedish: boolean } | null {
  const normalized = header.toLowerCase().trim()
    .replace(/[åä]/g, 'a').replace(/ö/g, 'o'); // Normalize Swedish chars for matching

  // Try Swedish first (project targets Swedish users)
  const swedishMatch = SWEDISH_HEADER_MAP[normalized];
  if (swedishMatch) return { ...swedishMatch, swedish: true };

  const englishMatch = ENGLISH_HEADER_MAP[normalized];
  if (englishMatch) return { ...englishMatch, swedish: false };

  return null;
}
```

### Pattern 3: Pivot Format Detection and Unpivoting
**What:** Detect if data is in grid format (months as columns) and transform to flat rows.
**When to use:** When headers contain date-like patterns (e.g., "Jan 2025", "2025-01", "Januari").
**Example:**
```typescript
const MONTH_PATTERNS = [
  /^\d{4}-\d{2}$/,                    // 2025-01
  /^(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\s*\d{4}$/i,  // Swedish months
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{4}$/i,  // English months
  /^(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s*\d{4}$/i,
];

function detectFormat(data: unknown[][]): { isPivot: boolean; monthColumns: number[] } {
  if (data.length === 0) return { isPivot: false, monthColumns: [] };

  const headers = data[0].map(String);
  const monthColumns: number[] = [];

  headers.forEach((h, i) => {
    if (MONTH_PATTERNS.some(p => p.test(h.trim()))) {
      monthColumns.push(i);
    }
  });

  // If 3+ columns look like months, it's a pivot format
  return { isPivot: monthColumns.length >= 3, monthColumns };
}

function unpivot(data: unknown[][], monthColumns: number[], nameCol: number, projectCol: number): FlatRow[] {
  const headers = data[0].map(String);
  const rows: FlatRow[] = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    for (const mc of monthColumns) {
      const hours = Number(row[mc]);
      if (hours > 0) {
        rows.push({
          personName: String(row[nameCol]),
          projectName: String(row[projectCol]),
          month: parseMonthHeader(headers[mc]),
          hours,
        });
      }
    }
  }
  return rows;
}
```

### Pattern 4: Fuzzy Name Matching
**What:** Match imported names against existing people/projects using similarity scoring.
**When to use:** During validation step for every person/project name in import data.
**Example:**
```typescript
import { compareTwoStrings, findBestMatch } from 'string-similarity';

const FUZZY_THRESHOLD = 0.8; // 80% similarity = suggest match
const EXACT_THRESHOLD = 0.95; // 95%+ = auto-match

function matchName(
  importedName: string,
  existingNames: Array<{ id: string; name: string }>
): { status: 'exact' | 'fuzzy' | 'unknown'; matchId?: string; matchName?: string; score?: number } {
  // Try exact match first (case-insensitive)
  const exactMatch = existingNames.find(
    e => e.name.toLowerCase() === importedName.toLowerCase()
  );
  if (exactMatch) return { status: 'exact', matchId: exactMatch.id, matchName: exactMatch.name };

  // Fuzzy match
  const nameStrings = existingNames.map(e => e.name);
  if (nameStrings.length === 0) return { status: 'unknown' };

  const result = findBestMatch(importedName, nameStrings);
  if (result.bestMatch.rating >= EXACT_THRESHOLD) {
    const match = existingNames[result.bestMatchIndex];
    return { status: 'exact', matchId: match.id, matchName: match.name, score: result.bestMatch.rating };
  }
  if (result.bestMatch.rating >= FUZZY_THRESHOLD) {
    const match = existingNames[result.bestMatchIndex];
    return { status: 'fuzzy', matchId: match.id, matchName: match.name, score: result.bestMatch.rating };
  }

  return { status: 'unknown' };
}
```

### Anti-Patterns to Avoid
- **Client-side Excel parsing:** Per ADR-007, files MUST be processed on the server. Do not import SheetJS in browser bundles -- it adds ~500KB and exposes parsing logic.
- **Single monolithic API call:** Do not process upload + validate + import in one request. The wizard needs intermediate results for UI.
- **Storing uploaded files on disk:** Use in-memory buffer processing. The file is parsed immediately and discarded. No temp file management needed.
- **Sequential row-by-row DB inserts outside a transaction:** Always use a single transaction for the entire import batch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel/CSV parsing | Custom binary parser | SheetJS (xlsx) 0.20.3 | Handles 20+ formats, codepages, merged cells, formulas |
| Fuzzy string matching | Levenshtein distance from scratch | string-similarity | Battle-tested Dice coefficient, handles edge cases |
| Codepage conversion | Manual charset detection | SheetJS codepage option + js-codepage | Built into SheetJS, handles 200+ codepages |
| Date/month parsing from headers | Regex-only approach | Combination of regex + Intl.DateTimeFormat | Swedish month names need locale-aware parsing |
| Template .xlsx generation | Manual binary construction | SheetJS XLSX.write() | Creates valid Excel files with proper formatting |

**Key insight:** Excel file format handling is deceptively complex -- merged cells, hidden rows, formula evaluation, codepage detection, and format variations (.xls vs .xlsx vs .csv) each have dozens of edge cases. SheetJS handles all of these. Building custom handling is a maintenance nightmare.

## Common Pitfalls

### Pitfall 1: SheetJS npm Registry Version
**What goes wrong:** `pnpm add xlsx` installs 0.18.5 from npm, which is outdated and has vulnerabilities.
**Why it happens:** SheetJS stopped publishing to npm at 0.18.5 and moved to their own CDN.
**How to avoid:** Always install from CDN: `pnpm add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
**Warning signs:** Version 0.18.5 in package.json, security audit warnings.

### Pitfall 2: Swedish Character Garbling in .xls Files
**What goes wrong:** Characters like a, a, o appear as garbage in parsed data from legacy .xls files.
**Why it happens:** BIFF5 .xls files may not have a CodePage record; SheetJS defaults to US English encoding.
**How to avoid:** Pass `codepage: 1252` in parse options. Implement detection: parse once, check for garbled chars, re-parse with alternative codepage if needed.
**Warning signs:** Strings containing sequences like `Ã¤`, `Ã¶`, `Ã¥` (UTF-8 bytes misread as Latin-1).

### Pitfall 3: Merged Cells Creating Empty Rows
**What goes wrong:** In a merged cell range (e.g., A1:A5 merged), only the top-left cell has a value. Rows 2-5 show undefined for that column.
**Why it happens:** SheetJS represents merges in `!merges` array, but `sheet_to_json` doesn't automatically fill merged cell values.
**How to avoid:** After parsing, iterate through `!merges` and forward-fill the merged cell value into all cells in the range before converting to JSON.
**Warning signs:** Rows with missing person name or project name that appear filled in the original Excel file.

### Pitfall 4: Formula Cells Containing Formulas Instead of Values
**What goes wrong:** Cells with formulas (e.g., `=SUM(B2:B5)`) might return the formula string instead of the computed value.
**Why it happens:** SheetJS can return both `f` (formula) and `v` (value) properties. Without `cellFormula: false`, the formula is preserved.
**How to avoid:** Use `cellFormula: false` parse option to get only computed values. Always read cell `.v` (value) property, never `.f` (formula).
**Warning signs:** Cell values starting with `=` in parsed data.

### Pitfall 5: Batch Size Limit in batchUpsertAllocations
**What goes wrong:** Current `batchUpsertSchema` limits to 100 allocations per request. A 5,000-row import would need 50 API calls.
**Why it happens:** The limit was designed for grid auto-save, not bulk import.
**How to avoid:** Create a separate import-specific service function or endpoint that accepts larger batches (up to 5,000). The transaction wrapping is already correct.
**Warning signs:** 413 payload too large or validation errors on the batch endpoint.

### Pitfall 6: CSV Encoding Detection
**What goes wrong:** CSV files saved from Excel on Swedish Windows use Windows-1252 encoding, not UTF-8. Swedish characters get garbled.
**Why it happens:** Excel defaults to system locale encoding for CSV export.
**How to avoid:** SheetJS `codepage: 1252` as default for CSV without BOM. If BOM present (UTF-8 BOM), SheetJS handles automatically.
**Warning signs:** Garbled characters only in CSV files, not .xlsx files (which are always UTF-8 internally).

### Pitfall 7: Month Format Ambiguity
**What goes wrong:** "01/2025" could be January 2025 or ambiguous in different locales. "Mar 2025" vs "Mars 2025" (Swedish).
**Why it happens:** Excel files from different users use different date formats.
**How to avoid:** Support multiple month formats. Parse with a priority list: YYYY-MM (unambiguous) > Swedish month names > English month names > MM/YYYY.
**Warning signs:** Wrong month assignments in imported data.

## Code Examples

### File Upload API Route Handler
```typescript
// Source: Next.js App Router pattern + SheetJS docs
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { orgId } = await requireRole('planner');

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    codepage: 1252,
    cellFormula: false,
    cellHTML: false,
    sheetRows: 5001, // Read max 5001 rows (1 header + 5000 data)
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Handle merged cells: forward-fill values
  if (sheet['!merges']) {
    for (const merge of sheet['!merges']) {
      const topLeft = sheet[XLSX.utils.encode_cell(merge.s)];
      if (!topLeft) continue;
      for (let r = merge.s.r; r <= merge.e.r; r++) {
        for (let c = merge.s.c; c <= merge.e.c; c++) {
          if (r === merge.s.r && c === merge.s.c) continue;
          const addr = XLSX.utils.encode_cell({ r, c });
          sheet[addr] = { ...topLeft };
        }
      }
    }
  }

  const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  // Filter hidden rows
  const visibleData = rawData.filter((_, i) => {
    if (!sheet['!rows'] || !sheet['!rows'][i]) return true;
    return !sheet['!rows'][i].hidden;
  });

  return NextResponse.json({
    headers: visibleData[0] || [],
    sampleRows: visibleData.slice(1, 6),
    totalRows: visibleData.length - 1,
    sheetName,
  });
}
```

### Template Generation
```typescript
// Source: SheetJS write API docs
import * as XLSX from 'xlsx';

export function generateFlatTemplate(): Buffer {
  const headers = ['Namn', 'Projekt', 'Manad', 'Timmar', 'Avdelning', 'Disciplin'];
  const exampleRows = [
    ['Anna Andersson', 'Projekt Alpha', '2025-01', 80, 'Engineering', 'Backend'],
    ['Erik Eriksson', 'Projekt Beta', '2025-01', 120, 'Product', 'Design'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export function generatePivotTemplate(): Buffer {
  const headers = ['Namn', 'Projekt', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
  const exampleRows = [
    ['Anna Andersson', 'Projekt Alpha', 80, 80, 60, 40, 0, 0],
    ['Anna Andersson', 'Projekt Beta', 40, 40, 80, 120, 160, 160],
    ['Erik Eriksson', 'Projekt Alpha', 160, 160, 160, 80, 40, 0],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  ws['!cols'] = [
    { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Template (Grid)');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
```

### Wizard State Management
```typescript
// Client-side wizard state (React useState, no external library needed)
type WizardStep = 'upload' | 'map' | 'validate' | 'import';

type WizardState = {
  step: WizardStep;
  // Step 1: Upload
  file: File | null;
  headers: string[];
  sampleRows: unknown[][];
  totalRows: number;
  formatInfo: { isPivot: boolean; monthColumns: number[] };
  // Step 2: Map
  columnMappings: Record<number, string>; // column index -> target field
  // Step 3: Validate
  validationResult: ValidationResult | null;
  userFixes: Record<number, Record<string, string>>; // row -> field -> fixed value
  // Step 4: Import
  importStatus: 'idle' | 'importing' | 'success' | 'error';
  importResult: BatchImportResult | null;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `npm install xlsx` | Install from CDN tarball | 2023 (SheetJS left npm) | Must use CDN URL in package.json |
| Client-side Excel parsing | Server-side with Route Handlers | Standard since Next.js 13+ | Smaller bundles, better security |
| Manual CSV parsing (Papa Parse) | SheetJS handles CSV too | SheetJS always supported CSV | One library for all formats |

**Deprecated/outdated:**
- xlsx 0.18.5 on npm: Unmaintained, has vulnerabilities. Use 0.20.3 from CDN.
- `readFileSync` in Next.js pages: Use `XLSX.read(buffer)` in Route Handlers instead.

## Open Questions

1. **Batch size for import execution**
   - What we know: Current `batchUpsertSchema` limits to 100 allocations. A 5,000-row import needs higher limits.
   - What's unclear: Whether to create a separate import endpoint with higher limits, or to chunk the import into multiple batched calls within a single transaction.
   - Recommendation: Create a dedicated `importAllocations()` service function that accepts up to 5,000 rows in a single transaction. Keep the existing batch endpoint unchanged for grid auto-save.

2. **File persistence between wizard steps**
   - What we know: The file is uploaded in step 1, but steps 2-4 need the parsed data.
   - What's unclear: Whether to re-upload the file at each step or keep parsed data in server memory/client state.
   - Recommendation: Parse file once on upload, return all parsed data to client. Client holds the parsed rows in state and sends them back for validation and import. No server-side file storage needed. This keeps things stateless and simple.

3. **Creating new people/projects during import**
   - What we know: Import references person and project names. If a name doesn't exist, it's an error per D-12.
   - What's unclear: Whether import should offer to auto-create missing people/projects.
   - Recommendation: For MVP, unknown names are errors that block import. User must create the person/project first, then re-import. This is simpler and safer.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | SheetJS server-side | Yes | (via Next.js) | -- |
| pnpm | Package installation | Yes | 10.33.0 | -- |
| SheetJS CDN | Package source | External | 0.20.3 | Mirror tarball locally |

No missing dependencies.

## Sources

### Primary (HIGH confidence)
- [SheetJS CDN](https://cdn.sheetjs.com/) - Current version 0.20.3, installation method
- [SheetJS Parse Options](https://docs.sheetjs.com/docs/api/parse-options/) - codepage, cellFormula, sheetRows options
- [SheetJS Merged Cells](https://docs.sheetjs.com/docs/csf/features/merges/) - !merges array structure
- [SheetJS Node.js Installation](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) - CDN install instructions

### Secondary (MEDIUM confidence)
- [string-similarity npm](https://www.npmjs.com/package/string-similarity) - v4.0.4, Dice coefficient implementation
- [Fuse.js](https://www.fusejs.io/) - Evaluated and rejected (search engine, not similarity scorer)
- [SheetJS codepage issues](https://github.com/SheetJS/sheetjs/issues/1849) - Swedish encoding edge cases

### Tertiary (LOW confidence)
- Pivot detection heuristics -- custom logic, no standard library. Approach based on pattern matching month-like headers. Needs validation with real Swedish Excel files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - SheetJS is the only maintained option, string-similarity well-established
- Architecture: HIGH - Follows existing feature module pattern, clear API route structure
- Pitfalls: HIGH - Well-documented issues with SheetJS npm version, codepage handling, merged cells
- Pivot detection: MEDIUM - Custom heuristic, no standard library, needs real-world testing
- Fuzzy matching threshold: MEDIUM - 0.8 is standard but may need tuning for Swedish names

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable domain, SheetJS releases infrequently)
