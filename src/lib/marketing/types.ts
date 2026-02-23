/**
 * Marketing Page Settings Types
 *
 * Shared types for the marketing page server component and
 * section components. Maps to the `landing_content` table
 * where section = 'platform_settings'.
 */

export interface HeroCopy {
  tagline?: string;
  headline?: string;
  subheadline?: string;
}

export interface PositioningCopy {
  headline?: string;
  description?: string;
}

export interface HowItWorksStep {
  title?: string;
  description?: string;
}

export interface HowItWorksCopy {
  headline?: string;
  subtitle?: string;
  steps?: HowItWorksStep[];
}

export interface SocialProofStat {
  number?: string;
  label?: string;
}

export interface SocialProofCopy {
  stats?: SocialProofStat[];
  testimonialQuote?: string;
  testimonialAuthor?: string;
  testimonialTitle?: string;
}

export interface CtaCopy {
  headline?: string;
  subheadline?: string;
}

export interface MarketingSettings {
  hiddenSections: string[];
  bookDemoUrl: string;
  logoUrl: string;
  aiCoachingEnabled: boolean;
  aiCoachingUrl: string;
  heroCopy: HeroCopy;
  /** Maps to `problemCopy` in DB for backward compat */
  positioningCopy: PositioningCopy;
  howItWorksCopy: HowItWorksCopy;
  socialProofCopy: SocialProofCopy;
  ctaCopy: CtaCopy;
}
