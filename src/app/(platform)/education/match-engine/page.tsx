'use client';

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Settings2,
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

interface EngineConfig {
  minScoreThreshold: number;
  isDefault?: boolean;
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
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMessage, setRecomputeMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, configRes] = await Promise.all([
        fetch('/api/match-engine/admin/stats'),
        fetch('/api/match-engine/admin/config'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.config);
      } else if (configRes.status === 403) {
        setError('Match Engine\u2122 Admin requires Enterprise plan.');
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
            Proprietary bi-directional matching system &mdash; multi-dimensional scoring
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

          {/* Engine Configuration Overview */}
          {config && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-teal-600" />
                  Engine Configuration
                  {config.isDefault !== false && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Proveground&apos;s proprietary <strong>Match Engine&trade;</strong> uses a multi-dimensional assessment to produce a single composite score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      Minimum Score Threshold
                      <InfoTooltip text="The minimum composite score (0–100) required for a match to be shown to students and corporate partners. Any student-listing pairing that scores below this threshold is filtered out of results. Default is 20. Increasing this value shows only higher-quality matches; lowering it shows more matches including weaker ones." />
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{config.minScoreThreshold}</p>
                    <p className="text-xs text-slate-500 mt-1">Scores below this threshold are filtered from results</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      Scoring Dimensions
                      <InfoTooltip text="The Match Engine evaluates 6 weighted signals per match: Skills Alignment (30%) — direct skill matches and proficiency levels; Temporal Fit (25%) — schedule and availability overlap; Sustainability (15%) — workload balance and burnout risk; Growth Trajectory (10%) — alignment with learning goals; Trust/Reliability (10%) — past completion rates and ratings; Network Affinity (10%) — institutional and alumni connections." />
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">Multi-Factor</p>
                    <p className="text-xs text-slate-500 mt-1">Proprietary algorithm evaluates multiple dimensions per match</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </>
      )}
    </div>
    </TooltipProvider>
  );
}
