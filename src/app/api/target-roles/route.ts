/**
 * Target Roles API
 * GET  — List available target roles
 * POST — Create a new target role (edu admin only)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/middleware';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get('institutionId') || session.data.tenantId;

    // Return global roles + institution-specific roles
    const rows = institutionId
      ? await sql`
          SELECT tr.*,
            (SELECT COUNT(*) FROM role_skill_requirements rsr WHERE rsr.target_role_id = tr.id) as skill_count
          FROM target_roles tr
          WHERE tr.institution_id IS NULL OR tr.institution_id = ${institutionId}
          ORDER BY tr.title ASC
        `
      : await sql`
          SELECT tr.*,
            (SELECT COUNT(*) FROM role_skill_requirements rsr WHERE rsr.target_role_id = tr.id) as skill_count
          FROM target_roles tr
          WHERE tr.institution_id IS NULL
          ORDER BY tr.title ASC
        `;

    return NextResponse.json({ roles: rows });
  } catch (error) {
    console.error('Target roles GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createRoleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  skillRequirements: z
    .array(
      z.object({
        skillId: z.string().uuid(),
        importance: z.enum(['required', 'preferred', 'nice_to_have']).default('required'),
        minimumProficiency: z.number().int().min(1).max(5).default(2),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only educational admins can create target roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, skillRequirements } = createRoleSchema.parse(body);

    const roleRows = await sql`
      INSERT INTO target_roles (title, description, institution_id, source)
      VALUES (${title}, ${description || ''}, ${session.data.tenantId}, 'manual')
      RETURNING id
    `;
    const roleId = roleRows[0].id as string;

    // Insert skill requirements if provided
    if (skillRequirements && skillRequirements.length > 0) {
      for (const req of skillRequirements) {
        await sql`
          INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
          VALUES (${roleId}, ${req.skillId}, ${req.importance}, ${req.minimumProficiency}, 'manual')
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return NextResponse.json({ id: roleId, title }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Target roles POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
