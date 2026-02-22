'use client';

/**
 * Education Admin — Team Huddle Contributor Management
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { ArrowLeft, Plus, Users, Edit2, UserX, UserCheck, AlertCircle, FileText } from 'lucide-react';

interface Contributor {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  title: string | null;
  classYear: string | null;
  bio: string | null;
  isActive: boolean;
  invitedAt: string;
  postCount: number;
  publishedCount: number;
}

const roleColors: Record<string, string> = {
  alumni: 'bg-blue-100 text-blue-700',
  partner: 'bg-purple-100 text-purple-700',
  admin: 'bg-teal-100 text-teal-700',
};

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function HuddleContributorsPage() {
  const router = useRouter();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('alumni');
  const [inviteTitle, setInviteTitle] = useState('');
  const [classYear, setClassYear] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchContributors = () => {
    setLoading(true);
    fetch('/api/education/huddle/contributors')
      .then((r) => r.json())
      .then((d) => setContributors(d.contributors || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchContributors(); }, []);

  const handleInvite = async () => {
    if (!email) { setError('Email is required'); return; }
    setSaving(true);
    setError('');

    try {
      const res = await csrfFetch('/api/education/huddle/contributors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, title: inviteTitle || undefined, classYear: classYear || undefined, bio: bio || undefined }),
      });
      if (res.ok) {
        setInviteOpen(false);
        setEmail(''); setRole('alumni'); setInviteTitle(''); setClassYear(''); setBio('');
        fetchContributors();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to invite');
      }
    } catch {
      setError('Failed to invite');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Contributor) => {
    if (c.isActive) {
      await csrfFetch(`/api/education/huddle/contributors/${c.id}`, { method: 'DELETE' });
    } else {
      await csrfFetch(`/api/education/huddle/contributors/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
    }
    fetchContributors();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.push('/education/huddle')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Content Management
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-8 w-8 text-teal-600" />
            Contributors
          </h1>
          <p className="text-slate-500 mt-1">Manage alumni and partner content contributors</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => { setError(''); setInviteOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Invite Contributor
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : contributors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No contributors yet</p>
            <Button className="mt-4 bg-teal-600 hover:bg-teal-700" onClick={() => setInviteOpen(true)}>
              Invite your first contributor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contributors.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={c.avatarUrl || undefined} />
                    <AvatarFallback>{initials(c.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <Badge className={`border-0 text-xs ${roleColors[c.role] || ''}`}>
                        {c.role}
                      </Badge>
                      {!c.isActive && <Badge className="bg-slate-100 text-slate-500 border-0 text-xs">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {c.email}
                      {c.title && ` · ${c.title}`}
                      {c.classYear && ` · ${c.classYear}`}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <FileText className="h-3 w-3" /> {c.postCount} posts ({c.publishedCount} published)
                      · Invited {new Date(c.invitedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(c)}
                    className={c.isActive ? 'text-slate-400 hover:text-red-600' : 'text-green-600'}>
                    {c.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Contributor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-2 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alumni">Alumni</SelectItem>
                  <SelectItem value="partner">Corporate Partner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input value={inviteTitle} onChange={(e) => setInviteTitle(e.target.value)} placeholder="e.g., VP of Engineering, Stripe" />
            </div>
            <div className="space-y-2">
              <Label>Class Year (optional)</Label>
              <Input value={classYear} onChange={(e) => setClassYear(e.target.value)} placeholder="e.g., Class of 2015" />
            </div>
            <div className="space-y-2">
              <Label>Bio (optional)</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? 'Inviting...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
