'use client';

/**
 * Search Students & Send Invitations
 *
 * Corporate partners can browse students and invite them to projects.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Send, GraduationCap, MapPin, Clock, Star, ChevronLeft, ChevronRight, School, Trophy, Activity, Info } from 'lucide-react';
import { TalentPoolInsights } from '@/components/corporate/talent-pool-insights';

interface Student {
  id: string;
  name: string;
  email: string;
  university: string | null;
  major: string | null;
  graduationYear: number | null;
  gpa: string | null;
  skills: string[];
  bio: string | null;
  hoursPerWeek: number | null;
  location: string | null;
  openToWork: boolean;
  alumniOf: string | null;
  sportsPlayed: string | null;
  activities: string | null;
}

interface Listing {
  id: string;
  title: string;
}

export default function SearchStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Invite dialog
  const [invitingStudent, setInvitingStudent] = useState<Student | null>(null);
  const [inviteListingId, setInviteListingId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchQuery) params.set('q', searchQuery);
      if (graduationYear) params.set('graduationYear', graduationYear);
      const res = await fetch(`/api/corporate/search-students?${params}`);
      const data = await res.json();
      setStudents(data.students || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, graduationYear]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Fetch published listings for invite dropdown
  useEffect(() => {
    fetch('/api/listings?status=published')
      .then((r) => r.json())
      .then((d) => setListings((d.listings || []).map((l: Record<string, unknown>) => ({ id: l.id as string, title: l.title as string }))))
      .catch(console.error);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleInvite = async () => {
    if (!invitingStudent || !inviteMessage.trim()) return;
    setSending(true);
    try {
      const res = await csrfFetch('/api/corporate/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: invitingStudent.id,
          listingId: inviteListingId || undefined,
          message: inviteMessage,
        }),
      });
      if (res.ok) {
        setInviteSuccess(true);
        setTimeout(() => {
          setInvitingStudent(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Find Students</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Search for talented students and invite them to your projects</p>
      </div>

      {/* Matching Explainer */}
      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
          <div className="text-sm text-teal-800 dark:text-teal-300">
            <p className="font-medium mb-1">How Student Matching Works</p>
            <p className="text-teal-700 dark:text-teal-400">
              Our matching considers more than just qualifications. Students are matched based on skills, availability,
              athletic background, schedule compatibility, and growth potential. Use the Talent Pool Insights below to
              understand what students are available and craft postings that attract the best talent.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="py-4">
          <form onSubmit={handleSearch} className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by name or major..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-44">
              <Select value={graduationYear} onValueChange={(v) => { setGraduationYear(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Graduation Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                  <SelectItem value="2028">2028</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Talent Pool Insights */}
      <TalentPoolInsights variant="full" defaultExpanded={false} />

      {/* Results */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      )}

      {!loading && students.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600">No students found</h3>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      )}

      {!loading && students.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students.map((student) => (
              <Card key={student.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold shrink-0">
                        {(student.name?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">{student.name}</h3>
                        {student.university && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {student.university}
                            {student.graduationYear && ` '${String(student.graduationYear).slice(-2)}`}
                          </p>
                        )}
                        {student.major && (
                          <p className="text-xs text-slate-400">{student.major}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 shrink-0"
                      onClick={() => {
                        setInvitingStudent(student);
                        setInviteMessage('');
                        setInviteListingId('');
                      }}
                    >
                      <Send className="h-3 w-3 mr-1" /> Invite
                    </Button>
                  </div>

                  {student.bio && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{student.bio}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-400">
                    {student.gpa && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" /> GPA: {student.gpa}
                      </span>
                    )}
                    {student.hoursPerWeek && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {student.hoursPerWeek}h/week
                      </span>
                    )}
                    {student.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {student.location}
                      </span>
                    )}
                    {student.openToWork && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Open to work</Badge>
                    )}
                    {student.alumniOf && (
                      <span className="flex items-center gap-1">
                        <School className="h-3 w-3" /> Alumni: {student.alumniOf}
                      </span>
                    )}
                    {student.sportsPlayed && (
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" /> {student.sportsPlayed}
                      </span>
                    )}
                    {student.activities && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" /> {student.activities}
                      </span>
                    )}
                  </div>

                  {Array.isArray(student.skills) && student.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {student.skills.slice(0, 6).map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                      {student.skills.length > 6 && (
                        <Badge variant="outline" className="text-xs text-slate-400">
                          +{student.skills.length - 6} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Invite Dialog */}
      <Dialog open={!!invitingStudent} onOpenChange={() => { setInvitingStudent(null); setInviteSuccess(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Student</DialogTitle>
            <DialogDescription>
              Send a project invitation to {invitingStudent?.name}
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
                <Button variant="outline" onClick={() => setInvitingStudent(null)}>Cancel</Button>
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
