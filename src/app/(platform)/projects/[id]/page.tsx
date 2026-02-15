'use client';

/**
 * Project Detail Page
 *
 * Shows full project information, required skills, company info,
 * and an apply button (or application status if already applied).
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Wifi,
  Briefcase,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Globe,
  TrendingUp,
  School,
  Trophy,
  ExternalLink,
  Star,
} from 'lucide-react';
import { MatchInsightsCard } from '@/components/coaching/match-insights-card';

interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  category: string | null;
  location: string | null;
  remoteAllowed: boolean;
  compensation: string | null;
  hoursPerWeek: number | null;
  duration: string | null;
  startDate: string | null;
  endDate: string | null;
  maxApplicants: number | null;
  requiresNda: boolean;
  skillsRequired: string[];
  status: string;
  publishedAt: string;
  createdAt: string;
  applicationCount: number;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    jobTitle: string | null;
    companyName: string | null;
    companyWebsite: string | null;
    companyDescription: string | null;
    companyIndustry: string | null;
    companySize: string | null;
    stockSymbol: string | null;
    isPubliclyTraded: boolean;
    alumniOf: string | null;
    sportsPlayed: string | null;
  };
  authorRating: { average: number; count: number } | null;
}

interface UserApplication {
  id: string;
  status: string;
  submittedAt: string;
}

const statusBadge: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Not Selected', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  withdrawn: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-500', icon: XCircle },
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [userApplication, setUserApplication] = useState<UserApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMatchInsights, setHasMatchInsights] = useState(false);
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`/api/projects/${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Project not found');
        return res.json();
      })
      .then((data) => {
        setProject(data.project);
        setUserApplication(data.userApplication);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Check if student has AI match insights access
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.role === 'student') {
          setIsStudent(true);
          // Check AI access
          fetch('/api/ai/usage')
            .then((r) => r.json())
            .then((usage) => {
              // If the usage endpoint returns successfully, AI is enabled
              if (usage.plan === 'professional' || usage.plan === 'enterprise') {
                setHasMatchInsights(true);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [projectId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600">Project Not Found</h3>
            <p className="text-sm text-slate-400 mt-1">{error || 'This project may have been removed.'}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const appStatus = userApplication ? statusBadge[userApplication.status] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Projects
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {project.title}
          </h1>
          <p className="text-slate-500 mt-1">
            Posted by{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {project.author.displayName || `${project.author.firstName} ${project.author.lastName}`}
            </span>
            {project.publishedAt && (
              <>
                {' '}&middot; {new Date(project.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {project.category && (
            <Badge variant="outline">{project.category}</Badge>
          )}
          {project.requiresNda && (
            <Badge variant="outline" className="border-amber-300 text-amber-700">
              <Shield className="h-3 w-3 mr-1" />
              NDA Required
            </Badge>
          )}
        </div>
      </div>

      {/* Application status banner */}
      {userApplication && appStatus && (
        <Card className={`border-l-4 ${
          userApplication.status === 'accepted' ? 'border-l-green-500' :
          userApplication.status === 'pending' ? 'border-l-yellow-500' :
          userApplication.status === 'rejected' ? 'border-l-red-500' :
          'border-l-slate-400'
        }`}>
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={`${appStatus.color} border-0`}>
                {appStatus.label}
              </Badge>
              <span className="text-sm text-slate-500">
                Applied on {new Date(userApplication.submittedAt).toLocaleDateString()}
              </span>
            </div>
            <Link href={`/applications/${userApplication.id}`}>
              <Button variant="outline" size="sm">
                View Application
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About This Project</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm">
                {project.description.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skills Required */}
          {Array.isArray(project.skillsRequired) && project.skillsRequired.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skills Required</CardTitle>
                <CardDescription>
                  Candidates should have experience in the following areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.skillsRequired.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-sm px-3 py-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* About the Sponsor */}
          <Card>
            <CardHeader>
              <CardTitle>About the Sponsor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg shrink-0">
                  {(project.author.firstName?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">
                    {project.author.displayName || `${project.author.firstName} ${project.author.lastName}`}
                  </p>
                  {project.author.jobTitle && (
                    <p className="text-sm text-slate-500">{project.author.jobTitle}{project.author.companyName ? ` at ${project.author.companyName}` : ''}</p>
                  )}
                </div>
              </div>

              {project.author.bio && (
                <p className="text-sm text-slate-600 dark:text-slate-300">{project.author.bio}</p>
              )}

              {(project.author.alumniOf || project.author.sportsPlayed) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {project.author.alumniOf && (
                    <span className="flex items-center gap-1">
                      <School className="h-3.5 w-3.5 text-slate-400" />
                      Alumni of {project.author.alumniOf}
                    </span>
                  )}
                  {project.author.sportsPlayed && (
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-slate-400" />
                      {project.author.sportsPlayed}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* About the Company */}
          <Card>
            <CardHeader>
              <CardTitle>About the Company</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.author.companyName ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-lg">{project.author.companyName}</p>
                    {project.author.isPubliclyTraded && project.author.stockSymbol ? (
                      <a href={`https://www.google.com/finance/quote/${project.author.stockSymbol}:NYSE?hl=en`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                        <Badge className="bg-blue-100 text-blue-700 border-0 hover:bg-blue-200 cursor-pointer">
                          <TrendingUp className="h-3 w-3 mr-1" />${project.author.stockSymbol}
                        </Badge>
                      </a>
                    ) : (
                      <Badge variant="outline" className="border-slate-300 text-slate-500">Privately Held</Badge>
                    )}
                    {project.authorRating && (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span className="text-sm font-medium">{project.authorRating.average.toFixed(1)}</span>
                        <span className="text-xs text-slate-400">({project.authorRating.count} review{project.authorRating.count !== 1 ? 's' : ''})</span>
                      </span>
                    )}
                  </div>

                  {project.author.companyDescription && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">{project.author.companyDescription}</p>
                  )}

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {project.author.companyWebsite && (
                      <a href={project.author.companyWebsite.startsWith('http') ? project.author.companyWebsite : `https://${project.author.companyWebsite}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-teal-600 hover:text-teal-700 hover:underline">
                        <Globe className="h-4 w-4" />
                        {project.author.companyWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {project.author.isPubliclyTraded && project.author.stockSymbol && (
                      <a href={`https://news.google.com/search?q=${encodeURIComponent(project.author.companyName || project.author.stockSymbol)}&hl=en-US`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline">
                        <TrendingUp className="h-4 w-4" /> Company News <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {(project.author.companyIndustry || project.author.companySize) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {project.author.companyIndustry && (
                        <Badge variant="secondary"><Briefcase className="h-3 w-3 mr-1" />{project.author.companyIndustry}</Badge>
                      )}
                      {project.author.companySize && (
                        <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{project.author.companySize} employees</Badge>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">Company information not provided</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply CTA */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {!userApplication ? (
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700 text-lg py-6"
                  onClick={() => router.push(`/projects/${project.id}/apply`)}
                >
                  Apply Now
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled
                >
                  Already Applied
                </Button>
              )}
              <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
                <Users className="h-3 w-3" />
                {project.applicationCount} applicant{project.applicationCount !== 1 ? 's' : ''}
                {project.maxApplicants && ` of ${project.maxApplicants} max`}
              </div>
            </CardContent>
          </Card>

          {/* AI Match Insights (students only) */}
          {isStudent && (
            <MatchInsightsCard
              listingId={project.id}
              hasAccess={hasMatchInsights}
            />
          )}

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.location && (
                <DetailRow icon={MapPin} label="Location" value={project.location} />
              )}
              {project.remoteAllowed && (
                <DetailRow icon={Wifi} label="Remote" value="Remote-friendly" />
              )}
              {project.compensation && (
                <DetailRow icon={DollarSign} label="Compensation" value={project.compensation} />
              )}
              {project.hoursPerWeek && (
                <DetailRow icon={Clock} label="Hours/Week" value={`${project.hoursPerWeek} hours`} />
              )}
              {project.duration && (
                <DetailRow icon={Briefcase} label="Duration" value={project.duration} />
              )}
              {project.startDate && (
                <DetailRow
                  icon={Calendar}
                  label="Start Date"
                  value={new Date(project.startDate).toLocaleDateString()}
                />
              )}
              {project.endDate && (
                <DetailRow
                  icon={Calendar}
                  label="End Date"
                  value={new Date(project.endDate).toLocaleDateString()}
                />
              )}
              {project.maxApplicants && (
                <DetailRow
                  icon={Users}
                  label="Max Applicants"
                  value={String(project.maxApplicants)}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-slate-400 shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
