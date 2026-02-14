'use client';

/**
 * Education Admin Dashboard
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Briefcase, CheckCircle2, Clock } from 'lucide-react';

interface Stats {
  totalStudents: number;
  activeProjects: number;
  completedProjects: number;
  waitlistCount: number;
}

interface RecentStudent {
  id: string;
  name: string;
  email: string;
  university: string | null;
  createdAt: string;
}

export default function EducationDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/education/dashboard')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setRecentStudents(data.recentStudents || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-10 w-64" /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Education Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your students and institution</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.totalStudents || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.activeProjects || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.completedProjects || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waitlist</CardTitle>
            <Clock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.waitlistCount || 0}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Students</CardTitle></CardHeader>
        <CardContent>
          {recentStudents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No students yet</p>
          ) : (
            <div className="space-y-3">
              {recentStudents.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.email}</p>
                  </div>
                  {s.university && <Badge variant="outline" className="text-xs">{s.university}</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
