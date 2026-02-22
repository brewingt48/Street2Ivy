'use client';

/**
 * TalentPoolInsights — Aggregate student data to help corporate partners
 * understand the talent pool and craft better project postings.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Users, GraduationCap, Clock, Wrench, Trophy, Lightbulb } from 'lucide-react';

interface InsightsData {
  totalStudents: number;
  topSports: { sport: string; studentCount: number }[];
  topUniversities: { university: string; studentCount: number }[];
  availabilityDistribution: { bucket: string; studentCount: number }[];
  topSkills: { skill: string; studentCount: number }[];
}

interface ListingContext {
  hoursPerWeek?: number;
  selectedSkills?: string[];
}

interface TalentPoolInsightsProps {
  variant: 'full' | 'compact';
  defaultExpanded?: boolean;
  listingContext?: ListingContext;
  scope?: 'tenant' | 'network';
}

type TabKey = 'sports' | 'universities' | 'availability' | 'skills';

function BarChart({ items, maxCount, label }: { items: { name: string; count: number }[]; maxCount: number; label: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 py-4 text-center">No {label} data available yet</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-3">
          <span className="text-xs text-slate-600 dark:text-slate-300 w-32 truncate shrink-0" title={item.name}>
            {item.name}
          </span>
          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
            <div
              className="bg-teal-500 h-full rounded-full transition-all"
              style={{ width: `${Math.max(4, (item.count / maxCount) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 w-8 text-right shrink-0">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

export function TalentPoolInsights({ variant, defaultExpanded = false, listingContext, scope = 'tenant' }: TalentPoolInsightsProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<TabKey>('sports');

  useEffect(() => {
    fetch(`/api/corporate/talent-pool-insights?scope=${scope}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [scope]);

  // Generate contextual tips based on listing context
  const tips: string[] = [];
  if (data && listingContext) {
    if (listingContext.hoursPerWeek && data.availabilityDistribution.length > 0) {
      const mostPopular = data.availabilityDistribution.reduce((a, b) => a.studentCount > b.studentCount ? a : b);
      if (listingContext.hoursPerWeek > 20 && mostPopular.bucket !== '31+' && mostPopular.bucket !== '21-30') {
        tips.push(`Most students are available ${mostPopular.bucket} hrs/week — consider if your requirement of ${listingContext.hoursPerWeek}h could be flexible.`);
      }
    }
    if (listingContext.selectedSkills && listingContext.selectedSkills.length > 0 && data.topSkills.length > 0) {
      for (const reqSkill of listingContext.selectedSkills) {
        const match = data.topSkills.find((s) => s.skill.toLowerCase() === reqSkill.toLowerCase());
        if (match && match.studentCount < 5) {
          tips.push(`"${match.skill}" has only ${match.studentCount} student${match.studentCount === 1 ? '' : 's'} — consider broadening this requirement.`);
        }
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-6 w-48 mb-3" />
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'sports', label: 'Sports', icon: <Trophy className="h-3.5 w-3.5" /> },
    { key: 'universities', label: 'Universities', icon: <GraduationCap className="h-3.5 w-3.5" /> },
    { key: 'availability', label: 'Availability', icon: <Clock className="h-3.5 w-3.5" /> },
    { key: 'skills', label: 'Skills', icon: <Wrench className="h-3.5 w-3.5" /> },
  ];

  const tabContent: Record<TabKey, React.ReactNode> = {
    sports: (
      <BarChart
        items={data.topSports.map((s) => ({ name: s.sport, count: s.studentCount }))}
        maxCount={Math.max(...data.topSports.map((s) => s.studentCount), 1)}
        label="sports"
      />
    ),
    universities: (
      <BarChart
        items={data.topUniversities.map((u) => ({ name: u.university, count: u.studentCount }))}
        maxCount={Math.max(...data.topUniversities.map((u) => u.studentCount), 1)}
        label="university"
      />
    ),
    availability: (
      <BarChart
        items={data.availabilityDistribution.map((a) => ({ name: `${a.bucket} hrs/wk`, count: a.studentCount }))}
        maxCount={Math.max(...data.availabilityDistribution.map((a) => a.studentCount), 1)}
        label="availability"
      />
    ),
    skills: (
      <BarChart
        items={data.topSkills.map((s) => ({ name: s.skill, count: s.studentCount }))}
        maxCount={Math.max(...data.topSkills.map((s) => s.studentCount), 1)}
        label="skills"
      />
    ),
  };

  return (
    <Card className="border-teal-200 dark:border-teal-800">
      <CardHeader
        className="cursor-pointer select-none py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-600" />
            {scope === 'network' ? 'Network Talent Pool' : 'Your Talent Pool'}
            <Badge variant="outline" className="text-xs font-normal">{data.totalStudents} students</Badge>
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className={variant === 'compact' ? 'pt-0 pb-4' : 'pt-0 pb-5'}>
          {/* Contextual tips */}
          {tips.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
              {tips.map((tip, i) => (
                <p key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {tip}
                </p>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {tabContent[activeTab]}
        </CardContent>
      )}
    </Card>
  );
}
