// v5.0 — Phase 43 / Plan 43-01: PATCH (update / un-archive) + DELETE (archive)
// /api/v5/admin/registers/[entity]/[id]
//
// Mirrors the auth + entity-validation contract from
// /api/v5/admin/registers/[entity]/route.ts.

import { NextRequest, NextResponse } from 'next/server';

import {
  archiveRegisterRow,
  updateRegisterRow,
  type RegisterEntity,
} from '@/features/admin/register.service';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';
import { NotFoundError } from '@/lib/errors';

const REGISTER_ENTITIES: readonly RegisterEntity[] = [
  'person',
  'project',
  'department',
  'discipline',
  'program',
] as const;

function parseEntity(raw: string): RegisterEntity {
  if (!(REGISTER_ENTITIES as readonly string[]).includes(raw)) {
    throw new NotFoundError('RegisterEntity', raw);
  }
  return raw as RegisterEntity;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  try {
    const { orgId, userId } = await requireRole('admin');
    const { entity: rawEntity, id } = await params;
    const entity = parseEntity(rawEntity);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    // PATCH { archivedAt: null } un-archives. Coerce string -> Date for live
    // archive timestamps if a client sends one.
    if (typeof body.archivedAt === 'string') {
      body.archivedAt = new Date(body.archivedAt);
    }
    const row = await updateRegisterRow({
      orgId,
      actorUserId: userId,
      entity,
      id,
      data: body,
    });
    return NextResponse.json({ row }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  try {
    const { orgId, userId } = await requireRole('admin');
    const { entity: rawEntity, id } = await params;
    const entity = parseEntity(rawEntity);
    const row = await archiveRegisterRow({
      orgId,
      actorUserId: userId,
      entity,
      id,
    });
    return NextResponse.json({ row }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
