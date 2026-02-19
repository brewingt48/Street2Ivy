'use client';

/**
 * Team Huddle — Contributor Dashboard
 *
 * Shows the contributor's own posts and allows creating new ones.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen, Plus, Edit2, Eye, AlertCircle, CheckCircle2, Clock, XCircle, FileText,
} from 'lucide-react';

interface ContributorPost {
  id: string;
  title: string;
  contentType: string;
  status: string;
  rejectionNote: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  draft: { color: 'bg-yellow-100 text-yellow-700', icon: FileText, label: 'Draft' },
  pending_review: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'Pending Review' },
  published: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Published' },
  rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejected' },
  archived: { color: 'bg-slate-100 text-slate-500', icon: FileText, label: 'Archived' },
};

export default function ContributorDashboardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ContributorPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isContributor, setIsContributor] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetch('/api/huddle/contributor/posts')
      .then((r) => r.json())
      .then((d) => {
        if (d.isContributor === false) {
          setIsContributor(false);
        } else {
          setPosts(d.posts || []);
          setIsActive(d.contributorActive !== false);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      </div>
    );
  }

  if (!isContributor) {
    return (
      <div className="max-w-xl mx-auto mt-8">
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Not a Contributor</h2>
            <p className="text-slate-500 mt-2">
              You haven&apos;t been invited as a Team Huddle contributor yet.
              Contact your institution&apos;s admin to request contributor access.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => router.push('/huddle')}>
              Browse Team Huddle
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-teal-600" />
            My Contributions
          </h1>
          <p className="text-slate-500 mt-1">Manage your Team Huddle content</p>
        </div>
        {isActive && (
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => router.push('/huddle/contribute/new')}>
            <Plus className="h-4 w-4 mr-2" /> New Post
          </Button>
        )}
      </div>

      {!isActive && (
        <div className="p-3 text-sm text-amber-600 bg-amber-50 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Your contributor account has been deactivated. Contact your admin for more information.
        </div>
      )}

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">You haven&apos;t created any posts yet.</p>
            {isActive && (
              <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => router.push('/huddle/contribute/new')}>
                Create your first post
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const sc = statusConfig[post.status] || statusConfig.draft;
            const StatusIcon = sc.icon;
            return (
              <Card key={post.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      <Badge className={`border-0 text-xs ${sc.color}`}>
                        <StatusIcon className="h-3 w-3 mr-0.5" /> {sc.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {post.contentType.replace('_', ' ')} · Updated {new Date(post.updatedAt).toLocaleDateString()}
                      {post.status === 'published' && ` · ${post.viewCount} views`}
                    </p>
                    {post.status === 'rejected' && post.rejectionNote && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Feedback: {post.rejectionNote}
                      </p>
                    )}
                  </div>
                  {['draft', 'rejected'].includes(post.status) && isActive && (
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/huddle/contribute/new?edit=${post.id}`)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
