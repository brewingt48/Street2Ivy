'use client';

/**
 * Education Admin — Student List
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, GraduationCap, ChevronLeft, ChevronRight, Download, Star } from 'lucide-react';
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
}

export default function EducationStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set('q', query);
    try {
      const res = await fetch(`/api/education/students?${params}`);
      const data = await res.json();
      setStudents(data.students || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, query]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Students</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View and manage enrolled students</p>
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
            { key: 'avgPrivateRating', label: 'Avg Rating', format: (v) => v != null ? String(v) : 'N/A' },
            { key: 'privateRatingCount', label: 'Rating Count' },
            { key: 'isActive', label: 'Active', format: (v) => v ? 'Yes' : 'No' },
          ]}
        />
        <p className="text-xs text-slate-400 mt-2">
          Search by name, email, or university. <strong>Active</strong> students can access the platform.
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by name, email, or university..." value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchStudents(); } }} />
        </div>
        <Button onClick={() => { setPage(1); fetchStudents(); }} className="bg-teal-600 hover:bg-teal-700">Search</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : students.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No students found</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {students.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                    {(s.name?.[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.university && <Badge variant="outline" className="text-xs">{s.university}</Badge>}
                  {s.major && <span className="text-xs text-slate-400">{s.major}</span>}
                  {s.avgPrivateRating != null && (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`h-3 w-3 ${star <= Math.round(s.avgPrivateRating!) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      ))}
                      <span className="text-xs font-medium text-slate-600 ml-0.5">{s.avgPrivateRating.toFixed(1)}</span>
                      <span className="text-xs text-slate-400">({s.privateRatingCount})</span>
                    </div>
                  )}
                  <Badge className={s.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
    </div>
  );
}
