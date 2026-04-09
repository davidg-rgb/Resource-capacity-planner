// v5.0 — Phase 44 / Plan 44-06: TEST-V5-01 CI diff gate.
//
// Reads the canonical TC-ID list (extracted from ARCHITECTURE.md §15),
// the generated manifest (extracted from test titles), and the
// allowlist (Wave C fill-in budget). Fails if any canonical TC-ID is
// neither present nor explicitly allow-listed.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const CANON_PATH = '.planning/test-contract/tc-canonical.json';
const MANIFEST_PATH = '.planning/test-contract/tc-manifest.json';
const ALLOWLIST_PATH = '.planning/test-contract/tc-allowlist.json';

describe('TEST-V5-01 TC-ID coverage', () => {
  it('TC-INV-COVERAGE-001 canonical TC-IDs are all present in manifest or allowlist', () => {
    const canonical = new Set(
      (JSON.parse(readFileSync(CANON_PATH, 'utf8')).canonical as string[]),
    );
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    const present = new Set(
      Object.keys(manifest.entries as Record<string, unknown>),
    );
    const allowed = new Set(
      (JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
        .stillMissing as string[]),
    );

    const missing: string[] = [];
    for (const id of canonical) {
      if (!present.has(id) && !allowed.has(id)) missing.push(id);
    }
    expect(
      missing,
      `Missing TC-IDs (not in manifest and not in allowlist):\n${missing.join('\n')}`,
    ).toEqual([]);
  });

  it('TC-INV-COVERAGE-002 allowlist contains no IDs that are already present', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    const present = new Set(
      Object.keys(manifest.entries as Record<string, unknown>),
    );
    const allowed = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
      .stillMissing as string[];
    const stale = allowed.filter((id) => present.has(id));
    expect(
      stale,
      `Allowlist is stale for: ${stale.join(', ')}. Remove these IDs from tc-allowlist.json.`,
    ).toEqual([]);
  });

  it('TC-INV-COVERAGE-003 allowlist entries are all in the canonical list', () => {
    const canonical = new Set(
      (JSON.parse(readFileSync(CANON_PATH, 'utf8')).canonical as string[]),
    );
    const allowed = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'))
      .stillMissing as string[];
    const orphans = allowed.filter((id) => !canonical.has(id));
    expect(
      orphans,
      `Allowlist has non-canonical entries: ${orphans.join(', ')}. Remove these from tc-allowlist.json.`,
    ).toEqual([]);
  });
});
