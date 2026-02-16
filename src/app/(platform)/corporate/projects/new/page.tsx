'use client';

/**
 * Create New Listing Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Send, AlertCircle, Sparkles, FileText, Briefcase } from 'lucide-react';
import { ScopingWizard } from '@/components/corporate/scoping-wizard';
import { TalentPoolInsights } from '@/components/corporate/talent-pool-insights';

interface Skill { id: string; name: string; category: string; }

const CATEGORIES = ['Technology','Marketing','Design','Finance','Consulting','Data Science','Engineering','Research','Operations','Legal','Other'];

export default function NewListingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [listingType, setListingType] = useState('project');
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
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [showScopingWizard, setShowScopingWizard] = useState(false);
  const [hasAiScoping, setHasAiScoping] = useState(false);
  const [milestones, setMilestones] = useState<Array<{ title: string; description: string; weekNumber: number }>>([]);

  useEffect(() => {
    fetch('/api/skills').then((r) => r.json()).then((d) => setAllSkills(d.skills || [])).catch(console.error);
    // Check AI scoping access
    fetch('/api/ai/usage')
      .then((r) => r.json())
      .then((usage) => {
        if (usage.plan === 'professional' || usage.plan === 'enterprise') {
          setHasAiScoping(true);
        }
      })
      .catch(() => {});
  }, []);

  const filteredSkills = allSkills.filter((s) => s.name.toLowerCase().includes(skillSearch.toLowerCase()) && !selectedSkills.includes(s.name));

  const buildPayload = () => ({
    title, description, listingType,
    category: category || undefined,
    location: location || undefined,
    remoteAllowed,
    compensation: compensation || undefined,
    hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek) : undefined,
    duration: duration || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    maxApplicants: maxApplicants ? parseInt(maxApplicants) : undefined,
    requiresNda,
    skillsRequired: selectedSkills.length > 0 ? selectedSkills : undefined,
    metadata: milestones.length > 0 ? { milestones } : undefined,
  });

  const handleSaveDraft = async () => {
    if (!title || !description) { setError('Title and description are required'); return; }
    setSaving(true); setError('');
    try {
      const res = await csrfFetch('/api/listings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) });
      if (!res.ok) { const d = await res.json(); const details = d.details ? Object.entries(d.details).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join('; ') : ''; throw new Error(details || d.error || 'Failed to save'); }
      router.push('/corporate/projects');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!title || !description) { setError('Title and description are required'); return; }
    setPublishing(true); setError('');
    try {
      const createRes = await csrfFetch('/api/listings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) });
      if (!createRes.ok) { const d = await createRes.json(); const details = d.details ? Object.entries(d.details).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`).join('; ') : ''; throw new Error(details || d.error || 'Failed to create'); }
      const { listing } = await createRes.json();
      await csrfFetch(`/api/listings/${listing.id}/publish`, { method: 'POST' });
      router.push('/corporate/projects');
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to publish'); } finally { setPublishing(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/corporate/projects')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Listings
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create New Listing</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Describe your project to attract the best student talent</p>
        <p className="text-xs text-slate-400 mt-2">
          Fill in the details below. <strong>Title</strong> and <strong>Description</strong> are required. Add skills to help our matching algorithm connect you with the right students. You can save as a draft and publish later.
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Project Details</CardTitle><CardDescription>Basic information about your project</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Listing Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setListingType('project')}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                  listingType === 'project'
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-950'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                <FileText className={`h-5 w-5 ${listingType === 'project' ? 'text-teal-600' : 'text-slate-400'}`} />
                <div>
                  <div className={`font-medium ${listingType === 'project' ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`}>Project</div>
                  <div className="text-xs text-slate-500">A defined project with deliverables</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setListingType('internship')}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                  listingType === 'internship'
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-950'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                <Briefcase className={`h-5 w-5 ${listingType === 'internship' ? 'text-teal-600' : 'text-slate-400'}`} />
                <div>
                  <div className={`font-medium ${listingType === 'internship' ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`}>Internship</div>
                  <div className="text-xs text-slate-500">An ongoing internship position</div>
                </div>
              </button>
            </div>
          </div>
          <div className="space-y-2"><Label htmlFor="title">Project Title *</Label><Input id="title" placeholder="e.g. Social Media Marketing Campaign" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="desc">Description *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowScopingWizard(true)}
                disabled={!description}
                className="text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                AI Scoping Assistant
              </Button>
            </div>
            <Textarea id="desc" placeholder="Describe the project scope, deliverables, and what you're looking for..." value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label htmlFor="loc">Location</Label><Input id="loc" placeholder="e.g. New York, NY" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={remoteAllowed} onChange={(e) => setRemoteAllowed(e.target.checked)} className="rounded border-slate-300" /><span className="text-sm">Remote-friendly</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={requiresNda} onChange={(e) => setRequiresNda(e.target.checked)} className="rounded border-slate-300" /><span className="text-sm">Requires NDA</span></label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compensation & Schedule</CardTitle>
          <CardDescription className="text-xs">
            This information helps students evaluate the opportunity. All work agreements, contracts, and payments are arranged directly between you and the student, outside the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Compensation</Label><Input placeholder="e.g. $25/hr or $2,000 fixed" value={compensation} onChange={(e) => setCompensation(e.target.value)} /></div>
            <div className="space-y-2"><Label>Hours per Week</Label><Input type="number" placeholder="20" min={1} max={80} value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Duration</Label><Input placeholder="e.g. 3 months" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Max Applicants</Label><Input type="number" placeholder="Leave empty for unlimited" min={1} value={maxApplicants} onChange={(e) => setMaxApplicants(e.target.value)} className="max-w-xs" /></div>
        </CardContent>
      </Card>

      {/* Posting Insights */}
      <TalentPoolInsights
        variant="compact"
        listingContext={{ hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek) : undefined, selectedSkills }}
      />

      <Card>
        <CardHeader><CardTitle>Required Skills ({selectedSkills.length})</CardTitle><CardDescription>Select the skills needed for this project</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map((s) => (<Badge key={s} className="bg-teal-600 cursor-pointer" onClick={() => setSelectedSkills((p) => p.filter((x) => x !== s))}>{s} &times;</Badge>))}
            </div>
          )}
          <Input placeholder="Search skills to add..." value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} />
          {skillSearch && (
            <div className="max-h-48 overflow-y-auto border rounded-md p-3">
              <div className="flex flex-wrap gap-2">
                {filteredSkills.slice(0, 30).map((s) => (<Badge key={s.id} variant="outline" className="cursor-pointer hover:bg-teal-50" onClick={() => { setSelectedSkills((p) => [...p, s.name]); setSkillSearch(''); }}>{s.name}</Badge>))}
                {filteredSkills.length === 0 && <p className="text-sm text-slate-400">No skills found</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI-Generated Milestones */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-600" />
                AI-Generated Milestones ({milestones.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setMilestones([])} className="text-slate-400 hover:text-red-500 text-xs">
                Clear
              </Button>
            </div>
            <CardDescription>Timeline generated by AI Scoping Assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {milestones.map((milestone, index) => (
                <div key={index} className="relative flex gap-4 pb-4 last:pb-0">
                  {index < milestones.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                  )}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 text-xs font-bold shrink-0 z-10">
                    W{milestone.weekNumber}
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{milestone.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pb-8">
        <Button variant="ghost" onClick={() => router.push('/corporate/projects')}>Cancel</Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving || publishing}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save as Draft'}</Button>
          <Button onClick={handlePublish} disabled={saving || publishing} className="bg-teal-600 hover:bg-teal-700"><Send className="h-4 w-4 mr-2" /> {publishing ? 'Publishing...' : 'Save & Publish'}</Button>
        </div>
      </div>

      {/* AI Scoping Wizard */}
      {showScopingWizard && (
        <ScopingWizard
          hasAccess={hasAiScoping}
          description={description}
          onApplyDescription={(d: string) => setDescription(d)}
          onApplySkills={(skills: string[]) => setSelectedSkills((prev) => Array.from(new Set([...prev, ...skills])))}
          onApplyMilestones={(m) => setMilestones(m)}
          onClose={() => setShowScopingWizard(false)}
        />
      )}
    </div>
  );
}
