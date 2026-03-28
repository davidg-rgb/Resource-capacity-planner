import { sql } from 'drizzle-orm';

import { db } from '@/db';

export interface SystemHealthMetrics {
  dbLatencyMs: number;
  dbConnected: boolean;
  activeConnections: number;
  recentErrors: number;
  memoryUsageMb: { rss: number; heapUsed: number; heapTotal: number };
  version: string;
  uptime: number;
  timestamp: string;
}

// Rolling error counter — resets on successful health check
let consecutiveErrors = 0;

function roundToOneDecimal(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

export async function getSystemHealth(): Promise<SystemHealthMetrics> {
  let dbLatencyMs = -1;
  let dbConnected = false;
  let activeConnections = 0;

  try {
    const start = performance.now();
    await db.execute(sql`SELECT 1`);
    const end = performance.now();
    dbLatencyMs = Math.round((end - start) * 100) / 100;
    dbConnected = true;
    consecutiveErrors = 0;

    // Query active connection count from pg_stat_activity
    const connResult = await db.execute(
      sql`SELECT count(*)::int AS active FROM pg_stat_activity WHERE state = 'active'`
    );
    activeConnections = (connResult.rows[0] as { active: number })?.active ?? 0;
  } catch {
    dbLatencyMs = -1;
    dbConnected = false;
    consecutiveErrors++;
  }

  const mem = process.memoryUsage();

  return {
    dbLatencyMs,
    dbConnected,
    activeConnections,
    recentErrors: consecutiveErrors,
    memoryUsageMb: {
      rss: roundToOneDecimal(mem.rss),
      heapUsed: roundToOneDecimal(mem.heapUsed),
      heapTotal: roundToOneDecimal(mem.heapTotal),
    },
    version: process.env.npm_package_version ?? 'unknown',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
