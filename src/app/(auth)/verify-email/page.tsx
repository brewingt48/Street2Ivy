'use client';

/**
 * Email Verification Page
 *
 * Automatically verifies the email token from the URL.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Suspense } from 'react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed');
        }
      } catch {
        setStatus('error');
        setMessage('An unexpected error occurred');
      }
    };

    verify();
  }, [token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl text-center">
          {status === 'verifying' && 'Verifying Email...'}
          {status === 'success' && 'Email Verified!'}
          {status === 'error' && 'Verification Failed'}
        </CardTitle>
        <CardDescription className="text-center">
          {status === 'verifying' && 'Please wait while we verify your email address.'}
          {message}
        </CardDescription>
      </CardHeader>
      {status !== 'verifying' && (
        <CardContent className="text-center">
          {status === 'success' && (
            <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-md">
              Your email has been verified successfully.
            </div>
          )}
          {status === 'error' && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
              {message}
            </div>
          )}
        </CardContent>
      )}
      <CardFooter>
        <Link href={status === 'success' ? '/dashboard' : '/login'} className="w-full">
          <Button className="w-full bg-teal-600 hover:bg-teal-700">
            {status === 'success' ? 'Go to Dashboard' : 'Back to Sign In'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
