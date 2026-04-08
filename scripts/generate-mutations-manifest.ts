// v5.0 — FOUND-V5-04: deterministic mutations manifest codegen.
//
// Scans v5 feature service files, collects every exported async function
// whose name matches the mutating-verb regex, and writes
// tests/invariants/mutations.json with a stable sort so that running the
// script twice in a row produces byte-identical output.
//
// IMPORTANT: the INCLUDE constant below MUST stay in sync with the
// files: glob in eslint.config.mjs (nordic/require-change-log block).
// Later v5 phases add new feature dirs to BOTH places.

import { Project, SyntaxKind, Node } from 'ts-morph';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, relative, sep } from 'node:path';
import { globSync } from 'glob';

const MUTATING_RE =
  /^(create|update|delete|edit|submit|approve|reject|commit|rollback|upsert|archive|withdraw|bulk[A-Z])/;

const INCLUDE = [
  'src/features/change-log/**/*.service.ts',
  'src/features/actuals/**/*.service.ts',
  'src/features/import/**/*.service.ts',
  // v5.0 — Phase 43 / Plan 43-01: admin register coverage (ADM-03).
  'src/features/admin/**/*.service.ts',
];

const OUTPUT = 'tests/invariants/mutations.json';

type Entry = { file: string; export: string };

function collect(): Entry[] {
  const files = Array.from(new Set(INCLUDE.flatMap((p) => globSync(p)))).sort();
  const project = new Project({
    tsConfigFilePath: 'tsconfig.json',
    skipAddingFilesFromTsConfig: true,
  });
  for (const f of files) project.addSourceFileAtPath(f);

  const entries: Entry[] = [];
  for (const sf of project.getSourceFiles()) {
    const rel = relative(process.cwd(), sf.getFilePath()).split(sep).join('/');
    for (const [name, decls] of sf.getExportedDeclarations()) {
      if (!MUTATING_RE.test(name)) continue;
      for (const d of decls) {
        let isAsync = false;
        if (Node.isFunctionDeclaration(d) || Node.isFunctionExpression(d)) {
          isAsync = d.isAsync();
        } else if (Node.isArrowFunction(d)) {
          isAsync = d.isAsync();
        } else if (Node.isVariableDeclaration(d)) {
          const init = d.getInitializer();
          if (
            init &&
            (init.getKind() === SyntaxKind.ArrowFunction ||
              init.getKind() === SyntaxKind.FunctionExpression)
          ) {
            // @ts-expect-error — narrowed by kind check above
            isAsync = init.isAsync();
          }
        }
        if (isAsync) {
          entries.push({ file: rel, export: name });
          break;
        }
      }
    }
  }

  entries.sort((a, b) => a.file.localeCompare(b.file) || a.export.localeCompare(b.export));
  return entries;
}

function main() {
  const entries = collect();
  const json = JSON.stringify({ entries }, null, 2) + '\n';
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, json, 'utf8');
  console.log(`Wrote ${entries.length} entries to ${OUTPUT}`);
}

main();
