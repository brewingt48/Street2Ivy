'use client';

/**
 * Skills Radar Chart Component
 *
 * Displays verified skill levels in a radar chart (3+ skills)
 * or horizontal bar chart (fewer than 3 skills).
 */

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface SkillsRadarChartProps {
  skills: Array<{ skill: string; level: number; maxLevel: number }>;
}

const TEAL_600 = '#0d9488';
const TEAL_200 = '#99f6e4';

export function SkillsRadarChart({ skills }: SkillsRadarChartProps) {
  if (skills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <BarChart3 size={40} className="mb-3" />
        <p className="text-sm">No skills data available</p>
      </div>
    );
  }

  const data = skills.map((s) => ({
    skill: s.skill,
    level: s.level,
    fullMark: s.maxLevel,
  }));

  // Radar chart requires at least 3 data points for meaningful display
  if (skills.length < 3) {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="skill" width={100} />
          <Tooltip />
          <Bar dataKey="level" fill={TEAL_600} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12, fill: '#475569' }} />
        <Radar
          name="Skill Level"
          dataKey="level"
          stroke={TEAL_600}
          fill={TEAL_200}
          fillOpacity={0.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
