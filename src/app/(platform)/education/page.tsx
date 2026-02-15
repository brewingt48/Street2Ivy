'use client';

/**
 * Education Admin Dashboard
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Briefcase, CheckCircle2, Clock, Info, TrendingUp, ArrowRight, Star, Crown, Lock } from 'lucide-react';
import { HelpSupportCard } from '@/components/shared/help-support-card';

interface Stats {
  totalStudents: number;
  activeProjects: number;
  completedProjects: number;
  waitlistCount: number;
  avgStudentRating: number | null;
  totalStudentRatings: number;
  ratedStudents: number;
}

interface RecentStudent {
  id: string;
  name: string;
  email: string;
  university: string | null;
  createdAt: string;
}

interface TopStudent {
  id: string;
  name: string;
  email: string;
  university: string | null;
  avgRating: number;
  ratingCount: number;
}

interface FeatureFlags {
  advancedReporting: boolean;
  studentRatings: boolean;
}

export default function EducationDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({ advancedReporting: true, studentRatings: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/education/dashboard')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setRecentStudents(data.recentStudents || []);
        setTopStudents(data.topStudents || []);
        if (data.features) {
          setFeatureFlags(data.features);
        }
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

      {/* Quick Guide for Edu Admins */}
      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
          <div className="text-sm text-teal-800 dark:text-teal-300">
            <p className="font-medium mb-1">Administration Guide</p>
            <ul className="space-y-1 text-teal-700 dark:text-teal-400">
              <li>&bull; <strong>Students</strong> &mdash; View and manage enrolled students from your institution</li>
              <li>&bull; <strong>Corporate Partners</strong> &mdash; Approve or manage corporate partners within your tenant</li>
              <li>&bull; <strong>Waitlist</strong> &mdash; Review and manage students waiting for approval</li>
              <li>&bull; <strong>Branding &amp; Settings</strong> &mdash; Customize your institution&apos;s branding and configuration</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Link href="/education/students">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <GraduationCap className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats?.totalStudents || 0}</div></CardContent>
          </Card>
        </Link>
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
        {featureFlags.studentRatings ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Student Rating</CardTitle>
              <Star className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {stats?.avgStudentRating !== null && stats?.avgStudentRating !== undefined
                    ? stats.avgStudentRating.toFixed(1)
                    : '—'}
                </span>
                {stats?.avgStudentRating != null && (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3 w-3 ${s <= Math.round(stats.avgStudentRating!) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stats?.ratedStudents || 0} student{stats?.ratedStudents !== 1 ? 's' : ''} rated
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Avg Student Rating</CardTitle>
              <Lock className="h-4 w-4 text-slate-300" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                <span className="text-xs text-slate-400">Professional plan required</span>
              </div>
            </CardContent>
          </Card>
        )}
        <Link href="/education/waitlist">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waitlist</CardTitle>
              <Clock className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats?.waitlistCount || 0}</div></CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Link */}
      <div className="flex justify-end">
        <Link href="/education/analytics">
          <Button variant="outline" size="sm" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            View Analytics
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {/* Top Performing Students */}
      {featureFlags.advancedReporting ? (
        topStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Top Performing Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topStudents.map((s, idx) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.university && <Badge variant="outline" className="text-xs">{s.university}</Badge>}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`h-3.5 w-3.5 ${star <= Math.round(s.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        ))}
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">{s.avgRating.toFixed(1)}</span>
                        <span className="text-xs text-slate-400">({s.ratingCount})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Crown className="h-5 w-5" />
              Top Performing Students
              <Badge className="bg-amber-100 text-amber-700 border-0 ml-2">Professional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Upgrade to the Professional or Enterprise plan to unlock student performance leaderboards,
              advanced reporting, and private student ratings from corporate partners.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
              Contact your platform administrator to upgrade your plan.
            </p>
          </CardContent>
        </Card>
      )}

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

      {/* Understanding Your Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-teal-600" />
            Understanding Your Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Total Students</p>
              <p>The number of students registered under your institution&apos;s tenant. Students must use an approved email domain to register.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Active Projects</p>
              <p>Published project listings from corporate partners that your students can apply to.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Completed</p>
              <p>Projects that have been successfully completed by students from your institution.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Waitlist</p>
              <p>Students waiting for approval to join the platform. Review and approve them from the Waitlist page.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <HelpSupportCard />
    </div>
  );
}
