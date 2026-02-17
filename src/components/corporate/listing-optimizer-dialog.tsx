'use client';

/**
 * AI Listing Optimizer Dialog
 *
 * Analyzes a listing and provides optimization suggestions with
 * scores, improvements, and an optimized description.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Lock,
  Loader2,
  AlertCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Copy,
  Check,
  FileText,
  TrendingUp,
  Eye,
  Lightbulb,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ListingOptimizerDialogProps {
  listingId: string;
  listingTitle: string;
  hasAccess: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyDescription?: (description: string) => void;
  onApplyTitle?: (title: string) => void;
}

interface Improvement {
  category: string;
  suggestion: string;
  impact: string;
}

interface OptimizerResult {
  attractivenessScore: number;
  clarityScore: number;
  improvements: Improvement[];
  optimizedDescription: string;
  optimizedTitle: string;
  summary: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-500';
}

function getScoreBg(score: number): string {
  if (score >= 8) return 'bg-green-100 dark:bg-green-900/20';
  if (score >= 5) return 'bg-yellow-100 dark:bg-yellow-900/20';
  return 'bg-red-100 dark:bg-red-900/20';
}

function ImpactBadge({ impact }: { impact: string }) {
  switch (impact) {
    case 'high':
      return (
        <Badge className="bg-red-100 text-red-700 border-0 text-xs gap-1">
          <ArrowUp className="h-3 w-3" /> High
        </Badge>
      );
    case 'medium':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs gap-1">
          <ArrowRight className="h-3 w-3" /> Medium
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-100 text-slate-600 border-0 text-xs gap-1">
          <ArrowDown className="h-3 w-3" /> Low
        </Badge>
      );
  }
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    description: 'bg-blue-100 text-blue-700',
    compensation: 'bg-green-100 text-green-700',
    skills: 'bg-purple-100 text-purple-700',
    flexibility: 'bg-teal-100 text-teal-700',
    title: 'bg-amber-100 text-amber-700',
    general: 'bg-slate-100 text-slate-600',
  };
  return (
    <Badge className={cn(colors[category] || colors.general, 'border-0 text-xs capitalize')}>
      {category}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ListingOptimizerDialog({
  listingId,
  listingTitle,
  hasAccess,
  open,
  onOpenChange,
  onApplyDescription,
  onApplyTitle,
}: ListingOptimizerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);

  async function handleOptimize() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/listing-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to optimize listing');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopyDescription() {
    if (!result) return;
    navigator.clipboard.writeText(result.optimizedDescription);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 2000);
  }

  function handleCopyTitle() {
    if (!result) return;
    navigator.clipboard.writeText(result.optimizedTitle);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            AI Listing Optimizer
          </DialogTitle>
          <DialogDescription>
            {listingTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Locked State */}
        {!hasAccess && (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                AI Listing Optimization
              </h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Get AI-powered analysis of your listing with scores, improvement suggestions,
                and an optimized description.
              </p>
            </div>
            <Badge className="bg-teal-100 text-teal-700 border-0">
              Available on Professional plan
            </Badge>
          </div>
        )}

        {/* Initial State */}
        {hasAccess && !loading && !error && !result && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mx-auto">
              <Lightbulb className="h-8 w-8 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                Optimize Your Listing
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Our AI will analyze your listing&apos;s attractiveness, clarity, and
                competitiveness, then suggest specific improvements.
              </p>
            </div>
            <Button
              onClick={handleOptimize}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze &amp; Optimize
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-8 space-y-4">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
            <p className="text-sm text-slate-500 text-center">Analyzing your listing...</p>
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button onClick={handleOptimize} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        )}

        {/* Results State */}
        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {result.summary}
            </p>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div className={cn('rounded-lg p-4 text-center', getScoreBg(result.attractivenessScore))}>
                <Eye className="h-5 w-5 mx-auto mb-1 text-slate-500" />
                <div className={cn('text-3xl font-bold', getScoreColor(result.attractivenessScore))}>
                  {result.attractivenessScore}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Attractiveness</p>
                <p className="text-[10px] text-slate-400">How appealing to students</p>
              </div>
              <div className={cn('rounded-lg p-4 text-center', getScoreBg(result.clarityScore))}>
                <FileText className="h-5 w-5 mx-auto mb-1 text-slate-500" />
                <div className={cn('text-3xl font-bold', getScoreColor(result.clarityScore))}>
                  {result.clarityScore}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Clarity</p>
                <p className="text-[10px] text-slate-400">How clear &amp; well-structured</p>
              </div>
            </div>

            {/* Improvements */}
            {result.improvements.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Improvement Suggestions
                  </h4>
                </div>
                <div className="space-y-2">
                  {result.improvements.map((imp, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-800/30"
                    >
                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        <CategoryBadge category={imp.category} />
                        <ImpactBadge impact={imp.impact} />
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {imp.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimized Title */}
            {result.optimizedTitle && result.optimizedTitle !== listingTitle && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Suggested Title
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyTitle}
                      className="text-xs"
                    >
                      {copiedTitle ? (
                        <><Check className="h-3 w-3 mr-1" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3 mr-1" /> Copy</>
                      )}
                    </Button>
                    {onApplyTitle && (
                      <Button
                        size="sm"
                        onClick={() => onApplyTitle(result.optimizedTitle)}
                        className="bg-teal-600 hover:bg-teal-700 text-xs"
                      >
                        Apply Title
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-teal-50/50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {result.optimizedTitle}
                  </p>
                </div>
              </div>
            )}

            {/* Optimized Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Optimized Description
                </h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyDescription}
                    className="text-xs"
                  >
                    {copiedDesc ? (
                      <><Check className="h-3 w-3 mr-1" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copy</>
                    )}
                  </Button>
                  {onApplyDescription && (
                    <Button
                      size="sm"
                      onClick={() => onApplyDescription(result.optimizedDescription)}
                      className="bg-teal-600 hover:bg-teal-700 text-xs"
                    >
                      Apply Description
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800/50 max-h-60 overflow-y-auto">
                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {result.optimizedDescription}
                </p>
              </div>
            </div>

            {/* Re-generate */}
            <Button
              onClick={handleOptimize}
              variant="outline"
              size="sm"
              className="w-full text-slate-500 hover:text-teal-600"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Re-analyze
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
