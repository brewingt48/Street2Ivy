'use client';

/**
 * Student Dashboard Page
 *
 * Shows live stats, recommended projects (smart matching),
 * recent applications, and onboarding progress.
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase,
  FileText,
  Inbox,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Search,
  MapPin,
  TrendingUp,
  Info,
} from 'lucide-react';
import { HelpSupportCard } from '@/components/shared/help-support-card';

interface DashboardData {
  stats: {
    applications: {
      total: number;
      pending: number;
      accepted: number;
      rejected: number;
      completed: number;
    };
    skills: number;
    profileCompleteness: number;
    emailVerified: boolean;
    availableProjects: number;
    unreadMessages: number;
  };
  recentApplications: {
    id: string;
    listingTitle: string;
    corporateName: string;
    status: string;
    submittedAt: string;
    respondedAt: string | null;
  }[];
}

interface Recommendation {
  listingId: string;
  title: string;
  description: string;
  category: string | null;
  company: string | null;
  compensation: string | null;
  remoteAllowed: boolean;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  withdrawn: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-500', icon: XCircle },
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/students/dashboard').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/matching?type=projects&limit=6').then((r) => r.json()).catch(() => ({ recommendations: [] })),
    ])
      .then(([dashboard, auth, matching]) => {
        setData(dashboard);
        setUserName(auth.user?.firstName || '');
        setRecommendations(matching.recommendations || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) return null;

  const { stats, recentApplications } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back{userName ? `, ${userName}` : ''}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Here&apos;s an overview of your activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/projects')}>
            <Search className="mr-2 h-4 w-4" />
            Search Projects
          </Button>
          <Button onClick={() => router.push('/projects')} className="bg-teal-600 hover:bg-teal-700">
            Browse All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
          <div className="text-sm text-teal-800 dark:text-teal-300">
            <p className="font-medium mb-1">Getting Started Tips</p>
            <ul className="space-y-1 text-teal-700 dark:text-teal-400">
              <li>&bull; <strong>Complete your profile</strong> to improve your visibility to corporate partners</li>
              <li>&bull; <strong>Add your skills</strong> in Settings &mdash; our matching algorithm uses them to recommend projects</li>
              <li>&bull; <strong>Browse Projects</strong> to find opportunities that match your interests and expertise</li>
              <li>&bull; <strong>Check your messages</strong> regularly &mdash; partners may reach out with invitations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/applications">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <FileText className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.applications.total}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stats.applications.pending} pending
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/projects">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.availableProjects}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Open for applications
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/inbox">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <Inbox className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreadMessages}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Unread messages
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.profileCompleteness}%</div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                <div
                  className="bg-teal-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${stats.profileCompleteness}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Link */}
      <div className="flex justify-end">
        <Link href="/dashboard/analytics">
          <Button variant="outline" size="sm" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            View Analytics
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {/* Recommended Projects — Smart Matching */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Recommended For You
              </CardTitle>
              <CardDescription>Projects matched to your skills and interests</CardDescription>
            </div>
            <Link href="/projects">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.slice(0, 6).map((rec) => (
                <div
                  key={rec.listingId}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => router.push(`/projects/${rec.listingId}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors line-clamp-1">
                      {rec.title}
                    </h3>
                    <Badge className="bg-teal-50 text-teal-700 border-0 text-xs ml-2 flex-shrink-0">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {rec.matchScore}%
                    </Badge>
                  </div>

                  {rec.company && (
                    <p className="text-xs text-slate-500 mb-2">{rec.company}</p>
                  )}

                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {rec.description}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    {rec.remoteAllowed && (
                      <Badge variant="outline" className="text-xs py-0">
                        <MapPin className="h-2.5 w-2.5 mr-1" /> Remote
                      </Badge>
                    )}
                    {rec.compensation && (
                      <Badge variant="outline" className="text-xs py-0">
                        {rec.compensation}
                      </Badge>
                    )}
                    {rec.matchedSkills.length > 0 && (
                      <span className="text-xs text-green-600">
                        {rec.matchedSkills.length} skill{rec.matchedSkills.length !== 1 ? 's' : ''} matched
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Applications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Your latest project applications</CardDescription>
          </div>
          {stats.applications.total > 0 && (
            <Link href="/applications">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {recentApplications.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-3" />
              <p className="font-medium">No applications yet</p>
              <p className="text-sm mt-1">
                Browse projects and submit your first application
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push('/projects')}
              >
                Browse Projects
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentApplications.map((app) => {
                const config = statusConfig[app.status] || statusConfig.pending;
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{app.listingTitle}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {app.corporateName || 'Company'} &middot;{' '}
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`${config.color} border-0 ml-2`}>
                      {config.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboarding Checklist */}
      {stats.profileCompleteness < 100 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Complete these steps to stand out to employers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ChecklistItem done={stats.emailVerified} label="Verify your email address" />
              <ChecklistItem done={stats.profileCompleteness >= 50} label="Complete your profile" />
              <ChecklistItem done={stats.skills > 0} label="Add your skills" />
              <ChecklistItem done={stats.applications.total > 0} label="Apply to a project" />
            </div>
          </CardContent>
        </Card>
      )}

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
              <p className="font-medium text-slate-900 dark:text-white mb-1">Applications</p>
              <p>Tracks how many projects you&apos;ve applied to. &quot;Pending&quot; means the company hasn&apos;t responded yet.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Available Projects</p>
              <p>The number of published listings currently accepting applications. Browse them to find your next opportunity.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Recommended For You</p>
              <p>Projects matched to your skills using our smart matching algorithm. The percentage shows how well your skills align.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Profile Completeness</p>
              <p>A complete profile with skills, bio, and education details makes you more visible to corporate partners.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <HelpSupportCard />
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
          done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
        }`}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : null}
      </div>
      <span className={done ? 'line-through text-slate-400' : ''}>{label}</span>
    </div>
  );
}
