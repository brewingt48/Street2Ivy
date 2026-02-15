'use client';

/**
 * Upgrade Prompt Component
 *
 * Reusable component shown to users who don't have access to a feature
 * due to their current plan tier. Displays the feature name, description,
 * current/required plan badges, optional benefits list, and a request
 * upgrade button.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle2, ArrowUpRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UpgradePromptProps {
  currentTier: string;
  requiredTier: string;
  featureName: string;
  featureDescription: string;
  benefits?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTierName(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function getTierColor(tier: string): string {
  switch (tier) {
    case 'enterprise':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'professional':
      return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UpgradePrompt({
  currentTier,
  requiredTier,
  featureName,
  featureDescription,
  benefits,
}: UpgradePromptProps) {
  function handleRequestUpgrade() {
    const subject = encodeURIComponent(`Plan Upgrade Request: ${formatTierName(requiredTier)}`);
    const body = encodeURIComponent(
      `Hello,\n\nI would like to request an upgrade from the ${formatTierName(currentTier)} plan to the ${formatTierName(requiredTier)} plan to access ${featureName}.\n\nPlease let me know the next steps.\n\nThank you.`
    );
    window.location.href = `mailto:support@proveground.com?subject=${subject}&body=${body}`;
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Gradient border accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-purple-500" />

      <CardContent className="pt-10 pb-8 px-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          {/* Lock icon */}
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>

          {/* Feature info */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {featureName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {featureDescription}
            </p>
          </div>

          {/* Plan badges */}
          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1">Current Plan</p>
              <Badge className={`${getTierColor(currentTier)} border-0 text-xs`}>
                {formatTierName(currentTier)}
              </Badge>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1">Required Plan</p>
              <Badge className={`${getTierColor(requiredTier)} border-0 text-xs`}>
                {formatTierName(requiredTier)}
              </Badge>
            </div>
          </div>

          {/* Benefits list */}
          {benefits && benefits.length > 0 && (
            <div className="text-left space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                What you get
              </p>
              <ul className="space-y-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Upgrade button */}
          <Button
            onClick={handleRequestUpgrade}
            className="w-full bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-700 hover:to-purple-700 text-white"
          >
            Request Upgrade
          </Button>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Contact your platform administrator to upgrade your institution&apos;s plan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
