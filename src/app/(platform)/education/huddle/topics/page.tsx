'use client';

/**
 * Education Admin — Team Huddle Topic Management
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { ArrowLeft, Plus, Edit2, Trash2, Tags, CheckCircle2, AlertCircle } from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  postCount: number;
  createdAt: string;
}

export default function HuddleTopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Topic | null>(null);
  const [name, setName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTopics = () => {
    setLoading(true);
    fetch('/api/education/huddle/topics')
      .then((r) => r.json())
      .then((d) => setTopics(d.topics || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTopics(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setName('');
    setDisplayOrder(topics.length);
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (topic: Topic) => {
    setEditTarget(topic);
    setName(topic.name);
    setDisplayOrder(topic.displayOrder);
    setError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');

    try {
      if (editTarget) {
        const res = await csrfFetch(`/api/education/huddle/topics/${editTarget.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), displayOrder }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to update'); return; }
      } else {
        const res = await csrfFetch('/api/education/huddle/topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), displayOrder }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to create'); return; }
      }
      setDialogOpen(false);
      fetchTopics();
    } catch {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (topic: Topic) => {
    await csrfFetch(`/api/education/huddle/topics/${topic.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !topic.isActive }),
    });
    fetchTopics();
  };

  const handleDelete = async (topicId: string) => {
    await csrfFetch(`/api/education/huddle/topics/${topicId}`, { method: 'DELETE' });
    fetchTopics();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.push('/education/huddle')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Content Management
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tags className="h-8 w-8 text-teal-600" />
            Topic Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Organize content by topic</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Topic
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : topics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tags className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No topics yet</p>
            <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={openCreate}>
              Create your first topic
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {topics.map((topic) => (
            <Card key={topic.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-6 text-center">{topic.displayOrder}</span>
                  <div>
                    <p className="font-medium text-sm">{topic.name}</p>
                    <p className="text-xs text-slate-400">
                      {topic.postCount} post{topic.postCount !== 1 ? 's' : ''} · /{topic.slug}
                    </p>
                  </div>
                  {!topic.isActive && (
                    <Badge className="bg-slate-100 text-slate-500 border-0 text-xs">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(topic)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleToggleActive(topic)}
                    className={topic.isActive ? 'text-slate-400' : 'text-green-600'}
                  >
                    {topic.isActive ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Topic' : 'New Topic'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-2 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Topic name" />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? 'Saving...' : editTarget ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
