'use client';

/**
 * Proveground Homepage
 *
 * Bright, clean, modern design inspired by Anthropic.com meets Nike.
 * Sections: Navbar, Hero (video/carousel), The Moment, How It Works,
 * Value Props, AI Coaching, Network Ecosystem, Closing CTA, Footer
 */

import { Navbar } from '@/components/home/Navbar';
import { Hero } from '@/components/home/Hero';
import { TheMoment } from '@/components/home/TheMoment';
import { HowItWorks } from '@/components/home/HowItWorks';
import { ValueProps } from '@/components/home/ValueProps';
import { AICoaching } from '@/components/home/AICoaching';
import { NetworkEcosystem } from '@/components/home/NetworkEcosystem';
import { ClosingCTA } from '@/components/home/ClosingCTA';
import { Footer } from '@/components/home/Footer';

export default function ProvegroundHomepage() {
  return (
    <main className="min-h-screen bg-white text-[#3a3a3a] font-sans">
      <Navbar />
      <Hero mode="carousel" />
      <TheMoment />
      <HowItWorks />
      <ValueProps />
      <AICoaching />
      <NetworkEcosystem />
      <ClosingCTA />
      <Footer />
    </main>
  );
}
