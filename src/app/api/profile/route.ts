/**
 * GET /api/profile — Get current user's full profile
 * PATCH /api/profile — Update current user's profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  bio: z.string().max(2000).optional(),
  phone: z.string().max(20).optional(),
  university: z.string().max(200).optional(),
  major: z.string().max(200).optional(),
  graduationYear: z.number().int().min(2000).max(2040).optional(),
  gpa: z.string().max(10).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const users = await sql`
      SELECT id, email, role, first_name, last_name, display_name,
             bio, phone, university, major, graduation_year, gpa,
             avatar_url, email_verified, institution_domain,
             tenant_id, public_data, created_at
      FROM users
      WHERE id = ${session.data.userId}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Get user skills
    const skills = await sql`
      SELECT s.id, s.name, s.category
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${session.data.userId}
      ORDER BY s.name
    `;

    // Get institution info if linked
    let institution = null;
    if (user.institution_domain) {
      const insts = await sql`
        SELECT domain, name, membership_status, ai_coaching_enabled, ai_coaching_url
        FROM institutions
        WHERE domain = ${user.institution_domain}
      `;
      if (insts.length > 0) institution = insts[0];
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        displayName: user.display_name,
        bio: user.bio,
        phone: user.phone,
        university: user.university,
        major: user.major,
        graduationYear: user.graduation_year,
        gpa: user.gpa,
        avatarUrl: user.avatar_url,
        emailVerified: user.email_verified,
        institutionDomain: user.institution_domain,
        createdAt: user.created_at,
      },
      skills,
      institution,
    });
  } catch (error) {
    console.error('Profile get error:', error);
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
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updates: string[] = [];
    const values: Record<string, unknown> = {};

    // Build dynamic update - display_name is GENERATED ALWAYS, never include
    if (data.firstName !== undefined) { updates.push('first_name'); values.first_name = data.firstName; }
    if (data.lastName !== undefined) { updates.push('last_name'); values.last_name = data.lastName; }
    if (data.bio !== undefined) { updates.push('bio'); values.bio = data.bio; }
    if (data.phone !== undefined) { updates.push('phone'); values.phone = data.phone; }
    if (data.university !== undefined) { updates.push('university'); values.university = data.university; }
    if (data.major !== undefined) { updates.push('major'); values.major = data.major; }
    if (data.graduationYear !== undefined) { updates.push('graduation_year'); values.graduation_year = data.graduationYear; }
    if (data.gpa !== undefined) { updates.push('gpa'); values.gpa = data.gpa; }
    if (data.avatarUrl !== undefined) { updates.push('avatar_url'); values.avatar_url = data.avatarUrl; }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Use raw SQL for dynamic column updates
    const setClauses = updates.map((col) => `${col} = $${col}`);

    await sql`
      UPDATE users
      SET ${sql(values, ...updates)}, updated_at = NOW()
      WHERE id = ${session.data.userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
