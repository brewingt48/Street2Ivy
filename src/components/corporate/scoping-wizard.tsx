'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Tags,
  Milestone,
  Star,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScopingWizardProps {
  hasAccess: boolean;
  description: string;
  onApplyDescription?: (description: string) => void;
  onApplySkills?: (skills: string[]) => void;
  onApplyMilestones?: (milestones: MilestoneItem[]) => void;
  onClose: () => void;
}

interface MilestoneItem {
  title: string;
  description: string;
  weekNumber: number;
}

interface DescriptionReview {
  feedback: string;
  improvedDescription: string;
  score: number;
}

interface SkillSuggestion {
  name: string;
  selected: boolean;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = [
  {
    key: 'description' as const,
    title: 'Review Description',
    description: 'AI reviews your project description and suggests improvements',
    icon: FileText,
  },
  {
    key: 'skills' as const,
    title: 'Suggest Skills',
    description: 'AI suggests relevant skills based on your project',
    icon: Tags,
  },
  {
    key: 'milestones' as const,
    title: 'Generate Milestones',
    description: 'AI generates a milestone timeline for your project',
    icon: Milestone,
  },
];

// ---------------------------------------------------------------------------
// Score display helper
// ---------------------------------------------------------------------------

function ScoreBadge({ score }: { score: number }) {
  const color = cn(
    score >= 80 && 'bg-green-100 text-green-700',
    score >= 50 && score < 80 && 'bg-yellow-100 text-yellow-700',
    score < 50 && 'bg-red-100 text-red-700',
  );
  return (
    <Badge className={cn(color, 'border-0 text-sm')}>
      <Star className="h-3 w-3 mr-1" />
      {score}/100
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScopingWizard({
  hasAccess,
  description,
  onApplyDescription,
  onApplySkills,
  onApplyMilestones,
  onClose,
}: ScopingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Description review state
  const [descLoading, setDescLoading] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);
  const [descReview, setDescReview] = useState<DescriptionReview | null>(null);
  const [descApplied, setDescApplied] = useState(false);

  // Step 2: Skills state
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillSuggestion[]>([]);
  const [skillsApplied, setSkillsApplied] = useState(false);

  // Step 3: Milestones state
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [milestonesError, setMilestonesError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [milestonesApplied, setMilestonesApplied] = useState(false);

  // ---- locked / upgrade prompt -------------------------------------------

  if (!hasAccess) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  AI Project Scoping
                </h3>
              </div>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Get AI-powered help to refine your project description, identify required
                skills, and generate a milestone timeline.
              </p>
            </div>
            <Badge className="bg-teal-100 text-teal-700 border-0">
              Available on Professional plan
            </Badge>
            <div className="pt-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ---- step handlers -----------------------------------------------------

  const analyzeDescription = useCallback(async () => {
    setDescLoading(true);
    setDescError(null);
    setDescReview(null);

    try {
      const response = await fetch('/api/ai/project-scoping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review_description',
          description,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze description');
      }

      const data = await response.json();
      setDescReview({
        feedback: data.feedback,
        improvedDescription: data.improvedDescription,
        score: data.score,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setDescError(message);
    } finally {
      setDescLoading(false);
    }
  }, [description]);

  const suggestSkills = useCallback(async () => {
    setSkillsLoading(true);
    setSkillsError(null);
    setSkills([]);

    try {
      const response = await fetch('/api/ai/project-scoping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_skills',
          description,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to suggest skills');
      }

      const data = await response.json();
      const parsed: SkillSuggestion[] = (data.skills ?? []).map((name: string) => ({
        name,
        selected: true,
      }));
      setSkills(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setSkillsError(message);
    } finally {
      setSkillsLoading(false);
    }
  }, [description]);

  const generateMilestones = useCallback(async () => {
    setMilestonesLoading(true);
    setMilestonesError(null);
    setMilestones([]);

    try {
      const response = await fetch('/api/ai/project-scoping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_milestones',
          description,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate milestones');
      }

      const data = await response.json();
      setMilestones(data.milestones ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setMilestonesError(message);
    } finally {
      setMilestonesLoading(false);
    }
  }, [description]);

  // ---- apply handlers ----------------------------------------------------

  function handleApplyDescription() {
    if (descReview?.improvedDescription) {
      onApplyDescription?.(descReview.improvedDescription);
      setDescApplied(true);
    }
  }

  function handleApplySkills() {
    const selectedSkills = skills.filter((s) => s.selected).map((s) => s.name);
    if (selectedSkills.length > 0) {
      onApplySkills?.(selectedSkills);
      setSkillsApplied(true);
    }
  }

  function handleApplyMilestones() {
    if (milestones.length > 0) {
      onApplyMilestones?.(milestones);
      setMilestonesApplied(true);
    }
  }

  function toggleSkill(skillName: string) {
    setSkills((prev) =>
      prev.map((s) =>
        s.name === skillName ? { ...s, selected: !s.selected } : s,
      ),
    );
  }

  // ---- navigation --------------------------------------------------------

  function goNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  // ---- step content renderers --------------------------------------------

  function renderDescriptionStep() {
    return (
      <div className="space-y-4">
        {/* Current description preview */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Current Description
          </label>
          <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 max-h-32 overflow-y-auto leading-relaxed">
            {description || 'No description provided.'}
          </div>
        </div>

        {/* Analyze button */}
        {!descReview && !descLoading && (
          <Button
            onClick={analyzeDescription}
            disabled={!description.trim()}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze Description
          </Button>
        )}

        {/* Loading */}
        {descLoading && (
          <div className="space-y-3">
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {/* Error */}
        {descError && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{descError}</span>
            </div>
            <Button onClick={analyzeDescription} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {/* Results */}
        {descReview && (
          <div className="space-y-4">
            {/* Score */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Description Score
              </span>
              <ScoreBadge score={descReview.score} />
            </div>

            {/* Feedback */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Feedback
              </label>
              <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 leading-relaxed">
                {descReview.feedback}
              </p>
            </div>

            {/* Improved description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Improved Description
              </label>
              <div className="text-sm text-slate-900 dark:text-slate-100 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3 leading-relaxed">
                {descReview.improvedDescription}
              </div>
            </div>

            {/* Apply button */}
            {!descApplied ? (
              <Button
                onClick={handleApplyDescription}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply Improved Description
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2">
                <Badge className="bg-green-100 text-green-700 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Description Applied
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderSkillsStep() {
    return (
      <div className="space-y-4">
        {/* Suggest button */}
        {skills.length === 0 && !skillsLoading && !skillsError && (
          <Button
            onClick={suggestSkills}
            disabled={!description.trim()}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Suggest Skills
          </Button>
        )}

        {/* Loading */}
        {skillsLoading && (
          <div className="space-y-3">
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          </div>
        )}

        {/* Error */}
        {skillsError && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{skillsError}</span>
            </div>
            <Button onClick={suggestSkills} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {/* Skills chips */}
        {skills.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Click to toggle skills. Selected skills will be applied.
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill.name}
                  onClick={() => toggleSkill(skill.name)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                    skill.selected
                      ? 'bg-teal-100 text-teal-700 border-teal-300 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700'
                      : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 line-through dark:bg-slate-800 dark:border-slate-600',
                  )}
                >
                  {skill.selected && (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  {skill.name}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 text-center">
              {skills.filter((s) => s.selected).length} of {skills.length} skills selected
            </p>

            {/* Apply button */}
            {!skillsApplied ? (
              <Button
                onClick={handleApplySkills}
                disabled={skills.filter((s) => s.selected).length === 0}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply Selected Skills
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2">
                <Badge className="bg-green-100 text-green-700 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Skills Applied
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderMilestonesStep() {
    return (
      <div className="space-y-4">
        {/* Generate button */}
        {milestones.length === 0 && !milestonesLoading && !milestonesError && (
          <Button
            onClick={generateMilestones}
            disabled={!description.trim()}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Milestones
          </Button>
        )}

        {/* Loading */}
        {milestonesLoading && (
          <div className="space-y-3">
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        )}

        {/* Error */}
        {milestonesError && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{milestonesError}</span>
            </div>
            <Button onClick={generateMilestones} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        )}

        {/* Milestone timeline */}
        {milestones.length > 0 && (
          <div className="space-y-4">
            <div className="relative space-y-0">
              {milestones.map((milestone, index) => (
                <div key={index} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Timeline line */}
                  {index < milestones.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                  )}

                  {/* Week indicator */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 text-xs font-bold shrink-0 z-10">
                    W{milestone.weekNumber}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {milestone.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply button */}
            {!milestonesApplied ? (
              <Button
                onClick={handleApplyMilestones}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply Milestones
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2">
                <Badge className="bg-green-100 text-green-700 border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Milestones Applied
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const stepRenderers = [renderDescriptionStep, renderSkillsStep, renderMilestonesStep];
  const isAnyLoading = descLoading || skillsLoading || milestonesLoading;
  const StepIcon = STEPS[currentStep].icon;

  // ---- render ------------------------------------------------------------

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <DialogTitle>AI Project Scoping</DialogTitle>
          </div>
          <DialogDescription>
            Let AI help you refine your project in three steps
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 py-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted =
              (index === 0 && descApplied) ||
              (index === 1 && skillsApplied) ||
              (index === 2 && milestonesApplied);

            return (
              <div key={step.key} className="flex items-center flex-1">
                <button
                  onClick={() => setCurrentStep(index)}
                  disabled={isAnyLoading}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors w-full text-left',
                    isActive
                      ? 'bg-teal-50 border border-teal-300 dark:bg-teal-900/20 dark:border-teal-700'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                    isAnyLoading && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-full shrink-0',
                      isCompleted
                        ? 'bg-green-100 text-green-600'
                        : isActive
                          ? 'bg-teal-100 text-teal-600'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-700',
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <p
                      className={cn(
                        'text-xs font-medium truncate',
                        isActive
                          ? 'text-teal-700 dark:text-teal-300'
                          : 'text-slate-600 dark:text-slate-400',
                      )}
                    >
                      {step.title}
                    </p>
                  </div>
                </button>
                {index < STEPS.length - 1 && (
                  <div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-700 shrink-0 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step title and description */}
        <div className="flex items-center gap-2 pb-1">
          <StepIcon className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Step {currentStep + 1}: {STEPS[currentStep].title}
          </h3>
        </div>
        <p className="text-xs text-slate-500 -mt-1">
          {STEPS[currentStep].description}
        </p>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-2 min-h-0">
          {stepRenderers[currentStep]()}
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={goPrev}
            variant="outline"
            size="sm"
            disabled={currentStep === 0 || isAnyLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-slate-500"
            >
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button
                onClick={goNext}
                size="sm"
                disabled={isAnyLoading}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {currentStep < STEPS.length - 2 ? 'Next' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={onClose}
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
