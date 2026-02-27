'use client';

/**
 * Student Skills Gap Dashboard
 *
 * Analyze skills against target career roles with readiness scoring.
 */

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TargetRoleSelector } from '@/components/skills-gap/target-role-selector';
import { ReadinessScoreCard } from '@/components/skills-gap/readiness-score-card';
import { SkillGapBreakdown } from '@/components/skills-gap/skill-gap-breakdown';
import { RecommendedActions } from '@/components/skills-gap/recommended-actions';
import { GapHistoryTimeline } from '@/components/skills-gap/gap-history-timeline';
import { Crosshair } from 'lucide-react';

interface GapItem {
  skillId: string;
  skillName: string;
  category: string;
  requiredLevel: number;
  currentLevel: number;
  gapSeverity: string;
  importance: string;
  recommendedProjects: Array<{ id: string; title: string }>;
}

interface StrengthItem {
  skillId: string;
  skillName: string;
  category: string;
  verifiedLevel: number;
  exceedsBy: number;
}

interface AnalysisResult {
  studentId: string;
  targetRoleId: string;
  targetRoleTitle: string;
  overallReadinessScore: number;
  readinessTier: string;
  gaps: GapItem[];
  strengths: StrengthItem[];
  snapshotId: string;
}

interface Snapshot {
  overall_readiness_score: string | number;
  snapshot_date: string;
  target_role_title: string;
}

export default function SkillsGapPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = useCallback(async (roleId: string) => {
    setLoading(true);
    try {
      const [analysisRes, historyRes] = await Promise.all([
        fetch(`/api/skills-gap/analyze?targetRoleId=${roleId}`),
        fetch(`/api/skills-gap/history?targetRoleId=${roleId}`),
      ]);

      const analysisData = await analysisRes.json();
      const historyData = await historyRes.json();

      if (analysisRes.ok) setAnalysis(analysisData);
      setHistory(historyData.snapshots || []);
    } catch (err) {
      console.error('Failed to load gap analysis:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      fetchAnalysis(selectedRoleId);
    }
  }, [selectedRoleId, fetchAnalysis]);

  const previousScore = history.length > 1 ? Number(history[1].overall_readiness_score) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Crosshair className="h-6 w-6 text-teal-600" />
            Skills Gap Analyzer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Select a target career role to see how your current skills compare to what employers are looking for. Your readiness score is calculated by comparing your skill levels against the requirements for the selected role. Skills confirmed through completed Proveground projects carry more weight than self-reported skills.
          </p>
        </div>
      </div>

      <TargetRoleSelector selectedRoleId={selectedRoleId} onRoleSelect={setSelectedRoleId} />

      {!selectedRoleId && (
        <div className="text-center py-16 text-slate-400">
          <Crosshair className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Select a target career role above to begin your analysis</p>
        </div>
      )}

      {loading && selectedRoleId && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!loading && analysis && (
        <div className="space-y-6">
          <ReadinessScoreCard
            score={analysis.overallReadinessScore}
            tier={analysis.readinessTier}
            previousScore={previousScore}
          />

          <SkillGapBreakdown gaps={analysis.gaps} strengths={analysis.strengths} />

          <RecommendedActions
            recommendations={analysis.gaps.slice(0, 3).map((gap) => ({
              skillName: gap.skillName,
              category: gap.category,
              currentLevel: gap.currentLevel,
              requiredLevel: gap.requiredLevel,
              gapSeverity: gap.gapSeverity,
              importance: gap.importance,
              recommendedProjects: gap.recommendedProjects,
              estimatedScoreImpact: 0,
            }))}
          />

          {history.length > 1 && <GapHistoryTimeline snapshots={history} />}
        </div>
      )}
    </div>
  );
}
