'use client';

/**
 * Edit Listing Page
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Send, XCircle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Skill { id: string; name: string; category: string; }

const CATEGORIES = ['Technology','Marketing','Design','Finance','Consulting','Data Science','Engineering','Research','Operations','Legal','Other'];

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [listingStatus, setListingStatus] = useState('draft');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [remoteAllowed, setRemoteAllowed] = useState(false);
  const [compensation, setCompensation] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxApplicants, setMaxApplicants] = useState('');
  const [requiresNda, setRequiresNda] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/listings/${listingId}`).then((r) => r.json()),
      fetch('/api/skills').then((r) => r.json()),
    ]).then(([ld, sd]) => {
      const l = ld.listing;
      setTitle(l.title || ''); setDescription(l.description || ''); setCategory(l.category || '');
      setLocation(l.location || ''); setRemoteAllowed(l.remoteAllowed || false);
      setCompensation(l.compensation || ''); setHoursPerWeek(l.hoursPerWeek ? String(l.hoursPerWeek) : '');
      setDuration(l.duration || ''); setStartDate(l.startDate ? String(l.startDate).split('T')[0] : '');
      setEndDate(l.endDate ? String(l.endDate).split('T')[0] : '');
      setMaxApplicants(l.maxApplicants ? String(l.maxApplicants) : '');
      setRequiresNda(l.requiresNda || false);
      setSelectedSkills(Array.isArray(l.skillsRequired) ? l.skillsRequired : []);
      setListingStatus(l.status); setAllSkills(sd.skills || []);
    }).catch((e) => setError(e.message)).finally(() => setPageLoading(false));
  }, [listingId]);

  const filteredSkills = allSkills.filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()) && !selectedSkills.includes(s.name));

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, category: category || null, location: location || null,
          remoteAllowed, compensation: compensation || null,
          hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek) : null,
          duration: duration || null, startDate: startDate || null, endDate: endDate || null,
          maxApplicants: maxApplicants ? parseInt(maxApplicants) : null,
          requiresNda, skillsRequired: selectedSkills,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save'); }
      setSuccess('Listing saved successfully');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    await handleSave();
    try {
      const res = await fetch(`/api/listings/${listingId}/publish`, { method: 'POST' });
      if (res.ok) { setListingStatus('published'); setSuccess('Listing published!'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to publish'); }
  };

  const handleClose = async () => {
    if (!confirm('Close this listing? It will no longer accept applications.')) return;
    try {
      const res = await fetch(`/api/listings/${listingId}/close`, { method: 'POST' });
      if (res.ok) { setListingStatus('closed'); setSuccess('Listing closed'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to close'); }
  };

  if (pageLoading) {
    return (<div className="max-w-3xl mx-auto space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/corporate/projects')}><ArrowLeft className="h-4 w-4 mr-2" /> Back to Listings</Button>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Edit Listing</h1>
        <Badge className={listingStatus === 'published' ? 'bg-green-100 text-green-700 border-0' : listingStatus === 'closed' ? 'bg-red-100 text-red-600 border-0' : 'bg-slate-100 text-slate-600 border-0'}>
          {listingStatus.charAt(0).toUpperCase() + listingStatus.slice(1)}
        </Badge>
      </div>

      {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}
      {success && <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {success}</div>}

      <Card>
        <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2"><Label>Description *</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={remoteAllowed} onChange={(e) => setRemoteAllowed(e.target.checked)} className="rounded border-slate-300" /><span className="text-sm">Remote-friendly</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={requiresNda} onChange={(e) => setRequiresNda(e.target.checked)} className="rounded border-slate-300" /><span className="text-sm">Requires NDA</span></label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Compensation & Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Compensation</Label><Input value={compensation} onChange={(e) => setCompensation(e.target.value)} /></div>
            <div className="space-y-2"><Label>Hours/Week</Label><Input type="number" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Duration</Label><Input value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Max Applicants</Label><Input type="number" value={maxApplicants} onChange={(e) => setMaxApplicants(e.target.value)} className="max-w-xs" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Required Skills ({selectedSkills.length})</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {selectedSkills.length > 0 && (<div className="flex flex-wrap gap-2">{selectedSkills.map((s) => (<Badge key={s} className="bg-teal-600 cursor-pointer" onClick={() => setSelectedSkills((p) => p.filter((x) => x !== s))}>{s} &times;</Badge>))}</div>)}
          <Input placeholder="Search skills..." value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} />
          {skillSearch && (<div className="max-h-48 overflow-y-auto border rounded-md p-3"><div className="flex flex-wrap gap-2">{filteredSkills.slice(0, 30).map((s) => (<Badge key={s.id} variant="outline" className="cursor-pointer hover:bg-teal-50" onClick={() => { setSelectedSkills((p) => [...p, s.name]); setSkillSearch(''); }}>{s.name}</Badge>))}</div></div>)}
        </CardContent>
      </Card>

      <div className="flex justify-between pb-8">
        <Button variant="ghost" onClick={() => router.push('/corporate/projects')}>Cancel</Button>
        <div className="flex gap-3">
          {listingStatus === 'published' && (<Button variant="outline" onClick={handleClose} className="text-red-600 hover:text-red-700"><XCircle className="h-4 w-4 mr-2" /> Close</Button>)}
          <Button variant="outline" onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}</Button>
          {listingStatus === 'draft' && (<Button onClick={handlePublish} disabled={saving} className="bg-teal-600 hover:bg-teal-700"><Send className="h-4 w-4 mr-2" /> Publish</Button>)}
        </div>
      </div>
    </div>
  );
}
