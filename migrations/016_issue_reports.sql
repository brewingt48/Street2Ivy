-- =============================================
-- MIGRATION 016: Issue Reports Table
-- =============================================
-- Creates the issue_reports table for students to report
-- safety, harassment, payment, and other issues with
-- corporate partners. Education admins can investigate
-- and resolve reports.

CREATE TABLE IF NOT EXISTS issue_reports (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reporter_name           TEXT NOT NULL,
    reported_entity_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_entity_name    TEXT NOT NULL,
    application_id          UUID REFERENCES project_applications(id) ON DELETE SET NULL,
    category                TEXT NOT NULL CHECK (category IN ('safety', 'harassment', 'payment', 'communication', 'discrimination', 'other')),
    subject                 TEXT NOT NULL,
    description             TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
    resolution_notes        TEXT,
    resolved_at             TIMESTAMPTZ,
    resolved_by             UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id               UUID REFERENCES tenants(id) ON DELETE CASCADE,
    institution_domain      TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_issue_reports_tenant ON issue_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_reporter ON issue_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_entity ON issue_reports(reported_entity_id);
