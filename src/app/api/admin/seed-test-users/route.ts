/**
 * POST /api/admin/seed-test-users
 *
 * Creates one test profile for each user type:
 * - Student
 * - Corporate Partner
 * - Edu Admin
 * - Platform Admin
 *
 * All passwords: TestUser1!
 * Admin-only endpoint.
 */

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

const TEST_PASSWORD = 'TestUser1!';

const TEST_USERS = [
  {
    email: 'student.test@proveground.com',
    firstName: 'Jordan',
    lastName: 'Rivera',
    role: 'student',
    bio: 'Computer Science major at Howard University. Passionate about AI/ML and full-stack development. Looking for hands-on project experience with innovative companies.',
    metadata: {
      university: 'Howard University',
      major: 'Computer Science',
      graduationYear: '2026',
      gpa: '3.7',
      alumniOf: 'Howard University',
      sportsPlayed: 'Track & Field',
      linkedinUrl: 'https://linkedin.com/in/jordan-rivera',
      timezone: 'America/New_York',
      hoursPerWeek: 20,
      openToWork: true,
    },
  },
  {
    email: 'corporate.test@proveground.com',
    firstName: 'Morgan',
    lastName: 'Chen',
    role: 'corporate_partner',
    bio: 'Head of Talent Acquisition at TechForward Inc. We partner with universities to find exceptional early-career talent for real-world projects.',
    metadata: {
      company: 'TechForward Inc.',
      title: 'Head of Talent Acquisition',
      alumniOf: 'Stanford University',
      sportsPlayed: 'Soccer',
      linkedinUrl: 'https://linkedin.com/in/morgan-chen',
      companySize: '500-1000',
      industry: 'Technology',
    },
  },
  {
    email: 'eduadmin.test@proveground.com',
    firstName: 'Taylor',
    lastName: 'Washington',
    role: 'educational_admin',
    bio: 'Director of Career Services at Howard University. Dedicated to bridging the gap between academic excellence and career readiness.',
    metadata: {
      institution: 'Howard University',
      title: 'Director of Career Services',
      department: 'Student Success & Career Development',
    },
  },
  {
    email: 'admin.test@proveground.com',
    firstName: 'Alex',
    lastName: 'Thompson',
    role: 'admin',
    bio: 'Platform administrator for Proveground. Managing tenants, users, and system-wide configurations.',
    metadata: {
      department: 'Platform Operations',
      title: 'Platform Administrator',
    },
  },
];

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Ensure required columns exist before seeding
    try {
      const colCheck = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_active'
      `;
      if (colCheck.length === 0) {
        await sql`ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE`;
      }
    } catch {
      // Column might already exist, continue
    }

    // Ensure pgcrypto extension exists
    try {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    } catch {
      // Extension might already exist
    }

    const tenantId = session.data.tenantId || process.env.TENANT_ID || null;
    const created: Array<{ email: string; role: string; status: string }> = [];
    const skipped: Array<{ email: string; reason: string }> = [];

    for (const user of TEST_USERS) {
      // Check if user already exists — if so, reset their password
      const existing = await sql`SELECT id FROM users WHERE email = ${user.email}`;
      if (existing.length > 0) {
        // Reset password for existing test user
        const [{ hash: resetHash }] = await sql`SELECT crypt(${TEST_PASSWORD}, gen_salt('bf', 10)) AS hash`;
        await sql`
          UPDATE users SET password_hash = ${resetHash}, email_verified = true
          WHERE email = ${user.email}
        `;
        created.push({ email: user.email, role: user.role, status: 'reset' });
        continue;
      }

      // Hash password via PostgreSQL crypt()
      const [{ hash }] = await sql`SELECT crypt(${TEST_PASSWORD}, gen_salt('bf', 10)) AS hash`;

      // Insert user — only use columns that exist in the schema
      await sql`
        INSERT INTO users (
          email, password_hash, first_name, last_name, role, tenant_id,
          email_verified, bio, metadata
        )
        VALUES (
          ${user.email}, ${hash}, ${user.firstName}, ${user.lastName},
          ${user.role}, ${tenantId},
          true, ${user.bio}, ${JSON.stringify(user.metadata)}::jsonb
        )
      `;

      created.push({ email: user.email, role: user.role, status: 'created' });
    }

    // Also seed some skills for the test student
    if (created.some((u) => u.role === 'student')) {
      const [student] = await sql`SELECT id FROM users WHERE email = 'student.test@proveground.com'`;
      if (student) {
        // Get some skills to assign
        const skills = await sql`
          SELECT id FROM skills ORDER BY RANDOM() LIMIT 8
        `;
        for (const skill of skills) {
          await sql`
            INSERT INTO user_skills (user_id, skill_id)
            VALUES (${student.id}, ${skill.id})
            ON CONFLICT (user_id, skill_id) DO NOTHING
          `;
        }
      }
    }

    const newCount = created.filter((c) => c.status === 'created').length;
    const resetCount = created.filter((c) => c.status === 'reset').length;
    return NextResponse.json({
      message: `Created ${newCount} new, reset ${resetCount} existing test users`,
      created,
      skipped,
      credentials: {
        password: TEST_PASSWORD,
        note: 'All test users share this password',
      },
    });
  } catch (error) {
    console.error('Seed test users error:', error);
    return NextResponse.json({ error: 'Failed to seed test users', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/seed-test-users — List test user status
 */
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const emails = TEST_USERS.map((u) => u.email);
    const users = await sql`
      SELECT id, email, role, first_name, last_name, created_at, last_login_at
      FROM users
      WHERE email = ANY(${emails})
      ORDER BY role
    `;

    const testUserStatus = TEST_USERS.map((tu) => {
      const found = users.find((u: Record<string, unknown>) => u.email === tu.email);
      return {
        email: tu.email,
        role: tu.role,
        firstName: tu.firstName,
        lastName: tu.lastName,
        exists: !!found,
        lastLogin: found ? (found as Record<string, unknown>).last_login_at : null,
      };
    });

    return NextResponse.json({
      testUsers: testUserStatus,
      password: TEST_PASSWORD,
    });
  } catch (error) {
    console.error('List test users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
