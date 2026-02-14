'use client';

/**
 * Corporate Partner Dashboard
 *
 * Shows listing stats, application stats, recent applications,
 * invite summary, and recommended students (smart matching).
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase,
  FileText,
  Mail,
  ArrowRight,
  Plus,
  Inbox,
  Sparkles,
  TrendingUp,
  Search,
  GraduationCap,
} from 'lucide-react';

interface DashboardData {
  listings: { active: number; draft: number; closed: number; total: number };
  applications: { pending: number; accepted: number; rejected: number; completed: number; total: number };
  invites: { pending: number; accepted: number; declined: number; total: number };
  unreadMessages: number;
  recentApplications: {
    id: string;
    studentName: string;
    status: string;
    listingTitle: string;
    submittedAt: string;
    gpa: string | null;
  }[];
}

interface StudentRecommendation {
  userId: string;
  firstName: string;
  lastName: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  university: string | null;
  major: string | null;
  gpa: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Declined', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700' },
};

export default function CorporateDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recommendations, setRecommendations] = useState<StudentRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/corporate/dashboard').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ])
      .then(([dashboard, auth]) => {
        setData(dashboard);
        setUserName(auth.user?.firstName || '');

        // If there are active listings, fetch student recommendations for the first one
        if (dashboard.listings?.active > 0) {
          fetch('/api/listings/corporate?status=published&limit=1')
            .then((r) => r.json())
            .then((listingsData) => {
              const firstListing = (listingsData.listings || [])[0];
              if (firstListing) {
                return fetch(`/api/matching?type=students&listingId=${firstListing.id}&limit=6`)
                  .then((r) => r.json())
                  .then((matchingData) => {
                    setRecommendations(matchingData.recommendations || []);
                  });
              }
            })
            .catch(console.error);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-28" />))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back{userName ? `, ${userName}` : ''}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Here&apos;s an overview of your listings and applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/corporate/search-students')}>
            <Search className="h-4 w-4 mr-2" />
            Find Students
          </Button>
          <Button onClick={() => router.push('/corporate/projects/new')} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" /> New Listing
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/corporate/projects')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Briefcase className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.listings.active}</div>
            <p className="text-xs text-slate-500">{data.listings.draft} draft, {data.listings.closed} closed</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/corporate/applications')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.applications.total}</div>
            <p className="text-xs text-slate-500">{data.applications.pending} pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invites Sent</CardTitle>
            <Mail className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.invites.total}</div>
            <p className="text-xs text-slate-500">{data.invites.accepted} accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <Inbox className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.unreadMessages}</div>
            <p className="text-xs text-slate-500">Unread messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Students — Smart Matching */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Recommended Students
              </CardTitle>
              <CardDescription>Top-matched students for your active listings</CardDescription>
            </div>
            <Link href="/corporate/search-students">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.slice(0, 6).map((rec) => (
                <div
                  key={rec.userId}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => router.push('/corporate/search-students')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
                        <GraduationCap className="h-4 w-4 text-teal-600" />
                      </div>
                      <h3 className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                        {rec.firstName} {rec.lastName}
                      </h3>
                    </div>
                    <Badge className="bg-teal-50 text-teal-700 border-0 text-xs flex-shrink-0">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {rec.matchScore}%
                    </Badge>
                  </div>

                  {(rec.university || rec.major) && (
                    <p className="text-xs text-slate-500 mb-2">
                      {rec.university}{rec.university && rec.major ? ' · ' : ''}{rec.major}
                    </p>
                  )}

                  {rec.gpa && (
                    <p className="text-xs text-slate-400 mb-2">GPA: {rec.gpa}</p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {rec.matchedSkills.length > 0 && (
                      <span className="text-xs text-green-600">
                        {rec.matchedSkills.length} skill{rec.matchedSkills.length !== 1 ? 's' : ''} matched
                      </span>
                    )}
                    {rec.matchedSkills.slice(0, 2).map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs py-0">
                        {skill}
                      </Badge>
                    ))}
                    {rec.matchedSkills.length > 2 && (
                      <span className="text-xs text-slate-400">
                        +{rec.matchedSkills.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Latest applications to your projects</CardDescription>
          </div>
          {data.applications.total > 0 && (
            <Link href="/corporate/applications">
              <Button variant="ghost" size="sm">View All <ArrowRight className="ml-1 h-3 w-3" /></Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {data.recentApplications.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-3" />
              <p className="font-medium">No applications yet</p>
              <p className="text-sm mt-1">Create and publish a listing to start receiving applications</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/corporate/projects/new')}>Create Listing</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentApplications.map((app) => {
                const config = statusConfig[app.status] || statusConfig.pending;
                return (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => router.push('/corporate/applications')}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{app.studentName}</p>
                        {app.gpa && <span className="text-xs text-slate-400">GPA: {app.gpa}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{app.listingTitle} &middot; {new Date(app.submittedAt).toLocaleDateString()}</p>
                    </div>
                    <Badge className={`${config.color} border-0 ml-2`}>{config.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
