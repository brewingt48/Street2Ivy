# Proveground Feature Design: Skills Gap Analyzer, Portfolio Builder, Outcomes Dashboard

**Date:** 2026-02-22
**Status:** Approved
**Scope:** Full spec, sequential implementation (Phases 1-6)

## Overview

Three major feature additions to the Proveground platform:
1. **Skills Gap Analyzer** — for students, educational admins, and employer visibility
2. **Portfolio Builder** — shareable verified portfolios with badges
3. **Outcomes-Based Reporting Dashboard** — for educational admins and career offices

All features include an optional Handshake EDU API integration that is institution-controlled.

## Architecture Decision: Extend Existing Tables (Approach A)

Rather than creating parallel skill systems, we extend the existing `skills` and `user_skills` tables with new columns. This keeps the Match Engine compatible and builds on 130+ already-seeded skills.

## Section 1: Data Layer

### Existing Table Modifications

**`skills` table — add columns:**
- `subcategory` (text, nullable) — e.g., "Programming Languages", "Data Analysis"
- `proficiency_levels` (jsonb, default `["beginner","intermediate","advanced","expert"]`)
- `aliases` (jsonb, default `[]`) — for fuzzy matching, e.g., `["Python 3", "py"]`
- `demand_weight` (numeric(4,3), default 0.0) — updated from Handshake job analysis
- `onet_code` (text, nullable) — O*NET SOC mapping

