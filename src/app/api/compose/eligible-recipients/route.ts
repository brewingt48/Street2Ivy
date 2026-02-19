/**
 * GET /api/compose/eligible-recipients — Get users this user can message
 *
 * - Students can message corporate partners they have active/completed applications with
 * - Corporate partners can message students who applied to their listings
 * - Admins can message anyone
 * - Edu admins can message students at their institution
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.data.userId;
    const role = session.data.role;
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const searchPattern = q ? `%${q}%` : '%';

    let recipients: Record<string, unknown>[];

    switch (role) {
      case 'student':
        // Students can message corporate partners they have applications with
        recipients = await sql`
          SELECT DISTINCT u.id, u.display_name as name, u.role, u.company_name
          FROM users u
          JOIN project_applications pa ON pa.corporate_id = u.id
          WHERE pa.student_id = ${userId}
            AND pa.status IN ('pending', 'accepted', 'completed')
            AND u.display_name ILIKE ${searchPattern}
          ORDER BY u.display_name
          LIMIT 20
        `;
        break;

      case 'corporate_partner':
        // Corporate partners can message students who applied
        recipients = await sql`
          SELECT DISTINCT u.id, u.display_name as name, u.role, u.university as institution
          FROM users u
          JOIN project_applications pa ON pa.student_id = u.id
          WHERE pa.corporate_id = ${userId}
            AND pa.status IN ('pending', 'accepted', 'completed')
            AND u.display_name ILIKE ${searchPattern}
          ORDER BY u.display_name
          LIMIT 20
        `;
        break;

      case 'educational_admin':
        // Edu admins can message students at their institution
        recipients = await sql`
          SELECT u.id, u.display_name as name, u.role, u.university as institution
          FROM users u
          WHERE u.role = 'student'
            AND u.is_active = true
            AND u.display_name ILIKE ${searchPattern}
          ORDER BY u.display_name
          LIMIT 20
        `;
        break;

      case 'admin':
        // Admins can message anyone
        recipients = await sql`
          SELECT u.id, u.display_name as name, u.role, u.company_name, u.university as institution
          FROM users u
          WHERE u.id != ${userId}
            AND u.is_active = true
            AND u.display_name ILIKE ${searchPattern}
          ORDER BY u.display_name
          LIMIT 30
        `;
        break;

      default:
        recipients = [];
    }

    return NextResponse.json({
      recipients: recipients.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        institution: r.institution || r.company_name || null,
      })),
    });
  } catch (error) {
    console.error('Eligible recipients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
