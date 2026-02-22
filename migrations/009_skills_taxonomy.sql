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
