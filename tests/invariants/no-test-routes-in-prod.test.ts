// Phase 47-04 — static invariant.
//
// INVARIANT: /api/test/seed must never appear in a production build.
//
// The route at src/app/api/test/seed/route.ts triple-gates itself (module-
// level throw, runtime env gate, proxy layer). The module-level throw is
// keyed on `NODE_ENV === 'production' && E2E_TEST !== '1'`, which means
// `next build` (which sets NODE_ENV=production) will crash loudly if the
// route handler is ever imported during a prod build.
//
// This test provides a FIFTH gate: if the prod build somehow tree-shakes
// past the throw (or the throw is ever weakened), the .next/ server chunks
// should still not contain any reference to the test-only route. We grep
// for two canonical markers:
//
//   1. 'api/test/seed'                         → the route path
//   2. 'test-only route imported in production' → the throw message
//
// Either appearing in the built server bundle means the route leaked into
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

const ROUTE_PATH_MARKER = 'api/test/seed';
const THROW_MESSAGE_MARKER = 'test-only route imported in production';

describe('invariant: /api/test/seed absent from production build', () => {
  it('is not present in .next/ server chunks', () => {
    if (!existsSync('.next')) {
      // eslint-disable-next-line no-console
      console.warn(
        '[invariant] .next/ missing — run `pnpm build` to exercise this check.',
      );
      return;
    }
    const files = globSync('.next/server/**/*.{js,mjs,cjs}');
    const offenders: Array<{ file: string; marker: string }> = [];
    for (const file of files) {
      const contents = readFileSync(file, 'utf8');
      if (contents.includes(ROUTE_PATH_MARKER)) {
        offenders.push({ file, marker: ROUTE_PATH_MARKER });
      }
      if (contents.includes(THROW_MESSAGE_MARKER)) {
        offenders.push({ file, marker: THROW_MESSAGE_MARKER });
      }
    }
    expect(offenders).toEqual([]);
  });

  it('has the module-level NODE_ENV=production throw in source', () => {
    // Source-level assertion, always runs even without a prior build.
    // If anyone ever weakens the gate (e.g. removes the throw), this test
    // fails immediately in `pnpm test` without needing a prod build.
    const src = readFileSync(
      'src/app/api/test/seed/route.ts',
      'utf8',
    );
    expect(src).toMatch(/process\.env\.NODE_ENV\s*===\s*['"]production['"]/);
    expect(src).toContain(THROW_MESSAGE_MARKER);
    expect(src).toMatch(/E2E_SEED_ENABLED/);
  });
});
