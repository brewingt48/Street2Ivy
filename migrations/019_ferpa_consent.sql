-- Migration 018: FERPA Consent Layer
-- Adds tables for FERPA consent tracking and directory information preferences
-- Required for legal compliance when handling student educational records

-- FERPA consent records
CREATE TABLE IF NOT EXISTS ferpa_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN (
    'data_sharing',        -- consent to share data with corporate partners
    'ai_processing',       -- consent to AI analysis of academic data
    'directory_info',      -- consent to display directory information
    'annual_notification'  -- acknowledgment of annual FERPA rights notification
  )),

  is_granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- What exactly was consented to (versioned)
  consent_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  consent_text TEXT NOT NULL, -- full text of what they agreed to

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ferpa_consent_user ON ferpa_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_ferpa_consent_tenant ON ferpa_consents(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ferpa_consent_unique ON ferpa_consents(user_id, tenant_id, consent_type, consent_version);

-- Directory information preferences (which fields students allow to be visible)
CREATE TABLE IF NOT EXISTS directory_info_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  show_full_name BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT false,
  show_major BOOLEAN DEFAULT true,
  show_year BOOLEAN DEFAULT true,
  show_sport BOOLEAN DEFAULT true,
  show_gpa BOOLEAN DEFAULT false,
  show_university BOOLEAN DEFAULT true,
  show_bio BOOLEAN DEFAULT true,
  show_skills BOOLEAN DEFAULT true,
  show_portfolio BOOLEAN DEFAULT true,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_directory_prefs_user ON directory_info_preferences(user_id);
