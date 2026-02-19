'use client';

/**
 * Public Layout — Passthrough
 *
 * The homepage (page.tsx) includes its own Navbar and Footer via
 * modular components, so this layout simply wraps children without
 * adding a duplicate nav or footer. Sub-pages like /blog still render
 * inside this layout and can add their own nav if needed.
 */

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
