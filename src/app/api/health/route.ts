/**
 * GET /api/health
 *
 * Health check endpoint for monitoring and load balancers.
 * Returns minimal info — no database names, environment, or error details.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection (don't expose any database metadata)
    await sql`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: { connected: true },
    });
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: { connected: false },
      },
      { status: 500 }
    );
  }
}
