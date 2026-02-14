/**
 * GET /api/blog/posts/:slug — Public: get a single published blog post
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const posts = await sql`
      SELECT id, title, slug, content, excerpt, category, tags, featured_image,
             author_name, view_count, published_at, created_at
      FROM blog_posts
      WHERE slug = ${params.slug} AND status = 'published'
    `;

    if (posts.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Increment view count
    await sql`UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = ${params.slug}`;

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
        featuredImage: p.featured_image,
        authorName: p.author_name,
        viewCount: p.view_count,
        publishedAt: p.published_at,
        createdAt: p.created_at,
      },
    });
  } catch (error) {
    console.error('Blog post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
