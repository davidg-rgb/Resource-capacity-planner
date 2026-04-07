// v5.0 — FOUND-V5-04 / TC-CL-005: runtime mutations-coverage invariant.
//
// Loads tests/invariants/mutations.json (produced deterministically by
// scripts/generate-mutations-manifest.ts), dynamically imports each listed
// mutating export, spies on recordChange, and asserts the spy is called at
// least once. At end of Phase 35 the manifest is empty, so this test short-
// circuits to a single passing no-op — later phases populate the manifest and
// the loop below exercises every entry.

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Stub the db module so importing the service does not try to connect to a
// real Postgres during this (pure-invariant) test.
vi.mock('@/db', () => ({
  db: { insert: () => ({ values: () => ({ returning: async () => [{}] }) }) },
}));

const changeLogService = await import('@/features/change-log/change-log.service');

type Entry = { file: string; export: string };
const manifest: { entries: Entry[] } = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/invariants/mutations.json'), 'utf8'),
);

describe('TC-CL-005: every mutating service calls recordChange()', () => {
  if (manifest.entries.length === 0) {
    it('manifest is empty at Phase 35 — later phases populate it', () => {
      expect(manifest.entries).toEqual([]);
    });
    return;
  }

  for (const entry of manifest.entries) {
    it(`${entry.file} :: ${entry.export} calls recordChange`, async () => {
      const spy = vi
        .spyOn(changeLogService, 'recordChange')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValue({} as any);
      try {
        const mod = await import(/* @vite-ignore */ resolve(process.cwd(), entry.file));
        const fn = mod[entry.export];
        expect(typeof fn).toBe('function');
        const stubTx = {
          insert: () => ({
            values: () => ({ returning: async () => [{}] }),
          }),
        };
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await fn({}, stubTx as any);
        } catch {
          // Swallow arg-validation failures — we only care that recordChange was reached.
        }
        expect(spy).toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });
  }
});
