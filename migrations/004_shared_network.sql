-- ============================================================================
-- CAMPUS2CAREER SHARED NETWORK LAYER
-- Enables corporate/alumni partners to post projects visible across tenants
-- while maintaining full student data isolation per tenant
--
-- ADAPTATIONS from original spec:
-- - No organizations(id) FK — corporate partners are users with role='corporate_partner'
-- - No projects(id) — project listings are in the 'listings' table
-- - No student_skills/student_profile_id — skills linked via user_skills(user_id, skill_id)
-- - Created project_status enum for network listings
-- ============================================================================

-- ============================================================================
-- NEW ENUM TYPES
-- ============================================================================

CREATE TYPE network_partner_status AS ENUM ('pending', 'active', 'suspended', 'inactive');
CREATE TYPE partner_visibility AS ENUM ('network', 'private', 'hybrid');
CREATE TYPE tenant_partner_relationship AS ENUM ('exclusive', 'preferred', 'network');
CREATE TYPE project_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled', 'closed');

-- ============================================================================
-- NETWORK PARTNERS
-- Organizations that exist at the platform level, not within a single tenant
-- A partner can be in the shared network AND have private relationships
-- ============================================================================

CREATE TABLE network_partners (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Optional link to an existing tenant user (if they also exist in a tenant)
    linked_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Partner identity
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(100) UNIQUE NOT NULL,
    type                VARCHAR(50) NOT NULL DEFAULT 'corporation'
                        CHECK (type IN ('corporation', 'alumni_business', 'nonprofit', 'government', 'startup')),
    industry            VARCHAR(100),
    website             TEXT,
    logo_url            TEXT,
    description         TEXT,
    company_size        VARCHAR(50),
    headquarters        VARCHAR(255),

    -- Alumni connection (critical for athletic marketplace)
    is_alumni_partner   BOOLEAN DEFAULT FALSE,
    alumni_institution  VARCHAR(255),
    alumni_sport        VARCHAR(100),
    alumni_graduation_year INTEGER,
    alumni_position     VARCHAR(100),
    alumni_years_on_team VARCHAR(50),

    -- Network status
    status              network_partner_status NOT NULL DEFAULT 'pending',
    visibility          partner_visibility NOT NULL DEFAULT 'network',
    verified            BOOLEAN DEFAULT FALSE,
    featured            BOOLEAN DEFAULT FALSE,

    -- Contact
    primary_contact_name  VARCHAR(200),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(20),

    -- Billing (for network-level partners paying Campus2Career directly)
    stripe_customer_id  VARCHAR(255),
    subscription_status VARCHAR(50),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_network_partners_updated_at
    BEFORE UPDATE ON network_partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_network_partners_status ON network_partners(status);
CREATE INDEX idx_network_partners_visibility ON network_partners(visibility);
CREATE INDEX idx_network_partners_alumni ON network_partners(is_alumni_partner, alumni_institution, alumni_sport);
CREATE INDEX idx_network_partners_slug ON network_partners(slug);
CREATE INDEX idx_network_partners_featured ON network_partners(featured) WHERE featured = TRUE;

-- ============================================================================
-- NETWORK PARTNER USERS
-- People who manage a network partner account (can span multiple tenants)
-- ============================================================================

CREATE TABLE network_partner_users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_partner_id  UUID NOT NULL REFERENCES network_partners(id) ON DELETE CASCADE,
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    title               VARCHAR(200),
    phone               VARCHAR(20),
    avatar_url          TEXT,
    role                VARCHAR(50) NOT NULL DEFAULT 'member'
                        CHECK (role IN ('owner', 'admin', 'member')),

    -- Alumni profile (shown to students)
    is_alumni           BOOLEAN DEFAULT FALSE,
    alumni_bio          TEXT,
    alumni_institution  VARCHAR(255),
    alumni_sport        VARCHAR(100),
    alumni_graduation_year INTEGER,
    alumni_position     VARCHAR(100),
    linkedin_url        TEXT,

    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'deactivated')),
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(network_partner_id, email)
);

CREATE INDEX idx_np_users_partner ON network_partner_users(network_partner_id);
CREATE INDEX idx_np_users_email ON network_partner_users(email);
CREATE INDEX idx_np_users_alumni ON network_partner_users(is_alumni, alumni_institution, alumni_sport);

-- ============================================================================
-- TENANT-PARTNER RELATIONSHIPS
-- Controls which partners are visible in which tenants
-- ============================================================================

