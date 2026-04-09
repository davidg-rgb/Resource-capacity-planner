/**
 * Static invariant: html2canvas must not return to package.json.
 *
 * Phase 45 (LAUNCH-01) swapped html2canvas for html-to-image because html2canvas
 * 1.4.1 silently failed on Tailwind v4 oklch custom properties in the PDF export
 * path. If a future change re-introduces html2canvas, this test fails loudly.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('pdf-export dependency invariants', () => {
  const pkg = JSON.parse(
    readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  it('html2canvas is not in dependencies (Phase 45, LAUNCH-01)', () => {
    expect(pkg.dependencies?.['html2canvas']).toBeUndefined();
  });

  it('html2canvas is not in devDependencies (Phase 45, LAUNCH-01)', () => {
    expect(pkg.devDependencies?.['html2canvas']).toBeUndefined();
  });

  it('html-to-image is the chosen DOM capture library', () => {
    expect(pkg.dependencies?.['html-to-image']).toBeDefined();
    expect(pkg.dependencies?.['html-to-image']).toMatch(/^\^?1\.11\./);
  });
});
