'use client';

/**
 * Security Settings Page
 *
 * MFA enrollment, status management, backup codes, and disable controls.
 * Uses TOTP (authenticator app) for multi-factor authentication.
 */

import { useState, useEffect, useCallback } from 'react';
import { csrfFetch } from '@/lib/security/csrf-fetch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  RefreshCw,
  KeyRound,
  Smartphone,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface MFAStatusData {
  isEnabled: boolean;
  method: string;
  backupCodesRemaining: number;
  isMFARequired: boolean;
}

type Step = 'status' | 'enroll-qr' | 'enroll-verify' | 'backup-codes' | 'disable';

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [mfaStatus, setMfaStatus] = useState<MFAStatusData | null>(null);
  const [step, setStep] = useState<Step>('status');

  // Enrollment state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Disable state
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  // Regenerate backup codes state
  const [regenCode, setRegenCode] = useState('');
  const [showRegenForm, setShowRegenForm] = useState(false);

  // UI state
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/mfa/status');
      if (res.ok) {
        const data = await res.json();
        setMfaStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch MFA status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleStartEnroll = async () => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await csrfFetch('/api/mfa/enroll', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to start enrollment' });
        return;
      }
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setStep('enroll-qr');
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyEnrollment = async () => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await csrfFetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode, secret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Verification failed' });
        return;
      }
      setBackupCodes(data.backupCodes || []);
      setStep('backup-codes');
      await fetchStatus();
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable = async () => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await csrfFetch('/api/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to disable MFA' });
        return;
      }
      setMessage({ type: 'success', text: 'MFA has been disabled' });
      setStep('status');
      setDisablePassword('');
      setDisableCode('');
      await fetchStatus();
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await csrfFetch('/api/mfa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: regenCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to regenerate codes' });
        return;
      }
      setBackupCodes(data.backupCodes || []);
      setStep('backup-codes');
      setRegenCode('');
      setShowRegenForm(false);
      await fetchStatus();
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setProcessing(false);
    }
  };

  const copyBackupCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    });
  };

  const downloadBackupCodes = () => {
    const text = `Street2Ivy MFA Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}\n\nEach code can only be used once. Store them in a safe place.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'street2ivy-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/settings"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Security Settings
          </h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage multi-factor authentication for your account
        </p>
      </div>

      {/* Global message */}
      {message && step === 'status' && (
        <div
          className={`p-3 text-sm rounded-md flex items-center gap-2 ${
            message.type === 'success'
              ? 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
              : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* MFA Status Card */}
      {step === 'status' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-teal-600" />
              Multi-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account using an authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${mfaStatus?.isEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  {mfaStatus?.isEnabled ? (
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <ShieldOff className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {mfaStatus?.isEnabled ? 'MFA Enabled' : 'MFA Not Enabled'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {mfaStatus?.isEnabled
                      ? 'Your account is protected with TOTP authentication'
                      : 'Enable MFA to add an extra layer of security'}
                  </p>
                </div>
              </div>
              <Badge variant={mfaStatus?.isEnabled ? 'default' : 'outline'} className={mfaStatus?.isEnabled ? 'bg-green-600' : ''}>
                {mfaStatus?.isEnabled ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {mfaStatus?.isMFARequired && !mfaStatus?.isEnabled && (
              <div className="p-3 text-sm rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Your organization requires MFA. Please enable it to continue using the platform.
              </div>
            )}

            {mfaStatus?.isEnabled && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Method</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4" />
                      Authenticator App (TOTP)
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Backup Codes</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4" />
                      {mfaStatus.backupCodesRemaining} remaining
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            {mfaStatus?.isEnabled ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowRegenForm(!showRegenForm)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                  onClick={() => { setStep('disable'); setMessage(null); }}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Disable MFA
                </Button>
              </>
            ) : (
              <Button
                onClick={handleStartEnroll}
                disabled={processing}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                {processing ? 'Starting...' : 'Enable MFA'}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* Regenerate Backup Codes Form */}
      {showRegenForm && step === 'status' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-teal-600" />
              Regenerate Backup Codes
            </CardTitle>
            <CardDescription>
              Enter your current TOTP code to generate new backup codes. This will invalidate all existing codes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div
                className={`p-3 text-sm rounded-md flex items-center gap-2 ${
                  message.type === 'error'
                    ? 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
                    : 'text-green-600 bg-green-50'
                }`}
              >
                <AlertCircle className="h-4 w-4" />
                {message.text}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="regenCode">Authenticator Code</Label>
              <Input
                id="regenCode"
                value={regenCode}
                onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="max-w-xs font-mono text-lg tracking-widest"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setShowRegenForm(false); setMessage(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleRegenerateBackupCodes}
              disabled={processing || regenCode.length !== 6}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {processing ? 'Generating...' : 'Generate New Codes'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step: QR Code Display */}
      {step === 'enroll-qr' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-teal-600" />
              Step 1: Scan QR Code
            </CardTitle>
            <CardDescription>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeDataUrl}
                  alt="MFA QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            {/* Manual entry secret */}
            <div className="space-y-2">
              <Label>Manual Entry Key</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                If you cannot scan the QR code, enter this key manually in your authenticator app:
              </p>
              <div className="flex items-center gap-2">
                <code className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-sm select-all flex-1 break-all">
                  {secret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(secret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => { setStep('status'); setMessage(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => { setStep('enroll-verify'); setMessage(null); }}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Next: Verify Code
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step: Verify Enrollment */}
      {step === 'enroll-verify' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-teal-600" />
              Step 2: Verify Code
            </CardTitle>
            <CardDescription>
              Enter the 6-digit code shown in your authenticator app to complete setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className="p-3 text-sm rounded-md text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {message.text}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="verifyCode">Verification Code</Label>
              <Input
                id="verifyCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                className="max-w-xs font-mono text-2xl tracking-[0.5em] text-center"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The code refreshes every 30 seconds
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => { setStep('enroll-qr'); setMessage(null); }}>
              Back
            </Button>
            <Button
              onClick={handleVerifyEnrollment}
              disabled={processing || verificationCode.length !== 6}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {processing ? 'Verifying...' : 'Verify & Enable MFA'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step: Backup Codes Display */}
      {step === 'backup-codes' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-teal-600" />
              Backup Codes
            </CardTitle>
            <CardDescription>
              Save these backup codes in a safe place. Each code can only be used once.
              You will not be able to see these codes again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 text-sm rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              These codes will only be shown once. Copy or download them now.
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {backupCodes.map((code, i) => (
                <div
                  key={i}
                  className="px-3 py-2 bg-white dark:bg-slate-900 rounded font-mono text-sm text-center border border-slate-200 dark:border-slate-700"
                >
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={copyBackupCodes}>
                <Copy className="h-4 w-4 mr-2" />
                {copiedCodes ? 'Copied!' : 'Copy All'}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadBackupCodes}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={() => {
                setStep('status');
                setBackupCodes([]);
                setVerificationCode('');
                setSecret('');
                setQrCodeDataUrl('');
                setMessage({ type: 'success', text: 'MFA has been enabled successfully' });
              }}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Done
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step: Disable MFA */}
      {step === 'disable' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <ShieldOff className="h-5 w-5" />
              Disable Multi-Factor Authentication
            </CardTitle>
            <CardDescription>
              To disable MFA, enter your account password and a current TOTP code.
              This will remove the additional security from your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className="p-3 text-sm rounded-md text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="disablePassword">Account Password</Label>
              <Input
                id="disablePassword"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disableTotp">Authenticator Code</Label>
              <Input
                id="disableTotp"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="max-w-xs font-mono text-lg tracking-widest"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => { setStep('status'); setMessage(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleDisable}
              disabled={processing || !disablePassword || disableCode.length !== 6}
              variant="destructive"
            >
              {processing ? 'Disabling...' : 'Disable MFA'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Multi-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500 dark:text-slate-400 space-y-3">
          <p>
            Multi-factor authentication (MFA) adds an extra layer of security by requiring
            a time-based code from your authenticator app in addition to your password.
          </p>
          <p>
            <strong>Supported apps:</strong> Google Authenticator, Authy, 1Password,
            Microsoft Authenticator, and any TOTP-compatible app.
          </p>
          <p>
            <strong>Backup codes:</strong> When you enable MFA, you will receive 8 one-time
            backup codes. Save these in a safe place in case you lose access to your
            authenticator app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
