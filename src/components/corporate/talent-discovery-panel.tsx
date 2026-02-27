'use client';

/**
 * AI Talent Discovery Panel
 *
 * Analyzes a set of students against a listing and shows per-student
 * AI insights with fit scores and talking points for outreach.
 */

import { useState } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
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
  MessageSquare,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TalentDiscoveryPanelProps {
  listingId: string;
  listingTitle: string;
  studentIds: string[];
  hasAccess: boolean;
}

interface Discovery {
  studentId: string;
  studentName: string;
  summary: string;
  talkingPoints: string[];
  fitScore: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): { bg: string; text: string } {
  if (score >= 75) return { bg: 'bg-green-100', text: 'text-green-700' };
  if (score >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
  return { bg: 'bg-red-100', text: 'text-red-700' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TalentDiscoveryPanel({
  listingId,
  listingTitle,
  studentIds,
  hasAccess,
}: TalentDiscoveryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveries, setDiscoveries] = useState<Discovery[] | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // ---- locked / upgrade prompt -------------------------------------------

  if (!hasAccess) {
    return (
      <Card className="border-dashed border-slate-300 dark:border-slate-600">
        <CardContent className="py-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                AI Talent Discovery
              </h3>
            </div>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Get AI-powered insights on how each student matches your project,
              with personalized outreach talking points.
            </p>
          </div>
          <Badge className="bg-teal-100 text-teal-700 border-0 text-xs">
            Requires Professional or Enterprise Plan
          </Badge>
        </CardContent>
      </Card>
    );
  }

  // ---- generate handler -------------------------------------------------

  async function handleDiscover() {
    if (studentIds.length === 0) return;

    setLoading(true);
    setError(null);
    setDiscoveries(null);

    try {
      const response = await csrfFetch('/api/ai/talent-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, studentIds: studentIds.slice(0, 10) }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to run talent discovery');
      }

      const data = await response.json();
      setDiscoveries(data.discoveries || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ---- loading state ----------------------------------------------------

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base">AI Talent Discovery</CardTitle>
          </div>
          <CardDescription>
            Analyzing {studentIds.length} student{studentIds.length !== 1 ? 's' : ''} against &quot;{listingTitle}&quot;...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
          </div>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // ---- error state ------------------------------------------------------

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base">AI Talent Discovery</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button onClick={handleDiscover} variant="outline" className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---- results display --------------------------------------------------

  if (discoveries) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-base">AI Talent Discovery</CardTitle>
            </div>
            <Button
              onClick={handleDiscover}
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 hover:text-teal-600"
            >
              <Sparkles className="h-3 w-3 mr-1" /> Re-analyze
            </Button>
          </div>
          <CardDescription>
            {discoveries.length} student{discoveries.length !== 1 ? 's' : ''} analyzed for &quot;{listingTitle}&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {discoveries.map((disc) => {
            const colors = getScoreColor(disc.fitScore);
            const isExpanded = expandedStudentId === disc.studentId;

            return (
              <div
                key={disc.studentId}
                className="border rounded-lg transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => setExpandedStudentId(isExpanded ? null : disc.studentId)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={cn(colors.bg, colors.text, 'border-0 text-xs font-bold shrink-0')}>
                      {disc.fitScore}
                    </Badge>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {disc.studentName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{disc.summary}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t pt-3">
                    {/* Full Summary */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
                        <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          AI Assessment
                        </h5>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {disc.summary}
                      </p>
                    </div>

                    {/* Talking Points */}
                    {disc.talkingPoints.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
                          <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Outreach Talking Points
                          </h5>
                        </div>
                        <ul className="space-y-1">
                          {disc.talkingPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // ---- initial state: discover button -----------------------------------

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-600" />
          <CardTitle className="text-base">AI Talent Discovery</CardTitle>
        </div>
        <CardDescription>
          Analyze {studentIds.length} student{studentIds.length !== 1 ? 's' : ''} for &quot;{listingTitle}&quot;
          and get personalized outreach recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDiscover}
          disabled={studentIds.length === 0}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Discover Talent
        </Button>
      </CardContent>
    </Card>
  );
}
