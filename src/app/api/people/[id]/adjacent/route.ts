import { NextRequest, NextResponse } from 'next/server';

import { getAdjacentPerson } from '@/features/people/person.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const orgId = await getTenantId();
    const { id } = await params;
    const { searchParams } = request.nextUrl;

    const direction = searchParams.get('direction');
    if (direction !== 'next' && direction !== 'prev') {
      return NextResponse.json(
        { error: 'ERR_VALIDATION', message: 'direction must be "next" or "prev"' },
        { status: 400 },
      );
    }

    const person = await getAdjacentPerson(orgId, id, direction);
    return NextResponse.json({ person });
  } catch (error) {
    return handleApiError(error);
  }
}
