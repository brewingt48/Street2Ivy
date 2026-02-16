-- ============================================================================
-- Migration 012: Team Huddle Branding — Customizable Landing Page
--
-- Adds a huddle_branding table that stores per-tenant customization for
-- the Team Huddle landing page: banner image/video, brand overrides,
-- welcome message, and layout configuration.
-- ============================================================================

CREATE TABLE IF NOT EXISTS huddle_branding (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Hero/Banner section
    banner_type             VARCHAR(20) DEFAULT 'image' CHECK (banner_type IN ('image', 'video', 'none')),
    banner_image_url        VARCHAR(500),
    banner_video_url        VARCHAR(500),
    banner_overlay_opacity  DECIMAL(3,2) DEFAULT 0.4,

    -- Branding overrides (null = fall back to tenant defaults)
    logo_url                VARCHAR(500),
    primary_color           VARCHAR(20),
    secondary_color         VARCHAR(20),

    -- Welcome content
    welcome_title           VARCHAR(300),
    welcome_message         TEXT,

    -- Layout configuration (JSONB for flexibility)
    -- Expected shape:
    -- {
    --   "featuredSectionTitle": "Featured Content",
    --   "topicSections": [{ "topicId": "uuid", "title": "Custom Title", "order": 0 }],
    --   "showContentTypes": ["video", "article", "pdf", "audio", "text_post"],
    --   "sectionOrder": ["featured", "topics", "recent"],
    --   "maxFeaturedPosts": 4
    -- }
    layout_config           JSONB DEFAULT '{}'::jsonb,

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_huddle_branding_tenant ON huddle_branding(tenant_id);
