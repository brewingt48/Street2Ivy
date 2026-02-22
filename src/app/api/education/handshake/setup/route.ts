/**
 * Handshake Integration Setup API
 * POST — Configure Handshake EDU API integration
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/middleware';
import { hasFeature } from '@/lib/tenant/features';
import { sql } from '@/lib/db';
import { encrypt } from '@/lib/handshake';

const setupSchema = z.object({
  apiKey: z.string().min(10),
  syncFrequency: z.enum(['daily', 'weekly', 'manual']).default('weekly'),
  dataPermissions: z.object({
    jobs: z.boolean().default(true),
    applications: z.boolean().default(false),
    students: z.boolean().default(false),
    fairs: z.boolean().default(false),
  }).default({ jobs: true, applications: false, students: false, fairs: false }),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Educational admin access required' }, { status: 403 });
    }

    const tenantId = session.data.tenantId;
    if (tenantId) {
      const allowed = await hasFeature(tenantId, 'handshakeIntegration');
      if (!allowed) {
        return NextResponse.json({ error: 'Handshake integration requires Enterprise plan' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { apiKey, syncFrequency, dataPermissions } = setupSchema.parse(body);

    const encryptedKey = encrypt(apiKey);

    // Upsert integration
    await sql`
      INSERT INTO handshake_integrations (institution_id, api_key_encrypted, sync_frequency, data_permissions, is_active)
      VALUES (${tenantId}, ${encryptedKey}, ${syncFrequency}, ${JSON.stringify(dataPermissions)}::jsonb, true)
      ON CONFLICT (institution_id)
      DO UPDATE SET
        api_key_encrypted = ${encryptedKey},
        sync_frequency = ${syncFrequency},
        data_permissions = ${JSON.stringify(dataPermissions)}::jsonb,
        is_active = true,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true, message: 'Handshake integration configured' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Handshake setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