**`user_skills` table — add columns:**
- `verification_source` (text, default `'self_reported'`) — enum: self_reported, project_completion, employer_endorsement, assessment
- `project_id` (uuid, nullable, FK -> listings) — which project verified this
- `endorser_id` (uuid, nullable, FK -> users) — employer who endorsed
- `verified_at` (timestamptz, nullable)
- `evidence_notes` (text, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

Existing `proficiency_level` integer 1-5 maps to: 1=beginner, 2=intermediate, 3=advanced, 4=expert, 5=expert+.

### New Tables (10 total)

**1. `target_roles`**
- id (uuid PK)
- title (text) — e.g., "Data Analyst", "Software Engineer"
- description (text)
- institution_id (uuid FK -> tenants, nullable) — null = global, set = institution-specific
- source (text) — "handshake_api", "onet", "manual", "system_generated"
- source_reference_id (text, nullable)
- created_at, updated_at

**2. `role_skill_requirements`**
- id (uuid PK)
- target_role_id (uuid FK -> target_roles)
- skill_id (uuid FK -> skills)
- importance (text) — "required", "preferred", "nice_to_have"
- minimum_proficiency (integer, 1-5)
- frequency_in_postings (numeric(4,3), nullable) — 0.0 to 1.0
- source (text) — "handshake_api", "onet", "manual"
- last_synced_at (timestamptz, nullable)
- created_at, updated_at

**3. `skill_gap_snapshots`**
- id (uuid PK)
- student_id (uuid FK -> users)
- target_role_id (uuid FK -> target_roles)
- overall_readiness_score (numeric(5,2)) — 0.0 to 100.0
- gaps (jsonb) — array of { skill_id, required_level, current_level, gap_severity, recommended_projects[] }
- strengths (jsonb) — array of { skill_id, verified_level, exceeds_by }
- snapshot_date (date)
- created_at

**4. `handshake_integrations`**
- id (uuid PK)
- institution_id (uuid FK -> tenants, unique)
- api_key_encrypted (text) — AES-256-GCM encrypted
- api_base_url (text, default "https://edu-api.joinhandshake.com/v1")
- is_active (boolean, default false)
- last_sync_at (timestamptz, nullable)
- last_sync_status (text) — "success", "partial_failure", "failed", "never_synced"
- last_sync_error (text, nullable)
- sync_frequency (text, default "weekly") — "daily", "weekly", "manual_only"
- data_permissions (jsonb) — { jobs: true, applications: true, students: false, fairs: false }
- created_at, updated_at

**5. `student_portfolios`**
- id (uuid PK)
- student_id (uuid FK -> users, unique)
- slug (text, unique) — URL-friendly, e.g., "jane-doe-2026"
- display_name (text)
- headline (text, nullable)
- bio (text, nullable)
- avatar_url (text, nullable)
- theme (text, default "professional") — "professional", "modern", "minimal", "bold"
- is_public (boolean, default true)
- show_readiness_score (boolean, default true)
- show_skill_chart (boolean, default true)
- custom_url (text, nullable)
- view_count (integer, default 0)
- last_viewed_at (timestamptz, nullable)
- created_at, updated_at

**6. `portfolio_projects`**
- id (uuid PK)
- portfolio_id (uuid FK -> student_portfolios)
- project_id (uuid FK -> listings)
- display_order (integer)
- is_featured (boolean, default false)
- student_reflection (text, nullable)
- created_at, updated_at

**7. `portfolio_badges`**
- id (uuid PK)
- student_id (uuid FK -> users)
- badge_type (text) — "skill_verified", "project_milestone", "top_performer", "hire_ready", "employer_endorsed", "streak", "first_project", "cross_institution"
- badge_label (text) — display text
- badge_metadata (jsonb) — contextual data
- earned_at (timestamptz)
- created_at

**8. `outcome_metrics`**
- id (uuid PK)
- institution_id (uuid FK -> tenants)
- metric_type (text) — "total_projects_completed", "avg_projects_per_student", "project_completion_rate", "avg_readiness_score", "readiness_tier_distribution", "skills_verified_count", "top_skills_verified", "employer_engagement_count", "employer_satisfaction_avg", "repeat_employer_rate", "student_activation_rate", "time_to_first_match", "project_to_hire_conversion", "handshake_application_correlation", "career_fair_engagement_correlation", "first_destination_outcomes"
- metric_value (numeric)
- metric_metadata (jsonb) — dimensional breakdowns
- period_start (date)
- period_end (date)
- cohort_filter (text, nullable)
- computed_at (timestamptz)
- created_at

**9. `outcome_reports`**
- id (uuid PK)
- institution_id (uuid FK -> tenants)
- title (text)
- report_type (text) — "accreditation", "board_summary", "program_review", "custom"
- filters (jsonb) — { programs, cohorts, date_range, metrics }
- generated_by (uuid FK -> users)
- generated_at (timestamptz)
- file_url (text, nullable)
- is_scheduled (boolean, default false)
- schedule_frequency (text, nullable) — "monthly", "quarterly", "semester"
- created_at, updated_at

**10. `portfolio_views`**
- id (uuid PK)
- portfolio_id (uuid FK -> student_portfolios)
- viewer_user_id (uuid, nullable) — null for anonymous
- viewer_type (text) — "employer", "student", "admin", "anonymous"
- referrer (text, nullable)
- viewed_at (timestamptz, default now())

### Encryption

Handshake API keys encrypted with AES-256-GCM via Node.js `crypto.createCipheriv`. Encryption key stored in `ENCRYPTION_KEY` env var (never in DB or codebase).

### Proficiency Mapping

DB integer 1-5 maps to labels in service layer: `{1: "beginner", 2: "intermediate", 3: "advanced", 4: "expert", 5: "expert"}`.

### Portfolio Slugs

Auto-generated from `firstName-lastName-graduationYear` with numeric suffix for collisions.

## Section 2: Service Layer

All services follow existing patterns — exported functions in `/src/lib/` directories, Drizzle ORM queries, tenant-scoping.

### `/src/lib/skills-gap/`

**`analyzer.ts`:**
- `analyzeStudentGaps(studentId, targetRoleId)` — compares verified skills vs role requirements, computes readiness score 0-100, identifies gaps with severity, recommends projects, saves snapshot
- `aggregateInstitutionGaps(institutionId, filters?)` — runs analysis across all students, produces top gaps, readiness distribution, heatmap data, trends
- `getRecommendedProjects(skillId, tenantId)` — finds available listings that develop a specific skill

**`scoring.ts`:**
- Required = 3x weight multiplier, Preferred = 2x, Nice-to-have = 1x
- Weighted by `frequency_in_postings` when available
- Normalized to 0-100 scale
- Tiers: Exploring (0-25), Building (26-50), Demonstrating (51-75), Hire-Ready (76-100)

### `/src/lib/handshake/`

**`client.ts`:**
- Constructor loads/decrypts credentials from `handshake_integrations`
- Methods: `testConnection()`, `fetchJobs()`, `fetchJobQualifications()`, `fetchApplications()`, `fetchPostings()`, `fetchStudents()`, `fetchCareerFairs()`, `fetchCareerFairAttendance()`, `fetchSurveys()`
- `handlePagination()` — cursor-based pagination up to configurable max
- `handleErrors()` — typed exceptions for auth failure, rate limit, not found
- Exponential backoff on 429 responses

**`sync.ts`:**
- `syncSkillDemandFromHandshake(institutionId)` — fetches job qualifications, maps to skills taxonomy via alias/fuzzy matching, updates demand_weight and frequency_in_postings
- `syncTargetRolesFromHandshake(institutionId)` — creates/updates target roles from Handshake job data

**`encryption.ts`:**
- AES-256-GCM encrypt/decrypt for API keys

### `/src/lib/portfolio/`

**`portfolio.ts`:** CRUD for portfolios, project selection, ordering

**`badges.ts`** (BadgeEngine):
- `evaluateAfterProjectCompletion(studentId, projectId)` — checks all badge criteria
- `evaluateStreaks(studentId)` — checks sustained engagement
- `evaluateEndorsement(studentId, employerId)` — awards employer-endorsed badge
- Idempotent — won't double-award

**`share.ts`:** Slug generation, QR code, PDF export helpers

### `/src/lib/outcomes/`

**`metrics.ts`** (OutcomesMetricsEngine):
- `computeAllMetrics(institutionId, period, filters?)` — orchestrates all computations
- Individual: `computeProjectMetrics()`, `computeSkillMetrics()`, `computeEmployerMetrics()`, `computeStudentEngagementMetrics()`
- `computeHandshakeCorrelationMetrics()` — only if Handshake active
- `computeComparativeMetrics()` — period-over-period deltas

**`reports.ts`** (ReportExporter):
- `generateCSV(reportConfig)` — raw data export
- `generatePDF(reportConfig)` — formatted with institutional branding
- `scheduleReport(config, frequency, recipients)` — saves with scheduling

### Background Jobs

Extend existing cron pattern (`/api/cron/` + `CRON_SECRET`):
- `POST /api/cron/handshake-sync` — weekly
- `POST /api/cron/compute-metrics` — daily
- `POST /api/cron/evaluate-streaks` — weekly

### Integration Points

- Project completion triggers `BadgeEngine.evaluateAfterProjectCompletion()` + verified skill update
- AI Coach calls `getStudentGapContext(studentId)` for gap-aware coaching
- Single Handshake sync feeds both skills gap and outcomes

## Section 3: API Layer

All routes follow existing patterns — Next.js App Router, `requireAuth()`/`requireRole()`, tenant-scoped.

### Skills Gap Analyzer

```
GET  /api/skills-gap/analyze?targetRoleId=...
GET  /api/skills-gap/history?targetRoleId=...
GET  /api/skills-gap/recommendations?targetRoleId=...
GET  /api/target-roles
POST /api/target-roles
GET  /api/target-roles/[id]/requirements
GET  /api/education/skills-analytics
GET  /api/education/skills-analytics/heatmap
GET  /api/education/skills-analytics/trends
POST /api/student/skills/verify
GET  /api/student/skills/verified
```

### Handshake Integration

```
GET    /api/education/handshake/status
POST   /api/education/handshake/setup
POST   /api/education/handshake/test
POST   /api/education/handshake/sync
GET    /api/education/handshake/sync-history
PATCH  /api/education/handshake/permissions
DELETE /api/education/handshake
GET    /api/education/employer-demand
```

### Portfolio

```
GET  /api/student/portfolio
POST /api/student/portfolio
PATCH /api/student/portfolio
PUT  /api/student/portfolio/projects
GET  /api/student/portfolio/badges
POST /api/student/portfolio/export-pdf
GET  /api/public/portfolio/[slug]
POST /api/public/portfolio/[slug]/view
```

### Outcomes Reporting

```
GET  /api/education/outcomes
GET  /api/education/outcomes/engagement
GET  /api/education/outcomes/skills
GET  /api/education/outcomes/employers
GET  /api/education/outcomes/handshake-correlation
GET  /api/education/outcomes/students
POST /api/education/reports
GET  /api/education/reports
GET  /api/education/reports/[id]
POST /api/education/reports/[id]/schedule
DELETE /api/education/reports/[id]
POST /api/cron/handshake-sync
POST /api/cron/compute-metrics
POST /api/cron/evaluate-streaks
```

## Section 4: Frontend

All pages follow existing patterns: async server component layouts, `'use client'` pages, fetch in useEffect, Tailwind + shadcn, Recharts, Skeleton loading.

### New Pages

**Student Dashboard:**
- `/dashboard/skills-gap` — target role selector, readiness score, gap breakdown, strengths, recommendations, history
- `/dashboard/portfolio` — profile editor, project selector (drag-and-drop), badge manager, preview/share
- `/dashboard/portfolio/preview` — live preview

**Education Admin Dashboard:**
- `/education/skills-analytics` — top gaps chart, readiness distribution, heatmap, student drill-down
- `/education/handshake` — connection wizard, sync controls, data permissions
- `/education/outcomes` — executive summary, engagement funnel, skills charts, employer impact, Handshake correlation
- `/education/reports` — templates, custom builder, archive, scheduling

**Public:**
- `/portfolio/[slug]` — public portfolio page

### New Components

**`/src/components/skills-gap/`:** ReadinessScoreCard, SkillGapBreakdown, TargetRoleSelector, RecommendedActions, GapHistoryTimeline, InstitutionGapsChart, ReadinessDistribution, SkillsHeatmap, EmployerDemandInsights

**`/src/components/portfolio/`:** PortfolioEditor, ProjectSelector, BadgeDisplay, BadgeIcon, PortfolioSharePanel, SkillsRadarChart, ProjectCard

**`/src/components/outcomes/`:** ExecutiveSummaryCards, EngagementFunnel, SkillsOverTimeChart, ReadinessTierProgression, EmployerImpactSection, HandshakeCorrelationPanel, ReportBuilder, ReportArchive

**`/src/components/handshake/`:** ConnectionWizard, SyncStatusPanel, DataPermissionsEditor

### Sidebar Updates

Student: "Skills Gap" (Target icon), "My Portfolio" (Briefcase icon)
Education: "Skills Analytics" (BarChart3), "Handshake" (Link), "Outcomes" (TrendingUp), "Reports" (FileText)

### Feature Gating

- Skills Gap, Portfolio, Outcomes: `professional` tier+
- Handshake Integration, Handshake Correlation: `enterprise` tier + active connection

## Implementation Phases

**Phase 1 — Foundation:** Skills taxonomy columns, verified skills columns, target_roles, role_skill_requirements, handshake_integrations tables, seed O*NET data

**Phase 2 — Skills Gap Analyzer:** SkillGapAnalyzer service, student dashboard view, admin skills analytics view

**Phase 3 — Handshake Integration:** HandshakeApiClient, sync jobs, admin setup UI, enriched gap data

**Phase 4 — Portfolio Builder:** Portfolio tables, BadgeEngine, portfolio editor, public page, share/export

**Phase 5 — Outcomes Dashboard:** Metrics tables, OutcomesMetricsEngine, dashboard UI, Handshake correlations, report templates/exporter

**Phase 6 — Integration & Polish:** Cross-feature hooks, AI Coach integration, performance optimization, mobile responsiveness, testing
