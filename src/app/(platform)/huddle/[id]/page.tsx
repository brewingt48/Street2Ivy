'use client';

/**
 * Team Huddle — Post Detail Page
 *
 * Full content view for a Team Huddle post.
 * Renders video embeds, article text, PDF links, audio players.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { getVideoEmbedUrl } from '@/lib/huddle/utils';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Eye,
  Video,
  FileText,
  Headphones,
  MessageSquare,
  ExternalLink,
  Pin,
  Star,
  Download,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HuddlePost {
  id: string;
  title: string;
  description: string | null;
  body: string | null;
  contentType: string;
  mediaUrl: string | null;
  fileKey: string | null;
  fileName: string | null;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  isPinned: boolean;
  status: string;
  publishedAt: string;
  createdAt: string;
  contributorId: string | null;
  contributorName: string | null;
  contributorAvatar: string | null;
  contributorRole: string | null;
  contributorClassYear: string | null;
  contributorTitle: string | null;
  contributorBio: string | null;
  viewCount: number;
  bookmarkCount: number;
  isBookmarked: boolean;
  topics: { id: string; name: string; slug: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  article: FileText,
  pdf: FileText,
  audio: Headphones,
  text_post: MessageSquare,
};

const typeColors: Record<string, string> = {
  video: 'bg-red-100 text-red-700',
  article: 'bg-blue-100 text-blue-700',
  pdf: 'bg-orange-100 text-orange-700',
  audio: 'bg-purple-100 text-purple-700',
  text_post: 'bg-slate-100 text-slate-700',
};

const typeLabels: Record<string, string> = {
  video: 'Video',
  article: 'Article',
  pdf: 'PDF',
  audio: 'Audio',
  text_post: 'Post',
};

function initials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HuddlePostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [post, setPost] = useState<HuddlePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingBookmark, setTogglingBookmark] = useState(false);

  useEffect(() => {
    let cancelled = false;
    params.then(({ id }) => {
      fetch(`/api/huddle/posts/${id}`)
        .then((r) => {
          if (!r.ok) throw new Error('Post not found');
          return r.json();
        })
        .then((d) => { if (!cancelled) setPost(d.post); })
        .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load post'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, [params]);

  const toggleBookmark = async () => {
    if (!post) return;
    setTogglingBookmark(true);
    try {
      const res = await csrfFetch(`/api/huddle/bookmarks/${post.id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPost((prev) => prev ? { ...prev, isBookmarked: data.bookmarked } : prev);
      }
    } catch { /* ignore */ }
    setTogglingBookmark(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/huddle')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Team Huddle
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{error || 'Post not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const TypeIcon = typeIcons[post.contentType] || FileText;
  const embedUrl = post.mediaUrl ? getVideoEmbedUrl(post.mediaUrl) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/huddle')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Team Huddle
      </Button>

      {/* Post Header */}
      <div className="space-y-4">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${typeColors[post.contentType] || ''} border-0`}>
            <TypeIcon className="h-3 w-3 mr-1" />
            {typeLabels[post.contentType] || post.contentType}
          </Badge>
          {post.isPinned && (
            <Badge className="bg-teal-100 text-teal-700 border-0">
              <Pin className="h-3 w-3 mr-0.5" /> Pinned
            </Badge>
          )}
          {post.isFeatured && (
            <Badge className="bg-amber-100 text-amber-700 border-0">
              <Star className="h-3 w-3 mr-0.5" /> Featured
            </Badge>
          )}
          {post.topics?.map((t) => (
            <Badge key={t.id} variant="outline" className="text-xs">
              {t.name}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" /> {post.viewCount} views
            </span>
            <span>·</span>
            <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleBookmark}
            disabled={togglingBookmark}
          >
            {post.isBookmarked ? (
              <><BookmarkCheck className="h-4 w-4 mr-1 text-teal-600" /> Saved</>
            ) : (
              <><Bookmark className="h-4 w-4 mr-1" /> Save</>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {/* Video embed */}
          {post.contentType === 'video' && embedUrl && (
            <div className="relative w-full pb-[56.25%] mb-6 rounded-lg overflow-hidden bg-black">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={post.title}
              />
            </div>
          )}

          {/* Video without embed (external link) */}
          {post.contentType === 'video' && post.mediaUrl && !embedUrl && (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <a
                href={post.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
              >
                <Video className="h-5 w-5" />
                Watch Video
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Audio player */}
          {post.contentType === 'audio' && post.mediaUrl && (
            <div className="mb-6">
              <audio controls className="w-full" src={post.mediaUrl}>
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* PDF link */}
          {post.contentType === 'pdf' && post.mediaUrl && (
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <a
                href={post.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-orange-700 hover:text-orange-800 font-medium"
              >
                <Download className="h-5 w-5" />
                {post.fileName || 'View PDF'}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Description */}
          {post.description && (
            <p className="text-slate-600 dark:text-slate-300 mb-4 italic">
              {post.description}
            </p>
          )}

          {/* Body text */}
          {post.body && (
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <div style={{ whiteSpace: 'pre-wrap' }}>{post.body}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contributor Card */}
      {post.contributorName && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={post.contributorAvatar || undefined} />
                <AvatarFallback>{initials(post.contributorName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {post.contributorName}
                </p>
                <p className="text-sm text-slate-500">
                  {post.contributorRole === 'alumni' ? 'Alumni' : post.contributorRole === 'partner' ? 'Corporate Partner' : 'Admin'}
                  {post.contributorClassYear && ` · ${post.contributorClassYear}`}
                  {post.contributorTitle && ` · ${post.contributorTitle}`}
                </p>
                {post.contributorBio && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    {post.contributorBio}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
