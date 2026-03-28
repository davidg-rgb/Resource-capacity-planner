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
import { getTeamHeatMap } from '@/features/analytics/analytics.service';
import { getOrgFlags } from '@/features/flags/flag.service';
import { getTenantId } from '@/lib/auth';

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

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

    // Parse and validate query params
    const params = request.nextUrl.searchParams;
    const from = params.get('from');
    const to = params.get('to');

    if (!from || !to || !MONTH_PATTERN.test(from) || !MONTH_PATTERN.test(to)) {
      return NextResponse.json(
        { error: 'Missing or invalid from/to params (expected YYYY-MM)' },
        { status: 400 },
      );
    }

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
    console.error('[PDF Export] Failed to generate team heatmap PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 },
    );
  }
}
