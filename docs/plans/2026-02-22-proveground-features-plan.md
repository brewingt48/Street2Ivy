# Proveground Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Skills Gap Analyzer, Portfolio Builder, and Outcomes Dashboard with optional Handshake EDU API integration across 6 sequential phases.

**Architecture:** Extend existing `skills` and `user_skills` tables with new columns. Add 10 new tables. New service modules in `/src/lib/`. API routes follow existing Next.js App Router pattern with raw SQL queries. Frontend uses `'use client'` components with Tailwind + shadcn + Recharts.

**Tech Stack:** Next.js 14 (App Router), PostgreSQL + Drizzle ORM, Tailwind CSS, Radix/shadcn UI, Recharts, Zod validation, lucide-react icons

**Note:** This codebase has no testing framework. Verification steps use manual endpoint testing and `npm run build` for type checking.

---

## Phase 1: Foundation (Data Layer)

### Task 1: Extend skills table schema

**Files:**
- Modify: `src/lib/db/schema/skills.ts`
- Create: `migrations/009_skills_taxonomy.sql`

**Step 1: Update Drizzle schema for skills table**

Add new columns to the `skills` table definition in `src/lib/db/schema/skills.ts`:

```typescript
import { pgTable, uuid, text, integer, numeric, timestamp, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users';

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  category: text('category').notNull().default('General'),
  description: text('description').default(''),
  subcategory: text('subcategory'),
  proficiencyLevels: jsonb('proficiency_levels').default(['beginner', 'intermediate', 'advanced', 'expert']),
  aliases: jsonb('aliases').default([]),
  demandWeight: numeric('demand_weight', { precision: 4, scale: 3 }).default('0.000'),
  onetCode: text('onet_code'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

**Step 2: Update Drizzle schema for userSkills table**

Add verification columns to `userSkills` in the same file:

```typescript
export const userSkills = pgTable(
  'user_skills',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    proficiencyLevel: integer('proficiency_level').default(3),
    verificationSource: text('verification_source').default('self_reported'),
    projectId: uuid('project_id'),
    endorserId: uuid('endorser_id'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    evidenceNotes: text('evidence_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.skillId] }),
  })
);
```

**Step 3: Write SQL migration**

Create `migrations/009_skills_taxonomy.sql`:

```sql
-- 009: Skills Taxonomy Extension & Verified Skills
-- Extends existing skills and user_skills tables for Skills Gap Analyzer

-- Add taxonomy columns to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS proficiency_levels JSONB DEFAULT '["beginner","intermediate","advanced","expert"]';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS demand_weight NUMERIC(4,3) DEFAULT 0.000;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS onet_code TEXT;

