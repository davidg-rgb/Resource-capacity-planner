// E2E database helpers. Never imported by production code.
//
// Responsibilities:
//   1. Safety guardrail — refuse to operate against any DATABASE_URL whose
//      database name does not contain 'e2e' or 'test'.
//   2. migrate() — spawn `pnpm db:push` against the E2E DB (drizzle-kit push
//      is idempotent and creates the schema from drizzle/schema without
//      requiring a migrations folder, which is what the project currently
//      uses — see package.json scripts).
//   3. reset() — TRUNCATE all application tables between specs, preserving
//      schema and drizzle's own metadata tables.
//
// This module runs in the Playwright runner process, not inside the Next
// dev server. It opens its own client connection to DATABASE_URL.

import { execSync } from 'node:child_process';

/**
 * Safety guardrail: refuse to operate against any DATABASE_URL whose database
 * name does not contain 'e2e' or 'test'. This is the LAST line of defense
 * against a developer accidentally pointing E2E at the dev or prod DB.
 *
 * Returns the parsed database name on success; throws otherwise.
 */
export function assertE2EDatabase(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('[e2e/db] DATABASE_URL is not set');
  }
  let dbName: string;
  try {
    const parsed = new URL(url);
    dbName = parsed.pathname.replace(/^\//, '');
  } catch {
    throw new Error(`[e2e/db] DATABASE_URL is not a valid URL: ${url}`);
  }
  if (!dbName) {
    throw new Error(
      `[e2e/db] DATABASE_URL has no database name in its path: ${url}`,
    );
  }
  if (!/e2e|test/i.test(dbName)) {
    throw new Error(
      `[e2e/db] Refusing to run E2E against database '${dbName}'. ` +
        `The DB name must contain 'e2e' or 'test'. ` +
        `Set DATABASE_URL to nc_e2e (or similar) in .env.test.`,
    );
  }
  return dbName;
}

/**
 * Push the drizzle schema into the E2E database.
 *
 * We intentionally use `pnpm db:push` (drizzle-kit push) instead of
 * `pnpm db:migrate` because this project authors schema directly under
 * `drizzle/schema` and does not ship a numbered migrations folder checked
 * into git. `db:push` is idempotent: first run creates the schema, later
 * runs are near-instant no-ops.
 */
export function migrate(): void {
  assertE2EDatabase();
  execSync('pnpm db:push --force', {
    stdio: 'inherit',
    env: process.env,
  });
}

/**
 * Truncate all application tables, preserving schema and drizzle migration
 * metadata. Used by per-spec beforeEach hooks AND by global-setup after
 * migrate() to guarantee a clean slate.
 *
 * Uses @neondatabase/serverless via tagged-template form for table discovery
 * (the only form the neon HTTP driver supports for arbitrary SQL). For the
 * TRUNCATE itself, identifiers cannot be parameterised — the neon driver
 * cannot interpolate bare identifiers — so we shell out to `psql` for the
 * TRUNCATE step. `psql` is a reasonable dependency for a local Postgres
 * E2E setup; CI runs it inside the postgres:16 service container.
 *
 * If the host lacks `psql` on PATH, the error will surface here with a
 * clear message pointing at the install step.
 */
export async function reset(): Promise<void> {
  assertE2EDatabase();

  // Discover all user tables in the public schema via neon's tagged-template
  // interface (the supported form). Exclude drizzle's migration tables.
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL!);
  const rows = (await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '\_\_drizzle%' ESCAPE '\'
  `) as Array<{ tablename: string }>;

  if (rows.length === 0) return;

  const tableList = rows
    .map((r) => `"public"."${r.tablename}"`)
    .join(', ');
  const truncateSql = `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`;

  // Shell out to psql for the TRUNCATE. Requires psql on PATH locally and
  // inside the CI postgres service container.
  try {
    execSync(`psql "${process.env.DATABASE_URL}" -c "${truncateSql}"`, {
      stdio: 'inherit',
    });
  } catch (err) {
    throw new Error(
      `[e2e/db] psql TRUNCATE failed. Ensure psql is on PATH and DATABASE_URL is reachable. ` +
        `Original error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
