/**
 * GET  /api/profile/privacy — Get current user's privacy preferences
 * PATCH /api/profile/privacy — Update privacy preferences
 *
 * Privacy preferences are stored in users.private_data JSONB column.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

interface PrivacyPreferences {
  aiTrainingOptOut: boolean;   // Do not use my data to train AI models
  aiCoachingEnabled: boolean;  // Allow AI coaching features
}

const DEFAULT_PREFERENCES: PrivacyPreferences = {
  aiTrainingOptOut: false,
  aiCoachingEnabled: true,
};

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const rows = await sql`
      SELECT private_data FROM users WHERE id = ${session.data.userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const privateData = (rows[0].private_data || {}) as any;
    const preferences: PrivacyPreferences = {
      aiTrainingOptOut: privateData.aiTrainingOptOut ?? DEFAULT_PREFERENCES.aiTrainingOptOut,
      aiCoachingEnabled: privateData.aiCoachingEnabled ?? DEFAULT_PREFERENCES.aiCoachingEnabled,
    };

    return NextResponse.json({ preferences });
  } catch (err) {
    console.error('Privacy preferences GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { aiTrainingOptOut, aiCoachingEnabled } = body;

    // Get existing private_data
    const rows = await sql`
      SELECT private_data FROM users WHERE id = ${session.data.userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingData = (rows[0].private_data || {}) as any;

    // Merge privacy preferences
    const updatedData = {
      ...existingData,
      ...(typeof aiTrainingOptOut === 'boolean' ? { aiTrainingOptOut } : {}),
      ...(typeof aiCoachingEnabled === 'boolean' ? { aiCoachingEnabled } : {}),
    };

    await sql`
      UPDATE users
      SET private_data = ${JSON.stringify(updatedData)}::jsonb,
          updated_at = NOW()
      WHERE id = ${session.data.userId}
    `;

    const preferences: PrivacyPreferences = {
      aiTrainingOptOut: updatedData.aiTrainingOptOut ?? DEFAULT_PREFERENCES.aiTrainingOptOut,
      aiCoachingEnabled: updatedData.aiCoachingEnabled ?? DEFAULT_PREFERENCES.aiCoachingEnabled,
    };

    return NextResponse.json({ preferences, message: 'Privacy preferences updated' });
  } catch (err) {
    console.error('Privacy preferences PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
