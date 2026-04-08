// v5.0 — Phase 42 / Plan 42-04 Task 2 — TC-UI shared drawer (LOAD-BEARING for UX-V5-09).
//
// Asserts that all four persona timeline pages import PlanVsActualDrawer from
// the EXACT SAME module specifier. This is the "single source of truth" gate
// for the shared drill-down drawer requirement: if anyone copies, forks, or
// renames the drawer per page, this test fails.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = [
  'src/app/(app)/pm/projects/[projectId]/page.tsx',
  'src/app/(app)/line-manager/timeline/page.tsx',
  'src/app/(app)/staff/page.tsx',
  'src/app/(app)/rd/page.tsx',
] as const;

// Only match real `import ... from '...'` statements, not strings inside
// comments. We strip line comments first then run a multi-line regex.
const IMPORT_RE = /^\s*import[\s\S]*?from\s+['"]([^'"]*PlanVsActualDrawer[^'"]*)['"]/gm;

function stripLineComments(src: string): string {
  return src
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('//');
      // Naive but sufficient: drop everything after `//` if it's not inside a
      // string. None of the relevant import lines contain `//`.
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

function readSpecifiers(file: string): string[] {
  const path = resolve(process.cwd(), file);
  const src = stripLineComments(readFileSync(path, 'utf8'));
  const out: string[] = [];
  let m: RegExpExecArray | null;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    out.push(m[1]!);
  }
  return out;
}

describe('TC-UI shared drawer — single source of truth (UX-V5-09)', () => {
  it('every timeline page imports PlanVsActualDrawer at least once', () => {
    for (const f of FILES) {
      const specs = readSpecifiers(f);
      expect.soft(specs.length, `${f} should import PlanVsActualDrawer`).toBeGreaterThanOrEqual(1);
    }
  });

  it('all four pages use the IDENTICAL import specifier for PlanVsActualDrawer', () => {
    const all = FILES.map((f) => ({ file: f, specs: readSpecifiers(f) }));

    // Each file must have at least one specifier matching the component file.
    // The shared canonical specifier is the one resolving to the
    // PlanVsActualDrawer module (not its provider sibling).
    const componentSpecs = all.map(({ file, specs }) => {
      const componentOnly = specs.filter((s) => s.endsWith('/PlanVsActualDrawer'));
      expect
        .soft(
          componentOnly.length,
          `${file} should import the PlanVsActualDrawer module exactly once`,
        )
        .toBe(1);
      return { file, spec: componentOnly[0]! };
    });

    const first = componentSpecs[0]!.spec;
    for (const { file, spec } of componentSpecs) {
      expect(spec, `${file} imports drawer from ${spec}; first page imports from ${first}`).toBe(
        first,
      );
    }
  });
});
