/**
 * GET /api/blog/posts — Public: list published blog posts
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const category = searchParams.get('category') || '';
    const limit = 12;
    const offset = (page - 1) * limit;

    let posts;
    let total;

    if (category) {
      posts = await sql`
        SELECT id, title, slug, excerpt, category, tags, featured_image,
               author_name, view_count, published_at
        FROM blog_posts
        WHERE status = 'published' AND category = ${category}
        ORDER BY published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM blog_posts WHERE status = 'published' AND category = ${category}
      `;
      total = parseInt(countResult[0].count as string);
    } else {
      posts = await sql`
        SELECT id, title, slug, excerpt, category, tags, featured_image,
               author_name, view_count, published_at
        FROM blog_posts
        WHERE status = 'published'
        ORDER BY published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const countResult = await sql`
        SELECT COUNT(*) as count FROM blog_posts WHERE status = 'published'
      `;
      total = parseInt(countResult[0].count as string);
    }

    const categories = await sql`SELECT name FROM blog_categories ORDER BY name`;

    return NextResponse.json({
      posts: posts.map((p: Record<string, unknown>) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        category: p.category,
        tags: p.tags,
        featuredImage: p.featured_image,
        authorName: p.author_name,
        viewCount: p.view_count,
        publishedAt: p.published_at,
      })),
      categories: categories.map((c: Record<string, unknown>) => c.name as string),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Blog posts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
