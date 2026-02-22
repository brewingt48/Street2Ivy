'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

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

interface SkillGapBreakdownProps {
  gaps: GapItem[];
  strengths: StrengthItem[];
}

type SortKey = 'severity' | 'importance' | 'name';

const severityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  significant: 'bg-amber-100 text-amber-700 border-amber-200',
  minor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

export function SkillGapBreakdown({ gaps, strengths }: SkillGapBreakdownProps) {
  const [sortKey, setSortKey] = useState<SortKey>('severity');

  const severityOrder: Record<string, number> = { critical: 0, significant: 1, minor: 2 };
  const importanceOrder: Record<string, number> = { required: 0, preferred: 1, nice_to_have: 2 };

  const sortedGaps = [...gaps].sort((a, b) => {
    if (sortKey === 'severity') return (severityOrder[a.gapSeverity] ?? 3) - (severityOrder[b.gapSeverity] ?? 3);
    if (sortKey === 'importance') return (importanceOrder[a.importance] ?? 3) - (importanceOrder[b.importance] ?? 3);
    return a.skillName.localeCompare(b.skillName);
  });

  return (
    <div className="space-y-4">
      {/* Gaps Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Skill Gaps ({gaps.length})
            </CardTitle>
            <div className="flex gap-1">
              {(['severity', 'importance', 'name'] as SortKey[]).map((key) => (
                <Button
                  key={key}
                  variant={sortKey === key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSortKey(key)}
                  className="text-xs h-7"
                >
                  {key === 'severity' ? 'Severity' : key === 'importance' ? 'Importance' : 'A-Z'}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedGaps.length === 0 ? (
            <p className="text-sm text-slate-500">No skill gaps identified!</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sortedGaps.map((gap) => (
                <div key={gap.skillId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{gap.skillName}</span>
                    <Badge className={severityColors[gap.gapSeverity] || 'bg-slate-100'}>{gap.gapSeverity}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">{gap.category}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Current: {gap.currentLevel}</span>
                        <span>Required: {gap.requiredLevel}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all"
                          style={{ width: `${(gap.currentLevel / gap.requiredLevel) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {gap.recommendedProjects.length > 0 && (
                    <div className="pt-1">
                      <Link
                        href={`/projects?skill=${encodeURIComponent(gap.skillName)}`}
                        className="text-xs text-teal-600 hover:underline"
                      >
                        Browse {gap.recommendedProjects.length} matching project{gap.recommendedProjects.length !== 1 ? 's' : ''}
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strengths Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Strengths ({strengths.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {strengths.length === 0 ? (
            <p className="text-sm text-slate-500">Complete projects to build verified strengths.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {strengths.map((s) => (
                <Badge key={s.skillId} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  {s.skillName} (Level {s.verifiedLevel})
                  {s.exceedsBy > 0 && <span className="ml-1 text-emerald-500">+{s.exceedsBy}</span>}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
