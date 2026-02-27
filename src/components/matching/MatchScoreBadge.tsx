'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MatchScoreBadgeProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
}

function getScoreColor(score: number) {
  if (score >= 80) return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' };
  if (score >= 60) return { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-400', ring: 'ring-teal-200 dark:ring-teal-800' };
  if (score >= 40) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-800' };
  return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', ring: 'ring-slate-200 dark:ring-slate-700' };
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Low';
}

function getScoreIcon(score: number) {
  if (score >= 60) return TrendingUp;
  if (score >= 40) return Minus;
  return TrendingDown;
}

const sizeStyles = {
  sm: { badge: 'px-1.5 py-0.5 text-xs gap-0.5', icon: 'h-3 w-3' },
  md: { badge: 'px-2 py-1 text-sm gap-1', icon: 'h-3.5 w-3.5' },
  lg: { badge: 'px-3 py-1.5 text-base gap-1.5', icon: 'h-4 w-4' },
};

export function MatchScoreBadge({
  score,
  size = 'md',
  showLabel = false,
  showIcon = true,
  className,
}: MatchScoreBadgeProps) {
  const colors = getScoreColor(score);
  const label = getScoreLabel(score);
  const Icon = getScoreIcon(score);
  const styles = sizeStyles[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full ring-1',
        colors.bg,
        colors.text,
        colors.ring,
        styles.badge,
        className
      )}
      title={`Match Score: ${score}% (${label})`}
    >
      {showIcon && <Icon className={styles.icon} />}
      <span>{score}%</span>
      {showLabel && (
        <span className="font-medium opacity-80">{label}</span>
      )}
    </span>
  );
}

/**
 * Circular gauge variant for larger displays
 */
interface MatchScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function MatchScoreGauge({
  score,
  size = 80,
  strokeWidth = 6,
  className,
}: MatchScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = ((100 - score) / 100) * circumference;
  const colors = getScoreColor(score);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          className={cn(
            score >= 80
              ? 'text-emerald-500'
              : score >= 60
                ? 'text-teal-500'
                : score >= 40
                  ? 'text-amber-500'
                  : 'text-slate-400'
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', colors.text, size >= 80 ? 'text-lg' : 'text-sm')}>
          {score}
        </span>
        {size >= 80 && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            match
          </span>
        )}
      </div>
    </div>
  );
}
