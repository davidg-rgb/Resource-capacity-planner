/**
 * TEST-V5-01 — Canonical TC-ID extractor.
 *
 * Reads `.planning/v5.0-ARCHITECTURE.md`, scans §15, extracts every
 * `TC-XXX-NNN` token, expands `..NN` range notation, and writes the
 * sorted unique list to `.planning/test-contract/tc-canonical.json`.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const ARCH_PATH = '.planning/v5.0-ARCHITECTURE.md';
const OUT_PATH = '.planning/test-contract/tc-canonical.json';

// Canonical TC-ID grammar. Supports:
//   TC-NEG-001                (pure numeric suffix)
//   TC-UI-EMPTY-014           (multi-segment alpha prefix)
//   TC-E2E-1A                 (digit + uppercase letter suffix)
//   TC-E2E-2B-approve         (digit+letter + lowercase qualifier tail)
//   TC-E2E-2B-reject
const SINGLE_RE = /TC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+[A-Za-z]*(?:-[a-z]+)*/g;
const RANGE_RE = /TC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+\.\.\d+/g;
const VALID_RE = /^TC-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d+[A-Za-z]*(?:-[a-z]+)*$/;

function extractSection15(md: string): string {
  const start = md.search(/^## 15\./m);
  if (start < 0) throw new Error('§15 start marker not found in ARCHITECTURE.md');
  const rest = md.slice(start + 1);
  const relEnd = rest.search(/^## 16\./m);
  if (relEnd < 0) throw new Error('§16 end marker not found in ARCHITECTURE.md');
  return md.slice(start, start + 1 + relEnd);
}

function expandRanges(section: string): string[] {
  const out: string[] = [];
  const ranges = section.match(RANGE_RE) ?? [];
  for (const token of ranges) {
    // e.g. TC-UI-EMPTY-001..014
    const m = token.match(/^(TC-[A-Z]+(?:-[A-Z]+)*-)(\d+)\.\.(\d+)$/);
    if (!m) continue;
    const prefix = m[1];
    const start = parseInt(m[2], 10);
    const end = parseInt(m[3], 10);
    const width = m[2].length;
    for (let i = start; i <= end; i++) {
      out.push(`${prefix}${String(i).padStart(width, '0')}`);
    }
  }
  return out;
}

function main(): void {
  const md = readFileSync(ARCH_PATH, 'utf8');
  const section = extractSection15(md);

  const singles = (section.match(SINGLE_RE) ?? []).filter(
    (t) => !t.includes('..'),
  );
  const expanded = expandRanges(section);

  const set = new Set<string>([...singles, ...expanded]);

  // Filter out any malformed tokens (defensive).
  const canonical = [...set].filter((id) => VALID_RE.test(id)).sort();

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      { canonical, generatedAt: new Date().toISOString() },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  // eslint-disable-next-line no-console
  console.log(`Extracted ${canonical.length} canonical TC-IDs → ${OUT_PATH}`);
}

main();
