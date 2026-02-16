'use client';

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Target,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';

interface EngineStats {
  scores: {
    avg_score: string;
    unique_listings: string;
  };
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex text-slate-400 hover:text-slate-600 transition-colors">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export default function MatchEngineDashboard() {
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMessage, setRecomputeMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await fetch('/api/match-engine/admin/stats');

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecompute = async () => {
    setRecomputing(true);
    setRecomputeMessage(null);
    try {
      const res = await csrfFetch('/api/match-engine/admin/recompute', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecomputeMessage(
        `Recomputation triggered. ${data.scoresMarkedStale || 0} scores queued.`
      );
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recomputation failed');
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-teal-600" />
            Match Engine&trade;
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time scoring stats for your network &mdash; hover the <Info className="inline h-3 w-3 text-slate-400" /> icons for details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleRecompute}
            disabled={recomputing}
          >
            {recomputing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Recomputing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Recompute All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {recomputeMessage && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {recomputeMessage}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Target className="h-4 w-4" />
                    Avg Student Match Score
                    <InfoTooltip text="The average match score (0–100) presented to your students. Higher averages indicate stronger alignment between your students and available project opportunities." />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Number(stats.scores.avg_score || 0).toFixed(1)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <BarChart3 className="h-4 w-4" />
                    Projects Scored
                    <InfoTooltip text="The number of unique project listings that have been evaluated by the Match Engine for your network's students." />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Number(stats.scores.unique_listings).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
    </TooltipProvider>
  );
}
