# Customizable Marketing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the existing admin CMS to the marketing page so section visibility, copy, and bookDemoUrl are editable from `/admin/homepage`.

**Architecture:** Convert `page.tsx` from a client component to a server component with ISR (60s revalidate). Fetch settings from `landing_content` table, pass as props to each section component. Components fall back to current hardcoded values when settings are empty.

**Tech Stack:** Next.js 15 (App Router, Server Components, ISR), PostgreSQL (via `@/lib/db` sql tagged template), TypeScript, Tailwind CSS, Framer Motion

---

### Task 1: Create MarketingSettings shared types

**Files:**
- Create: `src/lib/marketing/types.ts`

**Step 1: Create the types file**

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS with no errors

**Step 3: Commit**

```bash
git add src/lib/marketing/types.ts
git commit -m "feat: add MarketingSettings shared types for CMS-connected marketing page"
```

---

### Task 2: Convert page.tsx to server component with DB fetch

This is the core architectural change. The page becomes a server component that fetches settings from the DB, then conditionally renders each section and passes relevant props.

**Files:**
- Modify: `src/app/(public)/page.tsx` (entire file rewrite — 44 lines → ~80 lines)

**Step 1: Rewrite page.tsx**

Replace the entire file content with:

```typescript
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
```

Key changes:
- Removed `'use client'` — now a server component
- Added `export const revalidate = 60` for ISR
- Added `getMarketingSettings()` function that queries `landing_content`
- Added `isVisible()` helper to check `hiddenSections`
- Each section wrapped in `isVisible()` conditional
- Hero, SocialProof, Positioning, HowItWorks, ClosingCTA receive `copy` props
- Navbar, Hero, ClosingCTA receive `bookDemoUrl` prop
- Navbar receives `logoUrl` prop
- Positioning reads from `problemCopy` (existing DB key) with fallback to `positioningCopy`
- ValueProps, PlatformFeatures, AICoaching, CareerStack, NetworkEcosystem: visibility only, no copy props yet

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: FAIL — components don't accept the new props yet. That's expected; we'll fix each component in subsequent tasks.

**Step 3: Commit (with --no-verify if tsc fails due to pending component changes)**

Do NOT commit yet. Proceed to Tasks 3–8 to wire all components, then commit all changes together as one working unit.

---

### Task 3: Wire Hero component to accept CMS props

**Files:**
- Modify: `src/components/home/Hero.tsx`

**Step 1: Add props interface and update component signature**

At the top of the file (after the imports, replacing `const DEMO_URL = ...`):

```typescript
import type { HeroCopy } from '@/lib/marketing/types';

interface HeroProps {
  bookDemoUrl?: string;
  copy?: HeroCopy;
}
```

Change the component signature from:
```typescript
export function Hero() {
```
to:
```typescript
export function Hero({ bookDemoUrl, copy }: HeroProps) {
```

**Step 2: Replace the hardcoded DEMO_URL constant**

Remove the line:
```typescript
const DEMO_URL = 'https://calendly.com/proveground/demo';
```

Add inside the component body (first line):
```typescript
const demoUrl = bookDemoUrl || 'https://calendly.com/proveground/demo';
```

**Step 3: Replace all `DEMO_URL` references with `demoUrl`**

There is 1 occurrence on line 121:
```typescript
href={DEMO_URL}
```
Change to:
```typescript
href={demoUrl}
```

**Step 4: Wire copy props into the headline and subheadline**

Replace the headline JSX (lines 83-92):
```tsx
<motion.h1
  initial={{ opacity: 0, y: 24 }}
  animate={loaded ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.7, delay: 0.3 }}
  className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-white leading-[0.95] tracking-wide uppercase"
>
  Where Talent Is
  <br />
  <span className="text-[#d4a843]">Proven,</span> Not Presumed
</motion.h1>
```
With:
```tsx
<motion.h1
  initial={{ opacity: 0, y: 24 }}
  animate={loaded ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.7, delay: 0.3 }}
  className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl text-white leading-[0.95] tracking-wide uppercase"
>
  {copy?.headline ? (
    copy.headline
  ) : (
    <>
      Where Talent Is
      <br />
      <span className="text-[#d4a843]">Proven,</span> Not Presumed
    </>
  )}
</motion.h1>
```

