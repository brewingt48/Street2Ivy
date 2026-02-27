# AI Bio Improvement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "Improve with AI" button to the student portfolio bio editor that polishes the student's existing bio using their profile context.

**Architecture:** New POST `/api/ai/portfolio/bio` endpoint follows the existing AI chat pattern (auth → feature gate → profile query → prompt builder → askClaude → increment usage). The portfolio editor component gets an "Improve with AI" button that shows a before/after preview panel.

**Tech Stack:** Next.js API route, Anthropic Claude (via existing `askClaude`), Zod validation, `csrfFetch`, React state management.

---

### Task 1: Add Bio Improvement Prompt Builder

**Files:**
- Modify: `src/lib/ai/prompts.ts` (append new function at end)

**Step 1: Add `buildBioImprovementPrompt` function**

Append to `src/lib/ai/prompts.ts`:

```typescript
/**
 * Build a bio improvement prompt for portfolio editing.
 * Asks Claude to polish the student's existing bio, weaving in their achievements.
 */
export function buildBioImprovementPrompt(
  student: StudentProfileForAi,
  currentBio: string,
  completedProjects: string[],
  avgRating: number | null
): string {
  const parts: string[] = [
    `You are a professional bio editor for Proveground, a platform connecting student-athletes with real-world corporate projects.`,
    ``,
    `A student has written a bio for their professional portfolio. Your job is to improve it — make it more polished, compelling, and impactful while preserving their authentic voice.`,
    ``,
    `## Student Profile`,
    `- Name: ${student.name}`,
  ];

  if (student.university) parts.push(`- University: ${student.university}`);
  if (student.major) parts.push(`- Major: ${student.major}`);
  if (student.graduationYear) parts.push(`- Expected Graduation: ${student.graduationYear}`);
  if (student.gpa) parts.push(`- GPA: ${student.gpa}`);
  if (student.skills.length > 0) parts.push(`- Skills: ${student.skills.join(', ')}`);
  if (student.sportsPlayed) parts.push(`- Athletics: ${student.sportsPlayed}`);
  if (student.activities) parts.push(`- Activities: ${student.activities}`);

  if (completedProjects.length > 0) {
    parts.push(`- Completed Projects: ${completedProjects.join(', ')}`);
  }
  if (avgRating !== null) {
    parts.push(`- Average Project Rating: ${avgRating.toFixed(1)}/5`);
  }

  parts.push(``);
  parts.push(`## Current Bio (to improve)`);
  parts.push(currentBio);
  parts.push(``);
  parts.push(`## Instructions`);
  parts.push(`1. PRESERVE the student's authentic voice and tone — improve, don't rewrite from scratch`);
  parts.push(`2. WEAVE IN concrete achievements from their profile (projects, ratings, skills) where natural`);
  parts.push(`3. KEEP the result under 2000 characters`);
  parts.push(`4. USE a professional but personable tone appropriate for employers`);
  parts.push(`5. NEVER fabricate facts, statistics, or achievements not present in the profile data above`);
  parts.push(`6. RETURN ONLY the improved bio text — no commentary, no explanations, no quotation marks wrapping it`);

  return parts.join('\n');
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors related to prompts.ts)

**Step 3: Commit**

```bash
git add src/lib/ai/prompts.ts
git commit -m "feat: add bio improvement prompt builder"
```

---

### Task 2: Create Bio Improvement API Route

**Files:**
- Create: `src/app/api/ai/portfolio/bio/route.ts`

**Step 1: Create the API route**

Create `src/app/api/ai/portfolio/bio/route.ts`:

