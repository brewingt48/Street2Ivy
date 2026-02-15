-- Migration 006: ProveGround Match Engine™
-- Creates all tables for the 6-signal bi-directional schedule-aware matching algorithm
--
-- Tables created:
--   sport_seasons, academic_calendars, student_schedules,
--   athletic_skill_mappings, match_scores, match_score_history,
--   corporate_attractiveness_scores, match_engine_config,
--   match_feedback, recomputation_queue
--
-- Alterations:
--   user_skills: ADD proficiency_level

-- ============================================================================
-- 1. Extend user_skills with proficiency levels
-- ============================================================================
ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS proficiency_level INTEGER DEFAULT 3;

-- Add check constraint (only if not exists)
DO $$ BEGIN
    ALTER TABLE user_skills ADD CONSTRAINT chk_proficiency_level
        CHECK (proficiency_level BETWEEN 1 AND 5);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. Sport Seasons — season schedules per sport
-- ============================================================================
CREATE TABLE IF NOT EXISTS sport_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_name TEXT NOT NULL,
    season_type TEXT NOT NULL DEFAULT 'regular', -- regular, postseason, offseason, spring
    start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
    end_month INTEGER NOT NULL CHECK (end_month BETWEEN 1 AND 12),
    practice_hours_per_week NUMERIC(4,1) NOT NULL DEFAULT 20,
    competition_hours_per_week NUMERIC(4,1) NOT NULL DEFAULT 5,
    travel_days_per_month INTEGER NOT NULL DEFAULT 2,
    intensity_level INTEGER NOT NULL DEFAULT 3 CHECK (intensity_level BETWEEN 1 AND 5),
    division TEXT DEFAULT 'D1', -- D1, D2, D3, NAIA, club
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sport_seasons_sport_name ON sport_seasons(sport_name);
CREATE INDEX IF NOT EXISTS idx_sport_seasons_season_type ON sport_seasons(season_type);

