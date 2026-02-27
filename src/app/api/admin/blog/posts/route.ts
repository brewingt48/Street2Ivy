/**
 * GET /api/admin/blog/posts — List all blog posts (admin)
 * POST /api/admin/blog/posts — Create a new blog post
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  content: z.string().default(''),
  excerpt: z.string().max(500).default(''),
  category: z.string().default('News'),
  tags: z.array(z.string()).default([]),
  featuredImage: z.string().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const posts = await sql`
      SELECT id, title, slug, excerpt, category, status, author_name,
             view_count, created_at, updated_at, published_at
      FROM blog_posts
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      posts: posts.map((p: Record<string, unknown>) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        category: p.category,
        status: p.status,
        authorName: p.author_name,
        viewCount: p.view_count,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        publishedAt: p.published_at,
      })),
    });
  } catch (error) {
    console.error('Admin blog posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.data.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data = parsed.data;
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Get author name
    const users = await sql`SELECT display_name FROM users WHERE id = ${session.data.userId}`;
    const authorName = (users[0]?.display_name as string) || 'Admin';

    const result = await sql`
      INSERT INTO blog_posts (title, slug, content, excerpt, category, tags, featured_image,
                              status, author_id, author_name,
                              published_at)
      VALUES (
        ${data.title}, ${slug}, ${data.content}, ${data.excerpt},
        ${data.category}, ${JSON.stringify(data.tags)}::jsonb,
        ${data.featuredImage || null},
        ${data.status}, ${session.data.userId}, ${authorName},
        ${data.status === 'published' ? new Date().toISOString() : null}${data.status === 'published' ? sql`::timestamptz` : sql``}
      )
      RETURNING id, title, slug, status, created_at
    `;

    return NextResponse.json({ post: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Create blog post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
