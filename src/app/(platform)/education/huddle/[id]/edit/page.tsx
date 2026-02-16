'use client';

/**
 * Education Admin — Edit Team Huddle Post
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { ArrowLeft, Save, Send, AlertCircle, Pin, Star, CheckCircle2, XCircle } from 'lucide-react';

interface Topic { id: string; name: string; }

const CONTENT_TYPES = [
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF / Resource' },
  { value: 'audio', label: 'Audio' },
  { value: 'text_post', label: 'Text Post' },
];

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  pending_review: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  archived: 'bg-slate-100 text-slate-500',
};

export default function EditHuddlePostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [postId, setPostId] = useState('');
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [contentType, setContentType] = useState('article');
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setPostId(id);

      Promise.all([
        fetch(`/api/education/huddle/posts/${id}`).then((r) => r.json()),
        fetch('/api/education/huddle/topics').then((r) => r.json()),
      ]).then(([postData, topicsData]) => {
        const p = postData.post;
        if (p) {
          setTitle(p.title || '');
          setDescription(p.description || '');
          setBody(p.body || '');
          setContentType(p.contentType || 'article');
          setMediaUrl(p.mediaUrl || '');
          setThumbnailUrl(p.thumbnailUrl || '');
          setIsPinned(p.isPinned || false);
          setIsFeatured(p.isFeatured || false);
          setStatus(p.status || '');
          setRejectionNote(p.rejectionNote || '');
          setSelectedTopics((p.topics || []).map((t: { id: string }) => t.id));
        }
        setAllTopics((topicsData.topics || []).filter((t: { isActive: boolean }) => t.isActive));
      }).catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [params]);

  const handleSave = async (newStatus?: string) => {
    if (!title) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const payload: Record<string, unknown> = {
        title, description, body, contentType,
        mediaUrl: mediaUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        topicIds: selectedTopics,
        isPinned, isFeatured,
      };
      if (newStatus) payload.status = newStatus;

      const res = await csrfFetch(`/api/education/huddle/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (newStatus) setStatus(newStatus);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/education/huddle')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Content Management
      </Button>

      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Edit Post</h1>
        <Badge className={`border-0 ${statusColors[status] || ''}`}>
          {status.replace('_', ' ')}
        </Badge>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {saved && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Changes saved
        </div>
      )}

      {status === 'rejected' && rejectionNote && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" /> Rejection feedback: {rejectionNote}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Post Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
          </div>

          <div className="space-y-2">
            <Label>Content Type *</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {(contentType === 'video' || contentType === 'audio') && (
            <div className="space-y-2">
              <Label>{contentType === 'video' ? 'Video URL' : 'Audio URL'}</Label>
              <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
            </div>
          )}

          {contentType === 'pdf' && (
            <div className="space-y-2">
              <Label>PDF / Resource URL</Label>
              <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          {(contentType === 'article' || contentType === 'text_post') && (
            <div className="space-y-2">
              <Label>Content Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Thumbnail URL</Label>
            <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {allTopics.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Topics</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allTopics.map((t) => (
                <Button
                  key={t.id}
                  variant={selectedTopics.includes(t.id) ? 'default' : 'outline'}
                  size="sm"
                  className={selectedTopics.includes(t.id) ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  onClick={() => toggleTopic(t.id)}
                >
                  {t.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Options</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={isPinned ? 'default' : 'outline'} size="sm"
              className={isPinned ? 'bg-teal-600 hover:bg-teal-700' : ''}
              onClick={() => setIsPinned(!isPinned)}
            >
              <Pin className="h-4 w-4 mr-1" /> {isPinned ? 'Pinned' : 'Pin'}
            </Button>
            <Button
              variant={isFeatured ? 'default' : 'outline'} size="sm"
              className={isFeatured ? 'bg-amber-500 hover:bg-amber-600' : ''}
              onClick={() => setIsFeatured(!isFeatured)}
            >
              <Star className="h-4 w-4 mr-1" /> {isFeatured ? 'Featured' : 'Feature'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pb-8">
        <Button variant="ghost" onClick={() => router.push('/education/huddle')}>Cancel</Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleSave()} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
          </Button>
          {status !== 'published' && (
            <Button onClick={() => handleSave('published')} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              <Send className="h-4 w-4 mr-2" /> Publish
            </Button>
          )}
          {status === 'published' && (
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>
              Unpublish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
