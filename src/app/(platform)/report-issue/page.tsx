'use client';

/**
 * Report Issue Page
 *
 * Allows students to report issues with corporate partners.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface Application {
  id: string;
  listingTitle: string;
  corporateName: string;
  corporateId?: string;
  status: string;
}

const CATEGORIES = [
  { value: 'safety', label: 'Safety' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'payment', label: 'Payment' },
  { value: 'communication', label: 'Communication' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'other', label: 'Other' },
];

export default function ReportIssuePage() {
  const searchParams = useSearchParams();
  const prefilledCorporateId = searchParams.get('corporateId') || '';
  const prefilledApplicationId = searchParams.get('applicationId') || '';

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [category, setCategory] = useState('');
  const [applicationId, setApplicationId] = useState(prefilledApplicationId);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    // Fetch student's accepted/completed applications
    fetch('/api/applications?status=accepted')
      .then((r) => r.json())
      .then((data) => {
        const accepted = (data.applications || []).map((a: Record<string, unknown>) => ({
          ...a,
          status: 'accepted',
        }));
        // Also fetch completed
        return fetch('/api/applications?status=completed')
          .then((r) => r.json())
          .then((completedData) => {
            const completed = (completedData.applications || []).map((a: Record<string, unknown>) => ({
              ...a,
              status: 'completed',
            }));
            setApplications([...accepted, ...completed]);
          });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Determine corporateId from selected application or prefilled
  const getCorporateId = (): string => {
    if (prefilledCorporateId) return prefilledCorporateId;
    if (applicationId) {
      // Try to get from application detail - for now use the corporateId from the applications list
      // Since applications list doesn't include corporateId, we need to handle this
      const app = applications.find((a) => a.id === applicationId);
      if (app?.corporateId) return app.corporateId;
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!category) {
      setError('Please select a category');
      return;
    }

    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }

    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    // We need a corporateId
    const corporateId = getCorporateId();
    if (!corporateId) {
      // If no corporateId, try to fetch from the selected application
      if (applicationId) {
        try {
          const res = await fetch(`/api/applications/${applicationId}`);
          const appData = await res.json();
          if (appData.application?.corporateId) {
            await submitReport(appData.application.corporateId);
            return;
          }
        } catch {
          // Fall through to error
        }
      }
      setError('Could not determine the corporate partner. Please select an application or try again.');
      return;
    }

    await submitReport(corporateId);
  };

  const submitReport = async (corporateId: string) => {
    setSubmitting(true);
    try {
      const res = await csrfFetch('/api/student/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corporateId,
          applicationId: applicationId || undefined,
          category,
          subject: subject.trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit report');
        return;
      }

      setSuccess(true);
      setCategory('');
      setApplicationId('');
      setSubject('');
      setDescription('');
    } catch {
      setError('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Report an Issue</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Report a concern or issue regarding a corporate partner. Your institution admin will be notified.
        </p>
      </div>

      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
          <div className="text-sm text-green-800 dark:text-green-300">
            <p className="font-medium">Report Submitted</p>
            <p>Your report has been submitted. Your institution admin will be notified.</p>
            <a href="/dashboard" className="inline-flex items-center text-green-700 font-medium hover:text-green-800 mt-2 text-xs">Back to Dashboard &rarr;</a>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm text-red-800 dark:text-red-300">
            <p>{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Issue Report
          </CardTitle>
          <CardDescription>
            Provide details about the issue you encountered. All reports are reviewed by your institution administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="application">Related Application (optional)</Label>
              <select
                id="application"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">-- No specific application --</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.listingTitle} - {app.corporateName}
                  </option>
                ))}
              </select>
              {loading && <p className="text-xs text-slate-400">Loading applications...</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide detailed information about the issue (minimum 10 characters)"
                rows={6}
                maxLength={5000}
                required
              />
              <p className="text-xs text-slate-400">{description.length}/5000 characters</p>
            </div>

            <Button
              type="submit"
              disabled={submitting || !category || !subject.trim() || description.trim().length < 10}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
