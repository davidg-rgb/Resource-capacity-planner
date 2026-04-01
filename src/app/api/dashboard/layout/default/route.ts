import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { dashboardLayouts } from '@/db/schema';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const widgetPlacementSchema = z.object({
  widgetId: z.string(),
  position: z.number().int().min(0),
  colSpan: z.union([z.literal(4), z.literal(6), z.literal(12)]),
  config: z.record(z.string(), z.unknown()).optional(),
  timeRangeOverride: z.object({ from: z.string(), to: z.string() }).nullable().optional(),
});

const putBodySchema = z.object({
  dashboardId: z.string().min(1),
  deviceClass: z.enum(['desktop', 'mobile']),
  widgets: z.array(widgetPlacementSchema),
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_DEFAULT_USER = '__tenant_default__';

// ---------------------------------------------------------------------------
// PUT  /api/dashboard/layout/default  (admin only)
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const { orgId } = await requireRole('admin');

    const body = putBodySchema.parse(await request.json());

    const [saved] = await db
      .insert(dashboardLayouts)
      .values({
        organizationId: orgId,
        clerkUserId: TENANT_DEFAULT_USER,
        dashboardId: body.dashboardId,
        deviceClass: body.deviceClass,
        layout: body.widgets,
        version: 1,
      })
      .onConflictDoUpdate({
        target: [
          dashboardLayouts.organizationId,
          dashboardLayouts.clerkUserId,
          dashboardLayouts.dashboardId,
          dashboardLayouts.deviceClass,
        ],
        set: {
          layout: body.widgets,
          version: 1,
        },
      })
      .returning();

    return NextResponse.json({ layout: saved });
  } catch (error) {
    return handleApiError(error);
  }
}
