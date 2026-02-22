'use client';

/**
 * Education Admin — Student List
 *
 * Grid/card display of enrolled students with search, sort, and filter
 * by name, major, sport, graduation year, and skills readiness score.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Star,
  ShieldOff,
  ShieldCheck,
  AlertTriangle,
  ArrowUpDown,
  Dumbbell,
  BookOpen,
  Calendar,
  Target,
  LayoutGrid,
  List,
} from 'lucide-react';
import { ExportButton } from '@/components/analytics/export-button';

interface Student {
  id: string;
  name: string;
  email: string;
  university: string | null;
  major: string | null;
  graduationYear: number | null;
  gpa: string | null;
  isActive: boolean;
  createdAt: string;
  applicationCount: number;
  avgPrivateRating: number | null;
  privateRatingCount: number;
  sport: string | null;
  readinessScore: number | null;
}

interface Filters {
  majors: string[];
  gradYears: number[];
  sports: string[];
}

type SortKey = 'created_at' | 'name' | 'major' | 'graduation_year' | 'sport' | 'readiness_score' | 'gpa';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'created_at', label: 'Date Joined' },
  { value: 'name', label: 'Name' },
  { value: 'major', label: 'Major' },
  { value: 'graduation_year', label: 'Grad Year' },
  { value: 'sport', label: 'Sport' },
  { value: 'readiness_score', label: 'Skills Score' },
  { value: 'gpa', label: 'GPA' },
];

function getReadinessLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Hire-Ready', color: 'bg-green-100 text-green-700' };
  if (score >= 60) return { label: 'Demonstrating', color: 'bg-teal-100 text-teal-700' };
  if (score >= 40) return { label: 'Building', color: 'bg-amber-100 text-amber-700' };
  return { label: 'Exploring', color: 'bg-slate-100 text-slate-600' };
}

export default function EducationStudentsPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [majorFilter, setMajorFilter] = useState('');
  const [gradYearFilter, setGradYearFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [filters, setFilters] = useState<Filters>({ majors: [], gradYears: [], sports: [] });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Block/Reactivate dialog
  const [actionStudent, setActionStudent] = useState<Student | null>(null);
  const [actionType, setActionType] = useState<'block' | 'reactivate'>('block');
  const [actionReason, setActionReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), sortBy, sortDir });
    if (query) params.set('q', query);
    if (majorFilter) params.set('major', majorFilter);
    if (gradYearFilter) params.set('gradYear', gradYearFilter);
    if (sportFilter) params.set('sport', sportFilter);
    try {
      const res = await fetch(`/api/education/students?${params}`);
      const data = await res.json();
      setStudents(data.students || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      if (data.filters) setFilters(data.filters);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, query, sortBy, sortDir, majorFilter, gradYearFilter, sportFilter]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleSearch = () => { setPage(1); fetchStudents(); };

  const toggleSortDir = () => {
    setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  const handleStatusAction = async () => {
    if (!actionStudent) return;
    setActionSubmitting(true);
    try {
      const res = await csrfFetch(`/api/admin/users/${actionStudent.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType === 'block' ? 'discontinue' : 'reactivate',
          reason: actionReason || undefined,
        }),
      });
      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) => s.id === actionStudent.id ? { ...s, isActive: actionType === 'reactivate' } : s)
        );
        setActionStudent(null);
        setActionReason('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update student status');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionSubmitting(false);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setMajorFilter('');
    setGradYearFilter('');
    setSportFilter('');
    setSortBy('created_at');
    setSortDir('desc');
    setPage(1);
  };

  const hasActiveFilters = query || majorFilter || gradYearFilter || sportFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-teal-600" />
            Students
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View and manage enrolled students. Search by name, email, university, or major. Sort and filter to find specific students.
          </p>
        </div>
        <ExportButton
          data={students as unknown as Record<string, unknown>[]}
          filename="students"
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'university', label: 'University' },
            { key: 'major', label: 'Major' },
            { key: 'graduationYear', label: 'Grad Year' },
            { key: 'sport', label: 'Sport', format: (v) => (v as string) || '' },
            { key: 'readinessScore', label: 'Readiness Score', format: (v) => v != null ? String(v) : '' },
            { key: 'avgPrivateRating', label: 'Avg Rating', format: (v) => v != null ? String(v) : 'N/A' },
            { key: 'privateRatingCount', label: 'Rating Count' },
            { key: 'isActive', label: 'Active', format: (v) => v ? 'Yes' : 'No' },
          ]}
        />
      </div>

      {/* Search + Filters Bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by name, email, university, or major..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
          </div>
          <Button onClick={handleSearch} className="bg-teal-600 hover:bg-teal-700">Search</Button>
        </div>

        {/* Sort + Filter Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Sort:</span>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortKey); setPage(1); }}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleSortDir} title={sortDir === 'asc' ? 'Ascending' : 'Descending'}>
              <ArrowUpDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Major Filter */}
          {filters.majors.length > 0 && (
            <Select value={majorFilter || '__all__'} onValueChange={(v) => { setMajorFilter(v === '__all__' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="All Majors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Majors</SelectItem>
                {filters.majors.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Grad Year Filter */}
          {filters.gradYears.length > 0 && (
            <Select value={gradYearFilter || '__all__'} onValueChange={(v) => { setGradYearFilter(v === '__all__' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="__all__">All Years</SelectItem>
                {filters.gradYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{String(y)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sport Filter */}
          {filters.sports.length > 0 && (
            <Select value={sportFilter || '__all__'} onValueChange={(v) => { setSportFilter(v === '__all__' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="__all__">All Sports</SelectItem>
                {filters.sports.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-400 hover:text-slate-600" onClick={clearFilters}>
              Clear filters
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400'}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Total count */}
          <span className="text-xs text-slate-400">{total} student{total !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Students Display */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-52' : 'h-16'} />
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No students found</p>
            {hasActiveFilters && (
              <Button variant="link" className="text-teal-600 mt-2" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* ===== GRID VIEW ===== */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5 pb-4">
                {/* Header: Avatar + Name + Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-sm shrink-0">
                      {(s.name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/education/students?q=${encodeURIComponent(s.email)}`}
                        className="text-sm font-semibold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate block"
                      >
                        {s.name}
                      </Link>
                      <p className="text-xs text-slate-400 truncate">{s.email}</p>
                    </div>
                  </div>
                  <Badge className={`shrink-0 text-[10px] ${s.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}`}>
                    {s.isActive ? 'Active' : 'Blocked'}
                  </Badge>
                </div>

                {/* Student Details */}
                <div className="space-y-1.5 text-xs">
                  {s.university && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <BookOpen className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.university}</span>
                    </div>
                  )}
                  {s.major && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <GraduationCap className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.major}</span>
                    </div>
                  )}
                  {s.graduationYear && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>Class of {s.graduationYear}</span>
                    </div>
                  )}
                  {s.sport && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Dumbbell className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.sport}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Badges + Actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Readiness Score */}
                    {s.readinessScore != null && (
                      <Badge className={`text-[10px] border-0 ${getReadinessLabel(s.readinessScore).color}`}>
                        <Target className="h-2.5 w-2.5 mr-0.5" />
                        {s.readinessScore}% &mdash; {getReadinessLabel(s.readinessScore).label}
                      </Badge>
                    )}
                    {/* Rating */}
                    {s.avgPrivateRating != null && (
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] font-medium text-slate-600">{s.avgPrivateRating.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400">({s.privateRatingCount})</span>
                      </div>
                    )}
                  </div>

                  {/* Block/Reactivate */}
                  {s.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 px-1.5 text-[10px]"
                      onClick={() => { setActionStudent(s); setActionType('block'); setActionReason(''); }}
                    >
                      <ShieldOff className="h-3 w-3 mr-0.5" /> Block
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-500 hover:text-green-700 hover:bg-green-50 h-6 px-1.5 text-[10px]"
                      onClick={() => { setActionStudent(s); setActionType('reactivate'); setActionReason(''); }}
                    >
                      <ShieldCheck className="h-3 w-3 mr-0.5" /> Reactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* ===== LIST VIEW ===== */
        <div className="space-y-2">
          {students.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                    {(s.name?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/education/students?q=${encodeURIComponent(s.email)}`}
                      className="text-sm font-medium hover:text-teal-600 transition-colors"
                    >
                      {s.name}
                    </Link>
                    <p className="text-xs text-slate-400">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {s.university && <Badge variant="outline" className="text-xs hidden md:inline-flex">{s.university}</Badge>}
                  {s.major && <span className="text-xs text-slate-400 hidden lg:inline">{s.major}</span>}
                  {s.graduationYear && <span className="text-xs text-slate-400 hidden lg:inline">{s.graduationYear}</span>}
                  {s.sport && <Badge variant="outline" className="text-xs hidden xl:inline-flex"><Dumbbell className="h-2.5 w-2.5 mr-1" />{s.sport}</Badge>}
                  {s.readinessScore != null && (
                    <Badge className={`text-[10px] border-0 hidden sm:inline-flex ${getReadinessLabel(s.readinessScore).color}`}>
                      {s.readinessScore}%
                    </Badge>
                  )}
                  {s.avgPrivateRating != null && (
                    <div className="items-center gap-1 hidden sm:flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`h-3 w-3 ${star <= Math.round(s.avgPrivateRating!) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      ))}
                      <span className="text-xs font-medium text-slate-600 ml-0.5">{s.avgPrivateRating.toFixed(1)}</span>
                    </div>
                  )}
                  <Badge className={s.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                    {s.isActive ? 'Active' : 'Blocked'}
                  </Badge>
                  {s.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                      onClick={() => { setActionStudent(s); setActionType('block'); setActionReason(''); }}
                    >
                      <ShieldOff className="h-3.5 w-3.5 mr-1" /> Block
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 h-7 px-2"
                      onClick={() => { setActionStudent(s); setActionType('reactivate'); setActionReason(''); }}
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Reactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Block / Reactivate Confirmation Dialog */}
      <Dialog open={!!actionStudent} onOpenChange={() => setActionStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'block' ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Block Student
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  Reactivate Student
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'block'
                ? `This will block ${actionStudent?.name} from accessing the platform. They will not be able to log in or apply to projects.`
                : `This will restore ${actionStudent?.name}'s access to the platform.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{actionType === 'block' ? 'Reason for blocking (optional)' : 'Note (optional)'}</Label>
              <Textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={actionType === 'block' ? 'e.g. Policy violation, academic ineligibility...' : 'e.g. Issue resolved, reinstatement approved...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionStudent(null)}>Cancel</Button>
            <Button
              onClick={handleStatusAction}
              disabled={actionSubmitting}
              className={actionType === 'block' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {actionSubmitting
                ? 'Processing...'
                : actionType === 'block'
                  ? 'Block Student'
                  : 'Reactivate Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
