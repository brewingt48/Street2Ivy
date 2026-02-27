'use client';

/**
 * MFA Challenge Component
 *
 * Shown during login when the user has MFA enabled.
 * Accepts a 6-digit TOTP code or a backup code.
 * On success, redirects to the appropriate dashboard.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Shield, KeyRound, AlertCircle } from 'lucide-react';

interface MFAChallengeProps {
  /** User data from the login response (for redirect routing) */
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    emailVerified: boolean;
    avatarUrl: string | null;
  };
  /** Callback when MFA verification succeeds */
  onSuccess?: () => void;
  /** Callback to go back to login */
  onBack?: () => void;
}

export function MFAChallenge({ user, onSuccess, onBack }: MFAChallengeProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          isBackupCode: useBackupCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      // Verification succeeded
      if (onSuccess) {
        onSuccess();
      } else {
        // Default redirect based on role
        const dashboardRoutes: Record<string, string> = {
          admin: '/admin',
          student: '/dashboard',
          corporate_partner: '/corporate',
          educational_admin: '/education',
        };
        router.push(dashboardRoutes[user.role] || '/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
          <Shield className="h-6 w-6 text-teal-600" />
          {useBackupCode ? 'Backup Code' : 'Two-Factor Authentication'}
        </CardTitle>
        <CardDescription className="text-center">
          {useBackupCode
            ? 'Enter one of your backup codes'
            : 'Enter the 6-digit code from your authenticator app'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {useBackupCode ? (
            <div className="space-y-2">
              <Label htmlFor="backupCode">Backup Code</Label>
              <Input
                id="backupCode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                autoFocus
                autoComplete="off"
                className="font-mono text-lg tracking-wider text-center"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Each backup code can only be used once
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="totpCode">Verification Code</Label>
              <Input
                id="totpCode"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                className="font-mono text-2xl tracking-[0.5em] text-center"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The code refreshes every 30 seconds
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700"
            disabled={loading || (useBackupCode ? code.trim().length < 4 : code.length !== 6)}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>

          <div className="flex flex-col items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setCode('');
                setError('');
              }}
              className="text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {useBackupCode ? 'Use authenticator code instead' : 'Use a backup code'}
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              >
                Back to login
              </button>
            )}

            <a
              href="mailto:support@street2ivy.com"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
            >
              I lost my device - contact support
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
