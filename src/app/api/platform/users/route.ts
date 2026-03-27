import { NextRequest, NextResponse } from 'next/server';

import { searchUsers } from '@/features/platform/platform-user.service';
import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();
    void admin; // auth check only

    const query = request.nextUrl.searchParams.get('query') ?? '';
    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? '20'), 100);

    const users = await searchUsers(query, limit);
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}
