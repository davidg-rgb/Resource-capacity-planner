/**
 * Generate e2e/fixtures/nordlys-import.xlsx (Phase 47, PLAY-01 / TC-E2E-2D).
 *
 * Deterministic fixture for the Line Manager "import a Nordlys Excel" spec
 * (TC-E2E-2D). Pinned to the row-per-entry layout already emitted by
 * `scripts/generate-import-template.ts` so the import pipeline hits the
 * happy path with zero warnings.
 *
 * Committed alongside the xlsx output so CI doesn't depend on tsx at test
 * time. Re-run this script only when the template schema changes.
 *
 * People are the three canonical names from `tests/fixtures/seed.ts`:
 *   Anna Lindqvist, Per Karlsson, Sara Berg
 *
 * Project: Nordlys
 * Months:  2026-05, 2026-06, 2026-07 (one row per month, day = first)
 * Hours:   Anna 80/60/80, Per 40/40/40, Sara 60/60/60
 *
 * Run: pnpm tsx scripts/generate-e2e-import-fixture.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import * as XLSX from 'xlsx';

const OUTPUT_PATH = resolve(process.cwd(), 'e2e/fixtures/nordlys-import.xlsx');

const headerRow = ['person_name', 'project_name', 'date', 'hours'];

const PROJECT = 'Nordlys';

const plan: Array<{ name: string; hours: [number, number, number] }> = [
  { name: 'Anna Lindqvist', hours: [80, 60, 80] },
  { name: 'Per Karlsson', hours: [40, 40, 40] },
  { name: 'Sara Berg', hours: [60, 60, 60] },
];

const months = ['2026-05-01', '2026-06-01', '2026-07-01'] as const;

const dataRows: Array<[string, string, string, number]> = [];
for (const person of plan) {
  months.forEach((date, idx) => {
    dataRows.push([person.name, PROJECT, date, person.hours[idx]]);
  });
}

function buildWorkbook(): XLSX.WorkBook {
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Utfall');
  return book;
}

function write(): void {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const book = buildWorkbook();
  const buf = XLSX.write(book, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  }) as Buffer;
  writeFileSync(OUTPUT_PATH, buf);
  console.log(
    `Wrote ${buf.byteLength} bytes to ${OUTPUT_PATH} (${dataRows.length} data rows)`,
  );
}

write();
