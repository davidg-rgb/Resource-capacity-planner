// v5.0 — Phase 38 / Plan 38-02 (TC-API-032): POST /api/v5/imports/{sessionId}/commit

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { commitActualsBatch } from '@/features/import/actuals-import.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const commitBodySchema = z.object({
  overrideManualEdits: z.boolean().default(false),
  overrideUnrolledImports: z.boolean().default(false),
  nameOverrides: z
    .object({
      persons: z.record(z.string(), z.string()).optional(),
      projects: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { orgId, userId } = await requireRole('planner');
    const { sessionId } = await params;
    const raw = (await request.json().catch(() => ({}))) as unknown;
    const body = commitBodySchema.parse(raw);

    const result = await commitActualsBatch({
      orgId,
      sessionId,
      overrideManualEdits: body.overrideManualEdits,
      overrideUnrolledImports: body.overrideUnrolledImports,
      nameOverrides: body.nameOverrides,
      actorPersonaId: userId,
      committedBy: userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