Replace the subheadline paragraph (lines 95-104):
```tsx
<motion.p
  initial={{ opacity: 0, y: 24 }}
  animate={loaded ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.6, delay: 0.6 }}
  className="mt-6 text-base sm:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed"
>
  Proveground is the career platform where students prove their skills
  through real project work &mdash; building verified track records that
  employers trust and career offices can measure.
</motion.p>
```
With:
```tsx
<motion.p
  initial={{ opacity: 0, y: 24 }}
  animate={loaded ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.6, delay: 0.6 }}
  className="mt-6 text-base sm:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed"
>
  {copy?.subheadline ||
    'Proveground is the career platform where students prove their skills through real project work \u2014 building verified track records that employers trust and career offices can measure.'}
</motion.p>
```

---

### Task 4: Wire SocialProof component to accept CMS props

**Files:**
- Modify: `src/components/home/SocialProof.tsx`

**Step 1: Add props interface and update component**

Add import and interface after existing imports:
```typescript
import type { SocialProofCopy } from '@/lib/marketing/types';

interface SocialProofProps {
  copy?: SocialProofCopy;
}
```

Change the hardcoded `stats` const (lines 6-11) to be the DEFAULT, and use props:

Replace the component signature:
```typescript
export function SocialProof() {
```
With:
```typescript
const DEFAULT_STATS = [
  { value: '500+', label: 'Verified Projects' },
  { value: '25+', label: 'Partner Institutions' },
  { value: '150+', label: 'Employer Partners' },
  { value: '2,000+', label: 'Skills Proven' },
];

export function SocialProof({ copy }: SocialProofProps) {
```

Remove the old `stats` const at top of file (lines 6-11).

**Step 2: Use copy.stats with fallback**

Inside the component, add:
```typescript
const displayStats = copy?.stats?.length
  ? copy.stats.map((s) => ({ value: s.number || '', label: s.label || '' }))
  : DEFAULT_STATS;
```

Replace `{stats.map((stat, i) => (` with `{displayStats.map((stat, i) => (`.

---

### Task 5: Wire Positioning component to accept CMS props

**Files:**
- Modify: `src/components/home/Positioning.tsx`

**Step 1: Add props interface**

```typescript
import type { PositioningCopy } from '@/lib/marketing/types';

interface PositioningProps {
  copy?: PositioningCopy;
}

export function Positioning({ copy }: PositioningProps) {
```

**Step 2: Wire copy into headline and body**

Replace the headline content (the inner JSX of the h2):
```tsx
Job boards show who applied.
<br className="hidden sm:block" />{' '}
We show who&rsquo;s ready.
```
With:
```tsx
{copy?.headline ? (
  copy.headline
) : (
  <>
    Job boards show who applied.
    <br className="hidden sm:block" />{' '}
    We show who&rsquo;s ready.
  </>
)}
```

Replace the body paragraph text:
```tsx
Most career platforms help students find listings...
```
With:
```tsx
{copy?.description ||
  'Most career platforms help students find listings and submit applications. Proveground helps them become the candidates who actually get hired. Through verified project work, AI-powered coaching, and measurable skill development, students build the proof that sets them apart \u2014 on any platform, in any application, for any role.'}
```

---

### Task 6: Wire HowItWorks component to accept CMS props

**Files:**
- Modify: `src/components/home/HowItWorks.tsx`

**Step 1: Add props interface**

```typescript
import type { HowItWorksCopy } from '@/lib/marketing/types';

interface HowItWorksProps {
  copy?: HowItWorksCopy;
}

export function HowItWorks({ copy }: HowItWorksProps) {
```

**Step 2: Wire headline**

Replace the h2 text `How Proveground Works` with:
```tsx
{copy?.headline || 'How Proveground Works'}
```

Replace the subtitle `Four steps from launch to measurable outcomes.` with:
```tsx
{copy?.subtitle || 'Four steps from launch to measurable outcomes.'}
```

**Step 3: Wire steps (if provided in settings)**

The hardcoded `steps` array at the top stays as the default. Inside the component, create a merged steps array:

```typescript
const displaySteps = steps.map((defaultStep, i) => {
  const override = copy?.steps?.[i];
  return {
    ...defaultStep,
    title: override?.title || defaultStep.title,
    body: override?.description || defaultStep.body,
  };
});
```

Replace `{steps.map((step, i) => {` with `{displaySteps.map((step, i) => {`.

---

### Task 7: Wire ClosingCTA component to accept CMS props

