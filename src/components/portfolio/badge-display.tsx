'use client';

/**
 * Badge Display Component
 *
 * Horizontal scrollable row of earned badges with:
 * - Icon + color mapping per badge type
 * - Click-to-expand detail card showing earned date and metadata
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shield,
  Star,
  Trophy,
  CheckCircle,
  Building2,
  Flame,
  Rocket,
  Globe,
  Award,
  X,
} from 'lucide-react';

interface BadgeItem {
  id: string;
  badgeType: string;
  label: string;
  earnedAt: string;
  metadata: Record<string, unknown>;
}

interface BadgeDisplayProps {
  badges: BadgeItem[];
}

const BADGE_CONFIG: Record<
  string,
  { icon: typeof Shield; color: string; bg: string; border: string }
> = {
  skill_verified: {
    icon: Shield,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
  },
  project_milestone: {
    icon: Star,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950',
    border: 'border-amber-200 dark:border-amber-800',
  },
  top_performer: {
    icon: Trophy,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-200 dark:border-purple-800',
  },
  hire_ready: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
  },
  employer_endorsed: {
    icon: Building2,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950',
    border: 'border-teal-200 dark:border-teal-800',
  },
  streak: {
    icon: Flame,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950',
    border: 'border-orange-200 dark:border-orange-800',
  },
  first_project: {
    icon: Rocket,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950',
    border: 'border-sky-200 dark:border-sky-800',
  },
  cross_institution: {
    icon: Globe,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950',
    border: 'border-violet-200 dark:border-violet-800',
  },
};

const DEFAULT_BADGE_CONFIG = {
  icon: Award,
  color: 'text-slate-600 dark:text-slate-400',
  bg: 'bg-slate-50 dark:bg-slate-950',
  border: 'border-slate-200 dark:border-slate-800',
};

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function BadgeDisplay({ badges }: BadgeDisplayProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);

  if (badges.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            No Badges Yet
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Complete projects and milestones to earn badges that showcase your
            achievements.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scrollable Badge Row */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {badges.map((badge) => {
          const config = BADGE_CONFIG[badge.badgeType] || DEFAULT_BADGE_CONFIG;
          const Icon = config.icon;
          const isSelected = selectedBadge?.id === badge.id;

          return (
            <button
              key={badge.id}
              type="button"
              onClick={() =>
                setSelectedBadge(isSelected ? null : badge)
              }
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 min-w-[100px] transition-all ${
                config.bg
              } ${config.border} ${
                isSelected
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'hover:shadow-md'
              }`}
            >
              <Icon className={`h-8 w-8 ${config.color}`} />
              <span className="text-xs font-medium text-center leading-tight">
                {badge.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detail Card */}
      {selectedBadge && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {(() => {
                  const config =
                    BADGE_CONFIG[selectedBadge.badgeType] || DEFAULT_BADGE_CONFIG;
                  const Icon = config.icon;
                  return (
                    <div
                      className={`rounded-full p-2 ${config.bg} ${config.border} border`}
                    >
                      <Icon className={`h-6 w-6 ${config.color}`} />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {selectedBadge.label}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Earned on {formatDate(selectedBadge.earnedAt)}
                  </p>
                  {'description' in selectedBadge.metadata &&
                    selectedBadge.metadata.description != null && (
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                        {String(selectedBadge.metadata.description)}
                      </p>
                    )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBadge(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