```typescript
/**
 * POST /api/ai/portfolio/bio — Improve a student's portfolio bio using AI
 *
 * Takes the student's current bio, loads their profile context (skills, projects,
 * ratings), and returns an AI-polished version preserving their voice.
 *
 * Uses the student_coaching feature key (same rate limits as AI coaching).
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentSession } from '@/lib/auth/middleware';
import { z } from 'zod';
import { checkAiAccessV2, incrementUsageV2, getUsageStatusV2 } from '@/lib/ai/config';
import { askClaude } from '@/lib/ai/claude-client';
import { buildBioImprovementPrompt } from '@/lib/ai/prompts';
import type { StudentProfileForAi } from '@/lib/ai/types';

const bioSchema = z.object({
  currentBio: z.string().min(20, 'Bio must be at least 20 characters to improve').max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.data.role !== 'student') {
      return NextResponse.json({ error: 'Bio improvement is available to students only' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { currentBio } = parsed.data;
    const userId = session.data.userId;
    const tenantId = session.data.tenantId;

    // Check AI access
    const accessCheck = await checkAiAccessV2(tenantId, userId, 'student_coaching');
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.denial?.message || 'AI access denied', denial: accessCheck.denial },
        { status: 403 }
      );
    }

    // Load student profile
    const userRows = await sql`
      SELECT display_name, university, major, graduation_year, gpa, bio, metadata
      FROM users WHERE id = ${userId}
    `;
    const user = userRows[0] || {};
    const metadata = (user.metadata || {}) as Record<string, unknown>;

    // Load skills
    const skillRows = await sql`
      SELECT s.name FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${userId}
    `;

    // Load completed project titles
    const projectRows = await sql`
      SELECT pl.title
      FROM project_applications pa
      JOIN project_listings pl ON pl.id = pa.listing_id
      WHERE pa.student_id = ${userId} AND pa.status = 'completed'
    `;

    // Load average rating
    const ratingRows = await sql`
      SELECT AVG(rating)::numeric(3,2) as avg_rating
      FROM corporate_ratings
      WHERE student_id = ${userId}
    `;

    const studentProfile: StudentProfileForAi = {
      name: (user.display_name as string) || 'Student',
      university: (user.university as string) || null,
      major: (user.major as string) || null,
      graduationYear: (user.graduation_year as string) || null,
      gpa: (user.gpa as string) || null,
      bio: currentBio,
      skills: skillRows.map((s: Record<string, unknown>) => s.name as string),
      sportsPlayed: (metadata.sportsPlayed as string) || null,
      activities: (metadata.activities as string) || null,
    };

    const completedProjects = projectRows.map((p: Record<string, unknown>) => p.title as string);
    const avgRating = ratingRows[0]?.avg_rating ? parseFloat(ratingRows[0].avg_rating as string) : null;

    // Build prompt and call Claude
    const systemPrompt = buildBioImprovementPrompt(studentProfile, currentBio, completedProjects, avgRating);

    const improvedBio = await askClaude({
      model: accessCheck.config.model,
      systemPrompt,
      messages: [{ role: 'user', content: 'Please improve my bio.' }],
      maxTokens: 1024,
    });

    // Increment usage
    await incrementUsageV2(tenantId, userId, 'student_coaching');

    // Return result with usage info
    const usage = await getUsageStatusV2(tenantId, userId, 'student_coaching');

    return NextResponse.json({ improvedBio: improvedBio.trim(), usage });
  } catch (error) {
    console.error('AI bio improvement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/api/ai/portfolio/bio/route.ts
git commit -m "feat: add AI bio improvement API endpoint"
```

---

### Task 3: Add AI Improve Button + Preview Panel to Portfolio Editor

**Files:**
- Modify: `src/components/portfolio/portfolio-editor.tsx`

**Step 1: Update imports and add state**

Add `Sparkles`, `Loader2`, `Check`, `X` to lucide imports. Add `csrfFetch` import. Add three new state variables: `aiLoading`, `improvedBio`, `aiError`.

**Step 2: Add the AI improvement handler function**

```typescript
const handleAiImprove = async () => {
  setAiLoading(true);
  setAiError(null);
  setImprovedBio(null);

  try {
    const res = await csrfFetch('/api/ai/portfolio/bio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentBio: bio }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to improve bio');
    }

    const data = await res.json();
    setImprovedBio(data.improvedBio);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to improve bio';
    setAiError(message);
  } finally {
    setAiLoading(false);
  }
};
```

**Step 3: Add UI elements after the bio character count (after line 192)**

After the `{bio.length}/2000 characters` paragraph, insert:

1. **"Improve with AI" button** — uses `Sparkles` icon, disabled when `bio.length < 20 || aiLoading`
2. **Error message** — shown when `aiError` is set
3. **Preview panel** — shown when `improvedBio` is set, containing:
   - "AI-Improved Version" label
   - The improved bio in a styled read-only container
   - "Accept" button (green, sets `setBio(improvedBio)` and clears preview)
   - "Discard" button (ghost, clears preview)

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/portfolio/portfolio-editor.tsx
git commit -m "feat: add AI bio improvement button and preview panel to portfolio editor"
```

---

### Task 4: Visual Verification

**Step 1: Navigate to student portfolio editor**

Log in as `marcus.williams@holycross.edu` / `Demo2025!`, go to the portfolio editor page.

**Step 2: Verify the "Improve with AI" button appears below the bio textarea**

- Button should be disabled if bio is under 20 characters
- Button should be enabled when bio has 20+ characters

**Step 3: Click "Improve with AI" and verify the flow**

- Button shows loading spinner
- After Claude responds, preview panel appears with improved bio
- "Accept" replaces the bio in the textarea
- "Discard" removes the preview and keeps original

**Step 4: Final commit if any visual fixes needed**

---

### Task 5: TypeScript Check + Deploy

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors

**Step 2: Deploy to Heroku**

```bash
git push heroku claude/festive-brahmagupta:main
```

Expected: Build succeeds, deploy as v211.
