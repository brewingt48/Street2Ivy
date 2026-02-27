/**
 * Custom 404 page
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-navy-900 font-serif">404</p>
        <h1 className="text-2xl font-bold text-navy-800 mt-4">Page not found</h1>
        <p className="text-slate-500 mt-2">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-navy-200 px-6 py-2.5 text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
