'use client';

/**
 * Delete Account Page
 *
 * Settings sub-page for permanent account deletion.
 * Requires email and password confirmation before proceeding.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const res = await csrfFetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Redirect to homepage after successful deletion
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setShowConfirmDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Delete Account
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Permanently remove your account and all associated data
        </p>
      </div>

      {/* Warning */}
      <div className="rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-full bg-red-100 dark:bg-red-900/40 p-2.5">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
              This action is permanent and cannot be undone
            </h2>
            <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed mb-3">
              Deleting your account will permanently remove:
            </p>
            <ul className="text-sm text-red-700 dark:text-red-400 space-y-1.5 ml-1">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">&#8226;</span>
                Your profile, bio, and all personal information
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">&#8226;</span>
                All project applications and cover letters
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">&#8226;</span>
                All messages (direct, application, and education)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">&#8226;</span>
                Your portfolio, badges, and project reflections
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">&#8226;</span>
                All AI coaching conversations and career guidance history
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">&#8226;</span>
                Match scores and feedback data
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">&#8226;</span>
                All active sessions (you will be logged out everywhere)
              </li>
            </ul>
            <p className="text-sm text-red-700 dark:text-red-400 mt-3 leading-relaxed">
              Before deleting, consider{' '}
              <Link href="/api/profile/export" className="font-medium underline underline-offset-2">
                exporting your data
              </Link>{' '}
              so you have a copy.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Confirm Account Deletion
          </CardTitle>
          <CardDescription>
            Enter your email and password to confirm you want to delete your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm rounded-md text-red-600 bg-red-50 dark:bg-red-950/30 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirmEmail">Your Email Address</Label>
            <Input
              id="confirmEmail"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Enter your email to confirm"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Your Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {!showConfirmDialog ? (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={!confirmEmail || !password}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete My Account
            </Button>
          ) : (
            <div className="w-full space-y-3">
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                  Are you absolutely sure?
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  This will permanently delete your account and all data. This action cannot be reversed.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConfirmDialog(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  className="flex-1"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
