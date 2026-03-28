import { sql } from 'drizzle-orm';

import { db } from '@/db';

export interface SystemHealthMetrics {
  dbLatencyMs: number;
  dbConnected: boolean;
  memoryUsageMb: { rss: number; heapUsed: number; heapTotal: number };
  version: string;
  uptime: number;
  timestamp: string;
}

function roundToOneDecimal(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

export async function getSystemHealth(): Promise<SystemHealthMetrics> {
  let dbLatencyMs = -1;
  let dbConnected = false;

  try {
    const start = performance.now();
    await db.execute(sql`SELECT 1`);
    const end = performance.now();
    dbLatencyMs = Math.round((end - start) * 100) / 100;
    dbConnected = true;
  } catch {
    dbLatencyMs = -1;
    dbConnected = false;
  }

  const mem = process.memoryUsage();

  return {
    dbLatencyMs,
    dbConnected,
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
