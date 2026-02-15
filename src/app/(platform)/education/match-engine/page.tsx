'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Brain,
  Clock,
  Battery,
  TrendingUp,
  Shield,
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
  feedback: {
    total_feedback: string;
    avg_rating: string;
  };
}

interface EngineConfig {
  signalWeights: {
    temporal: number;
    skills: number;
    sustainability: number;
    growth: number;
    trust: number;
    network: number;
  };
  minScoreThreshold: number;
  isDefault?: boolean;
}

const signalLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  temporal: { label: 'Temporal Fit', icon: Clock, color: 'text-blue-500' },
  skills: { label: 'Skills', icon: Brain, color: 'text-teal-500' },
  sustainability: { label: 'Sustainability', icon: Battery, color: 'text-green-500' },
  growth: { label: 'Growth', icon: TrendingUp, color: 'text-purple-500' },
  trust: { label: 'Trust', icon: Shield, color: 'text-amber-500' },
  network: { label: 'Network', icon: Users, color: 'text-indigo-500' },
};

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
        setError('Match Engine Admin requires Enterprise plan.');
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
      const res = await fetch('/api/match-engine/admin/recompute', {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-teal-600" />
            ProveGround Match Engine
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            6-signal bi-directional matching system
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
                    Avg Match Score
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
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Number(stats.scores.unique_listings).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Signal Weights */}
          {config && config.signalWeights && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-teal-600" />
                  Signal Weights
                  {config.isDefault !== false && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  How each signal contributes to the composite match score
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(config.signalWeights).map(([key, weight]) => {
                    const cfg = signalLabels[key] || {
                      label: key,
                      icon: Brain,
                      color: 'text-slate-500',
                    };
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800"
                      >
                        <Icon className={`h-5 w-5 ${cfg.color}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {cfg.label}
                          </p>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-teal-500 rounded-full"
                              style={{ width: `${weight * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {Math.round(weight * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Stats */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-teal-600" />
                  Match Feedback
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-slate-500">Total Feedback</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {Number(stats.feedback.total_feedback).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Avg Rating</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {stats.feedback.avg_rating
                        ? `${Number(stats.feedback.avg_rating).toFixed(1)} / 5`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
