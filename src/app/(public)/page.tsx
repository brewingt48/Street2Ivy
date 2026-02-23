/**
 * Proveground Homepage (Server Component)
 *
 * Fetches marketing settings from landing_content table, then renders
 * each section with CMS-editable copy and visibility toggles.
 * Falls back to hardcoded defaults when no settings exist.
 *
 * ISR: revalidates every 60 seconds. Admin saves trigger immediate
 * revalidation via revalidatePath('/').
 */

import { sql } from '@/lib/db';
import type {
  HeroCopy,
  PositioningCopy,
  HowItWorksCopy,
  SocialProofCopy,
  CtaCopy,
} from '@/lib/marketing/types';
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

export const revalidate = 60;

const DEFAULT_DEMO_URL = 'https://calendly.com/proveground/demo';

async function getMarketingSettings(): Promise<Record<string, unknown>> {
  try {
    const [row] = await sql`
      SELECT content FROM landing_content WHERE section = 'platform_settings'
    `;
    return (row?.content as Record<string, unknown>) || {};
  } catch {
    // If DB is unreachable, fall back to empty settings (all defaults)
    return {};
  }
}

function isVisible(settings: Record<string, unknown>, sectionId: string): boolean {
  const hidden = (settings.hiddenSections as string[]) || [];
  return !hidden.includes(sectionId);
}

export default async function ProvegroundHomepage() {
  const settings = await getMarketingSettings();
  const bookDemoUrl = (settings.bookDemoUrl as string) || DEFAULT_DEMO_URL;
  const logoUrl = (settings.logoUrl as string) || '';

  return (
    <main className="min-h-screen bg-white text-[#3a3a3a] font-sans">
      <Navbar bookDemoUrl={bookDemoUrl} logoUrl={logoUrl} />
      {isVisible(settings, 'hero') && (
        <Hero bookDemoUrl={bookDemoUrl} copy={settings.heroCopy as HeroCopy} />
      )}
      {isVisible(settings, 'social-proof') && (
        <SocialProof copy={settings.socialProofCopy as SocialProofCopy} />
      )}
      {isVisible(settings, 'positioning') && (
        <Positioning copy={(settings.problemCopy as PositioningCopy) || (settings.positioningCopy as PositioningCopy)} />
      )}
      {isVisible(settings, 'value-props') && <ValueProps />}
      {isVisible(settings, 'how-it-works') && (
        <HowItWorks copy={settings.howItWorksCopy as HowItWorksCopy} />
      )}
      {isVisible(settings, 'platform-features') && <PlatformFeatures />}
      {isVisible(settings, 'ai-coaching') && <AICoaching />}
      {isVisible(settings, 'career-stack') && <CareerStack />}
      {isVisible(settings, 'network-ecosystem') && <NetworkEcosystem />}
      <Disclaimer />
      {isVisible(settings, 'cta') && (
        <ClosingCTA bookDemoUrl={bookDemoUrl} copy={settings.ctaCopy as CtaCopy} />
      )}
      <Footer />
    </main>
  );
}