CREATE TABLE tenant_partner_access (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    network_partner_id  UUID NOT NULL REFERENCES network_partners(id) ON DELETE CASCADE,

    relationship        tenant_partner_relationship NOT NULL DEFAULT 'network',
    -- 'exclusive' = this partner ONLY appears in this tenant (recruited by the tenant)
    -- 'preferred' = this partner appears in this tenant with priority + in the network
    -- 'network'   = this partner appears via shared network access (default)

    -- Who established this relationship
    invited_by          UUID,
    accepted_at         TIMESTAMPTZ,

    -- Tenant-specific partner branding (optional override)
    custom_display_name VARCHAR(255),
    custom_description  TEXT,
    featured_in_tenant  BOOLEAN DEFAULT FALSE,

    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, network_partner_id)
);

CREATE INDEX idx_tpa_tenant ON tenant_partner_access(tenant_id);
CREATE INDEX idx_tpa_partner ON tenant_partner_access(network_partner_id);
CREATE INDEX idx_tpa_relationship ON tenant_partner_access(tenant_id, relationship);

-- ============================================================================
-- NETWORK LISTINGS (Projects posted to the shared network)
-- These are projects that can span multiple tenants
-- ============================================================================

CREATE TABLE network_listings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_partner_id  UUID NOT NULL REFERENCES network_partners(id) ON DELETE CASCADE,
    created_by          UUID NOT NULL REFERENCES network_partner_users(id),

    title               VARCHAR(300) NOT NULL,
    description         TEXT NOT NULL,
    scope_of_work       TEXT,
    deliverables        TEXT,
    category            VARCHAR(100),

    -- Compensation
    budget_min          NUMERIC(10,2),
    budget_max          NUMERIC(10,2),
    payment_type        VARCHAR(50) DEFAULT 'fixed'
                        CHECK (payment_type IN ('fixed', 'hourly', 'milestone', 'mentorship_only', 'hybrid')),
    is_paid             BOOLEAN DEFAULT TRUE,

    -- Timeline
    estimated_hours     INTEGER,
    start_date          DATE,
    end_date            DATE,
    application_deadline DATE,

    -- Team
    max_students        INTEGER DEFAULT 1,
    students_accepted   INTEGER DEFAULT 0,

    -- Visibility controls
    status              project_status NOT NULL DEFAULT 'draft',
    visibility          VARCHAR(50) NOT NULL DEFAULT 'network'
                        CHECK (visibility IN ('network', 'targeted', 'private')),

    target_institutions TEXT[],
    target_sports       TEXT[],
    target_graduation_years INTEGER[],

    remote_ok           BOOLEAN DEFAULT TRUE,
    location            VARCHAR(255),

    -- Alumni-specific fields
    is_alumni_project   BOOLEAN DEFAULT FALSE,
    alumni_message      TEXT,

    is_featured         BOOLEAN DEFAULT FALSE,
    published_at        TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_network_listings_updated_at
    BEFORE UPDATE ON network_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_nl_partner ON network_listings(network_partner_id);
CREATE INDEX idx_nl_status ON network_listings(status);
CREATE INDEX idx_nl_visibility ON network_listings(visibility);
CREATE INDEX idx_nl_open ON network_listings(status, application_deadline) WHERE status = 'open';
CREATE INDEX idx_nl_alumni ON network_listings(is_alumni_project) WHERE is_alumni_project = TRUE;
CREATE INDEX idx_nl_category ON network_listings(category);

-- Skills for network listings (references the shared global skills table)
CREATE TABLE network_listing_skills (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_listing_id  UUID NOT NULL REFERENCES network_listings(id) ON DELETE CASCADE,
    skill_id            UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    importance          VARCHAR(20) DEFAULT 'required'
                        CHECK (importance IN ('required', 'preferred', 'nice_to_have')),
    min_proficiency     INTEGER DEFAULT 1 CHECK (min_proficiency BETWEEN 1 AND 5),
    UNIQUE(network_listing_id, skill_id)
);

CREATE INDEX idx_nls_listing ON network_listing_skills(network_listing_id);
CREATE INDEX idx_nls_skill ON network_listing_skills(skill_id);

-- Target specific tenants for 'targeted' listings
CREATE TABLE network_listing_targets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network_listing_id  UUID NOT NULL REFERENCES network_listings(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(network_listing_id, tenant_id)
);

-- ============================================================================
-- NETWORK APPLICATIONS
-- When a student (tenant-scoped) applies to a network listing
-- The application lives in the tenant's scope but references the network listing
-- ============================================================================

