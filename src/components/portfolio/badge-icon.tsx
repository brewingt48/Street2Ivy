'use client';

/**
 * Badge Icon Component
 *
 * Maps portfolio badge types to icons and color schemes.
 */

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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BadgeIconProps {
  type: string;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

interface BadgeConfig {
  icon: LucideIcon;
  bgClass: string;
  textClass: string;
}

const BADGE_MAP: Record<string, BadgeConfig> = {
  skill_verified: {
    icon: Shield,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
  },
  project_milestone: {
    icon: Star,
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-600',
  },
  top_performer: {
    icon: Trophy,
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-600',
  },
  hire_ready: {
    icon: CheckCircle,
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-600',
  },
  employer_endorsed: {
    icon: Building2,
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-600',
  },
  streak: {
    icon: Flame,
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-600',
  },
  first_project: {
    icon: Rocket,
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-600',
  },
  cross_institution: {
    icon: Globe,
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-600',
  },
};

const SIZE_MAP: Record<string, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

const CONTAINER_SIZE_MAP: Record<string, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function BadgeIcon({
  type,
  label,
  size = 'md',
  showLabel = true,
}: BadgeIconProps) {
  const config = BADGE_MAP[type] ?? {
    icon: Award,
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-600',
  };

  const Icon = config.icon;
  const iconSize = SIZE_MAP[size] ?? 20;
  const containerSize = CONTAINER_SIZE_MAP[size] ?? 'h-10 w-10';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          containerSize,
          config.bgClass,
          config.textClass
        )}
        title={label}
      >
        <Icon size={iconSize} />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-600 text-center leading-tight max-w-[80px]">
          {label}
        </span>
      )}
    </div>
  );
}
