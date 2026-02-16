'use client';

/**
 * Education Admin — Team Huddle Content Management
 *
 * List all posts with status tabs, search, filters, and actions.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Bookmark,
  Edit2,
  CheckCircle2,
  XCircle,
  Archive,
  Pin,
  Star,
  Video,
  FileText,
  Headphones,
  MessageSquare,
  BarChart3,
  Tags,
  Users,
  AlertCircle,
  Palette,
} from 'lucide-react';

interface HuddlePost {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  status: string;
  isFeatured: boolean;
  isPinned: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  rejectionNote: string | null;
  contributorName: string | null;
  contributorRole: string | null;
  viewCount: number;
  bookmarkCount: number;
  topics: { id: string; name: string; slug: string }[];
}

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  pending_review: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  archived: 'bg-slate-100 text-slate-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  rejected: 'Rejected',
  archived: 'Archived',
};

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video, article: FileText, pdf: FileText, audio: Headphones, text_post: MessageSquare,
};

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'draft', label: 'Drafts' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

export default function EduHuddleManagementPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<HuddlePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [rejectTarget, setRejectTarget] = useState<HuddlePost | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPosts = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (query) params.set('q', query);
    if (statusFilter) params.set('status', statusFilter);

    fetch(`/api/education/huddle/posts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || []);
        setTotalPages(d.totalPages || 1);
        setStatusCounts(d.statusCounts || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPosts(); }, [page, statusFilter]);

  // Search debounce
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => { if (query !== '') fetchPosts(); }, [query]);

  const handleApprove = async (postId: string) => {
    setActionLoading(true);
    try {
      const res = await csrfFetch(`/api/education/huddle/posts/${postId}/approve`, { method: 'POST' });
      if (res.ok) fetchPosts();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason) return;
    setActionLoading(true);
    try {
      const res = await csrfFetch(`/api/education/huddle/posts/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        setRejectTarget(null);
        setRejectReason('');
        fetchPosts();
      }
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const handleArchive = async (postId: string) => {
    setActionLoading(true);
    try {
      const res = await csrfFetch(`/api/education/huddle/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) fetchPosts();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const handleTogglePin = async (post: HuddlePost) => {
    await csrfFetch(`/api/education/huddle/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: !post.isPinned }),
    });
    fetchPosts();
  };

  const handleToggleFeature = async (post: HuddlePost) => {
    await csrfFetch(`/api/education/huddle/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFeatured: !post.isFeatured }),
    });
    fetchPosts();
  };

  const totalPosts = Object.values(statusCounts).reduce((a, b) => a + b, 0);

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
            Manage content for your students
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/education/huddle/branding')}>
            <Palette className="h-4 w-4 mr-2" /> Branding
          </Button>
          <Button variant="outline" onClick={() => router.push('/education/huddle/topics')}>
            <Tags className="h-4 w-4 mr-2" /> Topics
          </Button>
          <Button variant="outline" onClick={() => router.push('/education/huddle/contributors')}>
            <Users className="h-4 w-4 mr-2" /> Contributors
          </Button>
          <Button variant="outline" onClick={() => router.push('/education/huddle/analytics')}>
            <BarChart3 className="h-4 w-4 mr-2" /> Analytics
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => router.push('/education/huddle/new')}>
            <Plus className="h-4 w-4 mr-2" /> New Post
          </Button>
        </div>
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

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === '' ? totalPosts : (statusCounts[tab.value] || 0);
          return (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? 'default' : 'outline'}
              size="sm"
              className={statusFilter === tab.value ? 'bg-teal-600 hover:bg-teal-700' : ''}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            >
              {tab.label} <span className="ml-1 text-xs opacity-70">({count})</span>
            </Button>
          );
        })}
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No posts found</p>
            <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => router.push('/education/huddle/new')}>
              Create your first post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const TypeIcon = typeIcons[post.contentType] || FileText;
            return (
              <Card key={post.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      <Badge className={`border-0 text-xs ${statusColors[post.status] || ''}`}>
                        {statusLabels[post.status] || post.status}
                      </Badge>
                      {post.isPinned && <Badge className="bg-teal-100 text-teal-700 border-0 text-xs"><Pin className="h-3 w-3 mr-0.5" /> Pinned</Badge>}
                      {post.isFeatured && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs"><Star className="h-3 w-3 mr-0.5" /> Featured</Badge>}
                      {post.topics?.slice(0, 2).map((t) => (
                        <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{post.contributorName || 'No contributor'}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {post.viewCount}</span>
                      <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" /> {post.bookmarkCount}</span>
                      <span>{new Date(post.updatedAt || post.createdAt).toLocaleDateString()}</span>
                    </div>
                    {post.status === 'rejected' && post.rejectionNote && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {post.rejectionNote}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    {post.status === 'pending_review' && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleApprove(post.id)} disabled={actionLoading}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setRejectTarget(post)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleTogglePin(post)} title={post.isPinned ? 'Unpin' : 'Pin'}>
                      <Pin className={`h-4 w-4 ${post.isPinned ? 'text-teal-600' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleFeature(post)} title={post.isFeatured ? 'Unfeature' : 'Feature'}>
                      <Star className={`h-4 w-4 ${post.isFeatured ? 'text-amber-500' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/education/huddle/${post.id}/edit`)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {post.status !== 'archived' && (
                      <Button variant="ghost" size="sm" onClick={() => handleArchive(post.id)} className="text-slate-400 hover:text-red-600">
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
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
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" /> Reject Post
            </DialogTitle>
            <DialogDescription>
              Provide feedback for &ldquo;{rejectTarget?.title}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</Button>
            <Button onClick={handleReject} disabled={!rejectReason || actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
