import { headers } from 'next/headers';

import { db } from '@/db';
import { platformAuditLog } from '@/db/schema';

export interface AuditEntry {
  adminId: string;
  action: string;
  targetOrgId?: string;
  targetUserId?: string;
  impersonationSessionId?: string;
  details?: Record<string, unknown>;
}

export async function logPlatformAction(entry: AuditEntry): Promise<void> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  const ipAddress = forwarded
    ? forwarded.split(',')[0].trim()
    : (headerStore.get('x-real-ip') ?? 'unknown');
  const userAgent = headerStore.get('user-agent') ?? undefined;

  await db.insert(platformAuditLog).values({
    adminId: entry.adminId,
    action: entry.action,
    targetOrgId: entry.targetOrgId,
    targetUserId: entry.targetUserId,
    impersonationSessionId: entry.impersonationSessionId,
    details: entry.details,
    ipAddress,
    userAgent,
  });
}
