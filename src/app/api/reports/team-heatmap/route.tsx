/**
 * GET /api/reports/team-heatmap
 *
 * Generates a PDF export of the Team Overview heat map.
 * Gated by the pdfExport feature flag (returns 404 when disabled).
 *
 * Query params:
 *   from - start month (YYYY-MM, required)
 *   to   - end month (YYYY-MM, required)
 */

import { Readable } from 'node:stream';

import { renderToStream } from '@react-pdf/renderer';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { HeatMapPDF } from '@/components/pdf/heat-map-pdf';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { getTeamHeatMap, validateMonthRange } from '@/features/analytics/analytics.service';
import { getOrgFlags } from '@/features/flags/flag.service';
import { getTenantId } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = await getTenantId();

    // Feature flag gate (PDF-01 / pitfall 5)
    const flags = await getOrgFlags(orgId);
    if (!flags.pdfExport) {
      return NextResponse.json(
        { error: 'Feature not available' },
        { status: 404 },
      );
    }

    // Parse and validate query params (max 36 months)
    const params = request.nextUrl.searchParams;
    const { from, to } = validateMonthRange(params.get('from'), params.get('to'));

    // Fetch org name for PDF header
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    const orgName = org?.name ?? 'Unknown Organization';

    // Fetch heat map data using existing analytics service
    const data = await getTeamHeatMap(orgId, from, to);

    // Render PDF to stream
    const nodeStream = await renderToStream(
      <HeatMapPDF data={data} orgName={orgName} dateRange={{ from, to }} />,
    );

    // Convert Node.js stream to Web ReadableStream for NextResponse (pitfall 1)
    const webStream = Readable.toWeb(
      Readable.from(nodeStream),
    ) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="team-overview-${from}-to-${to}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
