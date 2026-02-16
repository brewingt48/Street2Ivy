'use client';

/**
 * Education Admin — New Team Huddle Post Editor
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { ArrowLeft, Save, Send, AlertCircle, Pin, Star } from 'lucide-react';

interface Topic { id: string; name: string; }
interface Contributor { id: string; name: string; role: string; }

const CONTENT_TYPES = [
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF / Resource' },
  { value: 'audio', label: 'Audio' },
  { value: 'text_post', label: 'Text Post' },
];

export default function NewHuddlePostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [contentType, setContentType] = useState('article');
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [contributorId, setContributorId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/education/huddle/topics')
      .then((r) => r.json())
      .then((d) => setTopics((d.topics || []).filter((t: { isActive: boolean }) => t.isActive)))
      .catch(console.error);

    fetch('/api/education/huddle/contributors')
      .then((r) => r.json())
      .then((d) => setContributors(
        (d.contributors || [])
          .filter((c: { isActive: boolean }) => c.isActive)
          .map((c: { id: string; name: string; role: string }) => ({ id: c.id, name: c.name, role: c.role }))
      ))
      .catch(console.error);
  }, []);

  const handleSave = async (publish: boolean) => {
    if (!title) { setError('Title is required'); return; }
    if (!contentType) { setError('Content type is required'); return; }

    publish ? setPublishing(true) : setSaving(true);
    setError('');

    try {
      const res = await csrfFetch('/api/education/huddle/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          body,
          contentType,
          mediaUrl: mediaUrl || null,
          thumbnailUrl: thumbnailUrl || null,
          topicIds: selectedTopics,
          contributorId: contributorId || null,
          isPinned,
          isFeatured,
          status: publish ? 'published' : 'draft',
        }),
      });

      if (res.ok) {
        router.push('/education/huddle');
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/education/huddle')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Content Management
      </Button>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">New Post</h1>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
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

          {/* Conditional fields based on content type */}
          {(contentType === 'video' || contentType === 'audio') && (
            <div className="space-y-2">
              <Label>{contentType === 'video' ? 'Video URL (YouTube or Vimeo)' : 'Audio URL'}</Label>
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder={contentType === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/audio.mp3'}
              />
            </div>
          )}

          {contentType === 'pdf' && (
            <div className="space-y-2">
              <Label>PDF / Resource URL</Label>
              <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://example.com/resource.pdf" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary..." rows={2} />
          </div>

          {(contentType === 'article' || contentType === 'text_post') && (
            <div className="space-y-2">
              <Label>Content Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your content..." rows={16} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Thumbnail URL (optional)</Label>
            <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
          </div>
        </CardContent>
      </Card>

      {/* Topics */}
      {topics.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Topics</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
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

      {/* Options */}
      <Card>
        <CardHeader><CardTitle>Options</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {contributors.length > 0 && (
            <div className="space-y-2">
              <Label>Contributor (optional)</Label>
              <Select value={contributorId} onValueChange={setContributorId}>
                <SelectTrigger><SelectValue placeholder="Select contributor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (post as admin)</SelectItem>
                  {contributors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              variant={isPinned ? 'default' : 'outline'}
              size="sm"
              className={isPinned ? 'bg-teal-600 hover:bg-teal-700' : ''}
              onClick={() => setIsPinned(!isPinned)}
            >
              <Pin className="h-4 w-4 mr-1" /> {isPinned ? 'Pinned' : 'Pin to Top'}
            </Button>
            <Button
              variant={isFeatured ? 'default' : 'outline'}
              size="sm"
              className={isFeatured ? 'bg-amber-500 hover:bg-amber-600' : ''}
              onClick={() => setIsFeatured(!isFeatured)}
            >
              <Star className="h-4 w-4 mr-1" /> {isFeatured ? 'Featured' : 'Mark Featured'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex justify-between pb-8">
        <Button variant="ghost" onClick={() => router.push('/education/huddle')}>Cancel</Button>
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
