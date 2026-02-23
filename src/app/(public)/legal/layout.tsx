import Link from 'next/link';
import { Navbar } from '@/components/home/Navbar';
import { Footer } from '@/components/home/Footer';

const LAST_UPDATED = 'February 23, 2026';

const NAV_LINKS = [
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/terms', label: 'Terms of Service' },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white text-[#3a3a3a] font-sans flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto px-6 pt-28 pb-16 w-full">
        {/* Navigation between legal pages */}
        <nav className="flex items-center gap-4 mb-8 border-b border-slate-200 pb-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Page content */}
        <div className="prose prose-slate max-w-none text-[#3a3a3a] leading-relaxed">
          {children}
        </div>

        {/* Last updated */}
        <div className="mt-12 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Last updated: {LAST_UPDATED}
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
