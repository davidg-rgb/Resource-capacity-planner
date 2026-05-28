import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, it, expect } from 'vitest';

const MUTATING_DECL = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/;
// ADR-V7-01: tenant scoping is the ONE canonical pattern — requireRole(...) that
// also threads orgId into a service that filters on a direct organizationId
// predicate. The legacy withTenant() query-builder wrapper was removed in Phase 55;
// it is now a REJECTED pattern (see the rejected-pattern guard below).
const REQUIRE_ROLE_ORG_ID = /requireRole\s*\([\s\S]*?\borgId\b/;
// The rejected pattern. If this token reappears anywhere in src/ the wrapper has
// been reintroduced and the single-pattern invariant is broken.
const REJECTED_WITH_TENANT = /withTenant\s*\(/;

type Exceptions = {
  routes: Array<{ file: string; verbs?: string[]; reason: string }>;
};
const exceptions = JSON.parse(
  readFileSync('tests/invariants/tenant-exceptions.json', 'utf8'),
) as Exceptions;
const exceptionFiles = new Set(exceptions.routes.map((r) => r.file.replace(/\\/g, '/')));

function* walk(dir: string, match: (name: string) => boolean): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, match);
    else if (match(e.name)) yield p;
  }
}

describe('TC-API-TENANT-STATIC: every mutating /api/v5/* route enforces tenancy', () => {
  const files = Array.from(walk('src/app/api/v5', (n) => n === 'route.ts'));
  // sanity — inventory found routes
  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    const normalized = file.split(sep).join('/');
    if (exceptionFiles.has(normalized)) continue;
    const src = readFileSync(file, 'utf8');
    if (!MUTATING_DECL.test(src)) continue;
    it(`TC-API-TENANT-STATIC ${normalized} threads requireRole()+orgId`, () => {
      const ok = REQUIRE_ROLE_ORG_ID.test(src);
      expect(
        ok,
        `Mutating route ${normalized} must thread requireRole()+orgId into a tenant-scoped service (ADR-V7-01). Add an exception in tests/invariants/tenant-exceptions.json if intentional.`,
      ).toBe(true);
    });
  }
});

describe('TC-API-TENANT-REJECTED: the removed withTenant() wrapper stays removed (ADR-V7-01)', () => {
  // TENANT-03: a mixed pattern must fail CI. The wrapper was deleted in Phase 55;
  // standardizing on the direct organizationId predicate is only meaningful if the
  // rejected pattern cannot creep back. Scan all of src/ — zero occurrences allowed.
  const srcFiles = Array.from(walk('src', (n) => n.endsWith('.ts') || n.endsWith('.tsx')));
  expect(srcFiles.length).toBeGreaterThan(0);

  it('withTenant( appears nowhere in src/', () => {
    const offenders = srcFiles.filter((f) => REJECTED_WITH_TENANT.test(readFileSync(f, 'utf8')));
    expect(
      offenders,
      `withTenant() was removed in Phase 55 (ADR-V7-01) in favor of direct organizationId predicates. ` +
        `These files reintroduce the rejected wrapper pattern:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
