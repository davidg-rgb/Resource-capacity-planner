import { NextRequest, NextResponse } from 'next/server';

import {
  createAnnouncement,
  listAnnouncements,
} from '@/features/announcements/announcement.service';
import { createAnnouncementSchema } from '@/features/announcements/announcement.schema';
import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { logPlatformAction } from '@/lib/platform-audit';

export async function GET() {
  try {
    await requirePlatformAdmin();
    const announcements = await listAnnouncements();
    return NextResponse.json(announcements);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePlatformAdmin();
    const body = createAnnouncementSchema.parse(await request.json());
    const announcement = await createAnnouncement(body, admin.adminId);
    await logPlatformAction({
      adminId: admin.adminId,
      action: 'announcement_created',
      details: { announcementId: announcement.id, title: body.title },
    });
    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
