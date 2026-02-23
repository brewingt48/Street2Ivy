# Customizable Marketing Page — Design Document

**Date:** 2026-02-23
**Status:** Approved
**Approach:** Connect + Redesign Components Incrementally (Approach A)

## Overview

Make the Proveground marketing page (`/`) customizable via the admin CMS. The admin CMS at `/admin/homepage` already saves settings to the `landing_content` table, but no marketing page component reads from it. This design wires the read side: convert `page.tsx` to a server component with ISR, fetch settings from the DB, and pass them as props to each section component with hardcoded fallbacks.

## Architecture

```
Request → page.tsx (Server Component, revalidate=60)
  → SQL: SELECT content FROM landing_content WHERE section = 'platform_settings'
  → Parse settings with fallbacks
  → Pass { settings, hiddenSections } as props to each <SectionComponent>
  → Each component: use settings if present, else hardcoded defaults
  → Admin saves → PUT /api/admin/settings → revalidatePath('/')
```

Key decisions:
- **ISR with 60s revalidate** — same pattern as tenant landing pages
- **revalidatePath('/') on save** — admin sees changes almost immediately
- **Props, not context** — each component receives only its relevant slice
- **Graceful fallbacks** — every field falls back to hardcoded values

## Shared Types

New file: `src/lib/marketing/types.ts`

```typescript
export interface MarketingSettings {
  hiddenSections: string[];
  bookDemoUrl: string;
  logoUrl: string;
  aiCoachingEnabled: boolean;
  aiCoachingUrl: string;
  heroCopy: {
    tagline?: string;
    headline?: string;
    subheadline?: string;
  };
  positioningCopy: {
    headline?: string;
    description?: string;
  };
  howItWorksCopy: {
    headline?: string;
    subtitle?: string;
    steps?: Array<{ title?: string; description?: string }>;
  };
  socialProofCopy: {
    stats?: Array<{ number?: string; label?: string }>;
    testimonialQuote?: string;
    testimonialAuthor?: string;
    testimonialTitle?: string;
  };
  ctaCopy: {
    headline?: string;
    subheadline?: string;
  };
}
```

## Section Visibility — ID Reconciliation

The admin CMS's ALL_SECTIONS must match the actual page components.

| Admin CMS ID | Component | Change |
|---|---|---|
| `hero` | Hero | ✅ Keep |
| `social-proof` | SocialProof | ✅ Keep |
| `problem` → `positioning` | Positioning | ⚠️ Rename |
| `value-props` | ValueProps | ✅ Keep |
| `how-it-works` | HowItWorks | ✅ Keep |
| `white-label` → `career-stack` | CareerStack | ⚠️ Rename |
| `ai-coaching` | AICoaching | ✅ Keep |
| `video` | *(none)* | 🗑 Remove |
| `faq` | *(none)* | 🗑 Remove |
| `cta` | ClosingCTA | ✅ Keep |
| *(new)* `platform-features` | PlatformFeatures | ➕ Add |
| *(new)* `network-ecosystem` | NetworkEcosystem | ➕ Add |

Always-visible (not toggleable): Navbar, Disclaimer, Footer

## page.tsx Conversion

Convert from `'use client'` to server component:
- Remove `'use client'` directive
- Add `export const revalidate = 60`
- Fetch settings from `landing_content` table
- Use `isVisible(settings, sectionId)` helper for conditional rendering
- Pass relevant props to each component

## Component Prop Pattern

Each component gets optional settings props with hardcoded fallbacks:
- **bookDemoUrl:** Navbar, Hero, ClosingCTA (3 files with hardcoded Calendly URL)
- **copy props:** Hero, SocialProof, Positioning, HowItWorks, ClosingCTA
- **Visibility only (no copy editor yet):** ValueProps, PlatformFeatures, AICoaching, CareerStack, NetworkEcosystem

## Admin CMS Changes

1. Update ALL_SECTIONS to match reconciled section IDs
2. Add revalidatePath('/') after successful PUT in API route
3. Positioning copy editor maps to existing problemCopy in DB

## Out of Scope

- No visual redesign of section components (they already look polished)
- No new copy editors for ValueProps, PlatformFeatures, AICoaching, CareerStack, NetworkEcosystem
- No image upload beyond existing logo URL
- No drag-and-drop section reordering
- No live preview in admin

## File Summary

| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/lib/marketing/types.ts` | Shared MarketingSettings type |
| MODIFY | `src/app/(public)/page.tsx` | Server component + ISR + DB fetch |
| MODIFY | `src/components/home/Navbar.tsx` | Accept bookDemoUrl + logoUrl props |
| MODIFY | `src/components/home/Hero.tsx` | Accept bookDemoUrl + copy props |
| MODIFY | `src/components/home/SocialProof.tsx` | Accept copy prop |
| MODIFY | `src/components/home/Positioning.tsx` | Accept copy prop |
| MODIFY | `src/components/home/HowItWorks.tsx` | Accept copy prop |
| MODIFY | `src/components/home/ClosingCTA.tsx` | Accept bookDemoUrl + copy prop |
| MODIFY | `src/app/(platform)/admin/homepage/page.tsx` | Update ALL_SECTIONS |
| MODIFY | `src/app/api/admin/settings/route.ts` | Add revalidatePath('/') |

Total: 10 files (1 new, 9 modified)

## Verification

1. `npx tsc --noEmit` — no TypeScript errors
2. Visit `/` — page renders identically with no DB content (all fallbacks)
3. Admin: `/admin/homepage` → hide "Social Proof" → Save → visit `/` → stats bar hidden
4. Admin: edit Hero headline → Save → visit `/` → new headline shows
5. Admin: set Book Demo URL → Save → all 3 "Request a Demo" buttons use new URL
