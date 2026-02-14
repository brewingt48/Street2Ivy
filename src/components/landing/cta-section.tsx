/**
 * CTA Section Component
 */

import Link from 'next/link';

interface CtaSectionProps {
  content?: Record<string, unknown>;
}

export function CtaSection({ content }: CtaSectionProps) {
  const heading = (content?.heading as string) || 'Ready to Bridge the Gap?';
  const description = (content?.description as string) || 'Join Street2Ivy today and start connecting with real-world opportunities. Whether you\'re a student looking for experience or a company seeking talent, we\'ve got you covered.';
  const ctaText = (content?.ctaText as string) || 'Create Your Free Account';

  return (
    <section className="py-20 bg-teal-600 dark:bg-teal-800">
      <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          {heading}
        </h2>
        <p className="mt-4 text-lg text-teal-100 max-w-2xl mx-auto">
          {description}
        </p>
        <div className="mt-8">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 text-base font-semibold text-teal-700 hover:bg-teal-50 transition-colors shadow-lg"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
