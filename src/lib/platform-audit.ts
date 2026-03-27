import { db } from '@/db';
import { platformAuditLog } from '@/db/schema';

import { getRequestMeta } from './platform-auth';

export interface AuditEntry {
  adminId: string;
  action: string;
  targetOrgId?: string;
  targetUserId?: string;
  impersonationSessionId?: string;
  details?: Record<string, unknown>;
}

/**
 * Log a platform admin action to the audit log.
 * Automatically captures IP address and user agent from request headers.
 */
export async function logPlatformAction(entry: AuditEntry): Promise<void> {
  const { ipAddress, userAgent } = await getRequestMeta();

  await db.insert(platformAuditLog).values({
    adminId: entry.adminId,
    action: entry.action,
    targetOrgId: entry.targetOrgId ?? null,
    targetUserId: entry.targetUserId ?? null,
    impersonationSessionId: entry.impersonationSessionId ?? null,
    details: entry.details ?? null,
    ipAddress,
    userAgent,
  });
}
