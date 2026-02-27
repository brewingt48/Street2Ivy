'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, BookOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Recommendation {
  skillName: string;
  category: string;
  currentLevel: number;
  requiredLevel: number;
  gapSeverity: string;
  importance: string;
  recommendedProjects: Array<{ id: string; title: string }>;
  estimatedScoreImpact: number;
}

interface RecommendedActionsProps {
  recommendations: Recommendation[];
}

const icons = [Zap, BookOpen, Sparkles];

export function RecommendedActions({ recommendations }: RecommendedActionsProps) {
  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recommended Next Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {recommendations.map((rec, i) => {
            const Icon = icons[i] || Zap;
            return (
              <div key={rec.skillName} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-teal-600" />
                  <span className="font-medium text-sm">{rec.skillName}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Level {rec.currentLevel} &rarr; {rec.requiredLevel} needed
                </p>
                {rec.recommendedProjects.length > 0 ? (
                  <Link
                    href={`/projects?skill=${encodeURIComponent(rec.skillName)}`}
                    className="block text-xs text-teal-600 hover:underline"
                  >
                    {rec.recommendedProjects.length} matching project{rec.recommendedProjects.length !== 1 ? 's' : ''} available
                  </Link>
                ) : (
                  <Link href="/coaching" className="block text-xs text-teal-600 hover:underline">
                    Ask AI Coach for guidance
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
