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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { UsageMeter } from '@/components/coaching/usage-meter';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Check,
  ChevronsUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiffViewProps {
  hasAccess: boolean;
  initialContent?: string;
  contentType: 'bio' | 'resume_summary';
  targetListingId?: string;
  onApply?: (newContent: string) => void;
}

interface Suggestion {
  id: string;
  original: string;
  suggested: string;
  reason: string;
  applied: boolean;
}

interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  plan: string;
}

// ---------------------------------------------------------------------------
// Content type labels
// ---------------------------------------------------------------------------

const CONTENT_TYPE_LABELS: Record<string, string> = {
  bio: 'Bio',
  resume_summary: 'Resume Summary',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DiffView({
  hasAccess,
  initialContent = '',
  contentType,
  targetListingId,
  onApply,
}: DiffViewProps) {
  const [content, setContent] = useState(initialContent);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [allApplied, setAllApplied] = useState(false);

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
                AI Writing Assistant
              </h3>
            </div>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Get AI-powered suggestions to improve your {CONTENT_TYPE_LABELS[contentType] ?? contentType} with
              side-by-side comparison of changes.
            </p>
          </div>
          <Badge className="bg-teal-100 text-teal-700 border-0">
            Available on Professional plan
          </Badge>
        </CardContent>
      </Card>
    );
  }

  // ---- analyze handler ---------------------------------------------------

  async function handleAnalyze() {
    if (!content.trim()) return;

    setLoading(true);
    setError(null);
    setSuggestions([]);
    setAllApplied(false);

    try {
      const response = await fetch('/api/ai/diff-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          contentType,
          targetListingId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze content');
      }

      const data = await response.json();

      const parsed: Suggestion[] = (data.suggestions ?? []).map(
        (s: { original: string; suggested: string; reason: string }, idx: number) => ({
          id: `suggestion-${idx}`,
          original: s.original,
          suggested: s.suggested,
          reason: s.reason,
          applied: false,
        }),
      );

      setSuggestions(parsed);

      if (data.usage) {
        setUsage(data.usage);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ---- apply a single suggestion -----------------------------------------

  function applySuggestion(suggestionId: string) {
    const suggestion = suggestions.find((s) => s.id === suggestionId);
    if (!suggestion || suggestion.applied) return;

    const updatedContent = content.replace(suggestion.original, suggestion.suggested);
    setContent(updatedContent);
    onApply?.(updatedContent);

    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, applied: true } : s)),
    );
  }

  // ---- apply all suggestions ---------------------------------------------

  function applyAll() {
    let updatedContent = content;

    const unapplied = suggestions.filter((s) => !s.applied);
    for (const suggestion of unapplied) {
      updatedContent = updatedContent.replace(suggestion.original, suggestion.suggested);
    }

    setContent(updatedContent);
    onApply?.(updatedContent);
    setSuggestions((prev) => prev.map((s) => ({ ...s, applied: true })));
    setAllApplied(true);
  }

  // ---- render ------------------------------------------------------------

  const hasUnapplied = suggestions.some((s) => !s.applied);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <CardTitle className="text-base">
              AI Writing Assistant
            </CardTitle>
          </div>
          {usage && (
            <UsageMeter
              used={usage.used}
              limit={usage.limit}
              remaining={usage.remaining}
              plan={usage.plan}
            />
          )}
        </div>
        <CardDescription>
          Improve your {CONTENT_TYPE_LABELS[contentType] ?? contentType} with AI-powered suggestions
          {targetListingId ? ' tailored to the target project' : ''}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Textarea with current content */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Your {CONTENT_TYPE_LABELS[contentType] ?? contentType}
          </label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Enter your ${CONTENT_TYPE_LABELS[contentType] ?? contentType} here...`}
            className="min-h-[120px] resize-y"
            disabled={loading}
          />
        </div>

        {/* Analyze button */}
        <Button
          onClick={handleAnalyze}
          disabled={loading || !content.trim()}
          className="w-full bg-teal-600 hover:bg-teal-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze with AI
            </>
          )}
        </Button>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Suggestions list */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            {/* Apply All header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
              </p>
              {hasUnapplied && !allApplied && (
                <Button
                  onClick={applyAll}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <ChevronsUp className="h-3.5 w-3.5 mr-1.5" />
                  Apply All
                </Button>
              )}
              {allApplied && (
                <Badge className="bg-green-100 text-green-700 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  All Applied
                </Badge>
              )}
            </div>

            {/* Individual suggestions */}
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={cn(
                  'rounded-lg border p-4 space-y-3 transition-colors',
                  suggestion.applied
                    ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
                    : 'border-slate-200 dark:border-slate-700',
                )}
              >
                {/* Original and suggested text */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {/* Original */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-red-500">
                      Original
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-through decoration-red-400/60">
                      {suggestion.original}
                    </p>
                  </div>

                  {/* Suggested */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-green-600">
                      Suggested
                    </span>
                    <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                      {suggestion.suggested}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <p className="text-xs text-slate-500 italic leading-relaxed">
                  {suggestion.reason}
                </p>

                {/* Accept button */}
                {!suggestion.applied ? (
                  <Button
                    onClick={() => applySuggestion(suggestion.id)}
                    size="sm"
                    variant="outline"
                    className="text-teal-600 border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Accept
                  </Button>
                ) : (
                  <Badge className="bg-green-100 text-green-700 border-0 w-fit">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Applied
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No suggestions found */}
        {!loading && !error && suggestions.length === 0 && content.trim() && allApplied && (
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">All suggestions have been applied!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
