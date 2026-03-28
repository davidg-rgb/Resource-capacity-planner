import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { featureFlags } from '@/db/schema';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { handleApiError } from '@/lib/api-utils';
import { FLAG_NAMES } from '@/features/flags/flag.types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { orgId } = await params;
    const rows = await db
      .select({ flagName: featureFlags.flagName, enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.organizationId, orgId));
    return NextResponse.json(rows);
  } catch (error) {
    return handleApiError(error);
  }
}

const toggleSchema = z.object({
  flagName: z.enum(FLAG_NAMES),
  enabled: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { orgId } = await params;
    const body = toggleSchema.parse(await request.json());

    await db
      .insert(featureFlags)
      .values({
        organizationId: orgId,
        flagName: body.flagName,
        enabled: body.enabled,
        setByAdminId: admin.adminId,
      })
      .onConflictDoUpdate({
        target: [featureFlags.organizationId, featureFlags.flagName],
        set: {
          enabled: body.enabled,
          setByAdminId: admin.adminId,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
