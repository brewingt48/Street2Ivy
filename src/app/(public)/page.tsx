'use client';

/**
 * Proveground Homepage
 *
 * Clean, modern design inspired by top-tier career platforms.
 * Flow: Navbar → Hero → Social Proof → Positioning → Audience Routing →
 * How It Works → Platform Features → AI Coaching → Career Stack →
 * Network Ecosystem → Disclaimer → Closing CTA → Footer
 */

import { Navbar } from '@/components/home/Navbar';
import { Hero } from '@/components/home/Hero';
import { SocialProof } from '@/components/home/SocialProof';
import { Positioning } from '@/components/home/Positioning';
import { ValueProps } from '@/components/home/ValueProps';
import { HowItWorks } from '@/components/home/HowItWorks';
import { PlatformFeatures } from '@/components/home/PlatformFeatures';
import { AICoaching } from '@/components/home/AICoaching';
import { CareerStack } from '@/components/home/CareerStack';
import { NetworkEcosystem } from '@/components/home/NetworkEcosystem';
import { Disclaimer } from '@/components/home/Disclaimer';
import { ClosingCTA } from '@/components/home/ClosingCTA';
import { Footer } from '@/components/home/Footer';

export default function ProvegroundHomepage() {
  return (
    <main className="min-h-screen bg-white text-[#3a3a3a] font-sans">
      <Navbar />
      <Hero />
      <SocialProof />
      <Positioning />
      <ValueProps />
      <HowItWorks />
      <PlatformFeatures />
      <AICoaching />
      <CareerStack />
      <NetworkEcosystem />
      <Disclaimer />
      <ClosingCTA />
      <Footer />
    </main>
  );
}
