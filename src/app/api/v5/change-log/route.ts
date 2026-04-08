// v5.0 — Phase 41 / Plan 41-01: GET /api/v5/change-log (UX-V5-10, D-16).
//
// Returns { entries, nextCursor } with cursor pagination + filter support.
// Array params accepted as repeated query params or comma-separated CSV.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { changeLogActionEnum, changeLogEntityEnum } from '@/db/schema';
import { getFeed } from '@/features/change-log/change-log.read';
import type {
  ChangeLogAction,
  ChangeLogEntity,
  FeedFilter,
} from '@/features/change-log/change-log.types';
import { handleApiError } from '@/lib/api-utils';
import { requireRole } from '@/lib/auth';

const csv = (s: string | null): string[] | undefined =>
  s
    ? s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    : undefined;

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireRole('planner');
    const sp = new URL(request.url).searchParams;

    const filter: FeedFilter = {};
    const projectIds = csv(sp.get('projectIds'));
    if (projectIds) filter.projectIds = projectIds;
    const personIds = csv(sp.get('personIds'));
    if (personIds) filter.personIds = personIds;

    const entities = csv(sp.get('entity'));
    if (entities) {
      const allowed = changeLogEntityEnum.enumValues as readonly string[];
      filter.entity = entities.filter((e): e is ChangeLogEntity => allowed.includes(e));
    }
    const actions = csv(sp.get('actions'));
    if (actions) {
      const allowed = changeLogActionEnum.enumValues as readonly string[];
      filter.actions = actions.filter((a): a is ChangeLogAction => allowed.includes(a));
    }
    const actorPersonaIds = csv(sp.get('actorPersonaIds'));
    if (actorPersonaIds) filter.actorPersonaIds = actorPersonaIds;

    const from = sp.get('from');
    const to = sp.get('to');
    if (from && to) filter.dateRange = { from, to };

    const limitRaw = sp.get('limit');
    const limit = limitRaw ? z.coerce.number().int().positive().parse(limitRaw) : undefined;
    const cursor = sp.get('cursor');

    const result = await getFeed({
      orgId,
      filter,
      pagination: { limit, cursor: cursor ?? null },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
