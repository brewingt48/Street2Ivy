'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ReadinessScoreCardProps {
  score: number;
  tier: string;
  previousScore?: number;
}

export function ReadinessScoreCard({ score, tier, previousScore }: ReadinessScoreCardProps) {
  const getColor = (s: number) => {
    if (s >= 71) return { text: 'text-emerald-600', bg: 'bg-emerald-50', stroke: '#059669' };
    if (s >= 41) return { text: 'text-amber-600', bg: 'bg-amber-50', stroke: '#d97706' };
    return { text: 'text-red-600', bg: 'bg-red-50', stroke: '#dc2626' };
  };

  const color = getColor(score);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  const trend = previousScore !== undefined ? score - previousScore : null;

  return (
    <Card className={color.bg}>
      <CardContent className="flex items-center gap-8 p-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={color.stroke} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${color.text}`}>{score}</span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800">{tier}</h3>
          <p className="text-sm text-slate-500 mt-1">Overall readiness score</p>
          {trend !== null && (
            <div className="flex items-center gap-1 mt-2">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : trend < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Minus className="h-4 w-4 text-slate-400" />
              )}
              <span className={`text-sm font-medium ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {trend > 0 ? '+' : ''}{trend} pts from last analysis
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