**Files:**
- Modify: `src/components/home/ClosingCTA.tsx`

**Step 1: Add props interface**

```typescript
import type { CtaCopy } from '@/lib/marketing/types';

interface ClosingCTAProps {
  bookDemoUrl?: string;
  copy?: CtaCopy;
}

export function ClosingCTA({ bookDemoUrl, copy }: ClosingCTAProps) {
```

**Step 2: Replace hardcoded DEMO_URL**

Remove:
```typescript
const DEMO_URL = 'https://calendly.com/proveground/demo';
```
Add inside component:
```typescript
const demoUrl = bookDemoUrl || 'https://calendly.com/proveground/demo';
```

Replace `href={DEMO_URL}` with `href={demoUrl}`.

**Step 3: Wire copy into headline and subheadline**

Replace the h2 content:
```tsx
Ready to build your institution&apos;s{' '}
<span className="text-[#d4a843]">talent engine?</span>
```
With:
```tsx
{copy?.headline ? (
  copy.headline
) : (
  <>
    Ready to build your institution&apos;s{' '}
    <span className="text-[#d4a843]">talent engine?</span>
  </>
)}
```

Replace the body paragraph:
```tsx
See how Proveground works for your school, organization, or workforce network.
```
With:
```tsx
{copy?.subheadline || 'See how Proveground works for your school, organization, or workforce network.'}
```

---

### Task 8: Wire Navbar component to accept CMS props

**Files:**
- Modify: `src/components/home/Navbar.tsx`

**Step 1: Add props interface**

```typescript
interface NavbarProps {
  bookDemoUrl?: string;
  logoUrl?: string;
}

export function Navbar({ bookDemoUrl, logoUrl }: NavbarProps) {
```

**Step 2: Replace hardcoded DEMO_URL**

Remove:
```typescript
const DEMO_URL = 'https://calendly.com/proveground/demo';
```
Add inside component:
```typescript
const demoUrl = bookDemoUrl || 'https://calendly.com/proveground/demo';
```

Replace all 3 occurrences of `href={DEMO_URL}` with `href={demoUrl}` (desktop nav, mobile CTA).

**Step 3: Wire logoUrl into the logo area**

Replace the logo `<a>` tag (lines 155-166) wrapping the text logo with:
```tsx
<a href="#" className="flex items-center gap-0 shrink-0">
  {logoUrl ? (
    <img src={logoUrl} alt="Logo" className="h-8 md:h-10 object-contain" />
  ) : (
    <>
      <span
        className={`font-display text-2xl md:text-3xl tracking-wider transition-colors duration-300 ${
          scrolled || isSubpage ? 'text-[#1a1a2e]' : 'text-white'
        }`}
      >
        PROVE
      </span>
      <span className="font-display text-2xl md:text-3xl tracking-wider text-[#d4a843]">
        GROUND
      </span>
    </>
  )}
</a>
```

---

### Task 9: TypeScript check and commit all component wiring

**Step 1: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS — all components now accept the props that page.tsx passes

**Step 2: Commit**

```bash
git add src/lib/marketing/types.ts src/app/\(public\)/page.tsx src/components/home/Navbar.tsx src/components/home/Hero.tsx src/components/home/SocialProof.tsx src/components/home/Positioning.tsx src/components/home/HowItWorks.tsx src/components/home/ClosingCTA.tsx
git commit -m "feat: connect marketing page to admin CMS settings

Convert page.tsx to server component with ISR (60s revalidate).
Fetch settings from landing_content table, pass as props to section
components with hardcoded fallbacks. Sections can be hidden via
admin CMS hiddenSections array. Copy for Hero, SocialProof,
Positioning, HowItWorks, and ClosingCTA is editable. Book Demo URL
is configurable across Navbar, Hero, and ClosingCTA."
```

---

### Task 10: Update admin CMS ALL_SECTIONS to match actual components

**Files:**
- Modify: `src/app/(platform)/admin/homepage/page.tsx:73-84`

**Step 1: Replace the ALL_SECTIONS array**

