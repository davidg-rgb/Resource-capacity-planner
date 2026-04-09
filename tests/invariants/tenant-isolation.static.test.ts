import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, it, expect } from 'vitest';

const MUTATING_DECL = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/;
// Either explicit withTenant(...) OR requireRole(...) that also threads orgId
const WITH_TENANT = /withTenant\s*\(/;
const REQUIRE_ROLE_ORG_ID = /requireRole\s*\([\s\S]*?\borgId\b/;

type Exceptions = {
  routes: Array<{ file: string; verbs?: string[]; reason: string }>;
};
const exceptions = JSON.parse(
  readFileSync('tests/invariants/tenant-exceptions.json', 'utf8'),
) as Exceptions;
const exceptionFiles = new Set(
  exceptions.routes.map((r) => r.file.replace(/\\/g, '/')),
);

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
    else if (e.name === 'route.ts') yield p;
  }
}

describe('TC-API-TENANT-STATIC: every mutating /api/v5/* route enforces tenancy', () => {
  const files = Array.from(walk('src/app/api/v5'));
  // sanity — inventory found routes
  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    const normalized = file.split(sep).join('/');
    if (exceptionFiles.has(normalized)) continue;
    const src = readFileSync(file, 'utf8');
    if (!MUTATING_DECL.test(src)) continue;
    it(`TC-API-TENANT-STATIC ${normalized} uses withTenant() or requireRole+orgId`, () => {
      const ok = WITH_TENANT.test(src) || REQUIRE_ROLE_ORG_ID.test(src);
      expect(
        ok,
        `Mutating route ${normalized} must call withTenant() OR thread requireRole()+orgId into a service. Add an exception in tests/invariants/tenant-exceptions.json if intentional.`,
      ).toBe(true);
    });
  }
});
