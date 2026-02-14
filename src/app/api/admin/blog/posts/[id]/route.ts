/**
 * GET /api/admin/blog/posts/:id — Get a blog post for editing
 * PUT /api/admin/blog/posts/:id — Update a blog post
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().max(200).optional(),
  content: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const posts = await sql`
      SELECT id, title, slug, content, excerpt, category, tags, status,
             featured_image, author_name, view_count, created_at, updated_at, published_at
      FROM blog_posts WHERE id = ${params.id}
    `;

    if (posts.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const p = posts[0];
    return NextResponse.json({
      post: {
        id: p.id,
        title: p.title,
        slug: p.slug,
        content: p.content,
        excerpt: p.excerpt,
        category: p.category,
        tags: p.tags,
        status: p.status,
        featuredImage: p.featured_image,
        authorName: p.author_name,
        viewCount: p.view_count,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        publishedAt: p.published_at,
      },
    });
  } catch (error) {
    console.error('Get blog post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const data = parsed.data;

    // Build SET clause dynamically
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { updates.push('title'); values.push(data.title); }
    if (data.slug !== undefined) { updates.push('slug'); values.push(data.slug); }
    if (data.content !== undefined) { updates.push('content'); values.push(data.content); }
    if (data.excerpt !== undefined) { updates.push('excerpt'); values.push(data.excerpt); }
    if (data.category !== undefined) { updates.push('category'); values.push(data.category); }
    if (data.status !== undefined) { updates.push('status'); values.push(data.status); }
    if (data.featuredImage !== undefined) { updates.push('featured_image'); values.push(data.featuredImage); }

    // Use simple update
    const result = await sql`
      UPDATE blog_posts SET
        title = COALESCE(${data.title || null}, title),
        slug = COALESCE(${data.slug || null}, slug),
        content = COALESCE(${data.content ?? null}, content),
        excerpt = COALESCE(${data.excerpt ?? null}, excerpt),
        category = COALESCE(${data.category || null}, category),
        status = COALESCE(${data.status || null}, status),
        featured_image = ${data.featuredImage !== undefined ? data.featuredImage : null},
        tags = ${data.tags ? JSON.stringify(data.tags) : null}::jsonb,
        updated_at = NOW(),
        updated_by = ${session.data.userId},
        published_at = CASE
          WHEN ${data.status || ''} = 'published' AND published_at IS NULL THEN NOW()
          ELSE published_at
        END
      WHERE id = ${params.id}
      RETURNING id, title, slug, status, updated_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post: result[0] });
  } catch (error) {
    console.error('Update blog post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