-- Add verification columns to user_skills
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS verification_source TEXT DEFAULT 'self_reported';
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS endorser_id UUID;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS evidence_notes TEXT;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_skills_subcategory ON skills(subcategory);
CREATE INDEX IF NOT EXISTS idx_skills_onet_code ON skills(onet_code);
CREATE INDEX IF NOT EXISTS idx_skills_demand_weight ON skills(demand_weight DESC);
CREATE INDEX IF NOT EXISTS idx_user_skills_verification ON user_skills(verification_source);
CREATE INDEX IF NOT EXISTS idx_user_skills_project ON user_skills(project_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_verified_at ON user_skills(verified_at);
```

**Step 4: Verify build**

Run: `cd /Users/tavaresbrewington/Desktop/street2ivy/.claude/worktrees/festive-brahmagupta && npm run build`
Expected: Build succeeds with no type errors

**Step 5: Commit**

```bash
git add src/lib/db/schema/skills.ts migrations/009_skills_taxonomy.sql
git commit -m "feat: extend skills and user_skills tables for taxonomy and verification"
```

---

### Task 2: Create target_roles and role_skill_requirements tables

**Files:**
- Create: `src/lib/db/schema/skills-gap.ts`
- Modify: `src/lib/db/schema/index.ts`
- Modify: `migrations/009_skills_taxonomy.sql` (append)

**Step 1: Create the Drizzle schema file**

Create `src/lib/db/schema/skills-gap.ts`:

```typescript
import { pgTable, uuid, text, numeric, integer, date, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { skills } from './skills';
import { tenants } from './tenants';
import { users } from './users';

export const targetRoles = pgTable('target_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').default(''),
  institutionId: uuid('institution_id').references(() => tenants.id, { onDelete: 'set null' }),
  source: text('source').notNull().default('manual'),
  sourceReferenceId: text('source_reference_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roleSkillRequirements = pgTable('role_skill_requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetRoleId: uuid('target_role_id').notNull().references(() => targetRoles.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  importance: text('importance').notNull().default('required'),
  minimumProficiency: integer('minimum_proficiency').notNull().default(2),
  frequencyInPostings: numeric('frequency_in_postings', { precision: 4, scale: 3 }),
  source: text('source').notNull().default('manual'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const skillGapSnapshots = pgTable('skill_gap_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetRoleId: uuid('target_role_id').notNull().references(() => targetRoles.id, { onDelete: 'cascade' }),
  overallReadinessScore: numeric('overall_readiness_score', { precision: 5, scale: 2 }).notNull().default('0.00'),
  gaps: jsonb('gaps').notNull().default([]),
  strengths: jsonb('strengths').notNull().default([]),
  snapshotDate: date('snapshot_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Step 2: Add export to schema index**

In `src/lib/db/schema/index.ts`, add after the `matching` export:

```typescript
export * from './skills-gap';
```

**Step 3: Append SQL migration**

Append to `migrations/009_skills_taxonomy.sql`:

```sql
-- Target roles (career paths students aim for)
CREATE TABLE IF NOT EXISTS target_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  institution_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  source_reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_target_roles_institution ON target_roles(institution_id);
CREATE INDEX IF NOT EXISTS idx_target_roles_source ON target_roles(source);

-- Skill requirements per target role
CREATE TABLE IF NOT EXISTS role_skill_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_role_id UUID NOT NULL REFERENCES target_roles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  importance TEXT NOT NULL DEFAULT 'required',
  minimum_proficiency INTEGER NOT NULL DEFAULT 2,
  frequency_in_postings NUMERIC(4,3),
  source TEXT NOT NULL DEFAULT 'manual',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(target_role_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_role_skill_reqs_role ON role_skill_requirements(target_role_id);
CREATE INDEX IF NOT EXISTS idx_role_skill_reqs_skill ON role_skill_requirements(skill_id);

-- Historical gap analysis snapshots
CREATE TABLE IF NOT EXISTS skill_gap_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_role_id UUID NOT NULL REFERENCES target_roles(id) ON DELETE CASCADE,
  overall_readiness_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  gaps JSONB NOT NULL DEFAULT '[]',
  strengths JSONB NOT NULL DEFAULT '[]',
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gap_snapshots_student ON skill_gap_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_gap_snapshots_role ON skill_gap_snapshots(target_role_id);
CREATE INDEX IF NOT EXISTS idx_gap_snapshots_date ON skill_gap_snapshots(student_id, snapshot_date DESC);
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/lib/db/schema/skills-gap.ts src/lib/db/schema/index.ts migrations/009_skills_taxonomy.sql
git commit -m "feat: add target_roles, role_skill_requirements, skill_gap_snapshots tables"
```

---

### Task 3: Create handshake_integrations table

**Files:**
- Create: `src/lib/db/schema/handshake.ts`
- Modify: `src/lib/db/schema/index.ts`
- Modify: `migrations/009_skills_taxonomy.sql` (append)

**Step 1: Create Drizzle schema**

Create `src/lib/db/schema/handshake.ts`:

```typescript
import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const handshakeIntegrations = pgTable('handshake_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  institutionId: uuid('institution_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }).unique(),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  apiBaseUrl: text('api_base_url').notNull().default('https://edu-api.joinhandshake.com/v1'),
  isActive: boolean('is_active').notNull().default(false),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastSyncStatus: text('last_sync_status').default('never_synced'),
  lastSyncError: text('last_sync_error'),
  syncFrequency: text('sync_frequency').notNull().default('weekly'),
  dataPermissions: jsonb('data_permissions').notNull().default({ jobs: true, applications: false, students: false, fairs: false }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Step 2: Add export to index**

In `src/lib/db/schema/index.ts`, add:

```typescript
export * from './handshake';
```

**Step 3: Append SQL migration**

Append to `migrations/009_skills_taxonomy.sql`:

```sql
-- Handshake EDU API integration per institution
CREATE TABLE IF NOT EXISTS handshake_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  api_key_encrypted TEXT NOT NULL,
  api_base_url TEXT NOT NULL DEFAULT 'https://edu-api.joinhandshake.com/v1',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'never_synced',
  last_sync_error TEXT,
  sync_frequency TEXT NOT NULL DEFAULT 'weekly',
  data_permissions JSONB NOT NULL DEFAULT '{"jobs": true, "applications": false, "students": false, "fairs": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handshake_institution ON handshake_integrations(institution_id);
```

**Step 4: Verify build and commit**

```bash
npm run build
git add src/lib/db/schema/handshake.ts src/lib/db/schema/index.ts migrations/009_skills_taxonomy.sql
git commit -m "feat: add handshake_integrations table"
```

---

### Task 4: Create portfolio tables

**Files:**
- Create: `src/lib/db/schema/portfolio.ts`
- Modify: `src/lib/db/schema/index.ts`
- Modify: `migrations/009_skills_taxonomy.sql` (append)

**Step 1: Create Drizzle schema**

Create `src/lib/db/schema/portfolio.ts`:

```typescript
import { pgTable, uuid, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';
import { listings } from './listings';

export const studentPortfolios = pgTable('student_portfolios', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  slug: text('slug').unique().notNull(),
  displayName: text('display_name').notNull(),
  headline: text('headline'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  theme: text('theme').notNull().default('professional'),
  isPublic: boolean('is_public').notNull().default(true),
  showReadinessScore: boolean('show_readiness_score').notNull().default(true),
  showSkillChart: boolean('show_skill_chart').notNull().default(true),
  customUrl: text('custom_url'),
  viewCount: integer('view_count').notNull().default(0),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioProjects = pgTable('portfolio_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull().references(() => studentPortfolios.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => listings.id, { onDelete: 'cascade' }),
  displayOrder: integer('display_order').notNull().default(0),
  isFeatured: boolean('is_featured').notNull().default(false),
  studentReflection: text('student_reflection'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioBadges = pgTable('portfolio_badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  badgeType: text('badge_type').notNull(),
  badgeLabel: text('badge_label').notNull(),
  badgeMetadata: jsonb('badge_metadata').notNull().default({}),
  earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const portfolioViews = pgTable('portfolio_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  portfolioId: uuid('portfolio_id').notNull().references(() => studentPortfolios.id, { onDelete: 'cascade' }),
  viewerUserId: uuid('viewer_user_id'),
  viewerType: text('viewer_type').notNull().default('anonymous'),
  referrer: text('referrer'),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Step 2: Add export to index**

In `src/lib/db/schema/index.ts`, add:

```typescript
export * from './portfolio';
```

**Step 3: Append SQL migration**

Append to `migrations/009_skills_taxonomy.sql`:

```sql
-- Student portfolios
CREATE TABLE IF NOT EXISTS student_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  avatar_url TEXT,
  theme TEXT NOT NULL DEFAULT 'professional',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  show_readiness_score BOOLEAN NOT NULL DEFAULT TRUE,
  show_skill_chart BOOLEAN NOT NULL DEFAULT TRUE,
  custom_url TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_student ON student_portfolios(student_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_slug ON student_portfolios(slug);

-- Portfolio project selections
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES student_portfolios(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  student_reflection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_projects_portfolio ON portfolio_projects(portfolio_id);

-- Earned badges
CREATE TABLE IF NOT EXISTS portfolio_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_label TEXT NOT NULL,
  badge_metadata JSONB NOT NULL DEFAULT '{}',
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_student ON portfolio_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_badges_type ON portfolio_badges(badge_type);

-- Portfolio view tracking
CREATE TABLE IF NOT EXISTS portfolio_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES student_portfolios(id) ON DELETE CASCADE,
  viewer_user_id UUID,
  viewer_type TEXT NOT NULL DEFAULT 'anonymous',
  referrer TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_views_portfolio ON portfolio_views(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_views_date ON portfolio_views(viewed_at DESC);
```

**Step 4: Verify build and commit**

```bash
npm run build
git add src/lib/db/schema/portfolio.ts src/lib/db/schema/index.ts migrations/009_skills_taxonomy.sql
git commit -m "feat: add portfolio tables (student_portfolios, portfolio_projects, portfolio_badges, portfolio_views)"
```

---

### Task 5: Create outcome_metrics and outcome_reports tables

**Files:**
- Create: `src/lib/db/schema/outcomes.ts`
- Modify: `src/lib/db/schema/index.ts`
- Modify: `migrations/009_skills_taxonomy.sql` (append)

**Step 1: Create Drizzle schema**

Create `src/lib/db/schema/outcomes.ts`:

```typescript
import { pgTable, uuid, text, numeric, boolean, date, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const outcomeMetrics = pgTable('outcome_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  institutionId: uuid('institution_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  metricType: text('metric_type').notNull(),
  metricValue: numeric('metric_value').notNull().default('0'),
  metricMetadata: jsonb('metric_metadata').notNull().default({}),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  cohortFilter: text('cohort_filter'),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const outcomeReports = pgTable('outcome_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  institutionId: uuid('institution_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  reportType: text('report_type').notNull().default('custom'),
  filters: jsonb('filters').notNull().default({}),
  generatedBy: uuid('generated_by').notNull().references(() => users.id),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  fileUrl: text('file_url'),
  isScheduled: boolean('is_scheduled').notNull().default(false),
  scheduleFrequency: text('schedule_frequency'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Step 2: Add export to index**

In `src/lib/db/schema/index.ts`, add:

```typescript
export * from './outcomes';
```

**Step 3: Append SQL migration**

Append to `migrations/009_skills_taxonomy.sql`:

```sql
-- Computed outcome metrics
CREATE TABLE IF NOT EXISTS outcome_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  metric_metadata JSONB NOT NULL DEFAULT '{}',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  cohort_filter TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcome_metrics_institution ON outcome_metrics(institution_id);
CREATE INDEX IF NOT EXISTS idx_outcome_metrics_type ON outcome_metrics(institution_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_outcome_metrics_period ON outcome_metrics(period_start, period_end);

-- Saved/scheduled reports
CREATE TABLE IF NOT EXISTS outcome_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'custom',
  filters JSONB NOT NULL DEFAULT '{}',
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_url TEXT,
  is_scheduled BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_frequency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcome_reports_institution ON outcome_reports(institution_id);
CREATE INDEX IF NOT EXISTS idx_outcome_reports_type ON outcome_reports(report_type);
```

**Step 4: Verify build and commit**

```bash
npm run build
git add src/lib/db/schema/outcomes.ts src/lib/db/schema/index.ts migrations/009_skills_taxonomy.sql
git commit -m "feat: add outcome_metrics and outcome_reports tables"
```

---

### Task 6: Add feature gates for new features

**Files:**
- Modify: `src/lib/tenant/features.ts`

**Step 1: Add new feature definitions**

Add after the `matchEngineAdmin` entry in `FEATURE_DEFINITIONS`:

```typescript
  // --- Skills Gap Analyzer ---
  skillsGapAnalyzer: {
    label: 'Skills Gap Analyzer',
    description: 'Student skills gap analysis with readiness scoring against target roles',
    plans: ['professional', 'enterprise'],
  },
  // --- Portfolio Builder ---
  portfolioBuilder: {
    label: 'Portfolio Builder',
    description: 'Shareable verified portfolios with badges and public profile pages',
    plans: ['professional', 'enterprise'],
  },
  // --- Outcomes Dashboard ---
  outcomesDashboard: {
    label: 'Outcomes Dashboard',
    description: 'Outcomes-based reporting with engagement, skills, and employer metrics',
    plans: ['professional', 'enterprise'],
  },
  // --- Handshake Integration ---
  handshakeIntegration: {
    label: 'Handshake Integration',
    description: 'Connect Handshake EDU API for enriched employer demand data and outcome correlations',
    plans: ['enterprise'],
  },
```

**Step 2: Add to PLAN_DEFAULTS**

Add to `starter` defaults:
```typescript
    skillsGapAnalyzer: false,
    portfolioBuilder: false,
    outcomesDashboard: false,
    handshakeIntegration: false,
```

Add to `professional` defaults:
```typescript
    skillsGapAnalyzer: true,
    portfolioBuilder: true,
    outcomesDashboard: true,
    handshakeIntegration: false,
```

Add to `enterprise` defaults:
```typescript
    skillsGapAnalyzer: true,
    portfolioBuilder: true,
    outcomesDashboard: true,
    handshakeIntegration: true,
```

**Step 3: Verify build and commit**

```bash
npm run build
git add src/lib/tenant/features.ts
git commit -m "feat: add feature gates for skills gap, portfolio, outcomes, and handshake"
```

---

### Task 7: Seed target roles from O*NET common occupations

**Files:**
- Create: `migrations/010_seed_target_roles.sql`

**Step 1: Create seed migration**

Create `migrations/010_seed_target_roles.sql` with ~20 common career roles and their skill requirements. Map each to existing skills in the `skills` table by name. Use subqueries to reference skill IDs.

The seed should include roles like: Software Engineer, Data Analyst, Management Consultant, Financial Analyst, Marketing Manager, Product Manager, UX Designer, Business Analyst, Project Manager, Account Manager, Sales Associate, Operations Analyst, Research Analyst, Content Strategist, Supply Chain Analyst, HR Coordinator, Graphic Designer, Data Scientist, Investment Banking Analyst, Compliance Analyst.

For each role, insert 5-8 skill requirements using the existing skill names from the seeded skills table (e.g., "Python", "SQL", "Excel", "Data Analysis", "Project Management", etc.).

**Step 2: Commit**

```bash
git add migrations/010_seed_target_roles.sql
git commit -m "feat: seed 20 target roles with skill requirements from O*NET data"
```

---

### Task 8: Create encryption utility for Handshake API keys

**Files:**
- Create: `src/lib/handshake/encryption.ts`

**Step 1: Create encryption module**

Create `src/lib/handshake/encryption.ts`:

```typescript
/**
 * Handshake API Key Encryption
 *
 * Uses AES-256-GCM with a key from ENCRYPTION_KEY env var.
 * Format: iv:authTag:ciphertext (all hex-encoded)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  // Hash the key to ensure it's exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**Step 2: Verify build and commit**

```bash
npm run build
git add src/lib/handshake/encryption.ts
git commit -m "feat: add AES-256-GCM encryption for Handshake API keys"
```

---

## Phase 2: Skills Gap Analyzer (Backend + Frontend)

### Task 9: Create SkillGapAnalyzer service

**Files:**
- Create: `src/lib/skills-gap/analyzer.ts`
- Create: `src/lib/skills-gap/scoring.ts`
- Create: `src/lib/skills-gap/index.ts`

**Step 1: Create scoring utility**

Create `src/lib/skills-gap/scoring.ts` with:
- `PROFICIENCY_LABELS` map: `{1: 'beginner', 2: 'intermediate', 3: 'advanced', 4: 'expert', 5: 'expert'}`
- `IMPORTANCE_MULTIPLIERS` map: `{required: 3, preferred: 2, nice_to_have: 1}`
- `READINESS_TIERS`: `[{min: 0, max: 25, label: 'Exploring'}, {min: 26, max: 50, label: 'Building'}, {min: 51, max: 75, label: 'Demonstrating'}, {min: 76, max: 100, label: 'Hire-Ready'}]`
- `getReadinessTier(score)` function
- `calculateReadinessScore(requirements, studentSkillsMap)` — implements the weighted scoring algorithm

**Step 2: Create analyzer service**

Create `src/lib/skills-gap/analyzer.ts` with:
- `analyzeStudentGaps(studentId, targetRoleId)` — uses raw `sql` queries (following existing pattern) to:
  1. Fetch student's `user_skills` joined with `skills` table
  2. Fetch `role_skill_requirements` joined with `skills` for the target role
  3. Compare each requirement against student skills
  4. Compute readiness score using `calculateReadinessScore`
  5. Find recommended projects: query `listings` where `skills_required` JSONB contains the gap skill name and status = 'published'
  6. Insert `skill_gap_snapshots` record
  7. Return the full analysis object

- `aggregateInstitutionGaps(institutionId, filters?)` — queries all students for institution, runs analysis, aggregates into top gaps, readiness distribution, etc.

- `getRecommendedProjects(skillName, tenantId)` — queries published listings whose `skills_required` JSONB array contains the skill name

**Step 3: Create barrel export**

Create `src/lib/skills-gap/index.ts`:
```typescript
export { analyzeStudentGaps, aggregateInstitutionGaps, getRecommendedProjects } from './analyzer';
export { calculateReadinessScore, getReadinessTier, PROFICIENCY_LABELS, READINESS_TIERS } from './scoring';
```

**Step 4: Verify build and commit**

```bash
npm run build
git add src/lib/skills-gap/
git commit -m "feat: implement SkillGapAnalyzer service with scoring and analysis"
```

---

### Task 10: Create Skills Gap API routes

**Files:**
- Create: `src/app/api/skills-gap/analyze/route.ts`
- Create: `src/app/api/skills-gap/history/route.ts`
- Create: `src/app/api/skills-gap/recommendations/route.ts`
- Create: `src/app/api/target-roles/route.ts`
- Create: `src/app/api/student/skills/verified/route.ts`
- Create: `src/app/api/education/skills-analytics/route.ts`

**Step 1: Create `GET /api/skills-gap/analyze`**

Follow the pattern from `src/app/api/match-engine/matches/compute/route.ts`:
- Require auth via `getCurrentSession()`
- Accept `targetRoleId` query param
- Call `analyzeStudentGaps(userId, targetRoleId)`
- Return JSON result

**Step 2: Create `GET /api/skills-gap/history`**

- Require auth
- Accept `targetRoleId` query param
- Query `skill_gap_snapshots` for the student ordered by `snapshot_date DESC`
- Return array of snapshots

**Step 3: Create `GET /api/skills-gap/recommendations`**

- Require auth
- Accept `targetRoleId` query param
- Run analysis, extract top 3 gaps by severity, include recommended projects for each
- Return recommendations array

**Step 4: Create `GET /api/target-roles` and `POST /api/target-roles`**

- GET: list target roles, optionally filtered by `institution_id` (include global roles where institution_id IS NULL plus institution-specific)
- POST: educational_admin role required, create a new target role with skill requirements

**Step 5: Create `GET /api/student/skills/verified`**

- Require student auth
- Query `user_skills` joined with `skills` where `verification_source != 'self_reported'`
- Return verified skills with proficiency, source, project, evidence

**Step 6: Create `GET /api/education/skills-analytics`**

- Require educational_admin role
- Feature gate on `skillsGapAnalyzer`
- Call `aggregateInstitutionGaps(tenantId, filters from query params)`
- Return aggregated data

**Step 7: Verify build and commit**

```bash
npm run build
git add src/app/api/skills-gap/ src/app/api/target-roles/ src/app/api/student/skills/ src/app/api/education/skills-analytics/
git commit -m "feat: add Skills Gap Analyzer API routes"
```

---

### Task 11: Create Student Skills Gap Dashboard page

**Files:**
- Create: `src/app/(platform)/dashboard/skills-gap/page.tsx`
- Create: `src/components/skills-gap/readiness-score-card.tsx`
- Create: `src/components/skills-gap/skill-gap-breakdown.tsx`
- Create: `src/components/skills-gap/target-role-selector.tsx`
- Create: `src/components/skills-gap/recommended-actions.tsx`
- Create: `src/components/skills-gap/gap-history-timeline.tsx`

**Step 1: Create TargetRoleSelector component**

`'use client'` component with:
- Fetch target roles from `GET /api/target-roles`
- Searchable dropdown using shadcn Select component
- On selection, trigger parent callback with roleId
- Show Handshake badge if role source is 'handshake_api'

**Step 2: Create ReadinessScoreCard component**

`'use client'` component with:
- Large circular progress indicator (CSS-based radial gradient or SVG circle)
- Color coding: 0-40 red (`text-red-500`), 41-70 amber (`text-amber-500`), 71-100 green (`text-emerald-500`)
- Tier label display
- Trend arrow (up/down/neutral) comparing to previous snapshot
- Description text

**Step 3: Create SkillGapBreakdown component**

`'use client'` component with:
- Grid of skill cards from the gaps + strengths arrays
- Each card: skill name, category, required level bar, current level bar, gap indicator icon
- Sort controls: by gap severity, by importance, alphabetical
- "Close this gap" link → recommended project or AI Coach link

**Step 4: Create RecommendedActions component**

`'use client'` component with:
- Top 3 highest-impact gap items
- For each: skill name, estimated score improvement, action link (project or coach)
- Card layout with icons

**Step 5: Create GapHistoryTimeline component**

`'use client'` component using Recharts:
- Line chart of `overall_readiness_score` over time from snapshots
- X-axis: snapshot dates, Y-axis: score 0-100
- Use existing `ChartCard` wrapper pattern

**Step 6: Create the page**

Create `src/app/(platform)/dashboard/skills-gap/page.tsx` as `'use client'`:
- Fetch gap analysis via `GET /api/skills-gap/analyze?targetRoleId=...`
- Fetch history via `GET /api/skills-gap/history?targetRoleId=...`
- Layout: TargetRoleSelector → ReadinessScoreCard → SkillGapBreakdown → RecommendedActions → GapHistoryTimeline
- Loading state with Skeleton components
- Empty state if no target role selected

**Step 7: Verify build and commit**

```bash
npm run build
git add src/app/\(platform\)/dashboard/skills-gap/ src/components/skills-gap/
git commit -m "feat: add student Skills Gap Analyzer dashboard page"
```

---

### Task 12: Create Education Admin Skills Analytics page

**Files:**
- Create: `src/app/(platform)/education/skills-analytics/page.tsx`
- Create: `src/components/skills-gap/institution-gaps-chart.tsx`
- Create: `src/components/skills-gap/readiness-distribution.tsx`
- Create: `src/components/skills-gap/skills-heatmap.tsx`

**Step 1: Create InstitutionGapsChart component**

- Horizontal bar chart (Recharts BarChart) of top 10-15 skill gaps
- Each bar: skill name, student count, percentage
- Color coded by severity
- Use `ChartCard` wrapper

**Step 2: Create ReadinessDistribution component**

- Pie chart (Recharts PieChart) of students across readiness tiers
- Use COLORS array from chart-card pattern
- Show percentages

**Step 3: Create SkillsHeatmap component**

- Table-based matrix: rows = skills, columns = programs/cohorts
- Cell background color intensity based on coverage percentage
- Use Tailwind opacity classes for intensity

**Step 4: Create the page**

`'use client'` page at `src/app/(platform)/education/skills-analytics/page.tsx`:
- Fetch from `GET /api/education/skills-analytics`
- Summary stat cards at top (total students analyzed, avg readiness, critical gaps, gaps closed)
- InstitutionGapsChart
- ReadinessDistribution
- SkillsHeatmap
- Student drill-down table (sortable, filterable)
- Filter bar: program, cohort, graduation year

**Step 5: Verify build and commit**

```bash
npm run build
git add src/app/\(platform\)/education/skills-analytics/ src/components/skills-gap/
git commit -m "feat: add education admin Skills Analytics page"
```

---

### Task 13: Update sidebar navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Add new imports**

Add to the lucide-react imports:
```typescript
import { ..., Crosshair, FolderOpen, LineChart, Link2 } from 'lucide-react';
```

**Step 2: Add student nav items**

In the `student` case, add after the "AI Coach" entry:
```typescript
{ href: '/dashboard/skills-gap', label: 'Skills Gap', icon: Crosshair, featureGate: 'skillsGapAnalyzer' },
{ href: '/dashboard/portfolio', label: 'My Portfolio', icon: FolderOpen, featureGate: 'portfolioBuilder' },
```

**Step 3: Add educational_admin nav items**

In the `educational_admin` case, add after the "Match Engine" entry in the first section:
```typescript
{ href: '/education/skills-analytics', label: 'Skills Analytics', icon: Crosshair, featureGate: 'skillsGapAnalyzer' },
{ href: '/education/outcomes', label: 'Outcomes', icon: LineChart, featureGate: 'outcomesDashboard' },
```

In the "Institution" section, add:
```typescript
{ href: '/education/handshake', label: 'Handshake', icon: Link2, featureGate: 'handshakeIntegration' },
{ href: '/education/reports', label: 'Reports', icon: FileText, featureGate: 'outcomesDashboard' },
```

**Step 4: Verify build and commit**

```bash
npm run build
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Skills Gap, Portfolio, Outcomes, Handshake to sidebar nav"
```

---

## Phase 3: Handshake Integration

### Task 14: Create Handshake API client

**Files:**
- Create: `src/lib/handshake/client.ts`
- Create: `src/lib/handshake/index.ts`

**Step 1: Create the API client**

Create `src/lib/handshake/client.ts` with:

- `HandshakeApiClient` class:
  - Constructor takes `institutionId`, loads from `handshake_integrations` table, decrypts API key
  - Private `request(endpoint, params)` method with auth headers, error handling, rate limit backoff
  - `testConnection()` — fetch 1 job, return `{success, message, latencyMs}`
  - `fetchJobs(params?)` — `GET /jobs` with pagination
  - `fetchJobQualifications(params?)` — `GET /job_qualifications`
  - `fetchApplications(params?)` — `GET /applications`
  - `fetchPostings(params?)` — `GET /postings`
  - `fetchStudents(params?)` — `GET /students`
  - `fetchCareerFairs(params?)` — `GET /career_fairs`
  - `fetchCareerFairAttendance(params?)` — `GET /career_fair_attendance`
  - `fetchSurveys(params?)` — `GET /first_destination_surveys`
  - `handlePagination(endpoint, params, maxPages)` — auto-paginate cursor-based results
  - `handleErrors(response)` — parse `{errors: [{status, code, detail}]}` format, throw typed errors

- Implement exponential backoff: on 429, wait `2^attempt * 1000ms`, max 3 retries
- All methods return parsed JSON

**Step 2: Create barrel export**

Create `src/lib/handshake/index.ts`:
```typescript
export { HandshakeApiClient } from './client';
export { encrypt, decrypt } from './encryption';
```

**Step 3: Verify build and commit**

```bash
npm run build
git add src/lib/handshake/
git commit -m "feat: implement Handshake EDU API client with pagination and retry"
```

---

### Task 15: Create Handshake sync service

**Files:**
- Create: `src/lib/handshake/sync.ts`

**Step 1: Create sync service**

Create `src/lib/handshake/sync.ts` with:

- `syncSkillDemandFromHandshake(institutionId)`:
  1. Create `HandshakeApiClient(institutionId)`
  2. Fetch job qualifications via `client.fetchJobQualifications()`
  3. Extract skill keywords from qualifications
  4. Match to existing skills using `aliases` JSONB array and case-insensitive name match
  5. Update `demand_weight` on skills table based on frequency
  6. Update `frequency_in_postings` on `role_skill_requirements`
  7. Update `last_sync_at` and `last_sync_status` on `handshake_integrations`
  8. Return sync summary `{skillsUpdated, rolesUpdated, jobsAnalyzed}`

- `syncTargetRolesFromHandshake(institutionId)`:
  1. Fetch jobs, extract unique job titles
  2. Create/update `target_roles` with `source = 'handshake_api'`
  3. Map job qualifications to `role_skill_requirements`
  4. Return count of roles created/updated

**Step 2: Verify build and commit**

```bash
npm run build
git add src/lib/handshake/sync.ts
git commit -m "feat: implement Handshake sync service for skill demand and target roles"
```

---

### Task 16: Create Handshake API routes and cron job

**Files:**
- Create: `src/app/api/education/handshake/status/route.ts`
- Create: `src/app/api/education/handshake/setup/route.ts`
- Create: `src/app/api/education/handshake/test/route.ts`
- Create: `src/app/api/education/handshake/sync/route.ts`
- Create: `src/app/api/cron/handshake-sync/route.ts`

**Step 1: Create status route**

`GET /api/education/handshake/status` — requires educational_admin, returns integration status (active, last sync, permissions) or null if not connected.

**Step 2: Create setup route**

`POST /api/education/handshake/setup` — requires educational_admin + enterprise plan. Accepts `{apiKey, syncFrequency, dataPermissions}`. Encrypts API key, inserts into `handshake_integrations`.

**Step 3: Create test route**

`POST /api/education/handshake/test` — requires educational_admin. Creates temp client, calls `testConnection()`, returns result.

**Step 4: Create sync route**

`POST /api/education/handshake/sync` — requires educational_admin. Triggers manual sync via `syncSkillDemandFromHandshake()`. Returns sync results.

**Step 5: Create cron job**

`POST /api/cron/handshake-sync` — follows existing cron pattern (CRON_SECRET auth). Queries all active `handshake_integrations`, runs sync for each based on their `sync_frequency`.

**Step 6: Verify build and commit**

```bash
npm run build
git add src/app/api/education/handshake/ src/app/api/cron/handshake-sync/
git commit -m "feat: add Handshake integration API routes and cron sync job"
```

---

### Task 17: Create Handshake admin setup UI

**Files:**
- Create: `src/app/(platform)/education/handshake/page.tsx`
- Create: `src/components/handshake/connection-wizard.tsx`
- Create: `src/components/handshake/sync-status-panel.tsx`

**Step 1: Create ConnectionWizard component**

`'use client'` multi-step form:
- Step 1: Instructions card — "Contact Handshake for EDU API access"
- Step 2: API key input — password-type input field
- Step 3: Test connection button → calls `POST /api/education/handshake/test`
- Step 4: Data permissions checkboxes (jobs, applications, students, fairs)
- Step 5: Sync frequency select (daily/weekly/manual)
- Step 6: Activate button → calls `POST /api/education/handshake/setup`

**Step 2: Create SyncStatusPanel component**

`'use client'` component for when integration is active:
- Connection status badge (green/red)
- Last sync timestamp
- "Sync Now" button → `POST /api/education/handshake/sync`
- Sync history (list of past syncs from metadata)
- Data permissions editor
- Disconnect button with confirmation

**Step 3: Create the page**

`'use client'` page at `src/app/(platform)/education/handshake/page.tsx`:
- Fetch status from `GET /api/education/handshake/status`
- If not connected: show ConnectionWizard
- If connected: show SyncStatusPanel
- Stats: jobs analyzed, skills extracted, roles created

**Step 4: Verify build and commit**

```bash
npm run build
git add src/app/\(platform\)/education/handshake/ src/components/handshake/
git commit -m "feat: add Handshake integration setup and management UI"
```

---

## Phase 4: Portfolio Builder

### Task 18: Create Portfolio service

**Files:**
- Create: `src/lib/portfolio/portfolio.ts`
- Create: `src/lib/portfolio/badges.ts`
- Create: `src/lib/portfolio/share.ts`
- Create: `src/lib/portfolio/index.ts`

**Step 1: Create portfolio CRUD service**

`src/lib/portfolio/portfolio.ts`:
- `createPortfolio(studentId, data)` — generate slug from firstName-lastName-graduationYear (handle collisions by appending -2, -3, etc.), insert into `student_portfolios`
- `getPortfolio(studentId)` — fetch portfolio with projects and badges
- `getPortfolioBySlug(slug)` — for public page, includes projects joined with listings, verified skills, badges
- `updatePortfolio(studentId, data)` — update settings (headline, bio, theme, visibility toggles)
- `updatePortfolioProjects(portfolioId, projects)` — replace project selections with new array (display_order, is_featured, reflection)
- `recordView(portfolioId, viewerUserId?, viewerType)` — insert portfolio_views, increment view_count

**Step 2: Create badge engine**

`src/lib/portfolio/badges.ts`:
- `evaluateAfterProjectCompletion(studentId, projectId)`:
  1. Check for new verified skills → award "skill_verified" badges
  2. Count completed projects → award "project_milestone" at 1, 5, 10, 25
  3. Check if first project → award "first_project"
  4. Check employer rating → if rating >= 4.5, award "top_performer"
  5. Check readiness scores → if any >= 76, award "hire_ready"
  All checks are idempotent: query existing badges to avoid duplicates

- `evaluateStreaks(studentId)` — check if student has completed projects in 3+ consecutive months, award "streak"

- `evaluateEndorsement(studentId, employerId)` — award "employer_endorsed" with employer metadata

- Helper: `awardBadge(studentId, type, label, metadata)` — insert if not duplicate (check by studentId + type + label)

**Step 3: Create share utilities**

`src/lib/portfolio/share.ts`:
- `generateSlug(firstName, lastName, graduationYear)` — lowercase, hyphenated, collision check
- `generateQRCodeDataUrl(portfolioUrl)` — use a lightweight QR library or SVG generation

**Step 4: Create barrel export and verify**

```bash
npm run build
git add src/lib/portfolio/
git commit -m "feat: implement Portfolio service with CRUD, BadgeEngine, and share utilities"
```

---

### Task 19: Create Portfolio API routes

**Files:**
- Create: `src/app/api/student/portfolio/route.ts`
- Create: `src/app/api/student/portfolio/projects/route.ts`
- Create: `src/app/api/student/portfolio/badges/route.ts`
- Create: `src/app/api/public/portfolio/[slug]/route.ts`
- Create: `src/app/api/public/portfolio/[slug]/view/route.ts`

**Step 1: Create student portfolio CRUD routes**

`GET /api/student/portfolio` — get own portfolio
`POST /api/student/portfolio` — create portfolio
`PATCH /api/student/portfolio` — update settings

**Step 2: Create project management route**

`PUT /api/student/portfolio/projects` — accept array of `{projectId, displayOrder, isFeatured, studentReflection}`, replace all portfolio_projects

**Step 3: Create badges route**

`GET /api/student/portfolio/badges` — get all earned badges

**Step 4: Create public portfolio routes**

`GET /api/public/portfolio/[slug]` — no auth required, fetch portfolio by slug with all public data (projects, badges, skills, readiness score if enabled)

`POST /api/public/portfolio/[slug]/view` — no auth required, record a view. Accept optional viewer context from headers.

**Step 5: Verify build and commit**

```bash
npm run build
git add src/app/api/student/portfolio/ src/app/api/public/portfolio/
git commit -m "feat: add Portfolio API routes (CRUD, public page, view tracking)"
```

---

### Task 20: Create Portfolio Editor page

**Files:**
- Create: `src/app/(platform)/dashboard/portfolio/page.tsx`
- Create: `src/components/portfolio/portfolio-editor.tsx`
- Create: `src/components/portfolio/project-selector.tsx`
- Create: `src/components/portfolio/badge-display.tsx`
- Create: `src/components/portfolio/portfolio-share-panel.tsx`

**Step 1: Create PortfolioEditor component**

Form with: display name, headline, bio, avatar URL, theme select (professional/modern/minimal/bold), visibility toggles. Uses React Hook Form + Zod validation. Saves via `PATCH /api/student/portfolio`.

**Step 2: Create ProjectSelector component**

- Fetches completed projects from `/api/students/dashboard` or a new endpoint
- List with drag-and-drop reordering (use native HTML5 drag or a simple state-based approach)
- Each item: include/exclude toggle, featured toggle, reflection text input
- Save button calls `PUT /api/student/portfolio/projects`

**Step 3: Create BadgeDisplay component**

- Horizontal scrollable row of badge icons
- Each badge: icon based on type (use lucide icons — Shield for skill, Star for milestone, Trophy for performer, CheckCircle for hire-ready, Building2 for endorsed, Flame for streak, Rocket for first, Globe for cross-institution)
- Hover/click shows detail card (earned date, description)

**Step 4: Create PortfolioSharePanel component**

- Copy URL button (using navigator.clipboard)
- "Share to LinkedIn" button (opens LinkedIn share URL)
- "Add to Handshake" button with instruction tooltip
- QR code display (generated from slug URL)

**Step 5: Create the page**

`'use client'` page with tabs: Profile, Projects, Badges, Share/Preview
- Fetches portfolio data on mount
- If no portfolio exists, show "Create Portfolio" CTA
- Each tab renders the corresponding component

**Step 6: Verify build and commit**

```bash
npm run build
git add src/app/\(platform\)/dashboard/portfolio/ src/components/portfolio/
git commit -m "feat: add Portfolio Editor page with project selector, badges, and sharing"
```

---

### Task 21: Create Public Portfolio page

**Files:**
- Create: `src/app/(public)/portfolio/[slug]/page.tsx`
- Create: `src/components/portfolio/project-card.tsx`
- Create: `src/components/portfolio/skills-radar-chart.tsx`
- Create: `src/components/portfolio/badge-icon.tsx`

**Step 1: Create BadgeIcon component**

Simple component mapping badge_type to icon + color:
```
skill_verified → Shield (blue)
project_milestone → Star (gold/amber)
top_performer → Trophy (purple)
hire_ready → CheckCircle (green)
employer_endorsed → Building2 (teal)
streak → Flame (orange)
first_project → Rocket (sky)
cross_institution → Globe (violet)
```

**Step 2: Create ProjectCard component**

Card showing: title, employer name, completion date, skills tags (Badge components), verification badge ("Verified by [Employer] via Proveground"), student reflection if present. Uses Card/CardContent from shadcn.

**Step 3: Create SkillsRadarChart component**

Recharts RadarChart showing verified skill levels by category. If not enough data, fall back to horizontal bar chart.

**Step 4: Create the public page**

Server component or `'use client'` page at `src/app/(public)/portfolio/[slug]/page.tsx`:
- Fetch from `GET /api/public/portfolio/${slug}`
- Record view via `POST /api/public/portfolio/${slug}/view`
- Layout: Header (name, headline, institution, trust mark) → Badge bar → Skills chart → Readiness score (if enabled) → Featured projects → Engagement summary
- If portfolio not found or not public: 404 page
- Share buttons in header
- "Verified by Proveground" footer trust mark

**Step 5: Verify build and commit**

```bash
npm run build
git add src/app/\(public\)/portfolio/ src/components/portfolio/
git commit -m "feat: add public Portfolio page with project cards, skills chart, and badges"
```

---

## Phase 5: Outcomes Dashboard

### Task 22: Create OutcomesMetricsEngine service

**Files:**
- Create: `src/lib/outcomes/metrics.ts`
- Create: `src/lib/outcomes/index.ts`

**Step 1: Create metrics computation engine**

`src/lib/outcomes/metrics.ts` with:

- `computeAllMetrics(institutionId, periodStart, periodEnd, filters?)` — orchestrates all metric computations, saves to `outcome_metrics` table

- `computeProjectMetrics(institutionId, period, filters)`:
  - `total_projects_completed`: COUNT completed applications
  - `avg_projects_per_student`: total / active students
  - `project_completion_rate`: completed / (completed + accepted)
  - `time_to_first_match`: AVG days from user.created_at to first application.submitted_at

- `computeSkillMetrics(institutionId, period, filters)`:
  - `skills_verified_count`: COUNT DISTINCT verified user_skills
  - `top_skills_verified`: GROUP BY skill, ORDER BY count DESC, LIMIT 15
  - `avg_readiness_score`: AVG from latest skill_gap_snapshots
  - `readiness_tier_distribution`: COUNT per tier

- `computeEmployerMetrics(institutionId, period, filters)`:
  - `employer_engagement_count`: COUNT DISTINCT listing authors
  - `employer_satisfaction_avg`: AVG from student_ratings
  - `repeat_employer_rate`: authors with 2+ listings / total authors

- `computeStudentEngagementMetrics(institutionId, period, filters)`:
  - `student_activation_rate`: students with completed applications / total students
  - Engagement distribution histogram data

- `computeComparativeMetrics(institutionId, period)`:
  - Fetch previous period metrics
  - Calculate deltas and percentage changes

Each computation inserts into `outcome_metrics` with the metric type, value, and metadata.

**Step 2: Create barrel export and verify**

```bash
npm run build
git add src/lib/outcomes/
git commit -m "feat: implement OutcomesMetricsEngine with project, skill, employer, and engagement metrics"
```

---

### Task 23: Create Outcomes API routes

**Files:**
- Create: `src/app/api/education/outcomes/route.ts`
- Create: `src/app/api/education/outcomes/engagement/route.ts`
- Create: `src/app/api/education/outcomes/skills/route.ts`
- Create: `src/app/api/education/outcomes/employers/route.ts`
- Create: `src/app/api/education/outcomes/students/route.ts`
- Create: `src/app/api/education/reports/route.ts`
- Create: `src/app/api/cron/compute-metrics/route.ts`

**Step 1: Create main outcomes route**

`GET /api/education/outcomes` — requires educational_admin + outcomesDashboard feature. Accepts `periodStart`, `periodEnd`, `cohort` query params. Returns latest computed metrics or computes on-demand if stale.

**Step 2: Create sub-routes**

Each returns a specific metric category:
- `/engagement` — activation funnel, distribution histogram
- `/skills` — verified counts, top skills, readiness trends
- `/employers` — engagement trend, satisfaction, repeat rate, top employers table
- `/students` — student-level drill-down with sortable columns

**Step 3: Create reports routes**

`POST /api/education/reports` — generate a report (CSV export). Accept `{title, reportType, filters, format}`. For CSV: compute metrics, format as CSV string, return download URL or inline data.

`GET /api/education/reports` — list saved reports for institution.

**Step 4: Create cron job**

`POST /api/cron/compute-metrics` — follows CRON_SECRET pattern. For each tenant with outcomesDashboard enabled, compute all metrics for current period.

**Step 5: Verify build and commit**

```bash
npm run build
git add src/app/api/education/outcomes/ src/app/api/education/reports/ src/app/api/cron/compute-metrics/
git commit -m "feat: add Outcomes API routes and metrics computation cron job"
```

---

### Task 24: Create Outcomes Dashboard page

**Files:**
- Create: `src/app/(platform)/education/outcomes/page.tsx`
- Create: `src/components/outcomes/executive-summary-cards.tsx`
- Create: `src/components/outcomes/engagement-funnel.tsx`
- Create: `src/components/outcomes/skills-over-time-chart.tsx`
- Create: `src/components/outcomes/readiness-tier-progression.tsx`
- Create: `src/components/outcomes/employer-impact-section.tsx`

**Step 1: Create ExecutiveSummaryCards component**

Row of 4-6 `StatCard`-style cards (follow existing `src/components/analytics/stat-card.tsx` pattern):
- Total Projects Completed (with delta arrow)
- Active Students (% of enrolled)
- Average Readiness Score
- Employer Partners
- Project Completion Rate
Each card: large number, small trend indicator, color-coded delta

**Step 2: Create EngagementFunnel component**

Recharts horizontal BarChart showing: Registered → Profile Complete → First Match → First Completion → Repeat. Each bar progressively shorter. Use `ChartCard` wrapper.

**Step 3: Create SkillsOverTimeChart component**

Recharts LineChart of cumulative skill verifications per month. Use `ChartCard` wrapper.

**Step 4: Create ReadinessTierProgression component**

Recharts stacked AreaChart showing student distribution across tiers over time. Colors: red (Exploring), amber (Building), teal (Demonstrating), emerald (Hire-Ready).

**Step 5: Create EmployerImpactSection component**

Card containing:
- Employer engagement line chart
- Satisfaction average gauge
- Repeat employer rate percentage
- Top employers table (DataTable pattern from existing analytics)

**Step 6: Create the page**

`'use client'` page at `src/app/(platform)/education/outcomes/page.tsx`:
- Date range picker (follow existing DateRangePicker pattern)
- Filter bar: program, cohort
- Export button
- Layout: ExecutiveSummaryCards → EngagementFunnel → SkillsOverTimeChart + ReadinessTierProgression (2-column grid) → EmployerImpactSection
- Handshake correlation section (conditionally rendered if Handshake active) — placeholder for Phase 6

**Step 7: Verify build and commit**

```bash
npm run build
git add src/app/\(platform\)/education/outcomes/ src/components/outcomes/
git commit -m "feat: add Outcomes Dashboard page with metrics visualizations"
```

---

### Task 25: Create Reports page

**Files:**
- Create: `src/app/(platform)/education/reports/page.tsx`
- Create: `src/components/outcomes/report-builder.tsx`

**Step 1: Create ReportBuilder component**

`'use client'` form component:
- Report template selector: Accreditation Summary, Board Summary, Semester Review, Employer Partnership, Custom
- Each template pre-selects relevant metrics
- Custom: checkboxes for metric categories (project, skill, employer, engagement)
- Filter selectors: program, cohort, date range
- Format selector: CSV or on-screen
- "Generate Report" button → calls `POST /api/education/reports`
- Download link on completion

**Step 2: Create the page**

`'use client'` page:
- Header: "Reports"
- ReportBuilder component
- Report Archive: list of previously generated reports from `GET /api/education/reports` with title, type, generated date, download link

**Step 3: Verify build and commit**

```bash
npm run build
git add src/app/\(platform\)/education/reports/ src/components/outcomes/report-builder.tsx
git commit -m "feat: add Reports page with report builder and archive"
```

---

## Phase 6: Integration & Polish

### Task 26: Add project completion hook for badges and skill verification

**Files:**
- Modify: `src/app/api/corporate/applications/[id]/respond/route.ts` (or wherever application status is updated to 'completed')

**Step 1: Find the completion endpoint**

Locate the API route that changes application status to `completed`. Add a post-completion hook that:

1. Queries the listing's `skills_required` JSONB
2. For each skill, upsert into `user_skills` with `verification_source = 'project_completion'`, `project_id`, `verified_at = NOW()`
3. Call `evaluateAfterProjectCompletion(studentId, projectId)`

This should be added AFTER the existing status update logic, not replacing anything.

**Step 2: Verify build and commit**

```bash
npm run build
git add src/app/api/corporate/applications/
git commit -m "feat: add project completion hook for skill verification and badge evaluation"
```

---

### Task 27: Integrate gap analysis context with AI Coach

**Files:**
- Modify: `src/lib/ai/prompts.ts` (or wherever coaching system prompts are built)
- Create: `src/lib/skills-gap/coach-context.ts`

**Step 1: Create coach context helper**

`src/lib/skills-gap/coach-context.ts`:
```typescript
export async function getStudentGapContext(studentId: string): Promise<string | null>
```
- Query latest `skill_gap_snapshots` for the student
- If found, format into a coaching context string:
  "The student has a readiness score of X for [Role]. Top gaps: [skill1] (critical), [skill2] (partial). Strengths: [skill3], [skill4]."
- Return null if no gap analysis exists

**Step 2: Integrate into coaching prompts**

In the coaching system prompt builder, call `getStudentGapContext(studentId)` and append the result to the system prompt if available. This enriches coaching conversations with gap awareness.

**Step 3: Verify build and commit**

```bash
npm run build
git add src/lib/skills-gap/coach-context.ts src/lib/ai/prompts.ts
git commit -m "feat: integrate skills gap context into AI coaching prompts"
```

---

### Task 28: Add Handshake correlation metrics (if integration active)

**Files:**
- Create: `src/lib/outcomes/handshake-correlation.ts`
- Create: `src/app/api/education/outcomes/handshake-correlation/route.ts`
- Create: `src/components/outcomes/handshake-correlation-panel.tsx`

**Step 1: Create correlation computation**

`src/lib/outcomes/handshake-correlation.ts`:
- `computeHandshakeCorrelationMetrics(institutionId, period)`:
  - Only runs if Handshake integration is active
  - Fetches application data from Handshake via client
  - Segments students into: Active (3+ projects), Moderate (1-2), Inactive (0)
  - Computes for each segment: application count, interview rate (if available), offer rate (if available)
  - Returns comparison data structure

**Step 2: Create API route**

`GET /api/education/outcomes/handshake-correlation` — requires enterprise + active Handshake. Returns correlation data.

**Step 3: Create UI component**

`HandshakeCorrelationPanel`:
- Header: "Proveground Impact on Career Outcomes"
- Comparison table: Active vs Moderate vs Inactive columns
- Key insight card with dynamic stat
- Disclaimer text about correlation vs causation

**Step 4: Integrate into Outcomes page**

Add the HandshakeCorrelationPanel to the outcomes page, conditionally rendered when Handshake is connected.

**Step 5: Verify build and commit**

```bash
npm run build
git add src/lib/outcomes/handshake-correlation.ts src/app/api/education/outcomes/handshake-correlation/ src/components/outcomes/handshake-correlation-panel.tsx
git commit -m "feat: add Handshake correlation metrics and visualization"
```

---

### Task 29: Add badge streak evaluation cron job

**Files:**
- Create: `src/app/api/cron/evaluate-streaks/route.ts`

**Step 1: Create cron endpoint**

Follow existing pattern from `recompute-matches`:
- Authenticate via CRON_SECRET
- Query all active students
- For each, call `evaluateStreaks(studentId)`
- Return processed count

**Step 2: Verify build and commit**

```bash
npm run build
git add src/app/api/cron/evaluate-streaks/
git commit -m "feat: add badge streak evaluation cron job"
```

---

### Task 30: Add employer-facing portfolio overlay

**Files:**
- Modify: `src/app/(public)/portfolio/[slug]/page.tsx`

**Step 1: Add employer context**

If the viewer is an authenticated employer (check session cookie):
- Fetch employer's active listings and their skill requirements
- Highlight skills in the portfolio that match the employer's requirements
- Show a match summary: "This candidate meets X of Y skills for your [Listing Title] role"
- Add "Invite to Project" CTA button

This is additive — the base public page still works for anonymous viewers.

**Step 2: Verify build and commit**

```bash
npm run build
git add src/app/\(public\)/portfolio/
git commit -m "feat: add employer context overlay on public portfolio page"
```

---

### Task 31: Add portfolio view metrics to outcomes dashboard

**Files:**
- Modify: `src/lib/outcomes/metrics.ts`

**Step 1: Add portfolio metrics**

Add to `computeAllMetrics`:
- `portfolio_views_total`: COUNT from portfolio_views for the period
- `portfolio_views_by_type`: GROUP BY viewer_type
- `most_viewed_portfolios`: TOP 10 by view count

These feed into the outcomes dashboard employer engagement section.

**Step 2: Verify build and commit**

```bash
npm run build
git add src/lib/outcomes/metrics.ts
git commit -m "feat: add portfolio view metrics to outcomes computation"
```

---

### Task 32: Final build verification and cleanup

**Step 1: Full build check**

```bash
npm run build
```

Expected: Clean build with no errors.

**Step 2: Lint check**

```bash
npm run lint
```

Fix any lint issues.

**Step 3: Review all new files**

Use `git diff main --stat` to review all changes. Ensure:
- No hardcoded secrets
- No console.log statements left in (except error handlers)
- All new routes have proper auth checks
- All new components use 'use client' directive where needed
- All SQL has parameterized queries (no string concatenation)

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and lint fixes for Proveground features"
```

---

## Summary of Deliverables

### Database (1 migration file, 5 schema files)
- `migrations/009_skills_taxonomy.sql` — all table creates and alterations
- `migrations/010_seed_target_roles.sql` — seed data
- `src/lib/db/schema/skills.ts` — modified (extended columns)
- `src/lib/db/schema/skills-gap.ts` — new
- `src/lib/db/schema/handshake.ts` — new
- `src/lib/db/schema/portfolio.ts` — new
- `src/lib/db/schema/outcomes.ts` — new

### Services (4 modules, ~15 files)
- `src/lib/skills-gap/` — analyzer, scoring, coach-context, index
- `src/lib/handshake/` — client, sync, encryption, index
- `src/lib/portfolio/` — portfolio, badges, share, index
- `src/lib/outcomes/` — metrics, handshake-correlation, index

### API Routes (~30 new routes)
- `src/app/api/skills-gap/` — 3 routes
- `src/app/api/target-roles/` — 2 routes
- `src/app/api/student/skills/verified/` — 1 route
- `src/app/api/student/portfolio/` — 4 routes
- `src/app/api/education/skills-analytics/` — 3 routes
- `src/app/api/education/handshake/` — 6 routes
- `src/app/api/education/outcomes/` — 6 routes
- `src/app/api/education/reports/` — 3 routes
- `src/app/api/public/portfolio/` — 2 routes
- `src/app/api/cron/` — 3 new cron jobs

### Pages (8 new pages)
- `/dashboard/skills-gap` — Student Skills Gap Analyzer
- `/dashboard/portfolio` — Portfolio Editor
- `/education/skills-analytics` — Institution Skills Analytics
- `/education/handshake` — Handshake Integration Setup
- `/education/outcomes` — Outcomes Dashboard
- `/education/reports` — Reports
- `/portfolio/[slug]` — Public Portfolio

### Components (~25 new components)
- `src/components/skills-gap/` — 8 components
- `src/components/portfolio/` — 7 components
- `src/components/outcomes/` — 7 components
- `src/components/handshake/` — 3 components

### Modified Files
- `src/lib/db/schema/index.ts` — add new exports
- `src/lib/tenant/features.ts` — add feature gates
- `src/components/layout/sidebar.tsx` — add nav items
- `src/lib/ai/prompts.ts` — add gap context
- Application completion route — add verification hook
