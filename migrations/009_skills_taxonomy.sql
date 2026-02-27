-- 009: Skills Taxonomy Extension & Verified Skills
-- Extends existing skills and user_skills tables for Skills Gap Analyzer

-- Add taxonomy columns to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS proficiency_levels JSONB DEFAULT '["beginner","intermediate","advanced","expert"]';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS demand_weight NUMERIC(4,3) DEFAULT 0.000;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS onet_code TEXT;

-- Create verification source enum type
DO $$ BEGIN
  CREATE TYPE verification_source_type AS ENUM ('self_reported', 'project_completion', 'employer_endorsement', 'assessment');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add verification columns to user_skills
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS verification_source verification_source_type DEFAULT 'self_reported';
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS endorser_id UUID;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS evidence_notes TEXT;
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_skills_subcategory ON skills(subcategory);
CREATE INDEX IF NOT EXISTS idx_skills_onet_code ON skills(onet_code);
CREATE INDEX IF NOT EXISTS idx_skills_demand_weight ON skills(demand_weight DESC);
CREATE INDEX IF NOT EXISTS idx_user_skills_verification ON user_skills(verification_source);
CREATE INDEX IF NOT EXISTS idx_user_skills_project ON user_skills(project_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_verified_at ON user_skills(verified_at);

-- ============================================
-- Target Roles & Skill Requirements
-- ============================================

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

-- ============================================
-- Handshake EDU API Integration
-- ============================================

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
CREATE INDEX IF NOT EXISTS idx_handshake_active ON handshake_integrations(is_active) WHERE is_active = TRUE;

-- ============================================
-- Portfolio Builder
-- ============================================

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

-- ============================================
-- Outcomes-Based Reporting
-- ============================================

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