-- ============================================================================
-- 3. Academic Calendars — academic term dates per tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS academic_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    term_name TEXT NOT NULL, -- 'Fall 2025', 'Spring 2026', 'Summer 2026'
    term_type TEXT NOT NULL DEFAULT 'semester', -- semester, quarter, trimester, break, summer
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_break BOOLEAN NOT NULL DEFAULT FALSE,
    priority_level INTEGER NOT NULL DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    academic_year TEXT, -- '2025-2026'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_calendars_tenant ON academic_calendars(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_calendars_dates ON academic_calendars(start_date, end_date);

-- ============================================================================
-- 4. Student Schedules — combined student availability
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sport_season_id UUID REFERENCES sport_seasons(id) ON DELETE SET NULL,
    academic_calendar_id UUID REFERENCES academic_calendars(id) ON DELETE SET NULL,
    schedule_type TEXT NOT NULL DEFAULT 'sport', -- sport, academic, custom, work
    custom_blocks JSONB NOT NULL DEFAULT '[]',
    -- custom_blocks format: [{ "day": "monday", "start_time": "09:00", "end_time": "12:00", "label": "Practice" }]
    available_hours_per_week NUMERIC(4,1),
    travel_conflicts JSONB NOT NULL DEFAULT '[]',
    -- travel_conflicts format: [{ "start_date": "2025-10-15", "end_date": "2025-10-17", "reason": "Away game" }]
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_start DATE,
    effective_end DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_schedules_user ON student_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_student_schedules_active ON student_schedules(user_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 5. Athletic Skill Mappings — sport → professional skill transfer
-- ============================================================================
CREATE TABLE IF NOT EXISTS athletic_skill_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_name TEXT NOT NULL,
    position TEXT, -- NULL means applies to all positions in that sport
    professional_skill TEXT NOT NULL,
    transfer_strength NUMERIC(3,2) NOT NULL DEFAULT 0.50
        CHECK (transfer_strength BETWEEN 0.00 AND 1.00),
    skill_category TEXT NOT NULL DEFAULT 'General',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_athletic_skill_mappings_sport ON athletic_skill_mappings(sport_name);
CREATE INDEX IF NOT EXISTS idx_athletic_skill_mappings_skill ON athletic_skill_mappings(professional_skill);
CREATE UNIQUE INDEX IF NOT EXISTS idx_athletic_skill_mappings_unique
    ON athletic_skill_mappings(sport_name, COALESCE(position, ''), professional_skill);

-- ============================================================================
-- 6. Match Scores — cached composite match scores
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    composite_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    signal_breakdown JSONB NOT NULL DEFAULT '{}',
    -- signal_breakdown format:
    -- {
    --   "temporal": { "score": 85, "details": { ... } },
    --   "skills": { "score": 72, "details": { ... } },
    --   "sustainability": { "score": 90, "details": { ... } },
    --   "growth": { "score": 65, "details": { ... } },
    --   "trust": { "score": 78, "details": { ... } },
    --   "network": { "score": 80, "details": { ... } }
    -- }
    is_stale BOOLEAN NOT NULL DEFAULT FALSE,
    computation_time_ms INTEGER, -- how long the computation took
    version INTEGER NOT NULL DEFAULT 1, -- engine version for cache invalidation
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_scores_student_listing
    ON match_scores(student_id, listing_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_listing ON match_scores(listing_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_tenant ON match_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_stale ON match_scores(is_stale) WHERE is_stale = TRUE;
CREATE INDEX IF NOT EXISTS idx_match_scores_composite ON match_scores(composite_score DESC);

-- ============================================================================
-- 7. Match Score History — audit trail of score changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_score_id UUID NOT NULL REFERENCES match_scores(id) ON DELETE CASCADE,
    old_score NUMERIC(5,2),
    new_score NUMERIC(5,2) NOT NULL,
    old_breakdown JSONB,
    new_breakdown JSONB NOT NULL DEFAULT '{}',
    change_reason TEXT, -- 'initial', 'profile_update', 'listing_update', 'schedule_change', 'cron_recompute'
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_score_history_score ON match_score_history(match_score_id);
CREATE INDEX IF NOT EXISTS idx_match_score_history_date ON match_score_history(changed_at);

-- ============================================================================
-- 8. Corporate Attractiveness Scores — reverse direction
-- ============================================================================
CREATE TABLE IF NOT EXISTS corporate_attractiveness_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    attractiveness_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    signal_breakdown JSONB NOT NULL DEFAULT '{}',
    -- signal_breakdown format:
    -- {
    --   "compensation": { "score": 80, "details": { ... } },
    --   "flexibility": { "score": 90, "details": { ... } },
    --   "reputation": { "score": 75, "details": { ... } },
    --   "completion_rate": { "score": 85, "details": { ... } },
    --   "growth_opportunity": { "score": 70, "details": { ... } }
    -- }
    sample_size INTEGER NOT NULL DEFAULT 0, -- number of data points used
    is_stale BOOLEAN NOT NULL DEFAULT FALSE,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_corp_attract_listing ON corporate_attractiveness_scores(listing_id);
CREATE INDEX IF NOT EXISTS idx_corp_attract_author ON corporate_attractiveness_scores(author_id);
CREATE INDEX IF NOT EXISTS idx_corp_attract_tenant ON corporate_attractiveness_scores(tenant_id);

-- ============================================================================
-- 9. Match Engine Config — per-tenant weight overrides
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_engine_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    signal_weights JSONB NOT NULL DEFAULT '{
        "temporal": 0.25,
        "skills": 0.30,
        "sustainability": 0.15,
        "growth": 0.10,
        "trust": 0.10,
        "network": 0.10
    }',
    min_score_threshold NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    max_results_per_query INTEGER NOT NULL DEFAULT 50,
    enable_athletic_transfer BOOLEAN NOT NULL DEFAULT TRUE,
    enable_schedule_matching BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{}',
    -- config: { "stale_threshold_hours": 24, "batch_size": 50, ... }
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_engine_config_tenant ON match_engine_config(tenant_id);

-- ============================================================================
-- 10. Match Feedback — student/corporate match feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS match_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_score_id UUID REFERENCES match_scores(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- who gave feedback
    feedback_type TEXT NOT NULL DEFAULT 'relevance', -- relevance, quality, interest
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_match_feedback_score ON match_feedback(match_score_id);
CREATE INDEX IF NOT EXISTS idx_match_feedback_student ON match_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_match_feedback_listing ON match_feedback(listing_id);

-- ============================================================================
-- 11. Recomputation Queue — queue for stale score reprocessing
-- ============================================================================
CREATE TABLE IF NOT EXISTS recomputation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    -- listing_id NULL means recompute all matches for this student
    reason TEXT NOT NULL DEFAULT 'manual', -- profile_update, listing_update, schedule_change, skill_change, manual, cron
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    -- 10 = highest priority (manual request), 1 = lowest (background cron)
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recomp_queue_pending
    ON recomputation_queue(priority DESC, queued_at ASC)
    WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recomp_queue_student ON recomputation_queue(student_id);
CREATE INDEX IF NOT EXISTS idx_recomp_queue_listing ON recomputation_queue(listing_id);

-- ============================================================================
-- Done
-- ============================================================================
