import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { dashboardLayouts } from '@/db/schema';
import { getDefaultLayout } from '@/features/dashboard/default-layouts';
import { getWidget } from '@/features/dashboard/widget-registry';
import type {
  DashboardLayoutData,
  WidgetPlacement,
} from '@/features/dashboard/widget-registry.types';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

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
// Helpers
// ---------------------------------------------------------------------------

const TENANT_DEFAULT_USER = '__tenant_default__';

/** Filter out widgets that no longer exist in the registry. */
function filterValidWidgets(widgets: WidgetPlacement[]): WidgetPlacement[] {
  return widgets.filter((w) => getWidget(w.widgetId) !== undefined);
}

// ---------------------------------------------------------------------------
// GET  /api/dashboard/layout
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const dashboardId = params.get('dashboardId') ?? 'manager';
    const deviceClass = z.enum(['desktop', 'mobile']).parse(params.get('deviceClass') ?? 'desktop');

    // Tier 1: personal layout (exact user + device)
    const [personal] = await db
      .select()
      .from(dashboardLayouts)
      .where(
        and(
          eq(dashboardLayouts.organizationId, orgId),
          eq(dashboardLayouts.clerkUserId, userId),
          eq(dashboardLayouts.dashboardId, dashboardId),
          eq(dashboardLayouts.deviceClass, deviceClass),
        ),
      )
      .limit(1);

    if (personal) {
      const widgets = filterValidWidgets(personal.layout as WidgetPlacement[]);
      const data: DashboardLayoutData = {
        dashboardId,
        deviceClass,
        widgets,
        version: personal.version,
      };
      return NextResponse.json({ source: 'personal', layout: data });
    }

    // Tier 2: cloned from other device class (same user, opposite device)
    const oppositeDevice = deviceClass === 'desktop' ? 'mobile' : 'desktop';
    const [cloned] = await db
      .select()
      .from(dashboardLayouts)
      .where(
        and(
          eq(dashboardLayouts.organizationId, orgId),
          eq(dashboardLayouts.clerkUserId, userId),
          eq(dashboardLayouts.dashboardId, dashboardId),
          eq(dashboardLayouts.deviceClass, oppositeDevice),
        ),
      )
      .limit(1);

    if (cloned) {
      const widgets = filterValidWidgets(cloned.layout as WidgetPlacement[]);
      const data: DashboardLayoutData = {
        dashboardId,
        deviceClass,
        widgets,
        version: cloned.version,
      };
      return NextResponse.json({ source: 'cloned', layout: data });
    }

    // Tier 3: tenant default
    const [tenantDefault] = await db
      .select()
      .from(dashboardLayouts)
      .where(
        and(
          eq(dashboardLayouts.organizationId, orgId),
          eq(dashboardLayouts.clerkUserId, TENANT_DEFAULT_USER),
          eq(dashboardLayouts.dashboardId, dashboardId),
          eq(dashboardLayouts.deviceClass, deviceClass),
        ),
      )
      .limit(1);

    if (tenantDefault) {
      const widgets = filterValidWidgets(tenantDefault.layout as WidgetPlacement[]);
      const data: DashboardLayoutData = {
        dashboardId,
        deviceClass,
        widgets,
        version: tenantDefault.version,
      };
      return NextResponse.json({ source: 'tenant-default', layout: data });
    }

    // Tier 4: built-in persona default
    const builtInWidgets = filterValidWidgets(getDefaultLayout(dashboardId, deviceClass));
    const data: DashboardLayoutData = {
      dashboardId,
      deviceClass,
      widgets: builtInWidgets,
      version: 1,
    };
    return NextResponse.json({ source: 'built-in', layout: data });
  } catch (error) {
    return handleApiError(error);
  }
}

// ---------------------------------------------------------------------------
// PUT  /api/dashboard/layout
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const orgId = await getTenantId();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = putBodySchema.parse(await request.json());

    const [saved] = await db
      .insert(dashboardLayouts)
      .values({
        organizationId: orgId,
        clerkUserId: userId,
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
