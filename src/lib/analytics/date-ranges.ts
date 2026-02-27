/**
 * Date Range Helpers for Analytics
 *
 * Predefined date ranges and utilities for analytics queries.
 */

export interface DateRange {
  start: string; // ISO date string (YYYY-MM-DD)
  end: string;   // ISO date string (YYYY-MM-DD)
  label: string;
}

export type RangeKey = '7d' | '30d' | '90d' | '12mo' | 'all';

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '12mo', label: 'Last 12 Months' },
  { value: 'all', label: 'All Time' },
];

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Get start/end dates for a named range
 */
export function getDateRange(range: RangeKey): DateRange {
  const now = new Date();
  const end = toISODate(now);

  switch (range) {
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start: toISODate(start), end, label: 'Last 7 Days' };
    }
    case '30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start: toISODate(start), end, label: 'Last 30 Days' };
    }
    case '90d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { start: toISODate(start), end, label: 'Last 90 Days' };
    }
    case '12mo': {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      return { start: toISODate(start), end, label: 'Last 12 Months' };
    }
    case 'all':
    default:
      return { start: '2020-01-01', end, label: 'All Time' };
  }
}

/**
 * Get the appropriate DATE_TRUNC interval for grouping timeline data
 */
export function getTimelineInterval(range: RangeKey): 'day' | 'week' | 'month' {
  switch (range) {
    case '7d':
      return 'day';
    case '30d':
      return 'day';
    case '90d':
      return 'week';
    case '12mo':
    case 'all':
    default:
      return 'month';
  }
}

/**
 * Format a date string for display in charts
 */
export function formatChartDate(dateStr: string, range: RangeKey): string {
  const d = new Date(dateStr);
  switch (range) {
    case '7d':
    case '30d':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '90d':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '12mo':
    case 'all':
    default:
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
}
