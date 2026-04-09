import { config as loadDotenv } from 'dotenv';
import { assertE2EDatabase, migrate, reset } from './lib/db';

/**
 * Playwright globalSetup hook — runs once per `pnpm test:e2e` invocation,
 * BEFORE Playwright spins up the webServer. We cannot hit /api/test/seed
 * here (server not up yet); instead we:
 *
 *   1. Load .env.test (if present) so DATABASE_URL points at nc_e2e.
 *   2. Assert DATABASE_URL targets an e2e DB (safety guardrail).
 *   3. Run drizzle schema push (idempotent — fast if already applied).
 *   4. Truncate all tables (clean slate).
 *
 * Per-spec seeding happens in each spec's `beforeEach` by POSTing to
 * /api/test/seed (added in Plan 47-04), which runs inside the webServer
 * process with access to its DB connection.
 */
export default async function globalSetup(): Promise<void> {
  // Load .env.test at repo root if it exists. Silent no-op otherwise.
  loadDotenv({ path: '.env.test' });

  if (!process.env.DATABASE_URL) {
    throw new Error(
      '[e2e] DATABASE_URL is not set. Create .env.test at the repo root ' +
        'with DATABASE_URL=postgresql://.../nc_e2e (see e2e/README.md for ' +
        'the full setup).',
    );
  }

  const dbName = assertE2EDatabase();
  console.log(`[e2e] globalSetup: using database '${dbName}'`);

  migrate();
  await reset();

  console.log('[e2e] globalSetup: migrate + reset complete');
}
