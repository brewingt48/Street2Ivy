'use client';

/**
 * Platform error boundary
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Platform error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-6">
          An unexpected error occurred. Please try again or return to your dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} variant="outline">
            Try Again
          </Button>
          <Button onClick={() => window.location.href = '/dashboard'} className="bg-teal-600 hover:bg-teal-700">
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