CREATE TABLE network_applications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    network_listing_id  UUID NOT NULL REFERENCES network_listings(id) ON DELETE CASCADE,
    student_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    status              application_status NOT NULL DEFAULT 'pending',
    cover_letter        TEXT,
    proposed_approach   TEXT,
    availability_note   TEXT,

    -- Match scoring
    match_score         NUMERIC(5,2),
    skills_match_score  NUMERIC(5,2),

    reviewed_at         TIMESTAMPTZ,
    reviewed_by         UUID REFERENCES network_partner_users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, network_listing_id, student_user_id)
);

-- RLS: network_applications are tenant-scoped
ALTER TABLE network_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_network_applications ON network_applications
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid
        OR current_setting('app.current_tenant_id', TRUE) IS NULL
        OR current_setting('app.current_tenant_id', TRUE) = ''
    );
CREATE POLICY tenant_insert_network_applications ON network_applications
    FOR INSERT WITH CHECK (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', TRUE), '')::uuid
        OR current_setting('app.current_tenant_id', TRUE) IS NULL
        OR current_setting('app.current_tenant_id', TRUE) = ''
    );

CREATE INDEX idx_na_tenant ON network_applications(tenant_id);
CREATE INDEX idx_na_listing ON network_applications(network_listing_id);
CREATE INDEX idx_na_student ON network_applications(tenant_id, student_user_id);
CREATE INDEX idx_na_status ON network_applications(status);

-- ============================================================================
-- UPDATE TENANTS TABLE: Add shared network + athletic marketplace columns
-- ============================================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shared_network_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS network_tier VARCHAR(50) DEFAULT 'basic';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_network_applications_per_month INTEGER DEFAULT 20;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS network_partner_limit INTEGER;

-- Athletic/community marketplace metadata
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS marketplace_type VARCHAR(50) DEFAULT 'institution';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sport VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS team_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS conference VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mascot_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hero_video_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hero_video_poster_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hero_headline TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hero_subheadline TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS about_content TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- HELPER FUNCTIONS (adapted for existing schema)
-- ============================================================================

