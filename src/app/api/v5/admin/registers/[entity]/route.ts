// v5.0 — Phase 43 / Plan 43-01: GET (list) + POST (create)
// /api/v5/admin/registers/[entity]
//
// Auth: requireRole('admin') — covers Clerk org:admin AND org:owner
// (RESEARCH §4 / A-04). Persona is a UX concept (ADR-004), not enforced
// at the API layer; the v5 admin pages add a <PersonaGate allowed=['admin']>
// wrapper on top in Plan 43-02.

import { NextRequest, NextResponse } from 'next/server';

import {
  createRegisterRow,
  listRegisterRows,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  try {
    const { orgId } = await requireRole('admin');
    const { entity: rawEntity } = await params;
    const entity = parseEntity(rawEntity);
    const includeArchived = new URL(request.url).searchParams.get('includeArchived') === 'true';
    const rows = await listRegisterRows({ orgId, entity, includeArchived });
    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  try {
    const { orgId, userId } = await requireRole('admin');
    const { entity: rawEntity } = await params;
    const entity = parseEntity(rawEntity);
    const body = (await request.json().catch(() => ({}))) as unknown;
    const row = await createRegisterRow({
      orgId,
      actorUserId: userId,
      entity,
      data: body,
    });
    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
