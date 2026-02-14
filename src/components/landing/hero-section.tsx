/**
 * Hero Section Component
 */

import Link from 'next/link';

interface HeroSectionProps {
  content?: Record<string, unknown>;
}

export function HeroSection({ content }: HeroSectionProps) {
  const title = (content?.title as string) || 'Connecting Students with Real-World Experience';
  const subtitle = (content?.subtitle as string) || 'A marketplace where college students collaborate with corporations on paid, scoped project work. Build skills. Build your career.';
  const ctaText = (content?.ctaText as string) || 'Get Started Free';

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-24 md:py-32 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight max-w-4xl mx-auto">
          {title}
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {subtitle}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-8 py-3 text-base font-semibold text-white hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/25"
          >
            {ctaText}
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 px-8 py-3 text-base font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div>
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">100+</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Projects</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">50+</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Companies</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">500+</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Students</p>
          </div>
        </div>
      </div>
    </section>
  );
}
