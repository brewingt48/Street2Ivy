'use client';

/**
 * AI Tools Hub — Corporate Partners
 *
 * Overview page showing all AI capabilities available to corporate partners,
 * usage dashboard, and quick links to feature locations.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  Brain,
  Search,
  FileText,
  Lightbulb,
  ArrowRight,
  ClipboardList,
  Briefcase,
  Lock,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface UsageData {
  used: number;
  limit: number;
  remaining: number;
  resetDate: string;
}

export default function CorporateAiToolsPage() {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [plan, setPlan] = useState<string>('starter');
  const [hasAiAccess, setHasAiAccess] = useState(false);

  useEffect(() => {
    fetch('/api/ai/usage')
      .then((r) => r.json())
      .then((data) => {
        setUsage(data);
        setPlan(data.plan || 'starter');
        setHasAiAccess(
          data.plan === 'professional' || data.plan === 'enterprise'
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const isUnlimited = usage?.limit === -1;
  const usagePercent = usage && !isUnlimited && usage.limit > 0
    ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
    : 0;

  const tools = [
    {
      title: 'AI Project Scoping',
      description: 'Get AI assistance creating well-structured project listings with milestones, skill requirements, and compensation guidance.',
      icon: Brain,
      href: '/corporate/projects/new',
      linkText: 'Create New Listing',
      available: hasAiAccess,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'AI Candidate Screening',
      description: 'Analyze applicants against your project requirements. Get fit scores, strengths, concerns, and tailored interview questions.',
      icon: ClipboardList,
      href: '/corporate/applications',
      linkText: 'Go to Applications',
      available: hasAiAccess,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
    },
    {
      title: 'AI Listing Optimizer',
      description: 'Analyze your listings for attractiveness and clarity. Get specific improvement suggestions and AI-optimized descriptions.',
      icon: Lightbulb,
      href: '/corporate/projects',
      linkText: 'Go to My Listings',
      available: hasAiAccess,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      title: 'AI Talent Discovery',
      description: 'Analyze students in search results against your listing. Get fit scores and personalized outreach talking points.',
      icon: Search,
      href: '/corporate/search-students',
      linkText: 'Find Students',
      available: hasAiAccess,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-teal-600" />
          AI Tools
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          AI-powered features to help you find, evaluate, and engage the best student talent
        </p>
      </div>

      {/* Usage Dashboard */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              AI Usage This Month
            </CardTitle>
            <CardDescription>
              {isUnlimited
                ? 'Unlimited usage on your Enterprise plan'
                : `${usage?.remaining ?? 0} interactions remaining`}
            </CardDescription>
          </div>
          <Badge
            className={
              plan === 'enterprise'
                ? 'bg-purple-100 text-purple-700 border-0'
                : plan === 'professional'
                  ? 'bg-teal-100 text-teal-700 border-0'
                  : 'bg-slate-100 text-slate-600 border-0'
            }
          >
            {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
          </Badge>
        </CardHeader>
        <CardContent>
          {!isUnlimited && usage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{usage.used} used</span>
                <span>{usage.limit} limit</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    usagePercent >= 90
                      ? 'bg-red-500'
                      : usagePercent >= 70
                        ? 'bg-amber-500'
                        : 'bg-teal-500',
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">
                Resets on {new Date(usage.resetDate).toLocaleDateString()}
              </p>
            </div>
          )}
          {isUnlimited && (
            <div className="flex items-center gap-2 text-sm text-purple-600">
              <TrendingUp className="h-4 w-4" />
              <span>
                {usage?.used || 0} interactions used this month &mdash; unlimited plan, no cap
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Not on Professional+ plan — upgrade prompt */}
      {!hasAiAccess && (
        <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
          <CardContent className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-800 flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Upgrade to Access AI Tools
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                AI-powered candidate screening, listing optimization, and talent discovery
                are available on the Professional and Enterprise plans. Contact your institution
                to upgrade.
              </p>
            </div>
            <Badge className="bg-teal-100 text-teal-700 border-0">
              Requires Professional or Enterprise Plan
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* AI Tools Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((tool) => (
          <Card
            key={tool.title}
            className={cn(
              'transition-shadow',
              tool.available
                ? 'hover:shadow-md cursor-pointer'
                : 'opacity-60',
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', tool.bgColor)}>
                  <tool.icon className={cn('h-5 w-5', tool.color)} />
                </div>
                {!tool.available && (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" /> Locked
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base mt-3">{tool.title}</CardTitle>
              <CardDescription className="text-sm">{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {tool.available ? (
                <Link href={tool.href}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    {tool.linkText}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled className="gap-1.5">
                  <Lock className="h-3 w-3" />
                  Upgrade to Access
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-teal-600" />
            How AI Tools Work
          </CardTitle>
          <CardDescription>
            Proveground&apos;s AI tools use advanced language models to help you make better hiring decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-600 dark:text-slate-300">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white mb-1">
                1. Context-Aware Analysis
              </p>
              <p>
                Each AI tool analyzes your specific listing details, required skills, and
                student profiles to provide tailored insights — not generic advice.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white mb-1">
                2. Actionable Recommendations
              </p>
              <p>
                Get specific improvement suggestions, interview questions, and outreach
                talking points that you can use immediately.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white mb-1">
                3. Better Outcomes
              </p>
              <p>
                AI-assisted screening helps you focus on the best candidates faster,
                while optimized listings attract more and better applicants.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

