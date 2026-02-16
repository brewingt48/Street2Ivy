'use client';

/**
 * Search Students & Send Invitations
 *
 * Corporate partners can browse students from their institution or the network,
 * click through to profiles, and invite them to projects.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search,
  Send,
  GraduationCap,
  MapPin,
  Clock,
  Star,
  ChevronLeft,
  ChevronRight,
  School,
  Trophy,
  Activity,
  Info,
  Globe,
  Building2,
  AlertCircle,
  Mail,
} from 'lucide-react';
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
  tenantName: string | null;
  isInNetwork: boolean;
}

interface Listing {
  id: string;
  title: string;
}

export default function SearchStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [scope, setScope] = useState<'tenant' | 'network'>('tenant');
  const [institution, setInstitution] = useState('');
  const [universities, setUniversities] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Invite dialog
  const [invitingStudent, setInvitingStudent] = useState<Student | null>(null);
  const [inviteListingId, setInviteListingId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', scope });
      if (searchQuery) params.set('q', searchQuery);
      if (graduationYear) params.set('graduationYear', graduationYear);
      if (scope === 'network' && institution) params.set('institution', institution);
      const res = await fetch(`/api/corporate/search-students?${params}`);
      const data = await res.json();
      setStudents(data.students || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      if (data.universities) setUniversities(data.universities);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, graduationYear, scope, institution]);

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

  const handleScopeChange = (newScope: 'tenant' | 'network') => {
    setScope(newScope);
    setPage(1);
    setInstitution('');
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

      {/* Scope Toggle */}
      <div className="flex gap-2">
        <Button
          variant={scope === 'tenant' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleScopeChange('tenant')}
          className={scope === 'tenant' ? 'bg-teal-600 hover:bg-teal-700' : ''}
        >
          <Building2 className="h-4 w-4 mr-1.5" /> My Institution
        </Button>
        <Button
          variant={scope === 'network' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleScopeChange('network')}
          className={scope === 'network' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          <Globe className="h-4 w-4 mr-1.5" /> Network
        </Button>
      </div>

      {/* Matching Explainer */}
      <div className={`border rounded-lg p-4 ${scope === 'network' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800'}`}>
        <div className="flex items-start gap-3">
          <Info className={`h-5 w-5 mt-0.5 shrink-0 ${scope === 'network' ? 'text-blue-600' : 'text-teal-600'}`} />
          <div className={`text-sm ${scope === 'network' ? 'text-blue-800 dark:text-blue-300' : 'text-teal-800 dark:text-teal-300'}`}>
            {scope === 'tenant' ? (
              <>
                <p className="font-medium mb-1">Searching Your Institution</p>
                <p className="text-teal-700 dark:text-teal-400">
                  Showing students enrolled at your institution. Click a student&apos;s name to view their full profile, or invite them directly to a project.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium mb-1">Searching the Network</p>
                <p className="text-blue-700 dark:text-blue-400">
                  Browse students from across the Proveground network. Filter by institution name to narrow results. Institutions not yet on the network are flagged &mdash; you can invite them to join.
                </p>
              </>
            )}
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
            {scope === 'network' && (
              <div className="w-52">
                <Select value={institution || 'all'} onValueChange={(v) => { setInstitution(v === 'all' ? '' : v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Institutions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Institutions</SelectItem>
                    {universities.map((uni) => (
                      <SelectItem key={uni} value={uni}>{uni}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="w-44">
              <Select value={graduationYear || 'all'} onValueChange={(v) => { setGraduationYear(v === 'all' ? '' : v); setPage(1); }}>
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
            <Button type="submit" className={scope === 'network' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'}>
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Talent Pool Insights */}
      <TalentPoolInsights variant="full" defaultExpanded={false} scope={scope} />

      {/* Results count */}
      {!loading && total > 0 && (
        <p className="text-sm text-slate-500">{total} student{total !== 1 ? 's' : ''} found</p>
      )}

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
            <p className="text-sm text-slate-400 mt-1">
              {scope === 'network'
                ? 'Try a different institution or broader search criteria'
                : 'Try adjusting your search criteria or switch to Network search'}
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && students.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students.map((student) => (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex items-start gap-3 min-w-0 cursor-pointer group"
                      onClick={() => router.push(`/corporate/students/${student.id}`)}
                    >
                      <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold shrink-0">
                        {(student.name?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate group-hover:text-teal-600 transition-colors cursor-pointer">
                          {student.name}
                        </h3>
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
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
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
                  </div>

                  {/* Network badges */}
                  {scope === 'network' && student.tenantName && (
                    <div className="mt-2">
                      {student.isInNetwork ? (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                          <Globe className="h-3 w-3 mr-1" /> {student.tenantName} &middot; In Network
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" /> {student.tenantName} &middot; Not in Network
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                            onClick={() => router.push('/inbox?action=invite-institution&name=' + encodeURIComponent(student.tenantName || student.university || ''))}
                          >
                            <Mail className="h-3 w-3 mr-1" /> Invite to Network
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

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
