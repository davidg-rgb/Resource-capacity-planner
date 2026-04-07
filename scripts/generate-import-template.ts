/**
 * Generate public/templates/template_row_per_entry.xlsx (IMP-06).
 *
 * Deterministic build script. Produces the canonical Nordic Capacity Excel
 * import template served as a static asset from the app. The file is
 * committed to source control so prod serves byte-stable content without
 * depending on runtime generation.
 *
 * Run: pnpm generate:import-template
 *
 * Side effect: after writing the file, re-reads it through
 * parseActualsWorkbook and asserts layout/row-count/warning invariants as a
 * self-check. Exits non-zero on any mismatch.
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import * as XLSX from 'xlsx';

import { parseActualsWorkbook } from '../src/features/import/parsers/actuals-excel.parser';

const OUTPUT_PATH = resolve(process.cwd(), 'public/templates/template_row_per_entry.xlsx');

const headerRow = ['person_name', 'project_name', 'date', 'hours'];
const dataRows: Array<[string, string, string, number]> = [
  ['Anna Andersson', 'Atlas', '2026-04-07', 8],
  ['Anna Andersson', 'Atlas', '2026-04-08', 7.5],
  ['Erik Svensson', 'Nova', '2026-04-07', 6],
  ['Erik Svensson', 'Nova', '2026-04-08', 8],
  ['Sara Berg', 'Atlas', '2026-04-07', 4],
];

const instructions: Array<[string]> = [
  ['Instruktioner — Utfallsimport'],
  [''],
  ['Fyll i en rad per person/projekt/datum.'],
  ['Datum ska vara i formatet ÅÅÅÅ-MM-DD (ISO).'],
  ['Timmar kan vara decimaltal (t.ex. 7,5 eller 7.5).'],
  ['US WEEKNUM() stöds inte. Använd ISO-veckor (t.ex. 2026-W15) om du använder pivoterad layout.'],
  ['Hitta en pivoterad mall på hjälpsidan.'],
];

function buildWorkbook(): XLSX.WorkBook {
  const utfallSheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, utfallSheet, 'Utfall');
  XLSX.utils.book_append_sheet(book, instructionsSheet, 'Instruktioner');
  return book;
}

function write(): void {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const book = buildWorkbook();
  // Pin compression/deterministic options so re-runs produce byte-stable output.
  const buf = XLSX.write(book, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  }) as Buffer;
  writeFileSync(OUTPUT_PATH, buf);

  console.log(`Wrote ${buf.byteLength} bytes → ${OUTPUT_PATH}`);
}

function selfCheck(): void {
  const buf = readFileSync(OUTPUT_PATH);
  // Convert Node Buffer to ArrayBuffer for parseActualsWorkbook.
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const result = parseActualsWorkbook(ab);

  if (result.layout !== 'row-per-entry') {
    throw new Error(`Self-check failed: expected layout 'row-per-entry', got '${result.layout}'`);
  }
  if (result.rows.length !== dataRows.length) {
    throw new Error(
      `Self-check failed: expected ${dataRows.length} rows, got ${result.rows.length}`,
    );
  }
  if (result.warnings.length !== 0) {
    throw new Error(
      `Self-check failed: expected 0 warnings, got ${result.warnings.length}: ${JSON.stringify(result.warnings)}`,
    );
  }

  console.log(`Self-check OK: layout=${result.layout}, rows=${result.rows.length}, warnings=0`);
}

write();
selfCheck();
