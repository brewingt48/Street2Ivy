'use client';

/**
 * Report Builder Component
 *
 * Form for generating outcomes reports (engagement, skills, employer, comprehensive).
 * Supports CSV download and on-screen (JSON) format.
 */

import { useState } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FileBarChart } from 'lucide-react';

interface ReportBuilderProps {
  onReportGenerated: () => void;
}

type ReportType = 'comprehensive' | 'engagement' | 'skills' | 'employer';
type ReportFormat = 'csv' | 'json';

function getDefaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function ReportBuilder({ onReportGenerated }: ReportBuilderProps) {
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState<ReportType>('comprehensive');
  const [periodStart, setPeriodStart] = useState(getDefaultStartDate);
  const [periodEnd, setPeriodEnd] = useState(getDefaultEndDate);
  const [format, setFormat] = useState<ReportFormat>('json');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Report title is required.');
      return;
    }

    if (title.length > 200) {
      setError('Report title must be 200 characters or fewer.');
      return;
    }

    setLoading(true);

    try {
      const res = await csrfFetch('/api/education/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          reportType,
          periodStart,
          periodEnd,
          format,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate report');
      }

      const data = await res.json();

      if (format === 'csv' && typeof data.data === 'string') {
        // Create a downloadable CSV blob
        const blob = new Blob([data.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setSuccess('Report generated and downloaded as CSV.');
      } else {
        setSuccess('Report generated successfully.');
      }

      setTitle('');
      onReportGenerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileBarChart className="h-5 w-5 text-teal-600" />
          Generate Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Report Title */}
          <div className="space-y-2">
            <Label htmlFor="report-title">Report Title</Label>
            <Input
              id="report-title"
              placeholder="e.g. Q4 2025 Comprehensive Report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          {/* Report Template and Format Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Template</Label>
              <Select
                value={reportType}
                onValueChange={(v) => setReportType(v as ReportType)}
              >
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                  <SelectItem value="engagement">Student Engagement Report</SelectItem>
                  <SelectItem value="skills">Skills &amp; Readiness Report</SelectItem>
                  <SelectItem value="employer">Employer Partnership Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-format">Format</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as ReportFormat)}
              >
                <SelectTrigger id="report-format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">On-Screen (JSON)</SelectItem>
                  <SelectItem value="csv">CSV Download</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-start">Start Date</Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end">End Date</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
