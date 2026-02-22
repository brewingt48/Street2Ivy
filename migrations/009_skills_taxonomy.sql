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
