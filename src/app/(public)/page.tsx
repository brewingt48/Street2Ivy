import Link from 'next/link';
import { sql } from '@/lib/db';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { CtaSection } from '@/components/landing/cta-section';

async function getLandingContent() {
  try {
    const sections = await sql`
      SELECT section, content FROM landing_content ORDER BY section
    `;
    const content: Record<string, Record<string, unknown>> = {};
    for (const s of sections) {
      content[s.section as string] = (s.content || {}) as Record<string, unknown>;
    }
    return content;
  } catch {
    return {};
  }
}

export default async function LandingPage() {
  const content = await getLandingContent();

  return (
    <>
      <HeroSection content={content.hero} />
      <FeaturesSection content={content.features} />
      <TestimonialsSection content={content.testimonials} />
      <CtaSection content={content.cta} />
    </>
  );
}
