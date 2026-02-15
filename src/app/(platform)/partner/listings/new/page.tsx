'use client';

/**
 * Create Network Listing Page
 *
 * Form for network partners to create a new project listing.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

interface FormData {
  title: string;
  description: string;
  scopeOfWork: string;
  deliverables: string;
  category: string;
  budgetMin: string;
  budgetMax: string;
  paymentType: string;
  isPaid: boolean;
  estimatedHours: string;
  startDate: string;
  endDate: string;
  applicationDeadline: string;
  maxStudents: string;
  visibility: string;
  targetInstitutions: string;
  remoteOk: boolean;
  location: string;
  isAlumniProject: boolean;
  alumniMessage: string;
}

const CATEGORIES = [
  'Marketing',
  'Software Development',
  'Data Science',
  'Design',
  'Finance',
  'Consulting',
  'Research',
  'Operations',
  'Sales',
  'Engineering',
  'Content Creation',
  'Business Strategy',
  'Other',
];

export default function CreateListingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    scopeOfWork: '',
    deliverables: '',
    category: '',
    budgetMin: '',
    budgetMax: '',
    paymentType: '',
    isPaid: true,
    estimatedHours: '',
    startDate: '',
    endDate: '',
    applicationDeadline: '',
    maxStudents: '1',
    visibility: 'network',
    targetInstitutions: '',
    remoteOk: false,
    location: '',
    isAlumniProject: false,
    alumniMessage: '',
  });

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        scopeOfWork: form.scopeOfWork || undefined,
        deliverables: form.deliverables || undefined,
        category: form.category || undefined,
        paymentType: form.paymentType || undefined,
        isPaid: form.isPaid,
        visibility: form.visibility,
        remoteOk: form.remoteOk,
        location: form.location || undefined,
        isAlumniProject: form.isAlumniProject,
        alumniMessage: form.isAlumniProject ? form.alumniMessage || undefined : undefined,
      };

      if (form.budgetMin) payload.budgetMin = parseFloat(form.budgetMin);
      if (form.budgetMax) payload.budgetMax = parseFloat(form.budgetMax);
      if (form.estimatedHours) payload.estimatedHours = parseInt(form.estimatedHours);
      if (form.maxStudents) payload.maxStudents = parseInt(form.maxStudents);
      if (form.startDate) payload.startDate = form.startDate;
      if (form.endDate) payload.endDate = form.endDate;
      if (form.applicationDeadline) payload.applicationDeadline = form.applicationDeadline;

      if (form.visibility === 'targeted' && form.targetInstitutions.trim()) {
        payload.targetInstitutions = form.targetInstitutions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const res = await fetch('/api/partner/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details);
        }
        setError(data.error || 'Failed to create listing');
        return;
      }

      router.push(`/partner/listings/${data.listing.id}`);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/partner')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create New Listing
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Post a project opportunity for students across the network
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Describe the project, scope, and deliverables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Title *
              </label>
              <Input
                placeholder="e.g., Social Media Strategy for Q3 Campaign"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                required
              />
              {fieldErrors.title && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.title[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <Textarea
                placeholder="Brief overview of the project..."
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Scope of Work
              </label>
              <Textarea
                placeholder="Detailed scope of what the student will do..."
                value={form.scopeOfWork}
                onChange={(e) => updateField('scopeOfWork', e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Deliverables
              </label>
              <Textarea
                placeholder="Expected deliverables (one per line or comma separated)..."
                value={form.deliverables}
                onChange={(e) => updateField('deliverables', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <Select
                value={form.category || 'none'}
                onValueChange={(v) => updateField('category', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Compensation */}
        <Card>
          <CardHeader>
            <CardTitle>Compensation</CardTitle>
            <CardDescription>Budget and payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPaid"
                checked={form.isPaid}
                onChange={(e) => updateField('isPaid', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="isPaid" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                This is a paid opportunity
              </label>
            </div>

            {form.isPaid && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Budget Min ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.budgetMin}
                      onChange={(e) => updateField('budgetMin', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Budget Max ($)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.budgetMax}
                      onChange={(e) => updateField('budgetMax', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Type
                  </label>
                  <Select
                    value={form.paymentType || 'none'}
                    onValueChange={(v) => updateField('paymentType', v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="stipend">Stipend</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline & Logistics */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline & Logistics</CardTitle>
            <CardDescription>
              Schedule, location, and capacity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estimated Hours
              </label>
              <Input
                type="number"
                min="1"
                placeholder="e.g., 40"
                value={form.estimatedHours}
                onChange={(e) => updateField('estimatedHours', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Application Deadline
              </label>
              <Input
                type="date"
                value={form.applicationDeadline}
                onChange={(e) => updateField('applicationDeadline', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Students
              </label>
              <Input
                type="number"
                min="1"
                value={form.maxStudents}
                onChange={(e) => updateField('maxStudents', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="remoteOk"
                checked={form.remoteOk}
                onChange={(e) => updateField('remoteOk', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="remoteOk" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Remote work allowed
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <Input
                placeholder="e.g., New York, NY"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Visibility</CardTitle>
            <CardDescription>
              Control who can see this listing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Visibility
              </label>
              <Select
                value={form.visibility}
                onValueChange={(v) => updateField('visibility', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="network">
                    Network &mdash; visible to all connected institutions
                  </SelectItem>
                  <SelectItem value="targeted">
                    Targeted &mdash; visible to specific institutions only
                  </SelectItem>
                  <SelectItem value="private">
                    Private &mdash; invitation only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.visibility === 'targeted' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Institutions (comma separated)
                </label>
                <Input
                  placeholder="e.g., Stanford, MIT, Harvard"
                  value={form.targetInstitutions}
                  onChange={(e) => updateField('targetInstitutions', e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alumni Info */}
        <Card>
          <CardHeader>
            <CardTitle>Alumni Connection</CardTitle>
            <CardDescription>
              Optionally mark this as an alumni project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isAlumniProject"
                checked={form.isAlumniProject}
                onChange={(e) => updateField('isAlumniProject', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label
                htmlFor="isAlumniProject"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                This is an alumni-backed project
              </label>
            </div>

            {form.isAlumniProject && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Alumni Message
                </label>
                <Textarea
                  placeholder="A personal message from the alumni sponsor..."
                  value={form.alumniMessage}
                  onChange={(e) => updateField('alumniMessage', e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error & Submit */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/partner')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !form.title.trim()}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Listing
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
