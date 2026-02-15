'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface AvailabilityWindow {
  weekStart: string;
  weekEnd: string;
  availableHours: number;
  totalCommittedHours: number;
  sportConflicts: string[];
  travelConflicts: number;
  overallAvailability: 'high' | 'medium' | 'low' | 'none';
}

interface AvailabilityCalendarProps {
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getAvailabilityColor(level: string) {
  switch (level) {
    case 'high':
      return 'bg-emerald-400 dark:bg-emerald-600';
    case 'medium':
      return 'bg-teal-400 dark:bg-teal-600';
    case 'low':
      return 'bg-amber-400 dark:bg-amber-600';
    case 'none':
      return 'bg-red-300 dark:bg-red-700';
    default:
      return 'bg-slate-200 dark:bg-slate-700';
  }
}

export function AvailabilityCalendar({ className }: AvailabilityCalendarProps) {
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();

  const startDate = new Date(viewYear, viewMonth, 1).toISOString().split('T')[0];
  const endDate = new Date(viewYear, viewMonth + 3, 0).toISOString().split('T')[0];

  const fetchWindows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/match-engine/schedules/availability?startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error('Failed to load availability');
      const data = await res.json();
      setWindows(data.windows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchWindows();
  }, [fetchWindows]);

  // Group windows by month
  const windowsByMonth: Record<string, AvailabilityWindow[]> = {};
  windows.forEach((w) => {
    const d = new Date(w.weekStart);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!windowsByMonth[key]) windowsByMonth[key] = [];
    windowsByMonth[key].push(w);
  });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              Availability Overview
            </CardTitle>
            <CardDescription>
              Your schedule availability by week
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setMonthOffset((m) => m - 3)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px] text-center">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setMonthOffset((m) => m + 3)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2" onClick={fetchWindows}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchWindows}>
              Retry
            </Button>
          </div>
        ) : windows.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              No availability data. Add schedules to see your availability.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-emerald-400" />
                High
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-teal-400" />
                Medium
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-amber-400" />
                Low
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm bg-red-300" />
                None
              </div>
            </div>

            {/* Week grid */}
            {Object.entries(windowsByMonth).map(([monthKey, monthWindows]) => {
              const [yr, mo] = monthKey.split('-').map(Number);
              return (
                <div key={monthKey} className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {MONTHS[mo - 1]} {yr}
                  </h4>
                  <div className="grid grid-cols-1 gap-1">
                    {monthWindows.map((w, idx) => {
                      const start = new Date(w.weekStart);
                      const end = new Date(w.weekEnd);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-md border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div
                            className={cn(
                              'h-8 w-2 rounded-full shrink-0',
                              getAvailabilityColor(w.overallAvailability)
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {' – '}
                              {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-500">
                              {w.availableHours}h available · {w.totalCommittedHours}h committed
                              {w.sportConflicts.length > 0 && (
                                <span className="text-amber-600"> · {w.sportConflicts.join(', ')}</span>
                              )}
                              {w.travelConflicts > 0 && (
                                <span className="text-red-500"> · {w.travelConflicts} travel day{w.travelConflicts !== 1 ? 's' : ''}</span>
                              )}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {w.availableHours}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
