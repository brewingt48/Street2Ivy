'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, Plus, Eye, Edit2 } from 'lucide-react';

interface Post { id: string; title: string; slug: string; excerpt: string; category: string; status: string; authorName: string; viewCount: number; publishedAt: string | null; createdAt: string; }

const statusColors: Record<string, string> = { draft: 'bg-yellow-100 text-yellow-700', published: 'bg-green-100 text-green-700', archived: 'bg-slate-100 text-slate-500' };

export default function AdminBlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/blog/posts').then((r) => r.json()).then((d) => setPosts(d.posts || []))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Blog</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage blog posts</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => router.push('/admin/blog/new')}>
          <Plus className="h-4 w-4 mr-2" /> New Post
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : posts.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Newspaper className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No blog posts yet</p>
          <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => router.push('/admin/blog/new')}>
            Create your first post
          </Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => router.push(`/admin/blog/${p.id}/edit`)}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    <Badge className={`border-0 ${statusColors[p.status] || ''}`}>{p.status}</Badge>
                    <Badge variant="outline" className="text-xs">{p.category}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{p.excerpt || 'No excerpt'}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Eye className="h-3 w-3" /> {p.viewCount}</span>
                  <span className="text-xs text-slate-400">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : 'Draft'}</span>
                  <Button variant="ghost" size="sm"><Edit2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
