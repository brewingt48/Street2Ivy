'use client';

/**
 * Student Application Detail Page
 *
 * Central hub where students see everything about their application:
 * - Application details
 * - Onboarding information (if accepted/completed)
 * - Corporate feedback (if completed)
 * - Rate the corporate partner (if completed, not yet rated)
 * - Private performance rating received
 * - Report issue link
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Star, Briefcase, AlertTriangle, CheckCircle2, AlertCircle, Mail, Phone, Globe, Shield } from 'lucide-react';
import Link from 'next/link';

interface ApplicationDetail {
  id: string;
  studentId: string;
  listingId: string;
  status: string;
  studentName: string;
  studentEmail: string;
  skills: string[] | null;
  coverLetter: string | null;
  interestReason: string | null;
  relevantCoursework: string | null;
  availabilityDate: string | null;
  hoursPerWeek: number | null;
  gpa: string | null;
  referencesText: string | null;
  listingTitle: string;
  corporateId: string;
  corporateName: string;
  rejectionReason: string | null;
  reviewerNotes: string | null;
  submittedAt: string;
  respondedAt: string | null;
  completedAt: string | null;
}

interface OnboardingData {
  id: string;
  applicationId: string;
  workDescription: string;
  paymentInfo: string;
  systemAccess: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  additionalNotes: string | null;
  createdAt: string;
}

interface FeedbackData {
  id: number;
  assessmentId: string;
  overallAverage: number;
  overallComments: string;
  strengths: string;
  areasForImprovement: string;
  recommendForFuture: boolean;
  assessorName: string;
  companyName: string;
  createdAt: string;
}

interface CorporateRating {
  id: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
}

interface PrivateRating {
  id: string;
  applicationId: string;
  rating: number;
  reviewText: string | null;
  strengths: string | null;
  areasForImprovement: string | null;
  recommendForFuture: boolean;
  corporateName: string;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700' },
  withdrawn: { label: 'Withdrawn', color: 'bg-slate-100 text-slate-500' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500' },
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [existingCorporateRating, setExistingCorporateRating] = useState<CorporateRating | null>(null);
  const [privateRating, setPrivateRating] = useState<PrivateRating | null>(null);
  const [error, setError] = useState('');

  // Rating form state
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myReview, setMyReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch application details
      const appRes = await fetch(`/api/applications/${applicationId}`);
      if (!appRes.ok) {
        setError('Application not found');
        setLoading(false);
        return;
      }
      const appData = await appRes.json();
      const app = appData.application as ApplicationDetail;
      setApplication(app);

      // Fetch additional data in parallel based on status
      const promises: Promise<void>[] = [];

      // Onboarding (if accepted or completed)
      if (app.status === 'accepted' || app.status === 'completed') {
        promises.push(
          fetch(`/api/student/onboarding/${applicationId}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
              if (data?.onboarding) setOnboarding(data.onboarding);
            })
            .catch(() => {})
        );
      }

      // Feedback (if completed)
      if (app.status === 'completed') {
        promises.push(
          fetch(`/api/student/feedback/${applicationId}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
              if (data?.feedback) setFeedback(data.feedback);
            })
            .catch(() => {})
        );

        // Check existing corporate rating
        promises.push(
          fetch(`/api/student/rate-corporate?applicationId=${applicationId}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
              if (data?.rating) setExistingCorporateRating(data.rating);
            })
            .catch(() => {})
        );

        // Private ratings
        promises.push(
          fetch('/api/student/my-ratings')
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
              if (data?.ratings) {
                const match = data.ratings.find(
                  (r: PrivateRating) => r.applicationId === applicationId
                );
                if (match) setPrivateRating(match);
              }
            })
            .catch(() => {})
        );
      }

      await Promise.all(promises);
    } catch {
      setError('Failed to load application details');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitRating = async () => {
    if (myRating === 0) {
      setRatingError('Please select a rating');
      return;
    }

    setSubmittingRating(true);
    setRatingError('');

    try {
      const res = await fetch('/api/student/rate-corporate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          rating: myRating,
          reviewText: myReview.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRatingError(data.error || 'Failed to submit rating');
        return;
      }

      setExistingCorporateRating(data.rating);
      setRatingSubmitted(true);
    } catch {
      setRatingError('Failed to submit rating. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/applications')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Applications
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-600">{error || 'Application not found'}</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = statusConfig[application.status] || statusConfig.pending;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/applications')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Applications
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {application.listingTitle}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={`${config.color} border-0 text-sm px-3 py-1`}>
                {config.label}
              </Badge>
              <span className="text-slate-500 text-sm">{application.corporateName}</span>
              <span className="text-slate-400 text-sm">
                Submitted {new Date(application.submittedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Application Details */}
      <Card>
        <CardHeader>
          <CardTitle>Application Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {application.coverLetter && (
            <div>
              <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Cover Letter</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{application.coverLetter}</p>
            </div>
          )}

          {application.interestReason && (
            <div>
              <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Interest Reason</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{application.interestReason}</p>
            </div>
          )}

          {application.relevantCoursework && (
            <div>
              <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Relevant Coursework</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{application.relevantCoursework}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {application.availabilityDate && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Availability</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{application.availabilityDate}</p>
              </div>
            )}
            {application.hoursPerWeek && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Hours/Week</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{application.hoursPerWeek}</p>
              </div>
            )}
            {application.gpa && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">GPA</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{application.gpa}</p>
              </div>
            )}
          </div>

          {application.skills && Array.isArray(application.skills) && application.skills.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {application.skills.map((skill: string) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {application.rejectionReason && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-xs text-red-500 mb-1 font-medium uppercase tracking-wide">Rejection Reason</p>
              <p className="text-sm text-red-700 dark:text-red-300">{application.rejectionReason}</p>
            </div>
          )}

          {application.respondedAt && (
            <p className="text-xs text-slate-400">
              Responded on {new Date(application.respondedAt).toLocaleDateString()}
            </p>
          )}
          {application.completedAt && (
            <p className="text-xs text-slate-400">
              Completed on {new Date(application.completedAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Onboarding Details */}
      {(application.status === 'accepted' || application.status === 'completed') && onboarding && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-teal-600" />
              Onboarding Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Work Description</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{onboarding.workDescription}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Payment Information</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{onboarding.paymentInfo}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">System Access</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{onboarding.systemAccess}</p>
            </div>

            <Separator />

            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Contact Information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Globe className="h-4 w-4 text-slate-400" />
                  {onboarding.contactName}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {onboarding.contactEmail}
                </div>
                {onboarding.contactPhone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {onboarding.contactPhone}
                  </div>
                )}
              </div>
            </div>

            {onboarding.additionalNotes && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Additional Notes</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{onboarding.additionalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Corporate Feedback */}
      {application.status === 'completed' && feedback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Performance Feedback
            </CardTitle>
            <CardDescription>
              Feedback from {feedback.assessorName || feedback.companyName || 'your corporate partner'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500 mr-2">Overall Rating:</p>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${
                      s <= (feedback.overallAverage || 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                {feedback.overallAverage?.toFixed(1) || 'N/A'}
              </span>
            </div>

            {feedback.overallComments && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Overall Comments</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{feedback.overallComments}</p>
              </div>
            )}

            {feedback.strengths && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Strengths</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{feedback.strengths}</p>
              </div>
            )}

            {feedback.areasForImprovement && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Areas for Improvement</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{feedback.areasForImprovement}</p>
              </div>
            )}

            {feedback.recommendForFuture && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                  Recommended for future opportunities
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rate Your Experience (if completed and not yet rated) */}
      {application.status === 'completed' && !existingCorporateRating && !ratingSubmitted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-teal-600" />
              Rate Your Work Experience
            </CardTitle>
            <CardDescription>
              Share your experience working with {application.corporateName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-2">Your Rating</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMyRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        s <= (hoverRating || myRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      } transition-colors`}
                    />
                  </button>
                ))}
                {myRating > 0 && (
                  <span className="text-sm text-slate-500 ml-2">{myRating}/5</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-2">Review (optional)</p>
              <Textarea
                value={myReview}
                onChange={(e) => setMyReview(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                maxLength={5000}
              />
            </div>

            {ratingError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{ratingError}</p>
              </div>
            )}

            <Button
              onClick={handleSubmitRating}
              disabled={submittingRating || myRating === 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {submittingRating ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Your Rating (already rated) */}
      {application.status === 'completed' && (existingCorporateRating || ratingSubmitted) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-teal-600" />
              Your Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ratingSubmitted && (
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-300">Your rating has been submitted successfully!</p>
              </div>
            )}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-5 w-5 ${
                    s <= (existingCorporateRating?.rating || 0)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-2">
                {existingCorporateRating?.rating || 0}/5
              </span>
            </div>
            {existingCorporateRating?.reviewText && (
              <p className="text-sm text-slate-600 dark:text-slate-300">{existingCorporateRating.reviewText}</p>
            )}
            {existingCorporateRating?.createdAt && (
              <p className="text-xs text-slate-400">
                Submitted on {new Date(existingCorporateRating.createdAt).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Private Performance Rating */}
      {application.status === 'completed' && privateRating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Private Performance Rating
            </CardTitle>
            <CardDescription>
              From {privateRating.corporateName || 'your corporate partner'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-5 w-5 ${
                    s <= privateRating.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-2">
                {privateRating.rating}/5
              </span>
            </div>

            {privateRating.reviewText && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Review</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{privateRating.reviewText}</p>
              </div>
            )}

            {privateRating.strengths && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Strengths</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{privateRating.strengths}</p>
              </div>
            )}

            {privateRating.areasForImprovement && (
              <div>
                <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Areas for Improvement</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{privateRating.areasForImprovement}</p>
              </div>
            )}

            <p className="text-xs text-slate-400 italic">
              This rating is only visible to you and your institution admin.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report Issue Link */}
      <div className="pt-2">
        <Separator className="mb-6" />
        <Link
          href={`/report-issue?corporateId=${application.corporateId}&applicationId=${application.id}`}
        >
          <Button variant="ghost" className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Report an Issue
          </Button>
        </Link>
      </div>
    </div>
  );
}
