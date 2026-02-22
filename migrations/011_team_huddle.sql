-- ============================================================================
-- Migration 011: Team Huddle — Premium Content Hub
-- ============================================================================

-- Topic categories (customizable per tenant)
CREATE TABLE huddle_topics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- Contributors (alumni & partners who can submit content)
CREATE TABLE huddle_contributors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL CHECK (role IN ('alumni', 'partner', 'admin')),
    title           VARCHAR(200),
    class_year      VARCHAR(50),
    bio             TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    invited_by      UUID REFERENCES users(id),
    invited_at      TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Content posts (the core content table)
CREATE TABLE huddle_posts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contributor_id  UUID NOT NULL REFERENCES huddle_contributors(id) ON DELETE CASCADE,
    content_type    VARCHAR(20) NOT NULL CHECK (content_type IN ('video', 'article', 'pdf', 'audio', 'text_post')),
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    body            TEXT,
    media_url       VARCHAR(500),
    file_key        VARCHAR(500),
    file_name       VARCHAR(300),
    thumbnail_url   VARCHAR(500),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
    is_featured     BOOLEAN DEFAULT FALSE,
    is_pinned       BOOLEAN DEFAULT FALSE,
    rejection_note  TEXT,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Post-topic associations (many-to-many)
CREATE TABLE huddle_post_topics (
    post_id         UUID NOT NULL REFERENCES huddle_posts(id) ON DELETE CASCADE,
    topic_id        UUID NOT NULL REFERENCES huddle_topics(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, topic_id)
);

-- Student bookmarks / saved content
CREATE TABLE huddle_bookmarks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id         UUID NOT NULL REFERENCES huddle_posts(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- View tracking (for engagement analytics)
CREATE TABLE huddle_views (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    post_id         UUID NOT NULL REFERENCES huddle_posts(id) ON DELETE CASCADE,
    viewed_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for admin actions
CREATE TABLE huddle_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id        UUID NOT NULL REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,
    target_type     VARCHAR(50) NOT NULL,
    target_id       UUID NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_huddle_posts_tenant_status ON huddle_posts(tenant_id, status);
CREATE INDEX idx_huddle_posts_tenant_published ON huddle_posts(tenant_id, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_huddle_posts_contributor ON huddle_posts(contributor_id);
CREATE INDEX idx_huddle_posts_content_type ON huddle_posts(tenant_id, content_type);
CREATE INDEX idx_huddle_bookmarks_user ON huddle_bookmarks(user_id);
CREATE INDEX idx_huddle_views_post ON huddle_views(post_id);
CREATE INDEX idx_huddle_views_tenant_date ON huddle_views(tenant_id, viewed_at DESC);
CREATE INDEX idx_huddle_topics_tenant ON huddle_topics(tenant_id, display_order);
CREATE INDEX idx_huddle_audit_tenant ON huddle_audit_log(tenant_id, created_at DESC);

-- Full-text search index on posts
CREATE INDEX idx_huddle_posts_search ON huddle_posts
     USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(body, '')));
