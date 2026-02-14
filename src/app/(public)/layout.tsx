'use client';

/**
 * Public Layout — Enterprise Design
 *
 * Premium navigation + footer for public-facing pages.
 * Transparent nav over hero, sticky on scroll.
 */

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Linkedin, Twitter } from 'lucide-react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-ivory">
      {/* Navigation */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-navy-100/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto flex h-16 items-center px-6 lg:px-8">
          <Link href="/" className="flex items-center mr-10">
            <span className={`text-xl font-bold tracking-tight transition-colors ${
              scrolled ? 'text-navy-900' : 'text-white'
            }`}>
              Campus<span className={scrolled ? 'text-gold-500' : 'text-gold-300'}>2</span>Career
            </span>
          </Link>

          <nav className="hidden lg:flex items-center space-x-8 flex-1">
            {[
              { href: '#how-it-works', label: 'How It Works' },
              { href: '#for-you', label: 'Solutions' },
              { href: '#white-label', label: 'White Label' },
              { href: '/blog', label: 'Blog' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  scrolled
                    ? 'text-navy-600 hover:text-navy-900'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center space-x-4 ml-auto">
            <Link href="/login" className={`text-sm font-medium transition-colors ${
              scrolled ? 'text-navy-600 hover:text-navy-900' : 'text-white/80 hover:text-white'
            }`}>
              Sign In
            </Link>
            <Link href="/register" className="inline-flex items-center justify-center rounded-full bg-gold-500 px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-gold-400 transition-colors shadow-lg shadow-gold-500/25">
              Request a Demo
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden ml-auto p-2 rounded-md ${scrolled ? 'text-navy-900' : 'text-white'}`}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t shadow-xl">
            <div className="px-6 py-6 space-y-4">
              {[
                { href: '#how-it-works', label: 'How It Works' },
                { href: '#for-you', label: 'Solutions' },
                { href: '#white-label', label: 'White Label' },
                { href: '/blog', label: 'Blog' },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-base font-medium text-navy-800 hover:text-gold-600"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-navy-100 flex flex-col gap-3">
                <Link href="/login" className="text-sm font-medium text-navy-600">Sign In</Link>
                <Link href="/register" className="inline-flex items-center justify-center rounded-full bg-gold-500 px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-gold-400">
                  Request a Demo
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main>{children}</main>

      {/* Enterprise Footer */}
      <footer className="bg-navy-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Main footer */}
          <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-1">
              <span className="text-xl font-bold tracking-tight">
                Campus<span className="text-gold-400">2</span>Career
              </span>
              <p className="mt-4 text-sm text-navy-300 leading-relaxed max-w-xs">
                From Campus to Career — Real Projects, Real Impact. The enterprise platform connecting students, corporations, and institutions.
              </p>
              <div className="flex items-center gap-3 mt-6">
                <a href="#" className="p-2 rounded-full bg-navy-800 hover:bg-navy-700 transition-colors">
                  <Linkedin className="h-4 w-4 text-navy-300" />
                </a>
                <a href="#" className="p-2 rounded-full bg-navy-800 hover:bg-navy-700 transition-colors">
                  <Twitter className="h-4 w-4 text-navy-300" />
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-4">Platform</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#how-it-works" className="text-navy-300 hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#for-you" className="text-navy-300 hover:text-white transition-colors">For Students</a></li>
                <li><a href="#for-you" className="text-navy-300 hover:text-white transition-colors">For Corporate Partners</a></li>
                <li><a href="#for-you" className="text-navy-300 hover:text-white transition-colors">For Institutions</a></li>
                <li><a href="#white-label" className="text-navy-300 hover:text-white transition-colors">White Label</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-4">Resources</h3>
              <ul className="space-y-3 text-sm">
                <li><Link href="/blog" className="text-navy-300 hover:text-white transition-colors">Blog</Link></li>
                <li><a href="#demo" className="text-navy-300 hover:text-white transition-colors">Request Demo</a></li>
                <li><Link href="/register" className="text-navy-300 hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-4">Legal</h3>
              <ul className="space-y-3 text-sm">
                <li><span className="text-navy-300 cursor-default">Privacy Policy</span></li>
                <li><span className="text-navy-300 cursor-default">Terms of Service</span></li>
                <li><span className="text-navy-300 cursor-default">Cookie Policy</span></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="py-6 border-t border-navy-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-navy-500">
              &copy; {new Date().getFullYear()} Campus2Career. All rights reserved. A Street2Ivy company.
            </p>
            <p className="text-xs text-navy-500">
              Built for the future of work.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
