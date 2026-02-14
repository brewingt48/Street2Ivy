/**
 * Public Layout
 *
 * Layout for public-facing pages (landing, blog) — no auth required.
 */

import Link from 'next/link';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Public navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-slate-900/95 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex h-14 items-center px-4 md:px-6">
          <Link href="/" className="flex items-center space-x-2 mr-8">
            <span className="text-xl font-bold text-teal-700 dark:text-teal-400">
              Street2Ivy
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6 flex-1">
            <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
              Blog
            </Link>
          </nav>

          <div className="flex items-center space-x-3 ml-auto">
            <Link href="/login">
              <span className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                Sign In
              </span>
            </Link>
            <Link href="/register" className="inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <span className="text-lg font-bold text-teal-700 dark:text-teal-400">Street2Ivy</span>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
                Connecting college students with corporations for paid, real-world project work.
                Build experience. Build your future.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Platform</h3>
              <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li><Link href="/blog" className="hover:text-slate-900 dark:hover:text-white">Blog</Link></li>
                <li><Link href="/register" className="hover:text-slate-900 dark:hover:text-white">Sign Up</Link></li>
                <li><Link href="/login" className="hover:text-slate-900 dark:hover:text-white">Login</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <li><span className="cursor-default">Privacy Policy</span></li>
                <li><span className="cursor-default">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Street2Ivy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
