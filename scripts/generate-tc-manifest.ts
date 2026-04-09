/**
 * TEST-V5-01 — Test-tree walker producing tc-manifest.json.
 *
 * Walks `tests/**` and `src/**` for test files, parses each as plain
 * text, finds lines calling `it(`, `test(`, or `describe(`, and extracts
 * the first-token TC-ID from the title string.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

const OUT_PATH = '.planning/test-contract/tc-manifest.json';
const ROOTS = ['tests', 'src'];

const TEST_EXT = /\.(test|spec)\.(ts|tsx)$/;
const TESTS_DIR_EXT = /\.(ts|tsx)$/;

// Match it('TC-XXX-NNN...'), test("TC-XXX-NNN..."), describe(`TC-XXX-NNN...`)
// Capture function name, quote, and title.
const CALL_RE = /\b(it|test|describe)\s*\(\s*(['"`])([^'"`]*)\2/g;
const FIRST_TC_RE = /^(TC-[A-Z]+(?:-[A-Z]+)*-\d+[a-z]?)\b/;
const VALID_RE = /^TC-[A-Z]+(?:-[A-Z]+)*-\d+[a-z]?$/;

interface ManifestEntry {
  file: string;
  testName: string;
  status: 'present';
}

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === 'dist') continue;
    const p = join(dir, name);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function isTestFile(path: string, root: string): boolean {
  if (root === 'tests') return TESTS_DIR_EXT.test(path);
  // src/** only counts *.test.* / *.spec.*
  return TEST_EXT.test(path);
}

function toPosix(p: string): string {
  return p.split(sep).join('/');
}

function main(): void {
  const entries: Record<string, ManifestEntry> = {};

  for (const root of ROOTS) {
    const files = walk(root).filter((f) => isTestFile(f, root));
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      CALL_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = CALL_RE.exec(content)) !== null) {
        const title = m[3];
        const tcMatch = title.match(FIRST_TC_RE);
        if (!tcMatch) continue;
        const tcId = tcMatch[1];
        if (!VALID_RE.test(tcId)) continue;
        if (entries[tcId]) continue; // first wins
        entries[tcId] = {
          file: toPosix(relative('.', file)),
          testName: title,
          status: 'present',
        };
      }
    }
  }

  // Sort entries by key for deterministic output.
  const sorted: Record<string, ManifestEntry> = {};
  for (const key of Object.keys(entries).sort()) {
    sorted[key] = entries[key];
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), entries: sorted },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  // eslint-disable-next-line no-console
  console.log(`Wrote ${Object.keys(sorted).length} TC-ID entries → ${OUT_PATH}`);
}

main();
