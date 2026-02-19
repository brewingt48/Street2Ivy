'use client';

/**
 * Team Huddle — My Library (Bookmarks)
 *
 * Shows the user's bookmarked/saved posts.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Eye,
  Video,
  FileText,
  Headphones,
  MessageSquare,
  Library,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface HuddlePost {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  isPinned: boolean;
  publishedAt: string;
  contributorName: string | null;
  contributorAvatar: string | null;
  contributorRole: string | null;
  contributorTitle: string | null;
  viewCount: number;
  isBookmarked: boolean;
  topics: { id: string; name: string; slug: string }[];
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video, article: FileText, pdf: FileText, audio: Headphones, text_post: MessageSquare,
};
const typeColors: Record<string, string> = {
  video: 'bg-red-100 text-red-700', article: 'bg-blue-100 text-blue-700',
  pdf: 'bg-orange-100 text-orange-700', audio: 'bg-purple-100 text-purple-700',
  text_post: 'bg-slate-100 text-slate-700',
};
const typeLabels: Record<string, string> = {
  video: 'Video', article: 'Article', pdf: 'PDF', audio: 'Audio', text_post: 'Post',
};

function initials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function HuddleLibraryPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<HuddlePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [togglingBookmark, setTogglingBookmark] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/huddle/bookmarks?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || []);
        setTotalPages(d.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const removeBookmark = async (postId: string) => {
    setTogglingBookmark(postId);
    try {
      const res = await csrfFetch(`/api/huddle/bookmarks/${postId}`, { method: 'POST' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch { /* ignore */ }
    setTogglingBookmark(null);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/huddle')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Team Huddle
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Library className="h-8 w-8 text-teal-600" />
          My Library
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Your saved posts and resources.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bookmark className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              You haven&apos;t saved anything yet. Bookmark posts to build your personal library.
            </p>
            <Button
              className="mt-4 bg-teal-600 hover:bg-teal-700"
              onClick={() => router.push('/huddle')}
            >
              Browse Team Huddle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const TypeIcon = typeIcons[post.contentType] || FileText;
            return (
              <Card
                key={post.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => router.push(`/huddle/${post.id}`)}
              >
                {post.thumbnailUrl ? (
                  <div className="relative h-40 bg-slate-100">
                    <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    <Badge className={`absolute top-2 left-2 ${typeColors[post.contentType] || ''} border-0`}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {typeLabels[post.contentType]}
                    </Badge>
                  </div>
                ) : (
                  <div className="relative h-24 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                    <TypeIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <Badge className={`absolute top-2 left-2 ${typeColors[post.contentType] || ''} border-0`}>
                      {typeLabels[post.contentType]}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-4 space-y-3">
                  {post.topics?.slice(0, 2).map((t) => (
                    <Badge key={t.id} variant="outline" className="text-xs mr-1">
                      {t.name}
                    </Badge>
                  ))}
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {post.title}
                  </h3>
                  {post.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{post.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={post.contributorAvatar || undefined} />
                      <AvatarFallback className="text-xs">{initials(post.contributorName)}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {post.contributorName || 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {post.viewCount}
                    </span>
                    <button
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={(e) => { e.stopPropagation(); removeBookmark(post.id); }}
                      disabled={togglingBookmark === post.id}
                    >
                      <BookmarkCheck className="h-4 w-4 text-teal-600" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
