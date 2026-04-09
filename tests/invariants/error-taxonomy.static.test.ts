/**
 * TC-INV-ERRTAX — static invariant: no raw `throw new Error(...)` under
 * /api/v5 routes or feature service files. Second layer next to the
 * ESLint guard added in plan 44-02. API-V5-01.
 *
 * NOTE: this test may be RED until 44-02 sweep completes — that is by
 * design. Wave A plans 01/02/03 land together before Wave B asserts
 * green CI.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, it, expect } from 'vitest';

const FORBIDDEN = /throw\s+new\s+Error\s*\(/;
const ROOTS = ['src/app/api/v5', 'src/features'];

function* walk(dir: string): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx')))
      yield p;
  }
}

describe('TC-INV-ERRTAX: no raw `throw new Error` in v5 API routes or feature services', () => {
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      // Only enforce under features/**/*.service.ts; skip other feature files
      if (root === 'src/features' && !file.endsWith('.service.ts')) continue;
      const src = readFileSync(file, 'utf8');
      const rel = file.split(sep).join('/');
      it(`TC-INV-ERRTAX ${rel} uses AppError, not raw Error`, () => {
        expect(src).not.toMatch(FORBIDDEN);
      });
    }
  }
});
