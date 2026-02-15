'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Clock,
  Brain,
  Battery,
  TrendingUp,
  Shield,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface SignalBreakdown {
  name: string;
  score: number;
  weight: number;
  details?: Record<string, unknown>;
}

interface MatchBreakdownProps {
  compositeScore: number;
  signals: SignalBreakdown[];
  matchedSkills?: string[];
  missingSkills?: string[];
  className?: string;
  defaultExpanded?: boolean;
}

const signalConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  temporal: { icon: Clock, label: 'Schedule Fit', color: 'text-blue-500' },
  skills: { icon: Brain, label: 'Skills', color: 'text-teal-500' },
  sustainability: { icon: Battery, label: 'Workload Balance', color: 'text-green-500' },
  growth: { icon: TrendingUp, label: 'Career Growth', color: 'text-purple-500' },
  trust: { icon: Shield, label: 'Track Record', color: 'text-amber-500' },
  network: { icon: Users, label: 'Network', color: 'text-indigo-500' },
};

function SignalBar({ signal }: { signal: SignalBreakdown }) {
  const config = signalConfig[signal.name] || {
    icon: Brain,
    label: signal.name,
    color: 'text-slate-500',
  };
  const Icon = config.icon;
  const weightedScore = Math.round(signal.score * signal.weight * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('h-3.5 w-3.5', config.color)} />
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {config.label}
          </span>
        </div>
        <span className="font-semibold text-slate-900 dark:text-white">
          {Math.round(signal.score * 100)}
        </span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            signal.score >= 0.8
              ? 'bg-emerald-500'
              : signal.score >= 0.6
                ? 'bg-teal-500'
                : signal.score >= 0.4
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
          )}
          style={{ width: `${Math.round(signal.score * 100)}%` }}
        />
      </div>
      <div className="text-xs text-slate-400">
        Score contribution
      </div>
    </div>
  );
}

export function MatchBreakdown({
  compositeScore,
  signals,
  matchedSkills = [],
  missingSkills = [],
  className,
  defaultExpanded = false,
}: MatchBreakdownProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-teal-600" />
            <strong>Match Engine&trade;</strong> Analysis
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs"
          >
            {expanded ? (
              <>
                Less <ChevronUp className="h-3 w-3 ml-1" />
              </>
            ) : (
              <>
                Details <ChevronDown className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Signal bars */}
        <div className="space-y-3">
          {signals.map((signal) => (
            <SignalBar key={signal.name} signal={signal} />
          ))}
        </div>

        {/* Skills section — only shown when expanded */}
        {expanded && (matchedSkills.length > 0 || missingSkills.length > 0) && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {matchedSkills.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Matched Skills ({matchedSkills.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {matchedSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {missingSkills.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  <XCircle className="h-3.5 w-3.5 text-slate-400" />
                  Missing Skills ({missingSkills.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {missingSkills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs text-slate-500">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