-- Get all visible listings for a tenant (combines private + network)
-- ADAPTED: Uses 'listings' instead of 'projects', 'users' instead of 'organizations'
CREATE OR REPLACE FUNCTION get_visible_listings(p_tenant_id UUID)
RETURNS TABLE (
    listing_id UUID,
    source VARCHAR,
    partner_name VARCHAR,
    partner_id UUID,
    relationship VARCHAR,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    budget_min NUMERIC,
    budget_max NUMERIC,
    payment_type VARCHAR,
    is_paid BOOLEAN,
    is_alumni_project BOOLEAN,
    alumni_message TEXT,
    listing_status TEXT,
    application_deadline DATE,
    max_students INTEGER,
    students_accepted INTEGER,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_tenant RECORD;
BEGIN
    -- Get tenant info
    SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;

    -- 1. Return tenant-scoped listings (private marketplace)
    RETURN QUERY
    SELECT
        l.id AS listing_id,
        'private'::VARCHAR AS source,
        u.company_name::VARCHAR AS partner_name,
        u.id AS partner_id,
        'exclusive'::VARCHAR AS relationship,
        l.title::VARCHAR,
        l.description,
        l.category::VARCHAR,
        l.budget_min,
        l.budget_max,
        l.payment_type::VARCHAR,
        COALESCE(l.is_paid, TRUE) AS is_paid,
        FALSE AS is_alumni_project,
        NULL::TEXT AS alumni_message,
        l.status AS listing_status,
        l.application_deadline,
        COALESCE(l.max_students, 1) AS max_students,
        COALESCE(l.students_accepted, 0) AS students_accepted,
        l.created_at
    FROM listings l
    JOIN users u ON u.id = l.author_id
    WHERE l.tenant_id = p_tenant_id
      AND l.status = 'published';

    -- 2. Return network listings this tenant can see
    IF v_tenant.shared_network_enabled THEN
        RETURN QUERY
        SELECT
            nl.id AS listing_id,
            'network'::VARCHAR AS source,
            np.name::VARCHAR AS partner_name,
            np.id AS partner_id,
            COALESCE(tpa.relationship::VARCHAR, 'network') AS relationship,
            nl.title::VARCHAR,
            nl.description,
            nl.category::VARCHAR,
            nl.budget_min,
            nl.budget_max,
            nl.payment_type::VARCHAR,
            nl.is_paid,
            nl.is_alumni_project,
            nl.alumni_message,
            nl.status::TEXT AS listing_status,
            nl.application_deadline,
            nl.max_students,
            nl.students_accepted,
            nl.created_at
        FROM network_listings nl
        JOIN network_partners np ON np.id = nl.network_partner_id
        LEFT JOIN tenant_partner_access tpa ON tpa.tenant_id = p_tenant_id
            AND tpa.network_partner_id = np.id
            AND tpa.is_active = TRUE
        WHERE nl.status = 'open'
          AND np.status = 'active'
          AND (
              (nl.visibility = 'network')
              OR
              (nl.visibility = 'targeted' AND EXISTS (
                  SELECT 1 FROM network_listing_targets nlt
                  WHERE nlt.network_listing_id = nl.id AND nlt.tenant_id = p_tenant_id
              ))
              OR
              (nl.visibility = 'private' AND tpa.relationship IN ('exclusive', 'preferred'))
          );
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Calculate match score for a student against a NETWORK listing
-- ADAPTED: Uses user_skills instead of student_skills/student_profile_id
CREATE OR REPLACE FUNCTION calculate_network_match_score(
    p_student_user_id UUID,
    p_network_listing_id UUID
) RETURNS NUMERIC AS $$
DECLARE
    total_weight NUMERIC := 0;
    matched_weight NUMERIC := 0;
    skill_weight NUMERIC;
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT nls.skill_id, nls.importance, nls.min_proficiency
        FROM network_listing_skills nls
        WHERE nls.network_listing_id = p_network_listing_id
    LOOP
        skill_weight := CASE rec.importance
            WHEN 'required' THEN 3.0
            WHEN 'preferred' THEN 2.0
            WHEN 'nice_to_have' THEN 1.0
            ELSE 1.0
        END;
        total_weight := total_weight + skill_weight;

        IF EXISTS (
            SELECT 1 FROM user_skills us
            WHERE us.user_id = p_student_user_id
              AND us.skill_id = rec.skill_id
        ) THEN
            matched_weight := matched_weight + skill_weight;
        END IF;
    END LOOP;

    IF total_weight = 0 THEN RETURN 0; END IF;
    RETURN ROUND((matched_weight / total_weight) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Create athletic team tenant with full branding
-- ADAPTED: Uses existing tenants table structure + new columns
CREATE OR REPLACE FUNCTION create_athletic_tenant(
    p_institution TEXT,
    p_sport TEXT,
    p_team_name TEXT,
    p_slug TEXT,
    p_admin_email TEXT,
    p_admin_first_name TEXT,
    p_admin_last_name TEXT,
    p_plan TEXT DEFAULT 'starter',
    p_conference TEXT DEFAULT NULL,
    p_custom_domain TEXT DEFAULT NULL,  -- kept for backward compat, not used
    p_hero_headline TEXT DEFAULT NULL,
    p_hero_subheadline TEXT DEFAULT NULL,
    p_hero_video_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_tenant_id UUID;
    new_admin_id UUID;
BEGIN
    INSERT INTO tenants (
        name, display_name, subdomain, status,
        marketplace_type, sport, team_name, conference,
        hero_headline, hero_subheadline, hero_video_url,
        shared_network_enabled, network_tier,
        features
    )
    VALUES (
        p_institution || ' ' || p_sport,
        p_team_name,
        p_slug,
        'active',
        'athletic',
        p_sport,
        p_team_name,
        p_conference,
        p_hero_headline,
        p_hero_subheadline,
        p_hero_video_url,
        true,
        'full',
        jsonb_build_object(
            'plan', p_plan,
            'aiCoaching', true,
            'inviteManagement', true,
            'customBranding', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'analytics', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'advancedReporting', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'studentRatings', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'corporateRatings', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'matchingAlgorithm', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'issueReporting', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'aiMatchInsights', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'aiDiffView', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'aiProjectScoping', CASE WHEN p_plan IN ('professional','enterprise') THEN true ELSE false END,
            'apiAccess', CASE WHEN p_plan = 'enterprise' THEN true ELSE false END,
            'aiPortfolioIntelligence', CASE WHEN p_plan = 'enterprise' THEN true ELSE false END,
            'aiTalentInsights', CASE WHEN p_plan = 'enterprise' THEN true ELSE false END
        )
    )
    RETURNING id INTO new_tenant_id;

    INSERT INTO users (
        email, first_name, last_name,
        role, tenant_id, is_active,
        password_hash
    )
    VALUES (
        p_admin_email,
        p_admin_first_name,
        p_admin_last_name,
        'educational_admin',
        new_tenant_id,
        true,
        'pending_setup'
    )
    RETURNING id INTO new_admin_id;

    RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql;
