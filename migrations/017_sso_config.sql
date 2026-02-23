-- SSO configuration per tenant (SAML 2.0 + OIDC)
-- Each tenant (university) can configure their own identity provider.

CREATE TABLE IF NOT EXISTS tenant_sso_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  protocol VARCHAR(10) NOT NULL CHECK (protocol IN ('saml', 'oidc')),
  is_enabled BOOLEAN DEFAULT false,
  enforce_sso BOOLEAN DEFAULT false, -- if true, disable password login for this tenant

  -- SAML 2.0 fields
  saml_entry_point TEXT,        -- IdP SSO URL
  saml_issuer TEXT,             -- SP Entity ID (our identifier)
  saml_cert TEXT,               -- IdP signing certificate (PEM)
  saml_callback_url TEXT,       -- ACS URL

  -- OIDC fields
  oidc_issuer TEXT,             -- e.g., https://accounts.google.com
  oidc_client_id TEXT,
  oidc_client_secret_encrypted TEXT, -- encrypted with AES-256-GCM
  oidc_redirect_uri TEXT,
  oidc_scopes TEXT DEFAULT 'openid email profile',

  -- Metadata
  idp_name VARCHAR(255),        -- e.g., "Okta", "Azure AD", "Google"
  metadata_url TEXT,            -- IdP metadata URL for auto-config

  -- User mapping
  email_attribute VARCHAR(255) DEFAULT 'email',
  first_name_attribute VARCHAR(255) DEFAULT 'firstName',
  last_name_attribute VARCHAR(255) DEFAULT 'lastName',
  role_attribute VARCHAR(255),  -- optional: map IdP groups to roles
  default_role VARCHAR(50) DEFAULT 'student',

  -- JIT provisioning
  jit_provisioning BOOLEAN DEFAULT true, -- create users on first SSO login

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, protocol)
);

CREATE INDEX IF NOT EXISTS idx_sso_config_tenant ON tenant_sso_configs(tenant_id);
