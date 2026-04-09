// v5.0 — Phase 44 / Plan 44-08: TC-PS-* specification-traceability tests.
//
// TC-PS-011..016 document planning/direct-edit invariants whose underlying
// helpers (`editAllocation`, `bulkCopyForward`) are slated for a follow-up
// phase. Until the implementation lands, these specification-traceability
// tests pin the assertion text in ARCHITECTURE.md §15 so any edit to the
// canonical contract is caught by CI. Each test reads the architecture
// document and asserts that the TC-ID line still carries the documented
// invariant keywords. When the actual service ships, these tests should be
// replaced in-place with PGlite integration tests that execute the behavior.

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const ARCH = readFileSync('.planning/v5.0-ARCHITECTURE.md', 'utf8');

function findAssertion(tcId: string): string {
  const re = new RegExp(`^.*\\b${tcId}\\b.*$`, 'gm');
  const matches = ARCH.match(re);
  if (!matches || matches.length === 0) {
    throw new Error(`TC-ID ${tcId} not found in ARCHITECTURE.md §15`);
  }
  return matches.join('\n');
}

describe('TC-PS-* planning direct-edit spec traceability (Phase 44-08)', () => {
  it('TC-PS-011 editAllocation historic check uses DB now(), not Node clock', () => {
    const line = findAssertion('TC-PS-011');
    expect(line).toMatch(/historic/i);
    expect(line).toMatch(/now\(\)|DB|Node/);
  });

  it('TC-PS-012 bulkCopyForward historic range with confirmHistoric=false aborts atomically', () => {
    const line = findAssertion('TC-PS-012');
    expect(line).toMatch(/bulkCopyForward/);
    expect(line).toMatch(/historic/i);
    expect(line).toMatch(/atomic|abort/i);
  });

  it('TC-PS-013 bulkCopyForward with PROPOSAL_IN_RANGE aborts atomically', () => {
    const line = findAssertion('TC-PS-013');
    expect(line).toMatch(/bulkCopyForward/);
    expect(line).toMatch(/PROPOSAL_IN_RANGE/);
    expect(line).toMatch(/atomic|abort|unaffected/i);
  });

  it('TC-PS-014 bulkCopyForward source-cell rule uses approved, not proposed', () => {
    const line = findAssertion('TC-PS-014');
    expect(line).toMatch(/bulkCopyForward/);
    expect(line).toMatch(/approved/i);
    expect(line).toMatch(/proposed|pending/i);
  });

  it('TC-PS-015 line-manager edit boundary is department-scoped', () => {
    const line = findAssertion('TC-PS-015');
    expect(line).toMatch(/line manager|Line manager/i);
    expect(line).toMatch(/department/i);
  });

  it('TC-PS-016 bulkCopyForward writes exactly one change_log row per operation', () => {
    const line = findAssertion('TC-PS-016');
    expect(line).toMatch(/bulkCopyForward/);
    expect(line).toMatch(/change_log/);
    expect(line).toMatch(/one|1\b/);
  });
});
