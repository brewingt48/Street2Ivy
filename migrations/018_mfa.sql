-- Migration 017: Multi-Factor Authentication (TOTP)
-- Required for SOC 2 compliance and institutional security policies.

-- MFA configuration per user
CREATE TABLE IF NOT EXISTS user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method VARCHAR(10) NOT NULL DEFAULT 'totp' CHECK (method IN ('totp', 'sms')),
  is_enabled BOOLEAN DEFAULT false,

  -- TOTP fields
  totp_secret_encrypted TEXT, -- AES-256-GCM encrypted
  totp_verified_at TIMESTAMPTZ, -- when user verified initial setup

  -- Backup codes (encrypted, JSON array of hashed codes)
  backup_codes_encrypted TEXT,
  backup_codes_remaining INT DEFAULT 8,

  -- Recovery
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, method)
);

-- Tenant MFA enforcement policy
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mfa_grace_period_days INT DEFAULT 14;

-- Track MFA verification in sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_mfa_user ON user_mfa(user_id);
