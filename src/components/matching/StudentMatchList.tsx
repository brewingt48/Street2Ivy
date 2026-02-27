'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MatchScoreBadge, MatchScoreGauge } from './MatchScoreBadge';
import { cn } from '@/lib/utils';
import {
  Users,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Mail,
} from 'lucide-react';

interface StudentMatch {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  university: string | null;
  compositeScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  signals?: Record<string, { score: number; weight: number }>;
}

interface StudentMatchListProps {
  listingId: string;
  className?: string;
  limit?: number;
  showInviteButton?: boolean;
  onInvite?: (studentId: string) => void;
}

export function StudentMatchList({
  listingId,
  className,
  limit = 20,
  showInviteButton = false,
  onInvite,
}: StudentMatchListProps) {
  const [matches, setMatches] = useState<StudentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/match-engine/matches/listing/${listingId}?limit=${limit}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load matches');
      }
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [listingId, limit]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            Matched Students
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchMatches}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              Matched Students
            </CardTitle>
            <CardDescription>
              {matches.length} student{matches.length !== 1 ? 's' : ''} ranked by match quality
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchMatches}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
            No matching students found for this listing.
          </p>
        ) : (
          <div className="space-y-2">
            {matches.map((match, idx) => {
              const isExpanded = expandedStudent === match.studentId;
              return (
                <div
                  key={match.studentId}
                  className={cn(
                    'rounded-lg border transition-colors',
                    isExpanded
                      ? 'border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  )}
                >
                  <button
                    onClick={() =>
                      setExpandedStudent(isExpanded ? null : match.studentId)
                    }
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    {/* Rank */}
                    <span className="text-xs font-semibold text-slate-400 w-5 text-center">
                      {idx + 1}
                    </span>

                    {/* Avatar placeholder */}
                    <div className="h-9 w-9 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400 text-sm font-semibold shrink-0">
                      {match.firstName[0]}
                      {match.lastName[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {match.firstName} {match.lastName}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        {match.university && (
                          <>
                            <GraduationCap className="h-3 w-3" />
                            <span className="truncate">{match.university}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <MatchScoreBadge score={match.compositeScore} size="sm" />

                    {/* Expand toggle */}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pl-11 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                      {/* Skills */}
                      {match.matchedSkills.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">
                            Matched Skills
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {match.matchedSkills.map((skill) => (
                              <Badge
                                key={skill}
                                variant="secondary"
                                className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {match.missingSkills.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">
                            Missing Skills
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {match.missingSkills.map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className="text-xs text-slate-500"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {showInviteButton && onInvite && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInvite(match.studentId);
                            }}
                          >
                            <Mail className="h-3.5 w-3.5 mr-1.5" />
                            Invite to Apply
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
