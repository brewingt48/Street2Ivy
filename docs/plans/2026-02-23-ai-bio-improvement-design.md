# AI Bio Improvement — Design Document

**Date:** 2026-02-23
**Status:** Approved
**Approach:** Inline "Improve with AI" button (Approach A)

## Overview

Add an "Improve with AI" button to the student portfolio bio editor. Students write their bio first, then AI polishes it using their profile context (skills, sport, completed projects, ratings). The student reviews a before/after preview and accepts or discards the result.

## Architecture

```
Student clicks "Improve with AI"
  -> POST /api/ai/portfolio/bio { currentBio }
    -> checkAiAccessV2(tenantId, userId, 'student_coaching')
    -> Load student profile (name, major, sport, skills, projects, ratings)
    -> buildBioImprovementPrompt(studentProfile, currentBio)
    -> askClaude({ model: accessCheck.config.model, ... })
    -> incrementUsageV2(...)
    -> Return { improvedBio, usage }
  -> Editor shows preview panel with improved bio
  -> Student clicks Accept -> setBio(improvedBio)
  -> Student clicks Discard -> keeps original
```

Uses existing `student_coaching` feature key. Costs 1 AI usage credit per improvement.

## New API Route: POST /api/ai/portfolio/bio

**File:** `src/app/api/ai/portfolio/bio/route.ts`

- Auth: getCurrentSession(), must be student role
- Validation: `z.object({ currentBio: z.string().min(20).max(2000) })`
- Feature gate: checkAiAccessV2(tenantId, userId, 'student_coaching')
- Profile query: user row + skills + completed project titles + avg rating
- Calls askClaude with buildBioImprovementPrompt(), maxTokens 1024
- Returns `{ improvedBio: string, usage: UsageStatus }`

## New Prompt Builder

**File:** `src/lib/ai/prompts.ts` — new function `buildBioImprovementPrompt()`

Instructions to Claude:
- Improve the student's existing bio, preserving their voice
- Weave in concrete achievements (completed projects, ratings, skills)
- Keep under 2000 characters
- Professional but personable tone
- Never fabricate facts not in the profile data
- Return ONLY the improved bio text, no commentary

## UI Changes

**File:** `src/components/portfolio/portfolio-editor.tsx`

Below bio textarea character count, add:
1. "Improve with AI" button (disabled when bio < 20 chars or loading)
2. Loading state with spinner
3. Preview panel after AI returns (read-only improved bio + Accept/Discard buttons)
4. Error state for rate limits or failures

New state: aiLoading, improvedBio, aiError

## Out of Scope

- No tone selector
- No streaming
- No headline improvement
- No AI usage display in editor
- No conversation history
