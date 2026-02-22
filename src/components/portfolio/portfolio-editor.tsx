'use client';

/**
 * Portfolio Editor Component
 *
 * Form for editing portfolio profile settings:
 * - Headline, bio, theme selection
 * - Visibility toggles for skills, readiness, public status
 * - Save with state-based success/error feedback
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  Eye,
  EyeOff,
  BarChart3,
  Target,
  Globe,
  CheckCircle,
  AlertCircle,
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

interface PortfolioEditorProps {
  portfolio: PortfolioData;
  onUpdate: () => void;
}

const THEME_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'modern', label: 'Modern' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'bold', label: 'Bold' },
] as const;

export function PortfolioEditor({ portfolio, onUpdate }: PortfolioEditorProps) {
  const [headline, setHeadline] = useState(portfolio.headline);
  const [bio, setBio] = useState(portfolio.bio);
  const [theme, setTheme] = useState(portfolio.theme);
  const [showSkills, setShowSkills] = useState(portfolio.showSkills);
  const [showReadiness, setShowReadiness] = useState(portfolio.showReadiness);
  const [isPublic, setIsPublic] = useState(portfolio.isPublic);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/student/portfolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline,
          bio,
          theme,
          showSkills,
          showReadiness,
          isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save portfolio');
      }

      setFeedback({ type: 'success', message: 'Portfolio updated successfully!' });
      onUpdate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save portfolio';
      setFeedback({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Profile Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Display Name (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={portfolio.studentId}
              readOnly
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Your display name is set from your profile and cannot be changed here.
            </p>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Software Engineering Student | Full-Stack Developer"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {headline.length}/200 characters
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell employers about yourself, your goals, and what makes you stand out..."
              rows={5}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              {bio.length}/2000 characters
            </p>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label htmlFor="theme">Portfolio Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visibility Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            type="button"
            onClick={() => setShowSkills(!showSkills)}
            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
              showSkills
                ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
                : 'border-border bg-background'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium">Show Skills Chart</span>
            </div>
            {showSkills ? (
              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowReadiness(!showReadiness)}
            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
              showReadiness
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                : 'border-border bg-background'
            }`}
          >
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-medium">Show Readiness Score</span>
            </div>
            {showReadiness ? (
              <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
              isPublic
                ? 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950'
                : 'border-border bg-background'
            }`}
          >
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-medium">Make Public</span>
            </div>
            {isPublic ? (
              <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          <p className="text-xs text-muted-foreground pt-1">
            When public, anyone with the link can view your portfolio. When private,
            only you can see it.
          </p>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
