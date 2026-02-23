'use client';

/**
 * FERPA Annual Notification Page
 *
 * Displays the full text of FERPA rights and allows students to acknowledge
 * receipt of the annual notification. Also provides directory information
 * preference management.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield,
  FileText,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  Trophy,
  BarChart3,
  Building2,
  User,
  Briefcase,
  FolderOpen,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface DirectoryPreferences {
  showFullName: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showMajor: boolean;
  showYear: boolean;
  showSport: boolean;
  showGpa: boolean;
  showUniversity: boolean;
  showBio: boolean;
  showSkills: boolean;
  showPortfolio: boolean;
  updatedAt: string | null;
}

interface DirectoryField {
  key: keyof Omit<DirectoryPreferences, 'updatedAt'>;
  label: string;
  description: string;
  icon: React.ReactNode;
  sensitive: boolean;
}

const DIRECTORY_FIELDS: DirectoryField[] = [
  { key: 'showFullName', label: 'Full Name', description: 'Your first and last name', icon: <User className="h-4 w-4" />, sensitive: false },
  { key: 'showEmail', label: 'Email Address', description: 'Your email address', icon: <Mail className="h-4 w-4" />, sensitive: true },
  { key: 'showPhone', label: 'Phone Number', description: 'Your phone number', icon: <Phone className="h-4 w-4" />, sensitive: true },
  { key: 'showMajor', label: 'Major / Field of Study', description: 'Your academic major', icon: <BookOpen className="h-4 w-4" />, sensitive: false },
  { key: 'showYear', label: 'Graduation Year', description: 'Your expected graduation year', icon: <GraduationCap className="h-4 w-4" />, sensitive: false },
  { key: 'showSport', label: 'Sport', description: 'Your sport and athletic activities', icon: <Trophy className="h-4 w-4" />, sensitive: false },
  { key: 'showGpa', label: 'GPA', description: 'Your grade point average', icon: <BarChart3 className="h-4 w-4" />, sensitive: true },
  { key: 'showUniversity', label: 'University', description: 'Your university name', icon: <Building2 className="h-4 w-4" />, sensitive: false },
  { key: 'showBio', label: 'Bio / About Me', description: 'Your personal bio and summary', icon: <User className="h-4 w-4" />, sensitive: false },
  { key: 'showSkills', label: 'Skills', description: 'Your listed skills and competencies', icon: <Briefcase className="h-4 w-4" />, sensitive: false },
  { key: 'showPortfolio', label: 'Portfolio', description: 'Your portfolio and work samples', icon: <FolderOpen className="h-4 w-4" />, sensitive: false },
];

export default function FERPANoticePage() {
  const [preferences, setPreferences] = useState<DirectoryPreferences>({
    showFullName: true,
    showEmail: false,
    showPhone: false,
    showMajor: true,
    showYear: true,
    showSport: true,
    showGpa: false,
    showUniversity: true,
    showBio: true,
    showSkills: true,
    showPortfolio: true,
    updatedAt: null,
  });
  const [lastAcknowledged, setLastAcknowledged] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [prefsRes, consentRes] = await Promise.all([
          fetch('/api/ferpa/directory-preferences'),
          fetch('/api/ferpa/consent'),
        ]);

        if (prefsRes.ok) {
          const data = await prefsRes.json();
          setPreferences(data.preferences);
        }

        if (consentRes.ok) {
          const data = await consentRes.json();
          interface ConsentRecord {
            consentType: string;
            isGranted: boolean;
            grantedAt: string | null;
          }
          const annualConsent = (data.consents as ConsentRecord[]).find(
            (c: ConsentRecord) => c.consentType === 'annual_notification' && c.isGranted
          );
          if (annualConsent) {
            setLastAcknowledged(annualConsent.grantedAt);
          }
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const togglePreference = useCallback((key: keyof Omit<DirectoryPreferences, 'updatedAt'>) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/ferpa/directory-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save preferences');
      }

      const data = await res.json();
      setPreferences(data.preferences);
      setMessage({ type: 'success', text: 'Directory information preferences saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save preferences.' });
    } finally {
      setSaving(false);
    }
  };

  const acknowledgeNotification = async () => {
    setAcknowledging(true);
    setMessage(null);

    try {
      const res = await fetch('/api/ferpa/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentType: 'annual_notification', isGranted: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to acknowledge notification');
      }

      setLastAcknowledged(new Date().toISOString());
      setMessage({ type: 'success', text: 'FERPA notification acknowledged. Thank you.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to acknowledge notification.' });
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="h-6 w-6 text-teal-600" />
          FERPA Notice & Directory Preferences
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Annual notification of your rights under the Family Educational Rights and Privacy Act.
        </p>
      </div>

      {/* Last acknowledged date */}
      {lastAcknowledged && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300">
            Last acknowledged: {new Date(lastAcknowledged).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}

      {/* FERPA Rights Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Annual FERPA Notification
          </CardTitle>
          <CardDescription>
            This notification is provided annually as required by FERPA (20 U.S.C. 1232g; 34 CFR Part 99).
          </CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm prose-slate dark:prose-invert max-w-none">
          <p>
            The Family Educational Rights and Privacy Act (FERPA) affords eligible students certain
            rights with respect to their education records. Proveground operates as a school official
            with a legitimate educational interest under agreements with participating educational
            institutions. These rights include:
          </p>

          <h4>1. Right to Inspect and Review Education Records</h4>
          <p>
            You have the right to inspect and review your education records maintained by Proveground
            within 45 days of the day Proveground receives a request for access. You should submit to
            privacy@proveground.com a written request that identifies the record(s) you wish to inspect.
            Proveground will make arrangements for access and notify you of the time and place where
            the records may be inspected.
          </p>

          <h4>2. Right to Request Amendment of Education Records</h4>
          <p>
            You have the right to request the amendment of your education records that you believe are
            inaccurate, misleading, or otherwise in violation of your privacy rights under FERPA. You
            should write to privacy@proveground.com, clearly identify the part of the record you want
            changed, and specify why it is inaccurate or misleading. If Proveground decides not to
            amend the record as requested, you will be notified of the decision and advised of your
            right to a hearing regarding the request for amendment.
          </p>

          <h4>3. Right to Provide Written Consent Before Disclosure</h4>
          <p>
            You have the right to provide written consent before Proveground discloses personally
            identifiable information (PII) from your education records, except to the extent that FERPA
            authorizes disclosure without consent. One exception that permits disclosure without consent
            is disclosure to school officials with legitimate educational interests. A school official
            includes a person employed by your institution in an administrative, supervisory, academic,
            research, or support staff position; a person serving on the board of trustees; or a
            person or company with whom your institution has contracted as its agent to provide a
            service instead of using institutional employees or officials (such as Proveground).
          </p>

          <h4>4. Right to File a Complaint</h4>
          <p>
            You have the right to file a complaint with the U.S. Department of Education concerning
            alleged failures by Proveground or your educational institution to comply with the
            requirements of FERPA. The name and address of the office that administers FERPA is:
          </p>
          <address className="not-italic text-sm pl-4 border-l-2 border-slate-300 dark:border-slate-600">
            Family Policy Compliance Office<br />
            U.S. Department of Education<br />
            400 Maryland Avenue, SW<br />
            Washington, DC 20202
          </address>

          <h4>5. Directory Information</h4>
          <p>
            Under FERPA, your educational institution may designate certain information as
            &quot;directory information,&quot; which may be disclosed without your prior consent. On Proveground,
            directory information may include your name, major field of study, enrollment status (year),
            participation in officially recognized activities and sports, and dates of attendance.
          </p>
          <p>
            You have the right to restrict the disclosure of your directory information. Use the
            Directory Information Preferences section below to control which fields are visible to
            corporate partners.
          </p>
        </CardContent>
      </Card>

      {/* Annual acknowledgment button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Acknowledge Receipt of FERPA Notification
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                By clicking below, you confirm that you have read and understand your rights under FERPA.
              </p>
            </div>
            <Button
              onClick={acknowledgeNotification}
              disabled={acknowledging}
              className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
            >
              {acknowledging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Acknowledging...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  I Acknowledge
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Directory Information Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-600" />
            Directory Information Preferences
          </CardTitle>
          <CardDescription>
            Control which fields are visible to corporate partners when they view your profile or
            application. Fields marked as sensitive are hidden by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DIRECTORY_FIELDS.map((field) => {
              const isVisible = preferences[field.key];
              return (
                <label
                  key={field.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isVisible
                      ? 'border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-900/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => togglePreference(field.key)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
                    aria-label={`Show ${field.label} to corporate partners`}
                  />
                  <div className="text-slate-500 dark:text-slate-400">
                    {field.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      {field.label}
                      {field.sensitive && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          Sensitive
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{field.description}</p>
                  </div>
                  <div className="shrink-0">
                    {isVisible ? (
                      <Eye className="h-4 w-4 text-teal-600" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={savePreferences}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
          role="alert"
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <p
            className={`text-sm ${
              message.type === 'success'
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}
    </div>
  );
}
