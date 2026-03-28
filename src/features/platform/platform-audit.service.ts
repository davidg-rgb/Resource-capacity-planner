import { and, count, desc, eq, gte, lte, SQL } from 'drizzle-orm';

import { db } from '@/db';
import { platformAdmins, platformAuditLog } from '@/db/schema';

export interface AuditQueryParams {
  adminId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export async function queryAuditLog(params: AuditQueryParams) {
  const { adminId, action, startDate, endDate, page = 1, pageSize = 50 } = params;

  const conditions: SQL[] = [];

  if (adminId) {
    conditions.push(eq(platformAuditLog.adminId, adminId));
  }
  if (action) {
    conditions.push(eq(platformAuditLog.action, action));
  }
  if (startDate) {
    conditions.push(gte(platformAuditLog.createdAt, new Date(startDate)));
  }
  if (endDate) {
    conditions.push(lte(platformAuditLog.createdAt, new Date(endDate)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [entries, totalResult] = await Promise.all([
    db
      .select({
        id: platformAuditLog.id,
        adminName: platformAdmins.name,
        adminEmail: platformAdmins.email,
        action: platformAuditLog.action,
        targetOrgId: platformAuditLog.targetOrgId,
        targetUserId: platformAuditLog.targetUserId,
        details: platformAuditLog.details,
        ipAddress: platformAuditLog.ipAddress,
        createdAt: platformAuditLog.createdAt,
      })
      .from(platformAuditLog)
      .innerJoin(platformAdmins, eq(platformAuditLog.adminId, platformAdmins.id))
      .where(whereClause)
      .orderBy(desc(platformAuditLog.createdAt))
      .offset((page - 1) * pageSize)
      .limit(pageSize),
    db.select({ total: count() }).from(platformAuditLog).where(whereClause),
  ]);

  return {
    entries,
    total: totalResult[0].total,
    page,
    pageSize,
  };
}
