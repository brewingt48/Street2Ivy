'use client';

/**
 * Project Selector Component
 *
 * Manage which projects appear in the portfolio:
 * - Reorder projects with up/down arrow buttons
 * - Toggle featured status per project
 * - Add student reflections
 * - Save project selections to the API
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUp,
  ArrowDown,
  Star,
  Save,
  Building2,
  CheckCircle,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';

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

interface ProjectSelectorProps {
  portfolio: PortfolioData;
  onUpdate: () => void;
}

interface ProjectItem {
  listingId: string;
  title: string;
  company: string;
  displayOrder: number;
  isFeatured: boolean;
  studentReflection: string;
}

export function ProjectSelector({ portfolio, onUpdate }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectItem[]>(
    portfolio.projects
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((p) => ({
        listingId: p.listingId,
        title: p.title,
        company: p.company,
        displayOrder: p.displayOrder,
        isFeatured: p.isFeatured,
        studentReflection: p.studentReflection || '',
      }))
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const moveProject = (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= projects.length) return;

    const updated = [...projects];
    const temp = updated[index];
    updated[index] = updated[swapIndex];
    updated[swapIndex] = temp;

    // Reassign display orders
    setProjects(
      updated.map((p, i) => ({ ...p, displayOrder: i }))
    );
  };

  const toggleFeatured = (index: number) => {
    setProjects((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, isFeatured: !p.isFeatured } : p
      )
    );
  };

  const updateReflection = (index: number, value: string) => {
    setProjects((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, studentReflection: value } : p
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/student/portfolio/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: portfolio.id,
          projects: projects.map((p) => ({
            listingId: p.listingId,
            displayOrder: p.displayOrder,
            isFeatured: p.isFeatured,
            studentReflection: p.studentReflection || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save projects');
      }

      setFeedback({ type: 'success', message: 'Projects updated successfully!' });
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save projects';
      setFeedback({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            No Projects Yet
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Complete projects on Proveground to add them to your portfolio.
            Projects you&apos;ve worked on will automatically appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Portfolio Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.map((project, index) => (
            <div
              key={project.listingId}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              {/* Project Header Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-sm text-slate-900 dark:text-white truncate">
                      {project.title}
                    </h4>
                    {project.isFeatured && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {project.company}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleFeatured(index)}
                    title={project.isFeatured ? 'Remove from featured' : 'Mark as featured'}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        project.isFeatured
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveProject(index, 'up')}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveProject(index, 'down')}
                    disabled={index === projects.length - 1}
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Reflection Input */}
              <div className="space-y-1">
                <label
                  htmlFor={`reflection-${project.listingId}`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Your Reflection (optional)
                </label>
                <Input
                  id={`reflection-${project.listingId}`}
                  value={project.studentReflection}
                  onChange={(e) => updateReflection(index, e.target.value)}
                  placeholder="What did you learn? What was your contribution?"
                  maxLength={1000}
                  className="text-sm"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Project Order'}
        </Button>
      </div>
    </div>
  );
}
