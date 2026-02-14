/**
 * POST /api/admin/migrate — Run pending database migrations
 *
 * Adds missing columns and seeds missing data.
 * Safe to run multiple times (idempotent).
 * Admin-only endpoint.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

interface MigrationResult {
  name: string;
  status: 'applied' | 'skipped' | 'error';
  message?: string;
}

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results: MigrationResult[] = [];

    // Migration 1: Add is_active column to users table
    try {
      const colCheck = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_active'
      `;
      if (colCheck.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE`;
        results.push({ name: 'add_users_is_active', status: 'applied' });
      } else {
        results.push({ name: 'add_users_is_active', status: 'skipped', message: 'Column already exists' });
      }
    } catch (err) {
      results.push({ name: 'add_users_is_active', status: 'error', message: err instanceof Error ? err.message : 'Unknown' });
    }

    // Migration 2: Seed platform_settings in landing_content if missing
    try {
      const settingsCheck = await sql`
        SELECT section FROM landing_content WHERE section = 'platform_settings'
      `;
      if (settingsCheck.length === 0) {
        await sql`
          INSERT INTO landing_content (section, content)
          VALUES ('platform_settings', '{"bookDemoUrl": "https://calendly.com", "logoUrl": "", "hiddenSections": [], "aiCoachingEnabled": false, "heroCopy": {}, "problemCopy": {}, "ctaCopy": {}}'::jsonb)
          ON CONFLICT (section) DO NOTHING
        `;
        results.push({ name: 'seed_platform_settings', status: 'applied' });
      } else {
        results.push({ name: 'seed_platform_settings', status: 'skipped', message: 'Row already exists' });
      }
    } catch (err) {
      results.push({ name: 'seed_platform_settings', status: 'error', message: err instanceof Error ? err.message : 'Unknown' });
    }

    // Migration 3: Seed support_settings in landing_content if missing
    try {
      const supportCheck = await sql`
        SELECT section FROM landing_content WHERE section = 'support_settings'
      `;
      if (supportCheck.length === 0) {
        await sql`
          INSERT INTO landing_content (section, content)
          VALUES ('support_settings', '{"contactEmail": "support@campus2career.com", "supportHours": "Mon-Fri 9am-5pm ET"}'::jsonb)
          ON CONFLICT (section) DO NOTHING
        `;
        results.push({ name: 'seed_support_settings', status: 'applied' });
      } else {
        results.push({ name: 'seed_support_settings', status: 'skipped', message: 'Row already exists' });
      }
    } catch (err) {
      results.push({ name: 'seed_support_settings', status: 'error', message: err instanceof Error ? err.message : 'Unknown' });
    }

    // Migration 4: Ensure pgcrypto extension exists (needed for crypt/gen_salt)
    try {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      results.push({ name: 'ensure_pgcrypto', status: 'applied' });
    } catch (err) {
      results.push({ name: 'ensure_pgcrypto', status: 'error', message: err instanceof Error ? err.message : 'Unknown' });
    }

    const applied = results.filter((r) => r.status === 'applied').length;
    const errors = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      message: `Migrations complete: ${applied} applied, ${errors} errors`,
      results,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}
