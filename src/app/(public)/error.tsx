'use client';

/**
 * Error boundary for public pages (landing page, blog, etc.)
 * Shows a styled error with retry and navigation options.
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Public page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-ivory">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-gold-50 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-navy-900">Something went wrong</h2>
        <p className="text-navy-500 mt-3">
          We encountered an unexpected error loading this page. Please try again.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              // Full page reload to clear any state issues
              window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-full bg-gold-500 px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-gold-400 transition-colors"
          >
            Reload Page
          </button>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border-2 border-navy-200 px-6 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
