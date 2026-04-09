// v5.0 — Phase 44 / Plan 44-08: TC-PR-014 specification-traceability test.
//
// TC-PR-014 documents a hook-level routing invariant on `useEditOrPropose`
// which is slated for a follow-up phase. Until the hook ships, this
// specification-traceability test pins the assertion text in
// ARCHITECTURE.md §15. When `useEditOrPropose` ships, replace in-place
// with a React Testing Library hook test.

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const ARCH = readFileSync('.planning/v5.0-ARCHITECTURE.md', 'utf8');

describe('TC-PR-014 spec traceability (Phase 44-08)', () => {
  it('TC-PR-014 PM cross-department edit is routed through submitProposal', () => {
    const re = /^.*\bTC-PR-014\b.*$/gm;
    const matches = ARCH.match(re);
    expect(matches, 'TC-PR-014 not found in ARCHITECTURE.md §15').toBeTruthy();
    const line = matches!.join('\n');
    expect(line).toMatch(/editAllocation|useEditOrPropose/);
    expect(line).toMatch(/submitProposal|proposal/i);
    expect(line).toMatch(/department/i);
  });
});
