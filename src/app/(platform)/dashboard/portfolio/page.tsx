'use client';

/**
 * Portfolio Dashboard Page
 *
 * Main portfolio management page for students:
 * - Create portfolio CTA if none exists
 * - 4 tabs: Profile, Projects, Badges, Share/Preview
 * - Each tab renders the corresponding editor component
 */

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  FolderOpen,
  User,
  Briefcase,
  Award,
  Share2,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { PortfolioEditor } from '@/components/portfolio/portfolio-editor';
import { ProjectSelector } from '@/components/portfolio/project-selector';
import { BadgeDisplay } from '@/components/portfolio/badge-display';
import { PortfolioSharePanel } from '@/components/portfolio/portfolio-share-panel';

interface PortfolioData {
  id: string;
  studentId: string;
  slug: string;
  headline: string;
  bio: string;
  theme: string;
  showSkills: boolean;
  showReadiness: boolean;
  isPublic: boolean;
  viewCount: number;
  projects: Array<{
    id: string;
    listingId: string;
    title: string;
    company: string;
    displayOrder: number;
    isFeatured: boolean;
    studentReflection: string | null;
  }>;
  badges: Array<{
    id: string;
    badgeType: string;
    label: string;
    earnedAt: string;
    metadata: Record<string, unknown>;
  }>;
}

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'projects', label: 'Projects', icon: Briefcase },
  { key: 'badges', label: 'Badges', icon: Award },
  { key: 'share', label: 'Share / Preview', icon: Share2 },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/student/portfolio');
      if (!res.ok) {
        if (res.status === 401) {
          setError('Please sign in to access your portfolio.');
          return;
        }
        if (res.status === 403) {
          setError('Portfolio Builder requires Professional plan or higher.');
          return;
        }
        throw new Error('Failed to load portfolio');
      }
      const data = await res.json();
      setPortfolio(data.portfolio || null);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
      setError('Failed to load portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const handleCreatePortfolio = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/student/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create portfolio');
      }

      await fetchPortfolio();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create portfolio';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-28" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !portfolio) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Portfolio
          </h1>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No portfolio — create CTA
  if (!portfolio) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Portfolio
          </h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Create Your Portfolio
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Showcase your projects, skills, and achievements to employers.
              Your Proveground portfolio is a living proof-of-work resume.
            </p>
            <Button
              className="mt-6"
              size="lg"
              onClick={handleCreatePortfolio}
              disabled={creating}
            >
              <Plus className="h-4 w-4 mr-2" />
              {creating ? 'Creating...' : 'Create Portfolio'}
            </Button>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-3">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Portfolio exists — tabbed editor
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <FolderOpen className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            My Portfolio
          </h1>
          <p className="text-sm text-muted-foreground">
            Customize and share your proof-of-work portfolio
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto border-b pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && (
          <PortfolioEditor
            portfolio={portfolio}
            onUpdate={fetchPortfolio}
          />
        )}
        {activeTab === 'projects' && (
          <ProjectSelector
            portfolio={portfolio}
            onUpdate={fetchPortfolio}
          />
        )}
        {activeTab === 'badges' && (
          <BadgeDisplay badges={portfolio.badges} />
        )}
        {activeTab === 'share' && (
          <PortfolioSharePanel
            slug={portfolio.slug}
            headline={portfolio.headline}
            viewCount={portfolio.viewCount}
          />
        )}
      </div>
    </div>
  );
}
