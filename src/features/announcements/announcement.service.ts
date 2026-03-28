import { and, arrayContains, desc, eq, isNull, lte, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { systemAnnouncements } from '@/db/schema';
import { NotFoundError } from '@/lib/errors';

import type { Announcement } from './announcement.types';

// Severity ordering: critical first, then warning, then info
const SEVERITY_ORDER = sql`CASE ${systemAnnouncements.severity}
  WHEN 'critical' THEN 0
  WHEN 'warning' THEN 1
  WHEN 'info' THEN 2
  ELSE 3
END`;

function toAnnouncement(row: typeof systemAnnouncements.$inferSelect): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    severity: row.severity,
    targetOrgIds: row.targetOrgIds,
    startsAt: row.startsAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Get active announcements filtered by date and optionally by target org.
 * Server-side date filtering ensures expired/future announcements are never returned.
 */
export async function getActiveAnnouncements(orgId?: string): Promise<Announcement[]> {
  const now = new Date();

  const conditions = [
    lte(systemAnnouncements.startsAt, now),
    or(isNull(systemAnnouncements.expiresAt), sql`${systemAnnouncements.expiresAt} > ${now}`),
  ];

  if (orgId) {
    // Show announcements that target all orgs (null) OR specifically include this org
    conditions.push(
      or(
        isNull(systemAnnouncements.targetOrgIds),
        arrayContains(systemAnnouncements.targetOrgIds, [orgId]),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(systemAnnouncements)
    .where(and(...conditions))
    .orderBy(SEVERITY_ORDER);

  return rows.map(toAnnouncement);
}

/**
 * List all announcements for platform admin management, ordered by creation date descending.
 */
export async function listAnnouncements(): Promise<Announcement[]> {
  const rows = await db
    .select()
    .from(systemAnnouncements)
    .orderBy(desc(systemAnnouncements.createdAt));

  return rows.map(toAnnouncement);
}

/**
 * Create a new announcement.
 */
export async function createAnnouncement(
  data: {
    title: string;
    body: string;
    severity: 'info' | 'warning' | 'critical';
    targetOrgIds?: string[];
    startsAt: string;
    expiresAt?: string | null;
  },
  adminId: string,
): Promise<Announcement> {
  const [row] = await db
    .insert(systemAnnouncements)
    .values({
      title: data.title,
      body: data.body,
      severity: data.severity,
      targetOrgIds: data.targetOrgIds ?? null,
      createdByAdminId: adminId,
      startsAt: new Date(data.startsAt),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    })
    .returning();

  return toAnnouncement(row);
}

/**
 * Update an existing announcement (partial update).
 */
export async function updateAnnouncement(
  id: string,
  data: {
    title?: string;
    body?: string;
    severity?: 'info' | 'warning' | 'critical';
    targetOrgIds?: string[];
    startsAt?: string;
    expiresAt?: string | null;
  },
): Promise<Announcement> {
  const values: Record<string, unknown> = {};
  if (data.title !== undefined) values.title = data.title;
  if (data.body !== undefined) values.body = data.body;
  if (data.severity !== undefined) values.severity = data.severity;
  if (data.targetOrgIds !== undefined) values.targetOrgIds = data.targetOrgIds;
  if (data.startsAt !== undefined) values.startsAt = new Date(data.startsAt);
  if (data.expiresAt !== undefined)
    values.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

  const [row] = await db
    .update(systemAnnouncements)
    .set(values)
    .where(eq(systemAnnouncements.id, id))
    .returning();

  if (!row) throw new NotFoundError('Announcement', id);
  return toAnnouncement(row);
}

/**
 * Delete an announcement by ID.
 */
export async function deleteAnnouncement(id: string): Promise<void> {
  const result = await db
    .delete(systemAnnouncements)
    .where(eq(systemAnnouncements.id, id))
    .returning({ id: systemAnnouncements.id });

  if (result.length === 0) throw new NotFoundError('Announcement', id);
}
