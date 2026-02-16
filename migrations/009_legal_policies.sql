-- ============================================================================
-- Migration 009: Legal Policies
-- ============================================================================
-- Adds a dedicated table for managing legal policies (Privacy Policy, Terms of
-- Service, etc.) at both the platform level and per-tenant level.
-- Platform-level policies (tenant_id IS NULL) are managed by platform admins.
-- Tenant-level policies (tenant_id IS NOT NULL) are managed by edu admins.
-- ============================================================================

CREATE TABLE legal_policies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,

  -- Ownership: NULL tenant_id = platform-level, non-NULL = tenant-level
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,

  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique slug per scope: platform policies have unique slugs globally,
-- tenant policies have unique slugs within each tenant
CREATE UNIQUE INDEX idx_legal_policies_platform_slug
  ON legal_policies (slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX idx_legal_policies_tenant_slug
  ON legal_policies (tenant_id, slug) WHERE tenant_id IS NOT NULL;

-- For footer queries: fetch all published policies for a given scope
CREATE INDEX idx_legal_policies_published
  ON legal_policies (is_published, tenant_id, sort_order);

-- Auto-update updated_at on row changes
CREATE TRIGGER tr_legal_policies_updated_at
  BEFORE UPDATE ON legal_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default platform policies (drafts — admin must publish)
INSERT INTO legal_policies (title, slug, content, is_published, sort_order, tenant_id)
VALUES
  ('Privacy Policy', 'privacy-policy', '', false, 0, NULL),
  ('Terms of Service', 'terms-of-service', '', false, 1, NULL);
