import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  listActiveSessions,
  startImpersonation,
} from '@/features/platform/platform-impersonation.service';
import { handleApiError } from '@/lib/api-utils';
import { logPlatformAction } from '@/lib/platform-audit';
import { requirePlatformAdmin } from '@/lib/platform-auth';

const startSchema = z.object({
  targetUserId: z.string().min(1),
  targetOrgId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const admin = await requirePlatformAdmin();
    const body = startSchema.parse(await request.json());

    const result = await startImpersonation(admin.adminId, body.targetUserId, body.targetOrgId);

    await logPlatformAction({
      adminId: admin.adminId,
      action: 'impersonation.start',
      targetOrgId: body.targetOrgId,
      targetUserId: body.targetUserId,
      impersonationSessionId: result.sessionId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const admin = await requirePlatformAdmin();
    void admin; // auth check only
    const sessions = await listActiveSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    return handleApiError(error);
  }
}
