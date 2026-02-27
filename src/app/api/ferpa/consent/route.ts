/**
 * GET /api/ferpa/consent — Return current consent status for all types
 * POST /api/ferpa/consent — Record a new consent (grant or revoke)
 *
 * FERPA requires explicit, documented consent before sharing student
 * educational records with third parties.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';
import { z } from 'zod';
import { FERPA_CONSENT_TEXTS } from '@/lib/auth/ferpa-gate';

const consentSchema = z.object({
  consentType: z.enum(['data_sharing', 'ai_processing', 'directory_info', 'annual_notification']),
  isGranted: z.boolean(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'FERPA consent is only applicable to students' }, { status: 403 });
    }

    const consents = await sql`
      SELECT
        consent_type,
        is_granted,
        granted_at,
        revoked_at,
        consent_version,
        created_at,
        updated_at
      FROM ferpa_consents
      WHERE user_id = ${session.data.userId}
      ORDER BY consent_type, created_at DESC
    `;

    // Get the most recent consent for each type
    const consentMap: Record<string, unknown> = {};
    for (const c of consents) {
      const key = c.consent_type as string;
      if (!consentMap[key]) {
        consentMap[key] = {
          consentType: c.consent_type,
          isGranted: c.is_granted,
          grantedAt: c.granted_at,
          revokedAt: c.revoked_at,
          consentVersion: c.consent_version,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        };
      }
    }

    // Include all consent types with defaults for missing ones
    const allTypes = ['data_sharing', 'ai_processing', 'directory_info', 'annual_notification'];
    const result = allTypes.map((type) => consentMap[type] || {
      consentType: type,
      isGranted: false,
      grantedAt: null,
      revokedAt: null,
      consentVersion: '1.0',
      createdAt: null,
      updatedAt: null,
    });

    return NextResponse.json({ consents: result });
  } catch (error) {
    console.error('FERPA consent GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'FERPA consent is only applicable to students' }, { status: 403 });
    }

    if (!session.data.tenantId) {
      return NextResponse.json({ error: 'Tenant context required for FERPA consent' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = consentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { consentType, isGranted } = parsed.data;
    const { ip, userAgent } = extractRequestInfo(request);

    // Get the consent text for the version being consented to
    const consentText = FERPA_CONSENT_TEXTS[consentType];
    const consentVersion = '1.0';

    const now = new Date().toISOString();

    // Upsert the consent record
    const result = await sql`
      INSERT INTO ferpa_consents (
        user_id, tenant_id, consent_type, is_granted,
        granted_at, revoked_at, consent_version, consent_text,
        ip_address, user_agent, updated_at
      )
      VALUES (
        ${session.data.userId},
        ${session.data.tenantId},
        ${consentType},
        ${isGranted},
        ${isGranted ? now : null},
        ${!isGranted ? now : null},
        ${consentVersion},
        ${consentText},
        ${ip}::inet,
        ${userAgent},
        NOW()
      )
      ON CONFLICT (user_id, tenant_id, consent_type, consent_version)
      DO UPDATE SET
        is_granted = ${isGranted},
        granted_at = CASE WHEN ${isGranted} THEN ${now}::timestamptz ELSE ferpa_consents.granted_at END,
        revoked_at = CASE WHEN NOT ${isGranted} THEN ${now}::timestamptz ELSE NULL END,
        ip_address = ${ip}::inet,
        user_agent = ${userAgent},
        updated_at = NOW()
      RETURNING id, consent_type, is_granted, granted_at, revoked_at, consent_version, updated_at
    `;

    // Audit log the consent change
    await auditLog(
      'ADMIN_ACTION' as const,
      {
        userId: session.data.userId,
        ip,
        userAgent,
        resource: 'ferpa_consent',
        resourceId: result[0]?.id,
        details: {
          action: isGranted ? 'ferpa_consent_granted' : 'ferpa_consent_revoked',
          consentType,
          consentVersion,
          tenantId: session.data.tenantId,
        },
      }
    );

    const row = result[0];
    return NextResponse.json({
      consent: {
        id: row.id,
        consentType: row.consent_type,
        isGranted: row.is_granted,
        grantedAt: row.granted_at,
        revokedAt: row.revoked_at,
        consentVersion: row.consent_version,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('FERPA consent POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
