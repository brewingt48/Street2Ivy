'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StrengthData {
  skillName: string;
  category: string;
  studentCount: number;
  avgLevel: number;
}

interface GapData {
  skillName: string;
  category: string;
  studentCount: number;
  avgGapSeverity: string;
}

interface SkillsHeatmapProps {
  strengths: StrengthData[];
  gaps: GapData[];
  totalStudents: number;
}

export function SkillsHeatmap({ strengths, gaps, totalStudents }: SkillsHeatmapProps) {
  const allSkills = [
    ...strengths.map((s) => ({
      name: s.skillName,
      category: s.category,
      coverage: totalStudents > 0 ? Math.round((s.studentCount / totalStudents) * 100) : 0,
      type: 'strength' as const,
      level: s.avgLevel,
    })),
    ...gaps.map((g) => ({
      name: g.skillName,
      category: g.category,
      coverage: totalStudents > 0 ? Math.round((g.studentCount / totalStudents) * 100) : 0,
      type: 'gap' as const,
      level: 0,
    })),
  ].sort((a, b) => b.coverage - a.coverage).slice(0, 20);

  const getCoverageColor = (coverage: number, type: string) => {
    if (type === 'gap') {
      if (coverage >= 60) return 'bg-red-200 text-red-800';
      if (coverage >= 30) return 'bg-orange-100 text-orange-800';
      return 'bg-yellow-50 text-yellow-800';
    }
    if (coverage >= 60) return 'bg-emerald-200 text-emerald-800';
    if (coverage >= 30) return 'bg-teal-100 text-teal-800';
    return 'bg-teal-50 text-teal-700';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Skills Coverage Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium text-slate-600">Skill</th>
                <th className="text-left py-2 px-3 font-medium text-slate-600">Category</th>
                <th className="text-left py-2 px-3 font-medium text-slate-600">Type</th>
                <th className="text-left py-2 px-3 font-medium text-slate-600">Student %</th>
                <th className="text-left py-2 px-3 font-medium text-slate-600">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {allSkills.map((skill) => (
                <tr key={`${skill.name}-${skill.type}`} className="border-b last:border-0">
                  <td className="py-2 px-3 font-medium">{skill.name}</td>
                  <td className="py-2 px-3 text-slate-500">{skill.category}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      skill.type === 'gap' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {skill.type === 'gap' ? 'Gap' : 'Strength'}
                    </span>
                  </td>
                  <td className="py-2 px-3">{skill.coverage}%</td>
                  <td className="py-2 px-3">
                    <div className="w-full max-w-32">
                      <div className="h-5 rounded overflow-hidden bg-slate-50">
                        <div
                          className={`h-full rounded ${getCoverageColor(skill.coverage, skill.type)} flex items-center justify-center text-xs font-medium transition-all`}
                          style={{ width: `${Math.max(skill.coverage, 10)}%` }}
                        >
                          {skill.coverage}%
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
