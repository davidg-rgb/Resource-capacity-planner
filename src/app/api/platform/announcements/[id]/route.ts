import { NextRequest, NextResponse } from 'next/server';

import {
  deleteAnnouncement,
  updateAnnouncement,
} from '@/features/announcements/announcement.service';
import { updateAnnouncementSchema } from '@/features/announcements/announcement.schema';
import { handleApiError } from '@/lib/api-utils';
import { requirePlatformAdmin } from '@/lib/platform-auth';
import { logPlatformAction } from '@/lib/platform-audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = await params;
    const body = updateAnnouncementSchema.parse(await request.json());
    const announcement = await updateAnnouncement(id, body);
    await logPlatformAction({
      adminId: admin.adminId,
      action: 'announcement_updated',
      details: { announcementId: id },
    });
    return NextResponse.json(announcement);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = await params;
    await deleteAnnouncement(id);
    await logPlatformAction({
      adminId: admin.adminId,
      action: 'announcement_deleted',
      details: { announcementId: id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
