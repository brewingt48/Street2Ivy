'use client';

/**
 * FERPA Consent Page
 *
 * Students must complete this page before accessing the platform.
 * Displays FERPA rights notice and collects consent for:
 * - Data sharing with corporate partners
 * - AI-powered analysis of academic data
 * - Directory information display
 * - Annual FERPA rights notification acknowledgment
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield,
  FileText,
  Brain,
  Users,
  Bell,
  Settings,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface ConsentItem {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
}

const CONSENT_ITEMS: ConsentItem[] = [
  {
    type: 'annual_notification',
    label: 'FERPA Rights Acknowledgment',
    description:
      'I acknowledge that I have been notified of my rights under the Family Educational Rights and Privacy Act (FERPA), including my right to inspect records, request amendments, consent to disclosures, and file complaints with the U.S. Department of Education.',
    icon: <Bell className="h-5 w-5 text-blue-600" />,
    required: true,
  },
  {
    type: 'data_sharing',
    label: 'Data Sharing with Corporate Partners',
    description:
      'I consent to having my academic and professional development records shared with corporate partners who post project listings on this platform. This includes profile information I have chosen to make visible through my directory information preferences. I may revoke this consent at any time.',
    icon: <Users className="h-5 w-5 text-teal-600" />,
    required: false,
  },
  {
    type: 'ai_processing',
    label: 'AI-Powered Analysis',
    description:
      'I consent to AI-powered analysis of my profile for matching and coaching purposes. This includes match scoring, skills gap analysis, and personalized career coaching powered by Anthropic\'s Claude. Anthropic does not use my data to train their models.',
    icon: <Brain className="h-5 w-5 text-purple-600" />,
    required: false,
  },
  {
    type: 'directory_info',
    label: 'Directory Information Display',
    description:
      'I consent to displaying my directory information (name, major, year, sport) to corporate partners on this platform. I can control exactly which fields are visible through my directory information preferences.',
    icon: <FileText className="h-5 w-5 text-amber-600" />,
    required: false,
  },
];

interface ConsentStatus {
  consentType: string;
  isGranted: boolean;
  grantedAt: string | null;
}

export default function FERPAConsentPage() {
  const router = useRouter();
  const [consents, setConsents] = useState<Record<string, boolean>>({
    annual_notification: false,
    data_sharing: false,
    ai_processing: false,
    directory_info: false,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [disclosure, setDisclosure] = useState<{ rights: Array<{ title: string; description: string }> } | null>(null);

  // Load existing consent status and FERPA disclosure text
  useEffect(() => {
    async function loadData() {
      try {
        const [consentRes, disclosureRes] = await Promise.all([
          fetch('/api/ferpa/consent'),
          fetch('/api/ferpa/disclosure'),
        ]);

        if (consentRes.ok) {
          const data = await consentRes.json();
          const consentMap: Record<string, boolean> = {};
          for (const c of data.consents as ConsentStatus[]) {
            consentMap[c.consentType] = c.isGranted;
          }
          setConsents((prev) => ({ ...prev, ...consentMap }));
        }

        if (disclosureRes.ok) {
          const data = await disclosureRes.json();
          setDisclosure(data.disclosure);
        }
      } catch {
        // Non-critical: page works with defaults
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const toggleConsent = useCallback((type: string) => {
    setConsents((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const handleSubmit = async () => {
    // Annual notification acknowledgment is required
    if (!consents.annual_notification) {
      setError('You must acknowledge your FERPA rights to continue.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Submit all consent choices in sequence
      for (const [consentType, isGranted] of Object.entries(consents)) {
        const res = await fetch('/api/ferpa/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consentType, isGranted }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save consent');
        }
      }

      setSubmitted(true);

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving your consent choices.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Consent Recorded</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your FERPA consent choices have been saved. You can update these at any time from your account settings.
                Redirecting to your dashboard...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="h-6 w-6 text-teal-600" />
          FERPA Consent
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Before you can access the platform, please review your rights under FERPA and provide your consent choices below.
        </p>
      </div>

      {/* FERPA Rights Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Your Rights Under FERPA
          </CardTitle>
          <CardDescription>
            The Family Educational Rights and Privacy Act (FERPA) affords you the following rights
            regarding your education records on this platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(disclosure?.rights || [
              {
                title: 'Right to Inspect and Review',
                description: 'You have the right to inspect and review your education records maintained by Proveground within 45 days of submitting a request.',
              },
              {
                title: 'Right to Request Amendment',
                description: 'You have the right to request the amendment of your education records that you believe are inaccurate, misleading, or in violation of your privacy rights.',
              },
              {
                title: 'Right to Consent to Disclosure',
                description: 'You have the right to provide written consent before Proveground discloses personally identifiable information from your education records.',
              },
              {
                title: 'Right to File a Complaint',
                description: 'You have the right to file a complaint with the U.S. Department of Education concerning alleged failures to comply with FERPA.',
              },
            ]).map((right, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="shrink-0 mt-0.5">
                  <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                    {i + 1}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{right.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{right.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Consent Checkboxes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Consent Choices</CardTitle>
          <CardDescription>
            Check each item to grant consent. You can change these choices at any time from your account settings.
            Items marked with an asterisk (*) are required to proceed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {CONSENT_ITEMS.map((item) => (
              <label
                key={item.type}
                className={`flex gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  consents[item.type]
                    ? 'border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    checked={consents[item.type]}
                    onChange={() => toggleConsent(item.type)}
                    className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
                    aria-describedby={`consent-desc-${item.type}`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.label}
                      {item.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
                    </span>
                  </div>
                  <p id={`consent-desc-${item.type}`} className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {item.description}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* Directory preferences link */}
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <Settings className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Directory Information Settings
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Control exactly which fields are visible to corporate partners (name, email, GPA, etc.).
                  You can update these at any time.
                </p>
                <a
                  href="/student/ferpa-notice"
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline mt-1"
                >
                  Review my directory information settings
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => router.push('/student/ferpa-notice')}
          className="order-2 sm:order-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          View Full FERPA Notice
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !consents.annual_notification}
          className="order-1 sm:order-2 bg-teal-600 hover:bg-teal-700 text-white"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Save Consent Choices & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
