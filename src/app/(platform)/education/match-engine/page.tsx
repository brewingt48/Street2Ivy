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
  Users,
  RefreshCw,
  ListOrdered,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Info,
} from 'lucide-react';

interface EngineStats {
  scores: {
    total_scores: string;
    stale_scores: string;
    avg_score: string;
    max_score: string;
    min_score: string;
    avg_computation_ms: string;
    unique_students: string;
    unique_listings: string;
  };
  queue: {
    pending: string;
    processed: string;
    total: string;
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
            Proveground&apos;s Proprietary <strong>Match Engine&trade;</strong>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
          {/* Stats Grid */}
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <BarChart3 className="h-4 w-4" />
                    Total Match Scores
                    <InfoTooltip text="The total number of student-to-listing match scores computed by the engine. Each score represents a unique pairing evaluated across 6 weighted dimensions (skills, schedule, sustainability, growth, trust, and network affinity)." />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Number(stats.scores.total_scores).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Stale Scores
                    <InfoTooltip text="Scores that need recomputation because underlying data has changed. A score becomes stale when a student updates their profile, skills, or schedule, or when a listing's requirements change. Stale scores are still shown to users while queued for background recomputation. Scores also go stale after 24 hours." />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Number(stats.scores.stale_scores).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Users className="h-4 w-4" />
                    Students Scored
                    <InfoTooltip text="The number of unique students who have at least one match score computed. Each student is scored against every available listing to find the best-fit opportunities." />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Number(stats.scores.unique_students).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Target className="h-4 w-4" />
                    Avg Score to Students
                    <InfoTooltip text="The average match score (0–100) presented to your tenant's students. This composite score blends 6 signals: Skills Alignment (30%), Temporal Fit (25%), Sustainability (15%), Growth Trajectory (10%), Trust/Reliability (10%), and Network Affinity (10%). Higher averages indicate better alignment between your students and available opportunities." />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Number(stats.scores.avg_score || 0).toFixed(1)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <ListOrdered className="h-4 w-4" />
                    Queue Pending
                    <InfoTooltip text="Match score computations waiting to be processed. Items enter the queue when student profiles or listing requirements change. Higher-priority updates (e.g. student profile changes) are processed first. A high pending count is normal after bulk updates." />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Number(stats.queue.pending).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Queue Processed
                    <InfoTooltip text="The total number of recomputation jobs that have been completed. This includes both successful recalculations and any that encountered errors. Compare with Queue Pending to gauge engine throughput." />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Number(stats.queue.processed).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <Clock className="h-4 w-4" />
                    Avg Compute Time
                    <InfoTooltip text="The average wall-clock time (in milliseconds) to compute a single match score. This includes loading student and listing data, evaluating all 6 scoring signals, and saving the result. Typical range is 50–200ms. Higher times may indicate complex data profiles." />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Number(stats.scores.avg_computation_ms || 0).toFixed(0)}ms
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <BarChart3 className="h-4 w-4" />
                    Listings Scored
                    <InfoTooltip text="The number of unique project listings that have been evaluated by the Match Engine. Each listing is scored against all eligible students to identify the best talent matches." />
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
