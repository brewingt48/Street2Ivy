'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Infinity, AlertTriangle } from 'lucide-react';

interface UsageMeterProps {
  used: number;
  limit: number;
  remaining: number;
  plan: string;
}

export function UsageMeter({ used, limit, remaining, plan }: UsageMeterProps) {
  // Unlimited plan
  if (limit === -1) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-teal-100 text-teal-700 border-0 hover:bg-teal-100">
          <Infinity className="h-3 w-3 mr-1" />
          Unlimited
        </Badge>
        <span className="text-xs text-slate-500 hidden sm:inline">
          {plan} plan
        </span>
      </div>
    );
  }

  // Limit reached
  if (remaining === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs font-medium text-red-600">Limit reached</span>
        </div>
        <span className="text-xs text-slate-400">
          Upgrade for more
        </span>
      </div>
    );
  }

  // Limited plan with usage bar
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const remainingPercentage = limit > 0 ? (remaining / limit) * 100 : 0;

  const barColor = cn(
    remainingPercentage > 50 && 'bg-green-500',
    remainingPercentage > 20 && remainingPercentage <= 50 && 'bg-yellow-500',
    remainingPercentage <= 20 && 'bg-red-500',
  );

  const textColor = cn(
    remainingPercentage > 50 && 'text-green-700',
    remainingPercentage > 20 && remainingPercentage <= 50 && 'text-yellow-700',
    remainingPercentage <= 20 && 'text-red-700',
  );

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={cn('text-xs font-medium whitespace-nowrap', textColor)}>
          {remaining}/{limit} remaining
        </span>
      </div>
    </div>
  );
}
