'use client';

/**
 * Team Huddle — Student Content Feed
 *
 * Browse published content from alumni and corporate partners.
 * Features: search, topic filter, content type filter, bookmarks.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UpgradePrompt } from '@/components/coaching/upgrade-prompt';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import {
  BookOpen,
  Search,
  Video,
  FileText,
  Headphones,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  Eye,
  ChevronLeft,
  ChevronRight,
  Pin,
  Star,
  Library,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Topic {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

interface HuddlePost {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  isPinned: boolean;
  publishedAt: string;
  contributorName: string | null;
  contributorAvatar: string | null;
  contributorRole: string | null;
  contributorClassYear: string | null;
  contributorTitle: string | null;
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

export default function HuddleFeedPage() {
  const router = useRouter();
  const [features, setFeatures] = useState<Record<string, unknown> | null>(null);
  const [posts, setPosts] = useState<HuddlePost[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState('');
  const [activeType, setActiveType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [togglingBookmark, setTogglingBookmark] = useState<string | null>(null);

  // Fetch features for premium gate
  useEffect(() => {
    fetch('/api/tenant/features')
      .then((r) => r.json())
      .then((d) => setFeatures(d.features || {}))
      .catch(() => setFeatures({}));
  }, []);

  // Fetch topics
  useEffect(() => {
    if (features && !features.teamHuddle) return;
    fetch('/api/huddle/topics')
      .then((r) => r.json())
      .then((d) => setTopics(d.topics || []))
      .catch(console.error);
  }, [features]);

  // Fetch posts
  const fetchPosts = useCallback(() => {
    if (features && !features.teamHuddle) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (query) params.set('q', query);
    if (activeTopic) params.set('topic', activeTopic);
    if (activeType) params.set('type', activeType);

    fetch(`/api/huddle/posts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [features, page, query, activeTopic, activeType]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Search with debounce
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleBookmark = async (postId: string) => {
    setTogglingBookmark(postId);
    try {
      const res = await csrfFetch(`/api/huddle/bookmarks/${postId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, isBookmarked: data.bookmarked } : p))
        );
      }
    } catch { /* ignore */ }
    setTogglingBookmark(null);
  };

  // Premium gate
  if (features === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (!features.teamHuddle) {
    return (
      <div className="max-w-xl mx-auto mt-8">
        <UpgradePrompt
          currentTier={String(features.plan || 'starter')}
          requiredTier="professional"
          featureName="Team Huddle"
          featureDescription="Access curated e-learning content, career resources, and alumni insights from your institution's network."
          benefits={[
            'Watch video lessons from industry professionals',
            'Browse career development articles and guides',
            'Save content to your personal library',
            'Learn from alumni success stories',
          ]}
        />
      </div>
    );
  }

  const contentTypeFilters = [
    { value: '', label: 'All' },
    { value: 'video', label: 'Videos' },
    { value: 'article', label: 'Articles' },
    { value: 'pdf', label: 'Resources' },
    { value: 'audio', label: 'Audio' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-teal-600" />
            Team Huddle
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Insights, inspiration, and resources from your alumni network and corporate partners.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/huddle/library')}>
          <Library className="h-4 w-4 mr-2" /> My Library
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          className="pl-10"
          placeholder="Search posts..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {/* Topic Pills */}
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTopic === '' ? 'default' : 'outline'}
            size="sm"
            className={activeTopic === '' ? 'bg-teal-600 hover:bg-teal-700' : ''}
            onClick={() => { setActiveTopic(''); setPage(1); }}
          >
            All Topics
          </Button>
          {topics.map((t) => (
            <Button
              key={t.id}
              variant={activeTopic === t.slug ? 'default' : 'outline'}
              size="sm"
              className={activeTopic === t.slug ? 'bg-teal-600 hover:bg-teal-700' : ''}
              onClick={() => { setActiveTopic(t.slug); setPage(1); }}
            >
              {t.name} {t.postCount > 0 && <span className="ml-1 text-xs opacity-70">({t.postCount})</span>}
            </Button>
          ))}
        </div>
      )}

      {/* Content Type Filters */}
      <div className="flex gap-2">
        {contentTypeFilters.map((f) => (
          <Button
            key={f.value}
            variant={activeType === f.value ? 'default' : 'ghost'}
            size="sm"
            className={activeType === f.value ? 'bg-teal-600 hover:bg-teal-700' : ''}
            onClick={() => { setActiveType(f.value); setPage(1); }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Results count */}
      {!loading && total > 0 && (
        <p className="text-sm text-slate-500">{total} post{total !== 1 ? 's' : ''} found</p>
      )}

      {/* Post Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">
              {query || activeTopic || activeType
                ? 'No posts found. Try adjusting your search or filters.'
                : 'Your Team Huddle is getting warmed up. Check back soon for content from your alumni network and partners.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const TypeIcon = typeIcons[post.contentType] || FileText;
            return (
              <Card
                key={post.id}
                className={`cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${
                  post.isPinned ? 'ring-2 ring-teal-200 dark:ring-teal-800' : ''
                }`}
                onClick={() => router.push(`/huddle/${post.id}`)}
              >
                {/* Thumbnail / Type Header */}
                {post.thumbnailUrl ? (
                  <div className="relative h-40 bg-slate-100">
                    <img
                      src={post.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <Badge className={`absolute top-2 left-2 ${typeColors[post.contentType] || ''} border-0`}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {typeLabels[post.contentType] || post.contentType}
                    </Badge>
                  </div>
                ) : (
                  <div className="relative h-24 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                    <TypeIcon className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <Badge className={`absolute top-2 left-2 ${typeColors[post.contentType] || ''} border-0`}>
                      {typeLabels[post.contentType] || post.contentType}
                    </Badge>
                  </div>
                )}

                <CardContent className="p-4 space-y-3">
                  {/* Status badges */}
                  <div className="flex items-center gap-1.5">
                    {post.isPinned && (
                      <Badge className="bg-teal-100 text-teal-700 border-0 text-xs">
                        <Pin className="h-3 w-3 mr-0.5" /> Pinned
                      </Badge>
                    )}
                    {post.isFeatured && (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                        <Star className="h-3 w-3 mr-0.5" /> Featured
                      </Badge>
                    )}
                    {post.topics?.slice(0, 2).map((t) => (
                      <Badge key={t.id} variant="outline" className="text-xs">
                        {t.name}
                      </Badge>
                    ))}
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {post.title}
                  </h3>

                  {/* Description */}
                  {post.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {post.description}
                    </p>
                  )}

                  {/* Contributor */}
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={post.contributorAvatar || undefined} />
                      <AvatarFallback className="text-xs">{initials(post.contributorName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                        {post.contributorName || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {post.contributorRole === 'alumni' && post.contributorClassYear
                          ? post.contributorClassYear
                          : post.contributorTitle || post.contributorRole || ''}
                      </p>
                    </div>
                  </div>

                  {/* Footer: views, bookmark, date */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {post.viewCount}
                      </span>
                      <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <button
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(post.id);
                      }}
                      disabled={togglingBookmark === post.id}
                    >
                      {post.isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4 text-teal-600" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
