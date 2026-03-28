import { NextResponse } from 'next/server';

import { getActiveAnnouncements } from '@/features/announcements/announcement.service';
import { handleApiError } from '@/lib/api-utils';
import { getTenantId } from '@/lib/auth';

export async function GET() {
  try {
    const orgId = await getTenantId();
    const announcements = await getActiveAnnouncements(orgId);
    return NextResponse.json(announcements);
  } catch (error) {
    return handleApiError(error);
  }
}
