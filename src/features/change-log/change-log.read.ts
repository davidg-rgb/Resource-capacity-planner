// v5.0 — Phase 41 / Plan 41-01: change_log feed read helper (UX-V5-10).
//
// Cursor pagination on (created_at DESC, id DESC) — composite cursor avoids
// the "rows with identical timestamp drift" pitfall (RESEARCH Pitfall 5).
// Limit default 50, max 200.
//
// JSONB project/person filters use `(context->>'projectId') IN (...)` with a
// fallback OR over `(new_value->>'projectId')` so allocation/proposal entries
// (which carry the IDs in `new_value` rather than `context`) match too.

import { and, between, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { changeLog } from './change-log.schema';
import type { ChangeLogEntry, FeedFilter, FeedPage, FeedPagination } from './change-log.types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

interface CursorShape {
  createdAt: string;
  id: string;
}

export function encodeCursor(c: CursorShape): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64');
}

export function decodeCursor(raw: string): CursorShape {
  try {
    const json = Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as CursorShape;
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
      throw new Error('invalid cursor shape');
    }
    return parsed;
  } catch {
    throw new Error('invalid cursor');
  }
}

export interface GetFeedArgs {
  orgId: string;
  filter: FeedFilter;
  pagination: FeedPagination;
}

export async function getFeed(args: GetFeedArgs): Promise<FeedPage> {
  const limit = Math.min(args.pagination.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const conds = [eq(changeLog.organizationId, args.orgId)];

  // Composite (createdAt, id) cursor — strict less-than tuple comparison so
  // rows sharing a createdAt are all visited rather than skipped (Pitfall 5).
  if (args.pagination.cursor) {
    const cur = decodeCursor(args.pagination.cursor);
    conds.push(
      sql`(${changeLog.createdAt}, ${changeLog.id}) < (${cur.createdAt}::timestamptz, ${cur.id}::uuid)`,
    );
  }

  if (args.filter.entity?.length) {
    conds.push(inArray(changeLog.entity, args.filter.entity));
  }
  if (args.filter.actions?.length) {
    conds.push(inArray(changeLog.action, args.filter.actions));
  }
  if (args.filter.actorPersonaIds?.length) {
    conds.push(inArray(changeLog.actorPersonaId, args.filter.actorPersonaIds));
  }
  if (args.filter.dateRange) {
    conds.push(
      between(
        changeLog.createdAt,
        new Date(args.filter.dateRange.from),
        new Date(args.filter.dateRange.to),
      ),
    );
  }

  // JSONB best-effort filters (RESEARCH Pitfall 8): match either context or
  // new_value because writers in different services use different homes for
  // the project/person ids. Use ANY() with a text[] cast for parameter safety.
  if (args.filter.projectIds?.length) {
    const list = sql.join(
      args.filter.projectIds.map((id) => sql`${id}`),
      sql`, `,
    );
    conds.push(
      sql`(
        (${changeLog.context}->>'projectId') IN (${list})
        OR (${changeLog.newValue}->>'projectId') IN (${list})
      )`,
    );
  }
  if (args.filter.personIds?.length) {
    const list = sql.join(
      args.filter.personIds.map((id) => sql`${id}`),
      sql`, `,
    );
    conds.push(
      sql`(
        (${changeLog.context}->>'personId') IN (${list})
        OR (${changeLog.newValue}->>'personId') IN (${list})
      )`,
    );
  }

  // Quiet the unused-import warning (or is reserved for future filter merges).
  void or;

  const rows = (await db
    .select()
    .from(changeLog)
    .where(and(...conds))
    .orderBy(desc(changeLog.createdAt), desc(changeLog.id))
    .limit(limit + 1)) as ChangeLogEntry[];

  const hasMore = rows.length > limit;
  const entries = hasMore ? rows.slice(0, limit) : rows;
  const last = entries[entries.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          createdAt:
            last.createdAt instanceof Date
              ? last.createdAt.toISOString()
              : (last.createdAt as unknown as string),
          id: last.id,
        })
      : null;

  // Quiet unused `lt` (kept for callers that may want simpler comparisons).
  void lt;

  return { entries, nextCursor };
}
