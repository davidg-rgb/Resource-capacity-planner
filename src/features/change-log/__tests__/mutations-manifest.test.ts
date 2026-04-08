// v5.0 — Phase 43 / Plan 43-04 (TC-CL-005 regen): explicit assertions that
// the mutations manifest produced by `scripts/generate-mutations-manifest.ts`
// includes the four register.service.ts mutations added in Plan 43-01.
//
// The Phase 35 runtime invariant (`tests/invariants/change-log.coverage.test.ts`)
// already asserts that every entry in the manifest calls `recordChange` at
// runtime. This test is the complementary static check: it asserts that the
// manifest CONTAINS the register.service entries at all, so a future edit
// that accidentally drops them fails loudly here rather than silently
// reducing coverage of TC-CL-005.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Entry = { file: string; export: string };

const manifest: { entries: Entry[] } = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/invariants/mutations.json'), 'utf8'),
);

describe('TC-CL-005 / Phase 43 — mutations manifest includes register.service mutations', () => {
  it('contains register.service.ts::createRegisterRow', () => {
    expect(
      manifest.entries.some(
        (e) =>
          e.file === 'src/features/admin/register.service.ts' && e.export === 'createRegisterRow',
      ),
    ).toBe(true);
  });

  it('contains register.service.ts::updateRegisterRow', () => {
    expect(
      manifest.entries.some(
        (e) =>
          e.file === 'src/features/admin/register.service.ts' && e.export === 'updateRegisterRow',
      ),
    ).toBe(true);
  });

  it('contains register.service.ts::archiveRegisterRow', () => {
    expect(
      manifest.entries.some(
        (e) =>
          e.file === 'src/features/admin/register.service.ts' && e.export === 'archiveRegisterRow',
      ),
    ).toBe(true);
  });

  it('does NOT contain listRegisterRows (read-only, not a mutation)', () => {
    expect(
      manifest.entries.some(
        (e) =>
          e.file === 'src/features/admin/register.service.ts' && e.export === 'listRegisterRows',
      ),
    ).toBe(false);
  });
});
