'use client';

/**
 * Team Huddle — Contributor Post Editor
 *
 * Simplified editor for contributors to submit posts for review.
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
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';

interface Topic { id: string; name: string; }

const CONTENT_TYPES = [
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF / Resource' },
  { value: 'audio', label: 'Audio' },
  { value: 'text_post', label: 'Text Post' },
];

export default function ContributorNewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [contentType, setContentType] = useState('article');
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/huddle/topics')
      .then((r) => r.json())
      .then((d) => setTopics(d.topics || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async () => {
    if (!title) { setError('Title is required'); return; }
    setSubmitting(true);
    setError('');

    try {
      const res = await csrfFetch('/api/huddle/contributor/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, body, contentType,
          mediaUrl: mediaUrl || null,
          thumbnailUrl: thumbnailUrl || null,
          topicIds: selectedTopics,
        }),
      });

      if (res.ok) {
        router.push('/huddle/contribute');
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to submit');
      }
    } catch {
      setError('Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/huddle/contribute')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Contributions
      </Button>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">New Post</h1>
      <p className="text-slate-500">Your post will be submitted for review by an admin.</p>

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

          {(contentType === 'video' || contentType === 'audio') && (
            <div className="space-y-2">
              <Label>{contentType === 'video' ? 'Video URL (YouTube or Vimeo)' : 'Audio URL'}</Label>
              <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
                placeholder={contentType === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/audio.mp3'} />
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
              <Label>Content</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your content..." rows={12} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Thumbnail URL (optional)</Label>
            <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
          </div>
        </CardContent>
      </Card>

      {topics.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Topics</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <Button key={t.id} variant={selectedTopics.includes(t.id) ? 'default' : 'outline'}
                  size="sm" className={selectedTopics.includes(t.id) ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  onClick={() => toggleTopic(t.id)}>{t.name}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pb-8">
        <Button variant="ghost" onClick={() => router.push('/huddle/contribute')}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
          <Send className="h-4 w-4 mr-2" /> {submitting ? 'Submitting...' : 'Submit for Review'}
        </Button>
      </div>
    </div>
  );
}
