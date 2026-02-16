'use client';

/**
 * Education Admin AI Insights Page
 *
 * Enterprise-level analytics powered by AI. Provides two main sections:
 * Portfolio Intelligence (cross-student skills analysis) and Talent Insights
 * (industry trend matching and demand analysis). Requires enterprise plan.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  TrendingUp,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { UpgradePrompt } from '@/components/coaching/upgrade-prompt';
import { csrfFetch } from '@/lib/security/csrf-fetch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PortfolioInsights {
  programStrengths: string[];
  skillGaps: string[];
  recommendations: string[];
  industryReadiness: number;
}

interface DemandTrend {
  skill: string;
  demand: 'high' | 'medium' | 'low';
  trend: 'rising' | 'stable' | 'declining';
}

interface TalentInsightsData {
  demandTrends: DemandTrend[];
  emergingSkills: string[];
  marketAlignment: number;
  actionItems: string[];
}

interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  resetDate: string;
  plan: string;
  model: string;
}

// ---------------------------------------------------------------------------
// Score Gauge Component
// ---------------------------------------------------------------------------

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 70) return { stroke: 'stroke-green-500', text: 'text-green-700', bg: 'bg-green-100', badge: 'Strong' };
    if (s >= 40) return { stroke: 'stroke-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-100', badge: 'Moderate' };
    return { stroke: 'stroke-red-500', text: 'text-red-700', bg: 'bg-red-100', badge: 'Needs Improvement' };
  };

  const colors = getColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48" cy="48" r="40"
            fill="none" strokeWidth="8"
            className="stroke-slate-200 dark:stroke-slate-700"
          />
          <circle
            cx="48" cy="48" r="40"
            fill="none" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-all duration-700 ease-out', colors.stroke)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-bold', colors.text)}>{score}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <Badge className={cn(colors.bg, colors.text, 'border-0 text-xs')}>{colors.badge}</Badge>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend Arrow Component
// ---------------------------------------------------------------------------

function TrendArrow({ trend }: { trend: 'rising' | 'stable' | 'declining' }) {
  if (trend === 'rising') {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
        <ArrowUpRight className="h-3.5 w-3.5" /> Rising
      </span>
    );
  }
  if (trend === 'declining') {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
        <ArrowDownRight className="h-3.5 w-3.5" /> Declining
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-medium">
      <ArrowRight className="h-3.5 w-3.5" /> Stable
    </span>
  );
}

// ---------------------------------------------------------------------------
// Demand Badge Component
// ---------------------------------------------------------------------------

function DemandBadge({ demand }: { demand: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
  };

  return (
    <Badge className={cn(styles[demand], 'border-0 text-xs capitalize')}>
      {demand}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function AiInsightsPage() {
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Portfolio Intelligence state
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [portfolioInsights, setPortfolioInsights] = useState<PortfolioInsights | null>(null);

  // Talent Insights state
  const [talentLoading, setTalentLoading] = useState(false);
  const [talentError, setTalentError] = useState<string | null>(null);
  const [talentInsights, setTalentInsights] = useState<TalentInsightsData | null>(null);

  // Check enterprise access on mount
  useEffect(() => {
    fetch('/api/ai/usage')
      .then((r) => r.json())
      .then((data) => {
        setUsageInfo(data);
      })
      .catch(console.error)
      .finally(() => setCheckingAccess(false));
  }, []);

  // Generate portfolio intelligence
  async function handleGeneratePortfolio() {
    setPortfolioLoading(true);
    setPortfolioError(null);
    setPortfolioInsights(null);

    try {
      const response = await csrfFetch('/api/ai/portfolio-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate portfolio intelligence');
      }

      const data = await response.json();
      setPortfolioInsights(data.insights);
      if (data.usage) setUsageInfo(data.usage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setPortfolioError(message);
    } finally {
      setPortfolioLoading(false);
    }
  }

  // Generate talent insights
  async function handleGenerateTalent() {
    setTalentLoading(true);
    setTalentError(null);
    setTalentInsights(null);

    try {
      const response = await csrfFetch('/api/ai/talent-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate talent insights');
      }

      const data = await response.json();
      setTalentInsights(data.insights);
      if (data.usage) setUsageInfo(data.usage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setTalentError(message);
    } finally {
      setTalentLoading(false);
    }
  }

  // Loading state while checking access
  if (checkingAccess) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Upgrade prompt for non-enterprise tenants
  if (usageInfo && usageInfo.plan !== 'enterprise') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">AI Insights</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Enterprise-level analytics powered by AI
          </p>
        </div>
        <UpgradePrompt
          currentTier={usageInfo.plan}
          requiredTier="enterprise"
          featureName="AI Insights"
          featureDescription="Access cross-student portfolio analysis, talent market insights, industry readiness scoring, and strategic recommendations powered by AI."
          benefits={[
            'Cross-student skills portfolio analysis',
            'Industry demand trend tracking',
            'Market alignment scoring',
            'Curriculum gap identification',
            'Actionable program recommendations',
            'Unlimited AI usage',
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">AI Insights</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Enterprise-level analytics powered by AI
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ----------------------------------------------------------------- */}
        {/* Portfolio Intelligence Section                                     */}
        {/* ----------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-base">Portfolio Intelligence</CardTitle>
            </div>
            <CardDescription>
              Cross-student skills analysis and program effectiveness insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Loading state */}
            {portfolioLoading && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                </div>
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
                <div className="flex flex-wrap gap-2 justify-center">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            )}

            {/* Error state */}
            {portfolioError && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{portfolioError}</span>
                </div>
                <Button onClick={handleGeneratePortfolio} variant="outline" className="w-full">
                  Try Again
                </Button>
              </div>
            )}

            {/* Results display */}
            {portfolioInsights && (
              <div className="space-y-6">
                {/* Industry Readiness Score */}
                <div className="flex justify-center">
                  <ScoreGauge score={portfolioInsights.industryReadiness} label="Industry Readiness" />
                </div>

                {/* Program Strengths */}
                {portfolioInsights.programStrengths.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Program Strengths
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {portfolioInsights.programStrengths.map((strength) => (
                        <Badge
                          key={strength}
                          className="bg-green-100 text-green-700 border-0 hover:bg-green-100"
                        >
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skill Gaps */}
                {portfolioInsights.skillGaps.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Skill Gaps
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {portfolioInsights.skillGaps.map((gap) => (
                        <Badge
                          key={gap}
                          className="bg-amber-100 text-amber-700 border-0 hover:bg-amber-100"
                        >
                          {gap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {portfolioInsights.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="h-4 w-4 text-teal-600" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Recommendations
                      </h4>
                    </div>
                    <ol className="space-y-2 pl-1">
                      {portfolioInsights.recommendations.map((rec, index) => (
                        <li key={index} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Regenerate button */}
                <Button
                  onClick={handleGeneratePortfolio}
                  variant="outline"
                  size="sm"
                  className="w-full text-slate-500 hover:text-teal-600"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Regenerate Analysis
                </Button>
              </div>
            )}

            {/* Initial state: generate button */}
            {!portfolioLoading && !portfolioError && !portfolioInsights && (
              <Button
                onClick={handleGeneratePortfolio}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Analysis
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ----------------------------------------------------------------- */}
        {/* Talent Insights Section                                           */}
        {/* ----------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-base">Talent Insights</CardTitle>
            </div>
            <CardDescription>
              Industry trend matching and talent demand analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Loading state */}
            {talentLoading && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                </div>
                <Skeleton className="h-4 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
                <div className="flex flex-wrap gap-2 justify-center">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            )}

            {/* Error state */}
            {talentError && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{talentError}</span>
                </div>
                <Button onClick={handleGenerateTalent} variant="outline" className="w-full">
                  Try Again
                </Button>
              </div>
            )}

            {/* Results display */}
            {talentInsights && (
              <div className="space-y-6">
                {/* Market Alignment Score */}
                <div className="flex justify-center">
                  <ScoreGauge score={talentInsights.marketAlignment} label="Market Alignment" />
                </div>

                {/* Demand Trends Table */}
                {talentInsights.demandTrends.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-slate-500" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Demand Trends
                      </h4>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50">
                            <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Skill</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Demand</th>
                            <th className="text-left px-3 py-2 font-medium text-slate-600 dark:text-slate-300">Trend</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {talentInsights.demandTrends.map((trend) => (
                            <tr key={trend.skill} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{trend.skill}</td>
                              <td className="px-3 py-2"><DemandBadge demand={trend.demand} /></td>
                              <td className="px-3 py-2"><TrendArrow trend={trend.trend} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Emerging Skills */}
                {talentInsights.emergingSkills.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Emerging Skills
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {talentInsights.emergingSkills.map((skill) => (
                        <Badge
                          key={skill}
                          className="bg-teal-100 text-teal-700 border-0 hover:bg-teal-100"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {talentInsights.actionItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="h-4 w-4 text-teal-600" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Action Items
                      </h4>
                    </div>
                    <ol className="space-y-2 pl-1">
                      {talentInsights.actionItems.map((item, index) => (
                        <li key={index} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Regenerate button */}
                <Button
                  onClick={handleGenerateTalent}
                  variant="outline"
                  size="sm"
                  className="w-full text-slate-500 hover:text-teal-600"
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                  Regenerate Insights
                </Button>
              </div>
            )}

            {/* Initial state: generate button */}
            {!talentLoading && !talentError && !talentInsights && (
              <Button
                onClick={handleGenerateTalent}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Generate Insights
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
