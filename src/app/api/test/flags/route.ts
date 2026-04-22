// TEST-ONLY ROUTE — Phase 53 REVIEW-FIX WR-01.
//
// Flips a feature-flag row for the E2E test tenant so Playwright specs can
// exercise flag-off parity (Phase 52 Invariant #2 + Phase 53 POLISH-FLAG).
//
// Protocol (matches e2e/helpers/flag-toggle.ts):
//   POST /api/test/flags  { flagName: FlagName, enabled: boolean }
//   → 204 No Content on success.
//
// Gated identically to /api/test/seed/route.ts:
//   1. HANDLER-ENTRY throw if NODE_ENV === 'production' AND E2E_TEST !== '1'.
//      Module stays importable by `next build` but is unreachable at runtime
//      in prod. Throw string matches no-test-routes-in-prod invariant.
//   2. Runtime 404 if E2E_SEED_ENABLED !== '1' — defense in depth. We reuse
//      the same env flag as /api/test/seed rather than introducing a new
//      gate; enabling E2E requires exactly one switch.
//   3. src/proxy.ts route matcher still applies (Clerk-protected outside
//      NODE_ENV=test / E2E_TEST=1).
//
// The row is upserted against `feature_flags_org_flag_uniq` so repeat calls
// with different `enabled` values flip the value without FK churn. The
// platform-admin FK target matches the deterministic ID seeded by
// /api/test/seed (E2E_PLATFORM_ADMIN_ID), so the route requires the seed to
// have run first — Playwright's globalSetup already does this.

import { NextRequest, NextResponse } from 'next/server';
import { v5 as uuidv5 } from 'uuid';
import { z } from 'zod';

import { db } from '@/db';
import { featureFlags } from '@/db/schema';
import { FLAG_NAMES } from '@/features/flags/flag.types';
import { FIXTURE_NS } from '../../../../../tests/fixtures/namespace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Deterministic IDs — MUST match /api/test/seed/route.ts. If either ID
// derivation changes there, update both in lockstep.
const E2E_ORG_ID = uuidv5('seed:e2e:organization', FIXTURE_NS);
const E2E_PLATFORM_ADMIN_ID = uuidv5('seed:e2e:platform_admin', FIXTURE_NS);

const toggleSchema = z.object({
  flagName: z.enum(FLAG_NAMES),
  enabled: z.boolean(),
});

export async function POST(request: NextRequest): Promise<Response> {
  // Gate 1: hard production block. Throw string is asserted by the
  // no-test-routes-in-prod static invariant (see WR-01 notes there).
  if (process.env.NODE_ENV === 'production' && process.env.E2E_TEST !== '1') {
    throw new Error(
      '[api/test/flags] test-only route imported in production build',
    );
  }
  // Gate 2: runtime opt-in. Reuses the seed route's env flag.
  if (process.env.E2E_SEED_ENABLED !== '1') {
    return new NextResponse(null, { status: 404 });
  }

  let body: z.infer<typeof toggleSchema>;
  try {
    body = toggleSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', detail: (err as Error).message },
      { status: 400 },
    );
  }

  await db
    .insert(featureFlags)
    .values({
      organizationId: E2E_ORG_ID,
      flagName: body.flagName,
      enabled: body.enabled,
      setByAdminId: E2E_PLATFORM_ADMIN_ID,
    })
    .onConflictDoUpdate({
      target: [featureFlags.organizationId, featureFlags.flagName],
      set: {
        enabled: body.enabled,
        setByAdminId: E2E_PLATFORM_ADMIN_ID,
        updatedAt: new Date(),
      },
    });

  return new NextResponse(null, { status: 204 });
}
