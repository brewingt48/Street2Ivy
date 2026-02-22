/**
 * Target Role CRUD API
 * GET    /api/target-roles/[id] — Get role with skill requirements
 * PUT    /api/target-roles/[id] — Update role and its skill requirements
 * DELETE /api/target-roles/[id] — Delete a role and its requirements
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const roleRows = await sql`
      SELECT id, title, description, institution_id, source, created_at
      FROM target_roles
      WHERE id = ${id}
    `;

    if (roleRows.length === 0) {
      return NextResponse.json({ error: 'Target role not found' }, { status: 404 });
    }

    const role = roleRows[0];

    // Fetch skill requirements with skill names
    const requirements = await sql`
      SELECT rsr.id, rsr.skill_id, rsr.importance, rsr.minimum_proficiency,
             s.name as skill_name, s.category as skill_category
      FROM role_skill_requirements rsr
      JOIN skills s ON s.id = rsr.skill_id
      WHERE rsr.target_role_id = ${id}
      ORDER BY
        CASE rsr.importance
          WHEN 'required' THEN 0
          WHEN 'preferred' THEN 1
          WHEN 'nice_to_have' THEN 2
        END,
        s.name
    `;

    return NextResponse.json({
      role: {
        id: role.id,
        title: role.title,
        description: role.description,
        institutionId: role.institution_id,
        source: role.source,
        createdAt: role.created_at,
      },
      requirements: requirements.map((r: Record<string, unknown>) => ({
        id: r.id,
        skillId: r.skill_id,
        skillName: r.skill_name,
        skillCategory: r.skill_category,
        importance: r.importance,
        minimumProficiency: Number(r.minimum_proficiency),
      })),
    });
  } catch (error) {
    console.error('Target role GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateRoleSchema = z.object({
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only educational admins can update target roles' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify role exists and belongs to tenant (or is global with manual source)
    const existingRows = await sql`
      SELECT id, institution_id, source FROM target_roles WHERE id = ${id}
    `;

    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Target role not found' }, { status: 404 });
    }

    const existing = existingRows[0];
    // Allow editing if: admin, or institution role belongs to their tenant
    if (
      session.data.role !== 'admin' &&
      existing.institution_id &&
      existing.institution_id !== session.data.tenantId
    ) {
      return NextResponse.json({ error: 'Cannot edit roles from other institutions' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, skillRequirements } = updateRoleSchema.parse(body);

    // Update the role
    await sql`
      UPDATE target_roles
      SET title = ${title},
          description = ${description || ''},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    // Replace skill requirements if provided
    if (skillRequirements !== undefined) {
      await sql`DELETE FROM role_skill_requirements WHERE target_role_id = ${id}`;

      for (const req of skillRequirements) {
        await sql`
          INSERT INTO role_skill_requirements (target_role_id, skill_id, importance, minimum_proficiency, source)
          VALUES (${id}, ${req.skillId}, ${req.importance}, ${req.minimumProficiency}, 'manual')
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return NextResponse.json({ success: true, id, title });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Target role PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'educational_admin' && session.data.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only educational admins can delete target roles' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingRows = await sql`
      SELECT id, institution_id FROM target_roles WHERE id = ${id}
    `;

    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Target role not found' }, { status: 404 });
    }

    const existing = existingRows[0];
    if (
      session.data.role !== 'admin' &&
      existing.institution_id &&
      existing.institution_id !== session.data.tenantId
    ) {
      return NextResponse.json({ error: 'Cannot delete roles from other institutions' }, { status: 403 });
    }

    // Delete role (cascade will remove skill requirements and snapshots)
    await sql`DELETE FROM target_roles WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Target role DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
