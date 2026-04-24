// Phase 47-04 — static invariant.
// Phase 53 REVIEW-VERIFY-FIX MJ-01: extended to cover /api/test/flags.
//
// INVARIANT: test-only routes must never appear in a production build.
//
// Each route in TEST_ROUTES triple-gates itself (handler-level throw,
// runtime env gate, proxy layer). The handler-level throw is keyed on
// `NODE_ENV === 'production' && E2E_TEST !== '1'`, which means
// `next build` (which sets NODE_ENV=production) will crash loudly if the
// route handler is ever imported at runtime in prod.
//
// This test provides a FIFTH gate: if the prod build somehow tree-shakes
// past the throw (or the throw is ever weakened), the .next/ server chunks
// should still not contain any reference to any test-only route. We grep
// for two canonical markers per route:
//
//   1. route path (e.g. 'api/test/seed', 'api/test/flags')
//   2. 'test-only route imported in production' → the throw message
//
// Either appearing in the built server bundle means a route leaked into
// prod; fix the build, don't relax the test.
//
// Behaviour when `.next/` is absent:
//   * Local dev runs skip (log a console.warn). The CI quality job runs
//     `pnpm build` before `pnpm test`, so the grep exercises the real
//     build output there.
//
// Behaviour when `.next/` is present but lacks a server chunk:
//   * globSync returns [], the offenders list stays empty, the test
//     passes. The absence of server output is checked elsewhere (build
//     smoke); this test is narrowly about "no leak".

import { existsSync, readFileSync } from 'node:fs';

import { globSync } from 'glob';
import { describe, expect, it } from 'vitest';

const THROW_MESSAGE_MARKER = 'test-only route imported in production';

interface TestRoute {
  pathMarker: string;
  sourcePath: string;
}

const TEST_ROUTES: TestRoute[] = [
  { pathMarker: 'api/test/seed', sourcePath: 'src/app/api/test/seed/route.ts' },
  { pathMarker: 'api/test/flags', sourcePath: 'src/app/api/test/flags/route.ts' },
];

describe('invariant: test-only routes absent from production build', () => {
  it('is not present in .next/ server chunks', () => {
    if (!existsSync('.next')) {
      console.warn('[invariant] .next/ missing — run `pnpm build` to exercise this check.');
      return;
    }
    const files = globSync('.next/server/**/*.{js,mjs,cjs}');
    const offenders: Array<{ file: string; marker: string }> = [];
    for (const file of files) {
      const contents = readFileSync(file, 'utf8');
      for (const { pathMarker } of TEST_ROUTES) {
        if (contents.includes(pathMarker)) {
          offenders.push({ file, marker: pathMarker });
        }
      }
      if (contents.includes(THROW_MESSAGE_MARKER)) {
        offenders.push({ file, marker: THROW_MESSAGE_MARKER });
      }
    }
    expect(offenders).toEqual([]);
  });

  it.each(TEST_ROUTES)(
    'has the handler-level NODE_ENV=production throw in source ($pathMarker)',
    ({ sourcePath }) => {
      // Source-level assertion, always runs even without a prior build.
      // If anyone ever weakens the gate (e.g. removes the throw), this test
      // fails immediately in `pnpm test` without needing a prod build.
      const src = readFileSync(sourcePath, 'utf8');
      expect(src).toMatch(/process\.env\.NODE_ENV\s*===\s*['"]production['"]/);
      expect(src).toContain(THROW_MESSAGE_MARKER);
      expect(src).toMatch(/E2E_SEED_ENABLED/);
    },
  );
});
