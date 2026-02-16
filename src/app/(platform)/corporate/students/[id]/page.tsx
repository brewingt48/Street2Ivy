'use client';

/**
 * Student Profile — Detailed view of a student for corporate partners
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft,
  GraduationCap,
  MapPin,
  Clock,
  Star,
  Trophy,
  Activity,
  School,
  Send,
  Briefcase,
  CheckCircle2,
  Calendar,
  Building2,
} from 'lucide-react';

interface StudentProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  university: string | null;
  major: string | null;
  graduationYear: number | null;
  gpa: string | null;
  bio: string | null;
  avatarUrl: string | null;
  tenantId: string | null;
  tenantName: string | null;
  sportsPlayed: string | null;
  activities: string | null;
  alumniOf: string | null;
  hoursPerWeek: number | null;
  openToWork: boolean;
  location: string | null;
  completedProjects: number;
  activeProjects: number;
  avgRating: number | null;
  ratingCount: number;
  memberSince: string;
}

interface Skill {
  name: string;
  category: string;
}

interface ExistingInvite {
  id: string;
  status: string;
  sentAt: string;
}

interface Listing {
  id: string;
  title: string;
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [existingInvite, setExistingInvite] = useState<ExistingInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [inviteListingId, setInviteListingId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/corporate/students/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Student not found');
        return r.json();
      })
      .then((data) => {
        setStudent(data.student);
        setSkills(data.skills || []);
        setExistingInvite(data.existingInvite);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Fetch listings for invite
    fetch('/api/listings?status=published')
      .then((r) => r.json())
      .then((d) => setListings((d.listings || []).map((l: Record<string, unknown>) => ({ id: l.id as string, title: l.title as string }))))
      .catch(console.error);
  }, [params.id]);

  const handleInvite = async () => {
    if (!student || !inviteMessage.trim()) return;
    setSending(true);
    try {
      const res = await csrfFetch('/api/corporate/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          listingId: inviteListingId || undefined,
          message: inviteMessage,
        }),
      });
      if (res.ok) {
        setInviteSuccess(true);
        setExistingInvite({ id: '', status: 'pending', sentAt: new Date().toISOString() });
        setTimeout(() => {
          setShowInviteDialog(false);
          setInviteMessage('');
          setInviteListingId('');
          setInviteSuccess(false);
        }, 1500);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send invite');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600">Student not found</h3>
            <p className="text-sm text-slate-400 mt-1">This student may no longer be active on the platform</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group skills by category
  const skillsByCategory: Record<string, string[]> = {};
  skills.forEach((sk) => {
    const cat = sk.category || 'Other';
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push(sk.name);
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Search
        </Button>
        <div className="flex items-center gap-2">
          {existingInvite ? (
            <Badge className={
              existingInvite.status === 'accepted' ? 'bg-green-100 text-green-700 border-0' :
              existingInvite.status === 'declined' ? 'bg-red-100 text-red-600 border-0' :
              'bg-yellow-100 text-yellow-700 border-0'
            }>
              Invite {existingInvite.status === 'pending' ? 'sent' : existingInvite.status}
            </Badge>
          ) : null}
          <Button
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => setShowInviteDialog(true)}
            disabled={existingInvite?.status === 'pending'}
          >
            <Send className="h-4 w-4 mr-2" /> Invite to Project
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-2xl font-bold shrink-0">
              {student.avatarUrl ? (
                <img src={student.avatarUrl} alt={student.name} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                (student.name?.[0] || '?').toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{student.name}</h1>
              {student.university && (
                <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mt-1">
                  <GraduationCap className="h-4 w-4 text-teal-600" />
                  {student.university}
                  {student.graduationYear && ` &middot; Class of ${student.graduationYear}`}
                </p>
              )}
              {student.major && (
                <p className="text-sm text-slate-500 mt-0.5">{student.major}</p>
              )}
              {student.tenantName && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3" /> {student.tenantName}
                </p>
              )}
            </div>
          </div>

          {student.bio && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-4">{student.bio}</p>
          )}

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
            {student.gpa && (
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500" /> GPA: {student.gpa}
              </span>
            )}
            {student.hoursPerWeek != null && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-500" /> {student.hoursPerWeek}h/week available
              </span>
            )}
            {student.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-red-400" /> {student.location}
              </span>
            )}
            {student.openToWork && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">Open to work</Badge>
            )}
          </div>

          {/* Athletics & Activities */}
          <div className="flex flex-wrap gap-3 mt-3">
            {student.sportsPlayed && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-amber-500" /> {student.sportsPlayed}
              </span>
            )}
            {student.activities && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-purple-500" /> {student.activities}
              </span>
            )}
            {student.alumniOf && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <School className="h-3.5 w-3.5 text-blue-500" /> Alumni: {student.alumniOf}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Project History & Ratings */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-4 text-center">
            <Briefcase className="h-5 w-5 text-teal-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{student.completedProjects}</div>
            <p className="text-xs text-slate-500">Completed Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{student.activeProjects}</div>
            <p className="text-xs text-slate-500">Active Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Star className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {student.avgRating ? student.avgRating.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-slate-500">
              {student.ratingCount > 0 ? `${student.ratingCount} review${student.ratingCount !== 1 ? 's' : ''}` : 'No reviews yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
              <div key={category} className="mb-3 last:mb-0">
                <p className="text-xs text-slate-400 mb-1">{category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {categorySkills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Member Since */}
      <p className="text-xs text-slate-400 flex items-center gap-1 justify-center">
        <Calendar className="h-3 w-3" /> Member since {new Date(student.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={() => { setShowInviteDialog(false); setInviteSuccess(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite {student.name}</DialogTitle>
            <DialogDescription>
              Send a project invitation to this student
            </DialogDescription>
          </DialogHeader>

          {inviteSuccess ? (
            <div className="py-8 text-center">
              <div className="text-green-600 text-lg font-medium">Invitation Sent!</div>
              <p className="text-sm text-slate-400 mt-1">The student will be notified</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {listings.length > 0 && (
                  <div className="space-y-2">
                    <Label>Project (optional)</Label>
                    <Select value={inviteListingId} onValueChange={setInviteListingId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {listings.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Message *</Label>
                  <Textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Introduce yourself and describe the opportunity..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleInvite}
                  disabled={sending || !inviteMessage.trim()}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
