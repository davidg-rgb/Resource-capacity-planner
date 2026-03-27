/**
 * Import template generation.
 *
 * Generates downloadable .xlsx template files with Swedish headers
 * and example data, in both flat and pivot format.
 */

import * as XLSX from 'xlsx';

/**
 * Generate a flat-format import template (.xlsx).
 *
 * Headers: Namn, Projekt, Manad, Timmar, Avdelning, Disciplin
 * Contains 2 example rows with Swedish example data.
 */
export function generateFlatTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  const data = [
    ['Namn', 'Projekt', 'M\u00e5nad', 'Timmar', 'Avdelning', 'Disciplin'],
    ['Anna Andersson', 'Projekt Alpha', '2025-01', 80, 'Engineering', 'Backend'],
    ['Erik Eriksson', 'Projekt Beta', '2025-02', 120, 'Product', 'Design'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Import Mall');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buf);
}

/**
 * Generate a pivot-format import template (.xlsx).
 *
 * Headers: Namn, Projekt, followed by 6 month columns (2025-01 through 2025-06).
 * Contains 3 example rows showing multiple people and projects.
 */
export function generatePivotTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  const data = [
    ['Namn', 'Projekt', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'],
    ['Anna Andersson', 'Projekt Alpha', 80, 80, 60, 40, 0, 0],
    ['Anna Andersson', 'Projekt Beta', 40, 40, 80, 120, 160, 160],
    ['Erik Eriksson', 'Projekt Alpha', 160, 160, 160, 80, 40, 0],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Import Mall (Pivotformat)');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buf);
}
