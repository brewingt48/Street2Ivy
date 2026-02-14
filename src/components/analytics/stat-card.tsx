'use client';

/**
 * Analytics Stat Card
 *
 * Enhanced stat card with value, label, trend indicator, and optional click-through.
 */

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: number | null;    // percentage change vs previous period, null = no trend
  trendLabel?: string;       // e.g. "vs last 30d"
  href?: string;             // click-through link
  icon?: React.ComponentType<{ className?: string }>;
}

export function StatCard({ label, value, suffix, trend, trendLabel, href, icon: Icon }: StatCardProps) {
  const content = (
    <Card className={href ? 'hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer' : ''}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {value}{suffix && <span className="text-base font-normal text-slate-400 ml-1">{suffix}</span>}
            </p>
            {trend !== undefined && trend !== null && (
              <div className="flex items-center gap-1 mt-1.5">
                {trend > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Minus className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span className={`text-xs font-medium ${
                  trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-slate-400'
                }`}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
                </span>
                {trendLabel && (
                  <span className="text-xs text-slate-400">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30">
              <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
