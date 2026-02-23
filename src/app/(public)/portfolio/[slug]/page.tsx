'use client';

/**
 * Public Portfolio Page
 *
 * Publicly-accessible portfolio page for students. Fetches portfolio data
 * by slug and records anonymous views. No authentication required.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  GraduationCap,
  Shield,
  Link as LinkIcon,
  Linkedin,
  CheckCircle,
  Briefcase,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BadgeIcon } from '@/components/portfolio/badge-icon';
import { ProjectCard } from '@/components/portfolio/project-card';
import { SkillsRadarChart } from '@/components/portfolio/skills-radar-chart';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface PortfolioProject {
  id: string;
  listingId: string;
  title: string;
  company: string;
  displayOrder: number;
  isFeatured: boolean;
  studentReflection: string | null;
}

interface PortfolioBadge {
  id: string;
  badgeType: string;
  label: string;
  earnedAt: string;
  metadata: Record<string, unknown>;
}

interface PortfolioSkill {
  skill: string;
  level: number;
  maxLevel: number;
  verificationSource: string;
}

interface PublicPortfolioData {
  id: string;
  studentId: string;
  slug: string;
  headline: string;
  bio: string;
  theme: string;
  showSkills: boolean;
  showReadiness: boolean;
  isPublic: boolean;
  viewCount: number;
  studentName: string;
  institution: string;
  projects: PortfolioProject[];
  badges: PortfolioBadge[];
  skills?: PortfolioSkill[];
}

/* -------------------------------------------------------------------------- */
/*  Theme helpers                                                             */
/* -------------------------------------------------------------------------- */

const THEME_CLASSES: Record<string, string> = {
  professional: 'bg-white text-slate-900',
  modern: 'bg-slate-900 text-white',
  minimal: 'bg-white text-slate-800',
  bold: 'bg-white text-slate-900',
};

