import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json(
      { status: 'ok', db: 'connected', timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        db: 'disconnected',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 },
    );
  }
}
