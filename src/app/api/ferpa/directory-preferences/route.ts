/**
 * GET /api/ferpa/directory-preferences — Return current directory info preferences
 * PUT /api/ferpa/directory-preferences — Update directory info preferences
 *
 * Under FERPA, students have the right to restrict which "directory information"
 * fields are visible to third parties. These preferences control what corporate
 * partners can see when viewing student profiles/applications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { auditLog, extractRequestInfo } from '@/lib/security/audit';
import { z } from 'zod';

const preferencesSchema = z.object({
  showFullName: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showMajor: z.boolean().optional(),
  showYear: z.boolean().optional(),
  showSport: z.boolean().optional(),
  showGpa: z.boolean().optional(),
  showUniversity: z.boolean().optional(),
  showBio: z.boolean().optional(),
  showSkills: z.boolean().optional(),
  showPortfolio: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Directory preferences are only applicable to students' }, { status: 403 });
    }

    const prefs = await sql`
      SELECT
        show_full_name, show_email, show_phone, show_major,
        show_year, show_sport, show_gpa, show_university,
        show_bio, show_skills, show_portfolio, updated_at
      FROM directory_info_preferences
      WHERE user_id = ${session.data.userId}
    `;

    if (prefs.length === 0) {
      // Return defaults if no preferences have been set
      return NextResponse.json({
        preferences: {
          showFullName: true,
          showEmail: false,
          showPhone: false,
          showMajor: true,
          showYear: true,
          showSport: true,
          showGpa: false,
          showUniversity: true,
          showBio: true,
          showSkills: true,
          showPortfolio: true,
          updatedAt: null,
        },
      });
    }

    const p = prefs[0];
    return NextResponse.json({
      preferences: {
        showFullName: p.show_full_name,
        showEmail: p.show_email,
        showPhone: p.show_phone,
        showMajor: p.show_major,
        showYear: p.show_year,
        showSport: p.show_sport,
        showGpa: p.show_gpa,
        showUniversity: p.show_university,
        showBio: p.show_bio,
        showSkills: p.show_skills,
        showPortfolio: p.show_portfolio,
        updatedAt: p.updated_at,
      },
    });
  } catch (error) {
    console.error('Directory preferences GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Directory preferences are only applicable to students' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = preferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const { ip, userAgent } = extractRequestInfo(request);

    // Upsert directory preferences
    const result = await sql`
      INSERT INTO directory_info_preferences (
        user_id,
        show_full_name, show_email, show_phone, show_major,
        show_year, show_sport, show_gpa, show_university,
        show_bio, show_skills, show_portfolio,
        updated_at
      )
      VALUES (
        ${session.data.userId},
        ${data.showFullName ?? true},
        ${data.showEmail ?? false},
        ${data.showPhone ?? false},
        ${data.showMajor ?? true},
        ${data.showYear ?? true},
        ${data.showSport ?? true},
        ${data.showGpa ?? false},
        ${data.showUniversity ?? true},
        ${data.showBio ?? true},
        ${data.showSkills ?? true},
        ${data.showPortfolio ?? true},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        show_full_name = COALESCE(${data.showFullName ?? null}, directory_info_preferences.show_full_name),
        show_email = COALESCE(${data.showEmail ?? null}, directory_info_preferences.show_email),
        show_phone = COALESCE(${data.showPhone ?? null}, directory_info_preferences.show_phone),
        show_major = COALESCE(${data.showMajor ?? null}, directory_info_preferences.show_major),
        show_year = COALESCE(${data.showYear ?? null}, directory_info_preferences.show_year),
        show_sport = COALESCE(${data.showSport ?? null}, directory_info_preferences.show_sport),
        show_gpa = COALESCE(${data.showGpa ?? null}, directory_info_preferences.show_gpa),
        show_university = COALESCE(${data.showUniversity ?? null}, directory_info_preferences.show_university),
        show_bio = COALESCE(${data.showBio ?? null}, directory_info_preferences.show_bio),
        show_skills = COALESCE(${data.showSkills ?? null}, directory_info_preferences.show_skills),
        show_portfolio = COALESCE(${data.showPortfolio ?? null}, directory_info_preferences.show_portfolio),
        updated_at = NOW()
      RETURNING
        show_full_name, show_email, show_phone, show_major,
        show_year, show_sport, show_gpa, show_university,
        show_bio, show_skills, show_portfolio, updated_at
    `;

    // Audit log
    await auditLog(
      'ADMIN_ACTION' as const,
      {
        userId: session.data.userId,
        ip,
        userAgent,
        resource: 'directory_info_preferences',
        details: {
          action: 'directory_preferences_updated',
          changes: data,
        },
      }
    );

    const p = result[0];
    return NextResponse.json({
      preferences: {
        showFullName: p.show_full_name,
        showEmail: p.show_email,
        showPhone: p.show_phone,
        showMajor: p.show_major,
        showYear: p.show_year,
        showSport: p.show_sport,
        showGpa: p.show_gpa,
        showUniversity: p.show_university,
        showBio: p.show_bio,
        showSkills: p.show_skills,
        showPortfolio: p.show_portfolio,
        updatedAt: p.updated_at,
      },
    });
  } catch (error) {
    console.error('Directory preferences PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