function getThemeClass(theme: string): string {
  return THEME_CLASSES[theme] ?? THEME_CLASSES.professional;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function PublicPortfolioPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [portfolio, setPortfolio] = useState<PublicPortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Employer context overlay (only populated for authenticated corporate_partner viewers)
  const [employerContext, setEmployerContext] = useState<{
    isEmployer: boolean;
    listings: Array<{ id: string; title: string; skills: string[] }>;
    matchSummary: string | null;
  } | null>(null);

  /* ---- Fetch portfolio data ---- */
  useEffect(() => {
    if (!slug) return;

    const fetchPortfolio = async () => {
      try {
        const res = await fetch(`/api/public/portfolio/${slug}`);
        if (!res.ok) {
          setError(
            res.status === 404
              ? 'Portfolio not found or is private'
              : 'Failed to load portfolio'
          );
          return;
        }
        const data = await res.json();
        setPortfolio(data.portfolio);
      } catch {
        setError('Failed to load portfolio');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [slug]);

  /* ---- Record view (fire-and-forget) ---- */
  useEffect(() => {
    if (!slug) return;

    fetch(`/api/public/portfolio/${slug}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrer: document.referrer || undefined }),
    }).catch(() => {
      // Silently ignore view tracking errors
    });
  }, [slug]);

  /* ---- Non-blocking employer context check ---- */
  useEffect(() => {
    fetch('/api/corporate/dashboard')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.listings) {
          // User is an employer - compute skill overlap
          const employerListings = data.listings.map((l: Record<string, unknown>) => ({
            id: l.id as string,
            title: l.title as string,
            skills: ((l.skills_required as unknown[]) || []).map((s: unknown) =>
              typeof s === 'string' ? s : (s as Record<string, string>)?.name || ''
            ),
          }));
          setEmployerContext({
            isEmployer: true,
            listings: employerListings,
            matchSummary: null,
          });
        }
      })
      .catch(() => {
        /* not an employer, silently ignore */
      });
  }, []);

  /* ---- Share handlers ---- */
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API not available
    });
  }, []);

  const handleShareLinkedIn = useCallback(() => {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'noopener,noreferrer'
    );
  }, []);

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6 pt-16 pb-12 space-y-8">
          {/* Header skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          {/* Badge bar skeleton */}
          <div className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          {/* Projects skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Error / Not found state ---- */
  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield size={48} className="mx-auto text-slate-300" />
          <h1 className="text-2xl font-bold text-slate-900">
            {error || 'Portfolio not found or is private'}
          </h1>
          <p className="text-slate-500 text-sm">
            This portfolio may not exist, or the owner has set it to private.
          </p>
        </div>
      </div>
    );
  }

  /* ---- Sort projects: featured first, then by display order ---- */
  const sortedProjects = [...portfolio.projects].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    return a.displayOrder - b.displayOrder;
  });

  const themeClass = getThemeClass(portfolio.theme);

  return (
    <div className={cn('min-h-screen', themeClass)} data-theme={portfolio.theme}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-16 pb-12">
        {/* ---------------------------------------------------------------- */}
        {/*  Header                                                         */}
        {/* ---------------------------------------------------------------- */}
        <header className="space-y-3 mb-10">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            {portfolio.studentName}
          </h1>

          {portfolio.headline && (
            <p className="text-lg text-slate-600">{portfolio.headline}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            {portfolio.institution && (
              <span className="flex items-center gap-1.5">
                <GraduationCap size={16} />
                {portfolio.institution}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-teal-600">
              <Shield size={14} />
              Verified by Proveground
            </span>
          </div>

          {portfolio.bio && (
            <p className="text-slate-600 leading-relaxed mt-2 max-w-2xl">
              {portfolio.bio}
            </p>
          )}
        </header>

        {/* ---------------------------------------------------------------- */}
        {/*  Badge bar                                                       */}
        {/* ---------------------------------------------------------------- */}
        {portfolio.badges.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Badges
            </h2>
            <div className="flex flex-wrap gap-4">
              {portfolio.badges.map((badge) => (
                <BadgeIcon
                  key={badge.id}
                  type={badge.badgeType}
                  label={badge.label}
                  size="md"
                  showLabel
                />
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/*  Skills chart                                                    */}
        {/* ---------------------------------------------------------------- */}
        {portfolio.showSkills && (
          <section className="mb-10">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Verified Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <SkillsRadarChart skills={portfolio.skills || []} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/*  Employer context overlay                                        */}
        {/* ---------------------------------------------------------------- */}
        {employerContext?.isEmployer && (
          <section className="mb-10">
            <Card className="border-indigo-200 bg-indigo-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-indigo-600" />
                  Employer View
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-3">
                  You&apos;re viewing this portfolio as an employer. This candidate&apos;s skills may align with your active listings.
                </p>
                {employerContext.listings.length > 0 && (
                  <div className="space-y-2">
                    {employerContext.listings.slice(0, 3).map((listing) => {
                      // Compute skill overlap with portfolio badges
                      const portfolioSkills =
                        portfolio?.badges
                          ?.filter((b) => b.badgeType === 'skill_verified')
                          .map((b) => b.label.replace('Verified: ', '')) || [];
                      const matchedSkills = listing.skills.filter((s) =>
                        portfolioSkills.some(
                          (ps) => ps.toLowerCase() === s.toLowerCase()
                        )
                      );
                      return (
                        <div
                          key={listing.id}
                          className="flex items-center justify-between p-2 bg-white rounded border"
                        >
                          <div>
                            <p className="text-sm font-medium">{listing.title}</p>
                            <p className="text-xs text-slate-500">
                              {matchedSkills.length} of {listing.skills.length} skills match
                            </p>
                          </div>
                          <Badge
                            variant={
                              matchedSkills.length > 0 ? 'default' : 'secondary'
                            }
                          >
                            {matchedSkills.length > 0
                              ? 'Potential Match'
                              : 'Review Skills'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/*  Projects                                                        */}
        {/* ---------------------------------------------------------------- */}
        {sortedProjects.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  title={project.title}
                  company={project.company}
                  isFeatured={project.isFeatured}
                  studentReflection={project.studentReflection}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/*  Footer                                                          */}
        {/* ---------------------------------------------------------------- */}
        <footer className="border-t pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Shield size={16} className="text-teal-600" />
            <span>Verified by Proveground</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareLinkedIn}
              className="gap-1.5"
            >
              <Linkedin size={14} />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <CheckCircle size={14} className="text-teal-600" />
                  Copied!
                </>
              ) : (
                <>
                  <LinkIcon size={14} />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