Replace lines 73-84:
```typescript
const ALL_SECTIONS = [
  { id: 'hero', label: 'Hero Banner', description: 'Full-screen video hero with headline' },
  { id: 'problem', label: 'The Problem / Opportunity', description: 'Statistics about the talent gap' },
  { id: 'how-it-works', label: 'How It Works', description: '3-step process explanation' },
  { id: 'value-props', label: 'Value Propositions', description: 'Solutions for students, corporates, and institutions' },
  { id: 'white-label', label: 'White Label', description: 'White-label platform showcase with mockup' },
  { id: 'ai-coaching', label: 'AI Coaching', description: 'AI career coaching feature section' },
  { id: 'social-proof', label: 'Social Proof', description: 'Stats, partner logos, and testimonials' },
  { id: 'video', label: 'Video Content', description: 'Platform demo video section' },
  { id: 'faq', label: 'FAQ', description: 'Frequently asked questions accordion — manage content in FAQ Manager' },
  { id: 'cta', label: 'CTA Footer', description: 'Bottom call-to-action with Book Demo' },
];
```

With:
```typescript
const ALL_SECTIONS = [
  { id: 'hero', label: 'Hero Banner', description: 'Full-screen gradient hero with headline and CTAs' },
  { id: 'social-proof', label: 'Social Proof', description: 'Stats bar with key metrics' },
  { id: 'positioning', label: 'Positioning Statement', description: '"Job boards show who applied. We show who\'s ready."' },
  { id: 'value-props', label: 'Value Propositions', description: 'Cards for Students, Employers, and Career Services' },
  { id: 'how-it-works', label: 'How It Works', description: '4-step process from launch to outcomes' },
  { id: 'platform-features', label: 'Platform Features', description: 'Match Engine, Skills Gap, Portfolio, AI Coaching, Dashboard, Content Hub' },
  { id: 'ai-coaching', label: 'AI Coaching', description: 'AI career coaching showcase with chat mockup' },
  { id: 'career-stack', label: 'Career Stack Comparison', description: 'Job boards vs. Proveground comparison table' },
  { id: 'network-ecosystem', label: 'Network Ecosystem', description: 'Multi-institution network visualization' },
  { id: 'cta', label: 'Closing CTA', description: 'Bottom call-to-action with Request a Demo' },
];
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/\(platform\)/admin/homepage/page.tsx
git commit -m "fix: reconcile admin CMS section IDs with actual marketing page components

Update ALL_SECTIONS to match the real component names. Removed phantom
sections (video, faq) and renamed mismatched IDs (problem→positioning,
white-label→career-stack). Added missing sections (platform-features,
network-ecosystem)."
```

---

### Task 11: Add revalidatePath('/') to admin settings API

**Files:**
- Modify: `src/app/api/admin/settings/route.ts:1-136`

**Step 1: Add revalidatePath import**

After line 3 (`import { z } from 'zod';`), add:
```typescript
import { revalidatePath } from 'next/cache';
```

**Step 2: Add revalidation after successful save**

After the INSERT/UPDATE query succeeds (after line 129, before `return NextResponse.json`), add:
```typescript
    // Bust ISR cache for the marketing homepage
    try {
      revalidatePath('/');
    } catch (revalError) {
      console.error('Revalidation error (non-blocking):', revalError);
    }
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/api/admin/settings/route.ts
git commit -m "feat: revalidate marketing page cache after admin settings save

Add revalidatePath('/') to the PUT handler so admin changes
appear on the marketing page immediately instead of waiting
for the 60s ISR cycle."
```

---

### Task 12: Manual verification and deploy

**Step 1: Start dev server**

Run: `npm run dev`
Visit: `http://localhost:3000`
Expected: Homepage renders identically to before — all sections visible, all hardcoded defaults active.

**Step 2: Test section visibility via admin**

1. Log in as admin at `/login`
2. Navigate to `/admin/homepage`
3. Verify all 10 sections show in Section Visibility card
4. Hide "Social Proof" → Save
5. Visit `/` → stats bar should be gone
6. Show "Social Proof" again → Save → stats bar returns

**Step 3: Test copy editing**

1. In admin CMS, edit Hero Section Copy → set headline to "Test Headline"
2. Save → Visit `/` → hero should show "Test Headline"
3. Clear the headline field → Save → hero should show original "Where Talent Is / Proven, Not Presumed"

**Step 4: Test Book Demo URL**

1. In admin CMS, change Book Demo URL to `https://example.com/demo`
2. Save → Visit `/`
3. Check "Request a Demo" buttons in Navbar, Hero, and ClosingCTA → all should link to new URL

**Step 5: Deploy**

```bash
git push heroku claude/festive-brahmagupta:main
```
Expected: Successful deployment
