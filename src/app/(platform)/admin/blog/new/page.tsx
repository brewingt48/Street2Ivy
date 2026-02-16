'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Send, AlertCircle } from 'lucide-react';

const CATEGORIES = ['News', 'Tips', 'Success Stories', 'Industry', 'Career', 'Education', 'Events'];

export default function NewBlogPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('News');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (publish: boolean) => {
    if (!title) { setError('Title is required'); return; }
    publish ? setPublishing(true) : setSaving(true);
    setError('');
    try {
      const res = await csrfFetch('/api/admin/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, slug: slug || undefined, content, excerpt, category,
          status: publish ? 'published' : 'draft',
        }),
      });
      if (res.ok) router.push('/admin/blog');
      else { const d = await res.json(); setError(d.error || 'Failed to save'); }
    } catch (err) { setError('Failed to save'); }
    finally { setSaving(false); setPublishing(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/blog')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Blog
      </Button>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">New Blog Post</h1>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Post Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" /></div>
          <div className="space-y-2"><Label>Slug (auto-generated if empty)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="post-url-slug" /></div>
          <div className="space-y-2"><Label>Excerpt</Label><Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary..." rows={2} /></div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your post content..." rows={12} /></div>
        </CardContent>
      </Card>

      <div className="flex justify-between pb-8">
        <Button variant="ghost" onClick={() => router.push('/admin/blog')}>Cancel</Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || publishing}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving || publishing} className="bg-teal-600 hover:bg-teal-700">
            <Send className="h-4 w-4 mr-2" /> {publishing ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
