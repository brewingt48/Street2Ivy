'use client';

/**
 * Team Huddle — Branded Landing Page
 *
 * Tenant-customizable content hub with:
 * - Hero banner (image/video) with branding
 * - Featured/pinned content section
 * - Topic-organized content sections
 * - Recent posts
 * - Navigation to feed, library, contribute
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UpgradePrompt } from '@/components/coaching/upgrade-prompt';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import {
  BookOpen,
  Video,
  FileText,
  Headphones,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  Eye,
  Pin,
  Star,
  Library,
  ArrowRight,
  ChevronRight,
  Layout,
  PenTool,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  viewCount: number;
  bookmarkCount: number;
  isBookmarked: boolean;
  topics: { id: string; name: string; slug: string }[];
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

interface TopicSection {
  topicId: string;
  title: string;
  slug: string;
  posts: HuddlePost[];
}

interface Branding {
  bannerType: string;
  bannerImageUrl: string | null;
  bannerVideoUrl: string | null;
  bannerOverlayOpacity: number;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  welcomeTitle: string | null;
  welcomeMessage: string | null;
  layoutConfig: Record<string, unknown>;
  tenantName: string;
}

interface LandingData {
  branding: Branding;
  featured: HuddlePost[];
  topicSections: TopicSection[];
  recent: HuddlePost[];
  topics: Topic[];
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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Post Card Component
// ---------------------------------------------------------------------------

function PostCard({
  post,
  onToggleBookmark,
  togglingBookmark,
}: {
  post: HuddlePost;
  onToggleBookmark: (postId: string) => void;
  togglingBookmark: string | null;
}) {
  const Icon = typeIcons[post.contentType] || FileText;

  return (
    <Link href={`/huddle/${post.id}`}>
      <Card className="h-full hover:shadow-md hover:border-teal-300 transition-all duration-200 cursor-pointer group">
        {/* Thumbnail */}
        {post.thumbnailUrl && (
          <div className="relative h-36 overflow-hidden rounded-t-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.thumbnailUrl}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-2 left-2">
              <Badge className={`text-xs ${typeColors[post.contentType] || 'bg-slate-100 text-slate-700'}`}>
                <Icon className="h-3 w-3 mr-1" />
                {typeLabels[post.contentType] || post.contentType}
              </Badge>
            </div>
            {post.isPinned && (
              <div className="absolute top-2 right-2">
                <Pin className="h-4 w-4 text-white drop-shadow" />
              </div>
            )}
          </div>
        )}

        <CardContent className={`p-4 ${!post.thumbnailUrl ? 'pt-4' : ''}`}>
          {/* Type badge (if no thumbnail) */}
          {!post.thumbnailUrl && (
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`text-xs ${typeColors[post.contentType] || 'bg-slate-100 text-slate-700'}`}>
                <Icon className="h-3 w-3 mr-1" />
                {typeLabels[post.contentType] || post.contentType}
              </Badge>
              {post.isFeatured && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">
                  <Star className="h-3 w-3 mr-1" /> Featured
                </Badge>
              )}
            </div>
          )}

          <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 group-hover:text-teal-700">
            {post.title}
          </h3>

          {post.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{post.description}</p>
          )}

          {/* Contributor */}
          {post.contributorName && (
            <div className="flex items-center gap-2 mt-3">
              <Avatar className="h-5 w-5">
                <AvatarImage src={post.contributorAvatar || undefined} />
                <AvatarFallback className="text-[8px]">{initials(post.contributorName)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-slate-500 truncate">{post.contributorName}</span>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {post.viewCount}
              </span>
              <span>{timeAgo(post.publishedAt)}</span>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleBookmark(post.id); }}
              disabled={togglingBookmark === post.id}
              className="hover:text-teal-600 transition-colors"
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
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Content Section Component
// ---------------------------------------------------------------------------

function ContentSection({
  title,
  posts,
  viewAllHref,
  onToggleBookmark,
  togglingBookmark,
  primaryColor,
}: {
  title: string;
  posts: HuddlePost[];
  viewAllHref?: string;
  onToggleBookmark: (postId: string) => void;
  togglingBookmark: string | null;
  primaryColor?: string;
}) {
  if (posts.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900" style={primaryColor ? { color: primaryColor } : {}}>
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            style={primaryColor ? { color: primaryColor } : {}}
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onToggleBookmark={onToggleBookmark}
            togglingBookmark={togglingBookmark}
          />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function HuddleLandingPage() {
  const router = useRouter();
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [togglingBookmark, setTogglingBookmark] = useState<string | null>(null);

  // Fetch landing page data
  useEffect(() => {
    fetch('/api/huddle/landing')
      .then(async (r) => {
        if (r.status === 403) {
          const d = await r.json();
          if (d.upgradeRequired) {
            setUpgradeRequired(true);
            return null;
          }
        }
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Toggle bookmark
  const handleToggleBookmark = useCallback(async (postId: string) => {
    setTogglingBookmark(postId);
    try {
      await csrfFetch(`/api/huddle/bookmarks/${postId}`, { method: 'POST' });
      // Update all sections that contain this post
      setData((prev) => {
        if (!prev) return prev;
        const togglePost = (p: HuddlePost) =>
          p.id === postId ? { ...p, isBookmarked: !p.isBookmarked, bookmarkCount: p.isBookmarked ? p.bookmarkCount - 1 : p.bookmarkCount + 1 } : p;
        return {
          ...prev,
          featured: prev.featured.map(togglePost),
          recent: prev.recent.map(togglePost),
          topicSections: prev.topicSections.map((ts) => ({
            ...ts,
            posts: ts.posts.map(togglePost),
          })),
        };
      });
    } catch (err) {
      console.error('Bookmark toggle failed:', err);
    } finally {
      setTogglingBookmark(null);
    }
  }, []);

  // Premium gate
  if (upgradeRequired) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <UpgradePrompt
          currentTier="starter"
          requiredTier="professional"
          featureName="Team Huddle"
          featureDescription="Team Huddle is a premium feature that provides curated e-learning content, career resources, and alumni insights."
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

  // Loading state
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      </div>
    );
  }

  const { branding, featured, topicSections, recent, topics } = data;
  const sectionOrder = (branding.layoutConfig.sectionOrder as string[]) || ['featured', 'topics', 'recent'];

  // Render sections based on configured order
  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case 'featured':
        return featured.length > 0 ? (
          <ContentSection
            key="featured"
            title={(branding.layoutConfig.featuredSectionTitle as string) || 'Featured Content'}
            posts={featured}
            viewAllHref="/huddle/feed?featured=true"
            onToggleBookmark={handleToggleBookmark}
            togglingBookmark={togglingBookmark}
            primaryColor={branding.primaryColor}
          />
        ) : null;

      case 'topics':
        return topicSections.length > 0 ? (
          <div key="topics" className="space-y-8">
            {topicSections.map((section) => (
              <ContentSection
                key={section.topicId}
                title={section.title}
                posts={section.posts}
                viewAllHref={`/huddle/feed?topic=${section.slug}`}
                onToggleBookmark={handleToggleBookmark}
                togglingBookmark={togglingBookmark}
                primaryColor={branding.primaryColor}
              />
            ))}
          </div>
        ) : null;

      case 'recent':
        return recent.length > 0 ? (
          <ContentSection
            key="recent"
            title="Recent Posts"
            posts={recent}
            viewAllHref="/huddle/feed"
            onToggleBookmark={handleToggleBookmark}
            togglingBookmark={togglingBookmark}
            primaryColor={branding.primaryColor}
          />
        ) : null;

      default:
        return null;
    }
  };

  const hasAnyContent = featured.length > 0 || topicSections.length > 0 || recent.length > 0;

  return (
    <div className="space-y-8 -mx-2 sm:-mx-0">
      {/* ================================================================= */}
      {/* Hero Banner */}
      {/* ================================================================= */}
      {branding.bannerType !== 'none' && (
        <div className="relative rounded-xl overflow-hidden" style={{ minHeight: '280px' }}>
          {/* Background */}
          {branding.bannerType === 'video' && branding.bannerVideoUrl ? (
            <video
              src={branding.bannerVideoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : branding.bannerImageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${branding.bannerImageUrl})` }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`,
              }}
            />
          )}

          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, rgba(0,0,0,${branding.bannerOverlayOpacity}) 0%, rgba(0,0,0,${branding.bannerOverlayOpacity + 0.2}) 100%)`,
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-16 sm:py-20">
            {branding.logoUrl && (
              <div className="mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.logoUrl}
                  alt={branding.tenantName}
                  className="h-12 sm:h-16 w-auto object-contain"
                />
              </div>
            )}

            <h1 className="text-2xl sm:text-4xl font-bold text-white drop-shadow-lg">
              {branding.welcomeTitle || `${branding.tenantName} Team Huddle`}
            </h1>

            {branding.welcomeMessage && (
              <p className="mt-3 text-sm sm:text-base text-white/90 max-w-2xl drop-shadow">
                {branding.welcomeMessage}
              </p>
            )}

            {/* Quick Nav Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <Button
                onClick={() => router.push('/huddle/feed')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur text-white border border-white/30"
              >
                <Layout className="h-4 w-4 mr-2" />
                Browse Content
              </Button>
              <Button
                onClick={() => router.push('/huddle/library')}
                variant="ghost"
                className="text-white hover:bg-white/20 border border-white/20"
              >
                <Library className="h-4 w-4 mr-2" />
                My Library
              </Button>
              <Button
                onClick={() => router.push('/huddle/contribute')}
                variant="ghost"
                className="text-white hover:bg-white/20 border border-white/20"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Contribute
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hero-less quick nav (if banner is 'none') */}
      {branding.bannerType === 'none' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {branding.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" className="h-10 w-auto" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {branding.welcomeTitle || `${branding.tenantName} Team Huddle`}
              </h1>
              {branding.welcomeMessage && (
                <p className="text-sm text-slate-500 mt-1">{branding.welcomeMessage}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push('/huddle/feed')} size="sm" className="bg-teal-600 hover:bg-teal-700">
              <Layout className="h-4 w-4 mr-2" /> Browse Content
            </Button>
            <Button onClick={() => router.push('/huddle/library')} variant="outline" size="sm">
              <Library className="h-4 w-4 mr-2" /> My Library
            </Button>
            <Button onClick={() => router.push('/huddle/contribute')} variant="outline" size="sm">
              <PenTool className="h-4 w-4 mr-2" /> Contribute
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Topic Pills (Quick Navigation) */}
      {/* ================================================================= */}
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <Link key={topic.id} href={`/huddle/feed?topic=${topic.slug}`}>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-teal-50 hover:border-teal-300 transition-colors px-3 py-1"
              >
                {topic.name}
                {topic.postCount > 0 && (
                  <span className="ml-1.5 text-xs text-slate-400">{topic.postCount}</span>
                )}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* ================================================================= */}
      {/* Content Sections (in configured order) */}
      {/* ================================================================= */}
      {hasAnyContent ? (
        <div className="space-y-10">
          {sectionOrder.map(renderSection)}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No Content Yet</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Content will appear here once your institution starts publishing posts.
            Check back soon for videos, articles, and more.
          </p>
          <Button
            onClick={() => router.push('/huddle/feed')}
            variant="outline"
            className="mt-4"
          >
            Browse Feed <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Card>
      )}

      {/* ================================================================= */}
      {/* Bottom CTA */}
      {/* ================================================================= */}
      {hasAnyContent && (
        <div className="flex items-center justify-center py-4">
          <Button
            onClick={() => router.push('/huddle/feed')}
            className="bg-teal-600 hover:bg-teal-700"
            style={branding.primaryColor ? { backgroundColor: branding.primaryColor } : {}}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Browse All Content
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
