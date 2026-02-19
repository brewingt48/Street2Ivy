'use client';

/**
 * Landing page error boundary
 */

import { useEffect } from 'react';

export default function LandingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Landing page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-0 mb-6">
          <span className="font-display text-3xl tracking-wider text-[#1a1a2e]">PROVE</span>
          <span className="font-display text-3xl tracking-wider text-[#d4a843]">GROUND</span>
        </div>
        <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">Something went wrong</h2>
        <p className="text-sm text-[#3a3a3a]/60 mb-6">
          We encountered an error loading this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#d4a843] text-[#1a1a2e] text-sm font-semibold hover:bg-[#f0c75e] transition-all duration-200 shadow-md"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
