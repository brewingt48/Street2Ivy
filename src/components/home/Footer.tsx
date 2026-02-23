'use client';

import { useState, useEffect } from 'react';

const DEMO_URL = 'https://calendly.com/proveground/demo';

interface PolicyLink {
  title: string;
  slug: string;
}

const footerColumns = [
  {
    heading: 'Students',
    links: [
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Portfolio', href: '#platform' },
      { label: 'AI Coaching', href: '#ai-coaching' },
    ],
  },
  {
    heading: 'Employers',
    links: [
      { label: 'Post a Project', href: '/login' },
      { label: 'Find Talent', href: '/login' },
      { label: 'Case Studies', href: '#' },
    ],
  },
  {
    heading: 'Programs',
    links: [
      { label: 'Launch Your Engine', href: DEMO_URL, external: true },
      { label: 'Outcomes Dashboard', href: '#platform' },
      { label: 'Integration', href: '#' },
    ],
  },
];

const companyLinks = [
  { label: 'About', href: '#' },
  { label: 'Contact', href: 'mailto:support@proveground.com' },
  { label: 'Privacy Policy', href: '/legal/privacy-policy' },
];

export function Footer() {
  const [policies, setPolicies] = useState<PolicyLink[]>([]);

  useEffect(() => {
    fetch('/api/legal-policies')
      .then((r) => r.json())
      .then((d) => setPolicies(d.policies || []))
      .catch(() => {});
  }, []);

  // Merge dynamic policies into Company column, avoiding duplicates with static links
  const staticSlugs = new Set(['privacy-policy']);
  const dynamicPolicyLinks = policies
    .filter((p) => !staticSlugs.has(p.slug))
    .map((p) => ({ label: p.title, href: `/legal/${p.slug}` }));

  const allCompanyLinks = [...companyLinks, ...dynamicPolicyLinks];

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16">
        {/* Top section: 4-column link grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {footerColumns.map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">
                {col.heading}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...('external' in link && link.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                      className="text-sm text-[#3a3a3a]/60 hover:text-[#d4a843] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Company column */}
          <div>
            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">
              Company
            </h3>
            <ul className="space-y-2">
              {allCompanyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-[#3a3a3a]/60 hover:text-[#d4a843] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Wordmark */}
          <div className="flex items-center gap-0">
            <span className="font-display text-xl tracking-wider text-[#1a1a2e]">PROVE</span>
            <span className="font-display text-xl tracking-wider text-[#d4a843]">GROUND</span>
          </div>

          {/* Copyright */}
          <p className="text-sm text-[#3a3a3a]/60 text-center sm:text-right">
            &copy; 2026 Proveground, Inc. All rights reserved. | support@proveground.com
          </p>
        </div>
      </div>
    </footer>
  );
}
