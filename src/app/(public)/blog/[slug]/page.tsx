'use client';

/**
 * Public Blog Post Page
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Eye, User } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  coverImageUrl: string | null;
  authorName: string;
  viewCount: number;
  publishedAt: string;
}

export default function PublicBlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/blog/posts/${slug}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'Post not found' : 'Failed to load post');
          return;
        }
        const data = await res.json();
        setPost(data.post);
      } catch {
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <Skeleton className="h-64 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{error || 'Post not found'}</h1>
        <Link href="/blog">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Blog
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      <Link href="/blog" className="inline-flex items-center text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Blog
      </Link>

      {post.category && (
        <Badge variant="secondary" className="mb-3">{post.category}</Badge>
      )}

      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
        {post.title}
      </h1>

      <div className="flex items-center gap-4 mt-4 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <User className="h-4 w-4" />
          {post.authorName}
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {new Date(post.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          {post.viewCount} views
        </div>
      </div>

      {post.coverImageUrl && (
        <div className="mt-8 rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="w-full h-auto max-h-96 object-cover"
          />
        </div>
      )}

      <div
        className="prose prose-slate dark:prose-invert max-w-none mt-8"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
