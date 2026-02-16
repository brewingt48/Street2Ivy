'use client';

/**
 * Proveground Homepage
 *
 * Bright, clean, modern design inspired by Anthropic.com meets Nike.
 * Flow: Navbar → Hero → Student Banner → How It Works → Value Props →
 * AI Coaching → Network Ecosystem → Closing CTA → Footer
 */

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/home/Navbar';
import { Hero } from '@/components/home/Hero';
import { StudentBanner } from '@/components/home/StudentBanner';
import { HowItWorks } from '@/components/home/HowItWorks';
import { ValueProps } from '@/components/home/ValueProps';
import { AICoaching } from '@/components/home/AICoaching';
import { NetworkEcosystem } from '@/components/home/NetworkEcosystem';
import { ClosingCTA } from '@/components/home/ClosingCTA';
import { Footer } from '@/components/home/Footer';

interface HeroCarouselConfig {
  images?: Array<{ src: string; alt: string }>;
  intervalMs?: number;
}

export default function ProvegroundHomepage() {
  const [heroCarousel, setHeroCarousel] = useState<HeroCarouselConfig | null>(null);

  useEffect(() => {
    fetch('/api/admin/homepage')
      .then((r) => r.json())
      .then((data) => {
        if (data.heroCarousel) {
          setHeroCarousel(data.heroCarousel);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-white text-[#3a3a3a] font-sans">
      <Navbar />
      <Hero
        mode="carousel"
        images={heroCarousel?.images}
        intervalMs={heroCarousel?.intervalMs}
      />
      <StudentBanner />
      <HowItWorks />
      <ValueProps />
      <AICoaching />
      <NetworkEcosystem />
      <ClosingCTA />
      <Footer />
    </main>
  );
}
