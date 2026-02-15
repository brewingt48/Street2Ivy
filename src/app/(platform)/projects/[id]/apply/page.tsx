'use client';

/**
 * Application Submission Page
 *
 * Form to apply to a project listing.
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Send,
  AlertCircle,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';

interface ProjectSummary {
  id: string;
  title: string;
  category: string | null;
  compensation: string | null;
  hoursPerWeek: number | null;
  duration: string | null;
  skillsRequired: string[];
  author: {
    displayName: string;
    firstName: string;
    lastName: string;
  };
}

export default function ApplyPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [coverLetter, setCoverLetter] = useState('');
  const [interestReason, setInterestReason] = useState('');
  const [relevantCoursework, setRelevantCoursework] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState('');

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Project not found');
        return res.json();
      })
      .then((data) => {
        setProject(data.project);
        if (data.userApplication) {
          setAlreadyApplied(true);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setPageLoading(false));
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: projectId,
          coverLetter: coverLetter || undefined,
          interestReason: interestReason || undefined,
          relevantCoursework: relevantCoursework || undefined,
          availabilityDate: availabilityDate || undefined,
          hoursPerWeek: hoursPerWeek ? parseInt(hoursPerWeek) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit application');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600">Project Not Found</h3>
            <p className="text-sm text-slate-400 mt-1">{error || 'This project may have been removed.'}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already applied
  if (alreadyApplied) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600">Already Applied</h3>
            <p className="text-sm text-slate-400 mt-1">
              You&apos;ve already submitted an application for this project.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard')}>
              View Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Application Submitted!
            </h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              Your application for <span className="font-medium">{project.title}</span> has been
              submitted. You&apos;ll receive a notification when the company responds.
            </p>
            <p className="text-xs text-slate-400 mt-3 max-w-sm mx-auto">
              If accepted, all work details, contracts, and payment will be arranged directly between you and the partner.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button
                onClick={() => router.push('/projects')}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Browse More Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Project
      </Button>

      {/* Project summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg">{project.title}</h2>
              <p className="text-sm text-slate-500">
                {project.author.displayName || `${project.author.firstName} ${project.author.lastName}`}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {project.category && <Badge variant="outline">{project.category}</Badge>}
                {project.compensation && (
                  <Badge variant="secondary">{project.compensation}</Badge>
                )}
                {project.duration && (
                  <Badge variant="secondary">{project.duration}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Your Application</CardTitle>
            <CardDescription>
              Tell the company why you&apos;re a great fit for this project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="coverLetter">
                Cover Letter <span className="text-slate-400 text-xs">(recommended)</span>
              </Label>
              <Textarea
                id="coverLetter"
                placeholder="Introduce yourself and explain why you're interested in this project..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
                maxLength={5000}
              />
              <p className="text-xs text-slate-400 text-right">
                {coverLetter.length}/5000
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestReason">
                Why are you interested? <span className="text-slate-400 text-xs">(optional)</span>
              </Label>
              <Textarea
                id="interestReason"
                placeholder="What excites you about this opportunity?"
                value={interestReason}
                onChange={(e) => setInterestReason(e.target.value)}
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coursework">
                Relevant Coursework <span className="text-slate-400 text-xs">(optional)</span>
              </Label>
              <Textarea
                id="coursework"
                placeholder="List courses relevant to this project..."
                value={relevantCoursework}
                onChange={(e) => setRelevantCoursework(e.target.value)}
                rows={2}
                maxLength={1000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="availability">
                  Available Start Date <span className="text-slate-400 text-xs">(optional)</span>
                </Label>
                <Input
                  id="availability"
                  type="date"
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">
                  Hours/Week Available <span className="text-slate-400 text-xs">(optional)</span>
                </Label>
                <Input
                  id="hours"
                  type="number"
                  placeholder="20"
                  min={1}
                  max={80}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Please note:</strong> Proveground is a matching and discovery platform. By submitting this application, you are expressing interest in the opportunity. All work agreements, contracts, and payments are arranged directly between you and the partner, outside the platform.
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/projects/${projectId}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {submitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
