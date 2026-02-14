/**
 * Auth Layout
 *
 * Centered card layout for all authentication pages.
 * Clean, minimal design with brand identity.
 * Includes easy navigation back to homepage.
 */

import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 to-white dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header — clickable link back to homepage */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block group">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
              Campus2Career
            </h1>
          </Link>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            From Campus to Career — Real Projects, Real Impact
          </p>
        </div>
        {children}
        {/* Back to homepage link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-teal-600 transition-colors"
          >
            &larr; Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
