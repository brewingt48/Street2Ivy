'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

const CATEGORIES = ['News', 'Tips', 'Success Stories', 'Industry', 'Career', 'Education', 'Events'];

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('News');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/blog/posts/${params.id}`).then((r) => r.json()).then((d) => {
      if (d.post) {
        setTitle(d.post.title); setSlug(d.post.slug); setContent(d.post.content || '');
        setExcerpt(d.post.excerpt || ''); setCategory(d.post.category); setStatus(d.post.status);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [params.id]);

  const handleSave = async (newStatus?: string) => {
    if (!title) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await csrfFetch(`/api/admin/blog/posts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, content, excerpt, category, status: newStatus || status }),
      });
      if (res.ok) {
        if (newStatus) setStatus(newStatus);
        router.push('/admin/blog');
      } else { const d = await res.json(); setError(d.error || 'Failed to save'); }
    } catch (err) { setError('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/blog')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Blog
      </Button>

      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Edit Post</h1>
        <Badge className={status === 'published' ? 'bg-green-100 text-green-700 border-0' : 'bg-yellow-100 text-yellow-700 border-0'}>{status}</Badge>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Post Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
          <div className="space-y-2"><Label>Excerpt</Label><Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} /></div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-between pb-8">
        <Button variant="ghost" onClick={() => router.push('/admin/blog')}>Cancel</Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
          </Button>
          {status === 'draft' && (
            <Button onClick={() => handleSave('published')} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              Publish
            </Button>
          )}
          {status === 'published' && (
            <Button variant="outline" onClick={() => handleSave('archived')} disabled={saving} className="text-red-600">
              Archive
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
