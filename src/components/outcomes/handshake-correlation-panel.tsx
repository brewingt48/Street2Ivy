'use client';

/**
 * Handshake Correlation Panel
 *
 * Displays the correlation between Proveground engagement levels
 * and career readiness metrics, segmented by student activity.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2 } from 'lucide-react';

interface HandshakeCorrelationPanelProps {
  data: {
    segments: Array<{
      label: string;
      studentCount: number;
      avgProjectsCompleted: number;
      avgReadinessScore: number;
    }>;
    handshakeActive: boolean;
    lastSyncAt: string | null;
    insightText: string;
  };
}

export function HandshakeCorrelationPanel({ data }: HandshakeCorrelationPanelProps) {
  if (!data.handshakeActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-5 w-5 text-slate-400" />
            Proveground Impact on Career Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Handshake integration is not active. Enable it to see correlation data
            between platform engagement and career outcomes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Proveground Impact on Career Outcomes
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              Handshake Connected
            </Badge>
          </div>
          {data.lastSyncAt && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Last synced: {new Date(data.lastSyncAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {/* Comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 font-medium text-slate-500 dark:text-slate-400">
                    Segment
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400">
                    Students
                  </th>
                  <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400">
                    Avg Projects
                  </th>
                  <th className="text-right py-2 pl-4 font-medium text-slate-500 dark:text-slate-400">
                    Avg Readiness
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.segments.map((segment, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <td className="py-2 pr-4 text-slate-900 dark:text-white font-medium">
                      {segment.label}
                    </td>
                    <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-300">
                      {segment.studentCount}
                    </td>
                    <td className="py-2 px-4 text-right text-slate-600 dark:text-slate-300">
                      {segment.avgProjectsCompleted}
                    </td>
                    <td className="py-2 pl-4 text-right font-medium text-slate-900 dark:text-white">
                      {segment.avgReadinessScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Key insight card */}
      {data.insightText && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
              Key Insight
            </p>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
              {data.insightText}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Note: Correlation does not imply causation. These metrics show associations
        between platform engagement and career readiness.
      </p>
    </div>
  );
}
