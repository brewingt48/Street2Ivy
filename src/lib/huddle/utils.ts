/**
 * Team Huddle Utility Functions
 *
 * Shared helpers for video URL validation, embed URL generation, and slug creation.
 */

// ---------------------------------------------------------------------------
// Video URL Allowlist
// ---------------------------------------------------------------------------

const ALLOWED_VIDEO_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
];

export function isAllowedVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_VIDEO_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Convert a YouTube or Vimeo URL to an embeddable iframe URL.
 * Returns null if the URL is not a recognized video host.
 */
export function getVideoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;

    // YouTube: youtube.com/watch?v=ID or youtu.be/ID
    if (host === 'youtube.com' || host === 'www.youtube.com') {
      const videoId = parsed.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      // Handle /embed/ URLs passthrough
      if (parsed.pathname.startsWith('/embed/')) return url;
      return null;
    }

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.slice(1);
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      return null;
    }

    // Vimeo: vimeo.com/ID or player.vimeo.com/video/ID
    if (host === 'vimeo.com') {
      const videoId = parsed.pathname.slice(1).split('/')[0];
      if (videoId && /^\d+$/.test(videoId)) return `https://player.vimeo.com/video/${videoId}`;
      return null;
    }

    if (host === 'player.vimeo.com') {
      // Already an embed URL
      return url;
    }

    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Slug Generation
// ---------------------------------------------------------------------------

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------------------------------------------------------------------------
// Content Type Helpers
// ---------------------------------------------------------------------------

export const CONTENT_TYPES = ['video', 'article', 'pdf', 'audio', 'text_post'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: 'Video',
  article: 'Article',
  pdf: 'PDF',
  audio: 'Audio',
  text_post: 'Text Post',
};

export const POST_STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'archived'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  rejected: 'Rejected',
  archived: 'Archived',
};
