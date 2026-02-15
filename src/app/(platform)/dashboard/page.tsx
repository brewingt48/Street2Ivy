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
  User,
  Star,
  Mail,
  Calendar,
  Target,
} from 'lucide-react';
import { HelpSupportCard } from '@/components/shared/help-support-card';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';
import { MatchBreakdown } from '@/components/matching/MatchBreakdown';

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
    invites: {
      total: number;
      pending: number;
      accepted: number;
      declined: number;
    };
    reviews: {
      received: number;
      given: number;
    };
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
  matchBreakdown: {
    skillMatch: number;
    categoryAffinity: number;
    availability: number;
    recencyBoost: number;
    successHistory: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
}

interface TenantFeatures {
  matchEngine?: boolean;
  matchEngineSchedule?: boolean;
  [key: string]: unknown;
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
  const [institution, setInstitution] = useState<{domain: string; name: string; ai_coaching_enabled: boolean; ai_coaching_url: string} | null>(null);
  const [tenantFeatures, setTenantFeatures] = useState<TenantFeatures>({});
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/students/dashboard').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/matching?type=projects&limit=6').then((r) => r.json()).catch(() => ({ recommendations: [] })),
      fetch('/api/profile').then((r) => r.json()).catch(() => ({})),
      fetch('/api/tenant/features').then((r) => r.json()).catch(() => ({ features: {} })),
    ])
      .then(([dashboard, auth, matching, profileData, featuresData]) => {
        setData(dashboard);
        setUserName(auth.user?.firstName || '');
        setRecommendations(matching.recommendations || []);
        if (profileData.institution) {
          setInstitution(profileData.institution);
        }
        setTenantFeatures(featuresData.features || {});
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
          <Button variant="outline" onClick={() => router.push('/settings')}>
            <User className="mr-2 h-4 w-4" />
            View My Profile
          </Button>
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
              <li>&bull; <strong>Add your skills</strong> in Settings &mdash; Proveground&apos;s proprietary <strong>Match Engine&trade;</strong> uses them to pair you with the right projects</li>
              <li>&bull; <strong>Browse Projects</strong> to find opportunities matched to your interests, schedule, and expertise</li>
              <li>&bull; <strong>Check your messages</strong> regularly &mdash; partners may reach out with invitations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
        <Link href="/invites">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invites</CardTitle>
              <Mail className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.invites?.total || 0}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stats.invites?.pending || 0} pending
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/reviews">
          <Card className="hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reviews</CardTitle>
              <Star className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reviews.received}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stats.reviews.given} given
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

      {/* AI Coaching */}
      {institution?.ai_coaching_enabled ? (
        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Career Coach
            </CardTitle>
            <CardDescription>
              Get personalized career guidance, resume tips, and interview preparation powered by AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => router.push('/coaching')}
            >
              Launch AI Coach
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : institution ? (
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="py-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-400" />
              AI Coaching is not yet available for your institution. Ask your university to enable it.
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          AI Coaching is available through participating institutions.
        </p>
      )}

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

      {/* Match Engine™ Schedule Card — only for athletic tenants */}
      {tenantFeatures.matchEngineSchedule && (
        <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              My Schedule
            </CardTitle>
            <CardDescription>
              Manage your sport seasons, academic calendar, and availability to improve your match scores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => router.push('/student/schedule')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Manage Schedule
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* How the Match Engine Works — Instructions */}
      {tenantFeatures.matchEngine && (
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-teal-600" />
              How Proveground&apos;s <strong>Match Engine&trade;</strong> Works
            </CardTitle>
            <CardDescription>
              Our proprietary matching technology pairs you with the right opportunities automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">1. Complete Your Profile</p>
                  <p>Add your skills, major, GPA, and experience. The more information the <strong>Match Engine&trade;</strong> has, the better your matches will be.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">2. Set Your Schedule</p>
                  <p>If your program supports it, update your sport seasons, academic calendar, and weekly availability so matches respect your time commitments.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">3. Review Your Matches</p>
                  <p>Projects appear in &quot;Recommended For You&quot; with a match score (0&ndash;100%). Higher scores mean a stronger fit across all six signals.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">The 6 Matching Signals</p>
                  <p>Every match is scored across six proprietary dimensions:</p>
                </div>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-teal-500" /> <strong>Skills Alignment</strong> &mdash; How well your skills match the project requirements</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> <strong>Temporal Fit</strong> &mdash; Whether the project timeline works with your schedule</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> <strong>Sustainability</strong> &mdash; Can you manage this workload alongside your other commitments</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500" /> <strong>Growth Trajectory</strong> &mdash; How much this project will advance your career development</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> <strong>Trust &amp; Reliability</strong> &mdash; Your track record of completing projects successfully</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500" /> <strong>Network Affinity</strong> &mdash; Connections between your program and the partner organization</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Projects — Smart Matching */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {tenantFeatures.matchEngine ? (
                  <Target className="h-5 w-5 text-teal-600" />
                ) : (
                  <Sparkles className="h-5 w-5 text-amber-500" />
                )}
                Recommended For You
              </CardTitle>
              <CardDescription>
                {tenantFeatures.matchEngine
                  ? <>Projects matched using Proveground&apos;s proprietary <strong>Match Engine&trade;</strong> based on your skills, schedule, and career trajectory.</>
                  : 'Projects suggested by our matching algorithm based on your skills, past application history, and availability.'}
              </CardDescription>
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
                    <div className="flex flex-col items-end ml-2 flex-shrink-0">
                      <MatchScoreBadge score={rec.matchScore} size="sm" />
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {rec.matchedSkills.length} of {rec.matchedSkills.length + rec.missingSkills.length} skills
                      </span>
                    </div>
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

                  {/* Expandable Match Breakdown — Match Engine™ only */}
                  {tenantFeatures.matchEngine && expandedRec === rec.listingId && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                      <MatchBreakdown
                        compositeScore={rec.matchScore}
                        signals={[
                          { name: 'skills', score: (rec.matchBreakdown?.skillMatch || 0) / 100, weight: 0.30 },
                          { name: 'temporal', score: (rec.matchBreakdown?.availability || 0) / 100, weight: 0.25 },
                          { name: 'sustainability', score: 0.5, weight: 0.15 },
                          { name: 'growth', score: (rec.matchBreakdown?.recencyBoost || 0) / 100, weight: 0.10 },
                          { name: 'trust', score: (rec.matchBreakdown?.successHistory || 0) / 100, weight: 0.10 },
                          { name: 'network', score: (rec.matchBreakdown?.categoryAffinity || 0) / 100, weight: 0.10 },
                        ]}
                        matchedSkills={rec.matchedSkills}
                        missingSkills={rec.missingSkills}
                        defaultExpanded
                      />
                    </div>
                  )}

                  {tenantFeatures.matchEngine && (
                    <button
                      className="mt-2 text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedRec(expandedRec === rec.listingId ? null : rec.listingId);
                      }}
                    >
                      {expandedRec === rec.listingId ? 'Hide breakdown' : 'View match breakdown'}
                    </button>
                  )}
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
              <p>
                {tenantFeatures.matchEngine
                  ? <>Projects matched using Proveground&apos;s proprietary <strong>Match Engine&trade;</strong>. Click &quot;View match breakdown&quot; to see how each of the six signals &mdash; Skills, Temporal Fit, Sustainability, Growth, Trust, and Network &mdash; contributes to your composite score.</>
                  : 'Projects matched to your skills using our smart matching algorithm. The percentage shows how well your skills align.'}
              </p>
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
