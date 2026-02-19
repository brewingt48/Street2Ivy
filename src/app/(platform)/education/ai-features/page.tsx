'use client';

/**
 * AI Features Page — Education Admin
 *
 * Read-only page showing the tenant's AI capabilities based on their plan tier.
 * Displays feature availability, usage stats, and upgrade prompts for locked features.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  GraduationCap,
  Target,
  FileText,
  ClipboardList,
  BarChart3,
  TrendingUp,
  Building2,
  Lock,
  CheckCircle2,
  Crown,
  Zap,
  Info,
} from 'lucide-react';

interface AiFeature {
  key: string;
  label: string;
  description: string;
  icon: string;
  requiredPlan: string;
  enabled: boolean;
  locked: boolean;
}

interface UsageData {
  byFeature: Record<string, number>;
  totalThisMonth: number;
  monthlyLimit: number;
  perStudentCoachingLimit: number;
}

interface AiFeaturesData {
  plan: string;
  planLabel: string;
  features: AiFeature[];
  usage: UsageData;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap,
  Target,
  FileText,
  ClipboardList,
  BarChart3,
  TrendingUp,
  Building2,
};

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  starter: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  professional: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  enterprise: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
};

export default function AiFeaturesPage() {
  const [data, setData] = useState<AiFeaturesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tenant/ai-features')
      .then((r) => r.json())
      .then((result) => {
        if (result.plan) {
          setData(result);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Unable to load AI features</p>
      </div>
    );
  }

  const planColors = PLAN_COLORS[data.plan] || PLAN_COLORS.starter;
  const enabledCount = data.features.filter((f) => f.enabled).length;
  const lockedCount = data.features.filter((f) => f.locked).length;
  const usagePercent = data.usage.monthlyLimit > 0
    ? Math.min(100, Math.round((data.usage.totalThisMonth / data.usage.monthlyLimit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">AI Features</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          View your institution&apos;s AI capabilities and usage based on your current plan
        </p>
      </div>

      {/* Plan Banner */}
      <Card className={`${planColors.border} border-2`}>
        <CardContent className="py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-xl ${planColors.bg} flex items-center justify-center`}>
                <Crown className={`h-7 w-7 ${planColors.text}`} />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${planColors.text}`}>{data.planLabel} Plan</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {enabledCount} of {data.features.length} AI features enabled
                  {lockedCount > 0 && ` | ${lockedCount} locked`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${planColors.bg} ${planColors.text} border-0 text-sm px-3 py-1`}>
                {data.planLabel}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Usage This Month
          </CardTitle>
          <CardDescription>
            AI interaction usage across all features for the current billing period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {data.usage.totalThisMonth.toLocaleString()}
              </p>
              <p className="text-sm text-slate-500">
                {data.usage.monthlyLimit === -1
                  ? 'Unlimited interactions'
                  : `of ${data.usage.monthlyLimit.toLocaleString()} monthly interactions`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Per-student coaching limit</p>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                {data.usage.perStudentCoachingLimit === -1
                  ? 'Unlimited'
                  : `${data.usage.perStudentCoachingLimit} / month`}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {data.usage.monthlyLimit > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>{usagePercent}% used</span>
                <span>{(data.usage.monthlyLimit - data.usage.totalThisMonth).toLocaleString()} remaining</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    usagePercent > 90 ? 'bg-red-500' :
                    usagePercent > 70 ? 'bg-amber-500' :
                    'bg-teal-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          )}

          {data.usage.monthlyLimit === -1 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Your Enterprise plan includes unlimited AI interactions
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Grid */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">AI Feature Availability</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.features.map((feature) => {
            const IconComponent = ICON_MAP[feature.icon] || Sparkles;
            const featureUsage = data.usage.byFeature[feature.key] || 0;

            return (
              <Card
                key={feature.key}
                className={`transition-colors ${
                  feature.locked
                    ? 'opacity-75 border-slate-200 dark:border-slate-700'
                    : feature.enabled
                    ? 'border-green-200 dark:border-green-800'
                    : 'border-slate-200'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        feature.locked
                          ? 'bg-slate-100 dark:bg-slate-800'
                          : feature.enabled
                          ? 'bg-green-50 dark:bg-green-900/30'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        {feature.locked ? (
                          <Lock className="h-5 w-5 text-slate-400" />
                        ) : (
                          <IconComponent className={`h-5 w-5 ${
                            feature.enabled ? 'text-green-600' : 'text-slate-400'
                          }`} />
                        )}
                      </div>
                      <div>
                        <CardTitle className={`text-sm ${feature.locked ? 'text-slate-400' : ''}`}>
                          {feature.label}
                        </CardTitle>
                      </div>
                    </div>
                    {feature.locked ? (
                      <Badge variant="outline" className="text-slate-400 text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    ) : feature.enabled ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={`text-xs ${feature.locked ? 'text-slate-400' : 'text-slate-500'} mb-3`}>
                    {feature.description}
                  </p>

                  {feature.locked ? (
                    <div className="flex items-center gap-2 p-2 rounded bg-amber-50 dark:bg-amber-900/10">
                      <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {feature.requiredPlan === 'enterprise' ? 'Enterprise' : 'Professional'} plan required
                      </p>
                    </div>
                  ) : feature.enabled && featureUsage > 0 ? (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Zap className="h-3.5 w-3.5 text-teal-500" />
                      <p className="text-xs text-slate-500">
                        {featureUsage.toLocaleString()} interaction{featureUsage !== 1 ? 's' : ''} this month
                      </p>
                    </div>
                  ) : feature.enabled ? (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      <p className="text-xs text-slate-500">Available — no usage yet this month</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Upgrade CTA for non-enterprise */}
      {data.plan !== 'enterprise' && lockedCount > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center shrink-0">
                <Crown className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Unlock {lockedCount} more AI feature{lockedCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                  Upgrade to {data.plan === 'starter' ? 'Professional or ' : ''}Enterprise to access
                  advanced AI capabilities including portfolio intelligence, talent insights, and institutional analytics.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  Contact your administrator to upgrade your plan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium mb-1">About AI Features</p>
              <p className="text-slate-500">
                AI features are powered by advanced language models and are designed to help your students
                succeed. Usage is tracked monthly and resets at the beginning of each billing period.
                Feature availability is determined by your institution&apos;s plan tier. Contact your
                platform administrator if you need access to additional features.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
