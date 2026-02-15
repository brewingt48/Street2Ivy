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
  Info,
  User,
  Target,
  Lightbulb,
  DollarSign,
  MapPin,
  Star as StarIcon,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { HelpSupportCard } from '@/components/shared/help-support-card';
import { MatchScoreBadge } from '@/components/matching/MatchScoreBadge';

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

interface AttractivenessData {
  attractivenessScore: number;
  signals: {
    compensation: { score: number; details: Record<string, unknown> };
    flexibility: { score: number; details: Record<string, unknown> };
    reputation: { score: number; details: Record<string, unknown> };
    completionRate: { score: number; details: Record<string, unknown> };
    growthOpportunity: { score: number; details: Record<string, unknown> };
  };
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
  const [hasMatchEngine, setHasMatchEngine] = useState(false);
  const [attractiveness, setAttractiveness] = useState<AttractivenessData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/corporate/dashboard').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/tenant/features').then((r) => r.json()).catch(() => ({ features: {} })),
    ])
      .then(([dashboard, auth, featuresData]) => {
        setData(dashboard);
        setUserName(auth.user?.firstName || '');
        const features = featuresData.features || {};
        setHasMatchEngine(!!features.matchEngine);

        // If there are active listings, fetch student recommendations and attractiveness for the first one
        if (dashboard.listings?.active > 0) {
          fetch('/api/listings/corporate?status=published&limit=1')
            .then((r) => r.json())
            .then((listingsData) => {
              const firstListing = (listingsData.listings || [])[0];
              if (firstListing) {
                // Fetch recommendations
                fetch(`/api/matching?type=students&listingId=${firstListing.id}&limit=6`)
                  .then((r) => r.json())
                  .then((matchingData) => {
                    setRecommendations(matchingData.recommendations || []);
                  })
                  .catch(console.error);

                // Fetch attractiveness score (best-effort, works for all tenants with matchEngine)
                if (features.matchEngine) {
                  fetch(`/api/match-engine/attractiveness/${firstListing.id}`)
                    .then((r) => r.ok ? r.json() : null)
                    .then((attrData) => {
                      if (attrData) setAttractiveness(attrData);
                    })
                    .catch(() => {});
                }
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
          <Button variant="outline" onClick={() => router.push('/settings')}>
            <User className="h-4 w-4 mr-2" />
            My Profile
          </Button>
          <Button variant="outline" onClick={() => router.push('/corporate/search-students')}>
            <Search className="h-4 w-4 mr-2" />
            Find Students
          </Button>
          <Button onClick={() => router.push('/corporate/projects/new')} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" /> New Listing
          </Button>
        </div>
      </div>

      {/* Quick Tips for Corporate Partners */}
      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
          <div className="text-sm text-teal-800 dark:text-teal-300">
            <p className="font-medium mb-1">Quick Guide</p>
            <ul className="space-y-1 text-teal-700 dark:text-teal-400">
              <li>&bull; <strong>New Listing</strong> &mdash; Create a project listing describing the work, skills needed, and compensation</li>
              <li>&bull; <strong>Applications</strong> &mdash; Review student applications, accept or decline, and mark projects as complete</li>
              <li>&bull; <strong>Find Students</strong> &mdash; Search the student pool or let Proveground&apos;s proprietary <strong>Match Engine&trade;</strong> surface the best candidates</li>
              <li>&bull; <strong>Messages</strong> &mdash; Communicate with students about applications and project details</li>
              <li>&bull; <strong>Note:</strong> Proveground is a matching and discovery platform &mdash; all work agreements, contracts, and payments are arranged directly between you and the student, outside the platform</li>
            </ul>
          </div>
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
        <Link href="/inbox">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <Inbox className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.unreadMessages}</div>
              <p className="text-xs text-slate-500">Unread messages</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Analytics Link */}
      <div className="flex justify-end">
        <Link href="/corporate/analytics">
          <Button variant="outline" size="sm" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            View Analytics
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
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
              <CardDescription>
                {hasMatchEngine
                  ? <>Students matched to your listing using Proveground&apos;s proprietary <strong>Match Engine&trade;</strong>. Composite scores reflect a multi-dimensional assessment of each candidate&apos;s fit.</>
                  : 'Students matched to your listing\u0027s required skills using our algorithm. The percentage shows how many of your required skills each student has.'}
              </CardDescription>
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
                    <MatchScoreBadge score={rec.matchScore} size="sm" />
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

      {/* How the Match Engine Works — Corporate Partner Guide */}
      {hasMatchEngine && (
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-teal-600" />
              How Proveground&apos;s <strong>Match Engine&trade;</strong> Works for Partners
            </CardTitle>
            <CardDescription>
              Our proprietary matching technology surfaces the best student talent for your projects automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-600 dark:text-slate-300">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">1. Post a Listing</p>
                <p>Describe the project, required skills, timeline, and compensation. The <strong>Match Engine&trade;</strong> uses this to find the best student matches.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">2. Review Matches</p>
                <p>Students appear in &quot;Recommended&quot; with a composite score (0&ndash;100%). Higher scores mean a stronger overall fit based on multiple proprietary dimensions of our algorithm.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">3. Engage &amp; Hire</p>
                <p>Invite top matches directly, review incoming applications, and build lasting relationships with verified student talent.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Listing Attractiveness — Match Engine™ Suggestions */}
      {hasMatchEngine && (
        <Card className="border-teal-200 dark:border-teal-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Make Your Listings More Attractive
            </CardTitle>
            <CardDescription>
              Proveground&apos;s <strong>Match Engine&trade;</strong> evaluates how attractive your listings are to students. Here&apos;s how to stand out and attract top talent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attractiveness ? (
              <div className="space-y-4">
                {/* Overall Score */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${
                      attractiveness.attractivenessScore >= 80 ? 'text-emerald-600' :
                      attractiveness.attractivenessScore >= 60 ? 'text-teal-600' :
                      attractiveness.attractivenessScore >= 40 ? 'text-amber-600' :
                      'text-red-500'
                    }`}>
                      {attractiveness.attractivenessScore}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">out of 100</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Listing Attractiveness Score
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {attractiveness.attractivenessScore >= 80
                        ? 'Excellent — your listing is highly attractive to students.'
                        : attractiveness.attractivenessScore >= 60
                          ? 'Good — a few improvements could help you attract even more top talent.'
                          : attractiveness.attractivenessScore >= 40
                            ? 'Fair — there are several ways to make your listing more competitive.'
                            : 'Needs improvement — follow the suggestions below to attract more students.'}
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          attractiveness.attractivenessScore >= 80 ? 'bg-emerald-500' :
                          attractiveness.attractivenessScore >= 60 ? 'bg-teal-500' :
                          attractiveness.attractivenessScore >= 40 ? 'bg-amber-500' :
                          'bg-red-400'
                        }`}
                        style={{ width: `${attractiveness.attractivenessScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actionable Suggestions Based on Signals */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Suggestions to Improve</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {attractiveness.signals.compensation.score < 70 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10">
                        <DollarSign className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Improve Compensation</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {attractiveness.signals.compensation.score < 40
                              ? 'Consider offering competitive pay ($18+/hr). Paid listings attract 3x more applicants.'
                              : 'Listing specific pay rates (e.g., "$20/hr") rather than "competitive" increases applications.'}
                          </p>
                        </div>
                      </div>
                    )}
                    {attractiveness.signals.flexibility.score < 70 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10">
                        <MapPin className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Add Flexibility</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {!attractiveness.signals.flexibility.details.remote
                              ? 'Enable remote work — remote-friendly listings see significantly more applicants from student-athletes with busy schedules.'
                              : 'Consider reducing required hours per week. Students with sports commitments prefer 10-20 hrs/week.'}
                          </p>
                        </div>
                      </div>
                    )}
                    {attractiveness.signals.reputation.score < 70 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/10">
                        <StarIcon className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Build Your Reputation</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Complete past projects successfully and encourage students to leave reviews. Partners with 4+ star ratings attract top talent.
                          </p>
                        </div>
                      </div>
                    )}
                    {attractiveness.signals.completionRate.score < 70 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Improve Completion Rate</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Mark projects as complete when finished. A high completion rate signals reliability and helps attract future applicants.
                          </p>
                        </div>
                      </div>
                    )}
                    {attractiveness.signals.growthOpportunity.score < 70 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-teal-200 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-900/10">
                        <Zap className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Highlight Growth Opportunities</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Mention mentorship, training, leadership experience, or full-time potential in your listing description. Students prioritize career development.
                          </p>
                        </div>
                      </div>
                    )}
                    {attractiveness.attractivenessScore >= 80 && (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 md:col-span-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Looking Great!</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Your listing scores well across all attractiveness dimensions. Keep maintaining your reputation and you&apos;ll continue attracting top student talent.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* No attractiveness data — show general tips */
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                  Improve your listings to attract more and better student applicants:
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border">
                    <DollarSign className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Offer Competitive Pay</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Paid listings with specific rates (e.g., &quot;$20/hr&quot;) attract significantly more applicants than unpaid or vague compensation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border">
                    <MapPin className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Enable Remote Work</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Remote-friendly positions attract more student-athletes who have complex schedules with sports and academics.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border">
                    <StarIcon className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Build Your Reputation</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Complete projects and encourage students to leave reviews. Partners with strong ratings attract the best talent.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border">
                    <Zap className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Highlight Growth</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Mention mentorship, training, leadership, or full-time potential. Students prioritize career development opportunities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              <p className="font-medium text-slate-900 dark:text-white mb-1">Active Listings</p>
              <p>Published project listings that are visible to students and accepting applications. Drafts are not visible until published.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Applications</p>
              <p>Student submissions to your projects. &quot;Pending&quot; means they&apos;re awaiting your review. Click to accept, decline, or mark complete.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Invites Sent</p>
              <p>Direct invitations you&apos;ve sent to students. Students can accept or decline your invite.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white mb-1">Recommended Students</p>
              <p>
                {hasMatchEngine
                  ? <>Students matched to your active listings using Proveground&apos;s proprietary <strong>Match Engine&trade;</strong>. Composite scores reflect a multi-dimensional assessment of each student&apos;s fit for your project.</>
                  : 'Students matched to your active listings using our skills-based algorithm. The percentage shows skill alignment.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <HelpSupportCard />
    </div>
  );
}
