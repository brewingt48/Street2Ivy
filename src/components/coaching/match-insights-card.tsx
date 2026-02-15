'use client';

import { useState } from 'react';
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
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Lock,
  Loader2,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchInsightsCardProps {
  listingId: string;
  hasAccess: boolean;
}

interface MatchInsightsData {
  confidenceScore: number;
  matchAssessment: string;
  strengths: string[];
  gaps: string[];
  interviewTips: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): {
  bg: string;
  text: string;
  ring: string;
  label: string;
} {
  if (score > 70) {
    return {
      bg: 'bg-green-100',
      text: 'text-green-700',
      ring: 'ring-green-500',
      label: 'Strong Match',
    };
  }
  if (score >= 40) {
    return {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      ring: 'ring-yellow-500',
      label: 'Moderate Match',
    };
  }
  return {
    bg: 'bg-red-100',
    text: 'text-red-700',
    ring: 'ring-red-500',
    label: 'Needs Work',
  };
}

function ScoreGauge({ score }: { score: number }) {
  const colors = getScoreColor(score);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          {/* Background circle */}
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            strokeWidth="8"
            className="stroke-slate-200 dark:stroke-slate-700"
          />
          {/* Score arc */}
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              'transition-all duration-700 ease-out',
              score > 70 && 'stroke-green-500',
              score >= 40 && score <= 70 && 'stroke-yellow-500',
              score < 40 && 'stroke-red-500',
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-bold', colors.text)}>{score}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">/ 100</span>
        </div>
      </div>
      <Badge className={cn(colors.bg, colors.text, 'border-0 text-xs')}>
        {colors.label}
      </Badge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MatchInsightsCard({ listingId, hasAccess }: MatchInsightsCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<MatchInsightsData | null>(null);

  // ---- locked / upgrade prompt -------------------------------------------

  if (!hasAccess) {
    return (
      <Card className="border-dashed border-slate-300 dark:border-slate-600">
        <CardContent className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <Lock className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                AI Match Insights
              </h3>
            </div>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              See how well your profile matches this project, including strengths,
              gaps, and interview preparation tips.
            </p>
          </div>
          <Badge className="bg-teal-100 text-teal-700 border-0">
            Available on Professional plan
          </Badge>
        </CardContent>
      </Card>
    );
  }

  // ---- generate insights handler -----------------------------------------

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setInsights(null);

    try {
      const response = await fetch('/api/ai/match-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate match insights');
      }

      const data = await response.json();
      setInsights(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ---- loading state -----------------------------------------------------

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base">AI Match Insights</CardTitle>
          </div>
          <CardDescription>Analyzing your profile against this project...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    );
  }

  // ---- error state -------------------------------------------------------

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base">AI Match Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            onClick={handleGenerate}
            variant="outline"
            className="w-full"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---- insights data display ---------------------------------------------

  if (insights) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base">AI Match Insights</CardTitle>
          </div>
          <CardDescription>Personalized analysis of your fit for this project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Confidence Score */}
          <div className="flex justify-center">
            <ScoreGauge score={insights.confidenceScore} />
          </div>

          {/* Match Assessment */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Assessment
              </h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {insights.matchAssessment}
            </p>
          </div>

          {/* Strengths */}
          {insights.strengths.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Strengths
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {insights.strengths.map((strength) => (
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

          {/* Gaps */}
          {insights.gaps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Areas to Improve
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {insights.gaps.map((gap) => (
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

          {/* Interview Tips */}
          {insights.interviewTips.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-teal-600" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Interview Tips
                </h4>
              </div>
              <ol className="space-y-2 pl-1">
                {insights.interviewTips.map((tip, index) => (
                  <li key={index} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Re-generate button */}
          <Button
            onClick={handleGenerate}
            variant="outline"
            size="sm"
            className="w-full text-slate-500 hover:text-teal-600"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Regenerate Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---- initial state: generate button ------------------------------------

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-600" />
          <CardTitle className="text-base">AI Match Insights</CardTitle>
        </div>
        <CardDescription>
          Get a personalized AI analysis of how well your profile matches this project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleGenerate}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Insights
        </Button>
      </CardContent>
    </Card>
  );
}
