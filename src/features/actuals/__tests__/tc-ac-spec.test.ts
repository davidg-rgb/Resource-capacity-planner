// v5.0 — Phase 44 / Plan 44-08: TC-AC-011 specification-traceability test.
//
// TC-AC-011 documents the contract that `commitActualsBatch` must throw
// ConflictError when invoked on a session not in 'staged' status. The
// commit helper itself ships in a follow-up phase; until then, this
// specification-traceability test pins the assertion text in
// ARCHITECTURE.md §15 so any contract drift fails CI. Replace in-place
// with a PGlite integration test once `commitActualsBatch` exists.

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const ARCH = readFileSync('.planning/v5.0-ARCHITECTURE.md', 'utf8');

describe('TC-AC-011 spec traceability (Phase 44-08)', () => {
  it('TC-AC-011 commitActualsBatch on non-staged session throws ConflictError', () => {
    const re = /^.*\bTC-AC-011\b.*$/gm;
    const matches = ARCH.match(re);
    expect(matches, 'TC-AC-011 not found in ARCHITECTURE.md §15').toBeTruthy();
    const line = matches!.join('\n');
    expect(line).toMatch(/commitActualsBatch/);
    expect(line).toMatch(/staged/);
    expect(line).toMatch(/ConflictError|throws?/i);
  });
});
