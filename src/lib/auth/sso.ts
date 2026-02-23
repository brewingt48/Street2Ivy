/**
 * SSO Module — SAML 2.0 + OIDC
 *
 * Core library for Single Sign-On authentication.
 * Uses @node-saml/node-saml for SAML 2.0 and openid-client v6 for OIDC.
 * Each tenant (university) can configure their own identity provider.
 */

import { sql } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/handshake/encryption';
import { SAML } from '@node-saml/node-saml';
import type { SamlConfig, Profile as SamlProfile } from '@node-saml/node-saml';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SSOConfig {
  id: string;
  tenantId: string;
  protocol: 'saml' | 'oidc';
  isEnabled: boolean;
  enforceSso: boolean;

  // SAML
  samlEntryPoint: string | null;
  samlIssuer: string | null;
  samlCert: string | null;
  samlCallbackUrl: string | null;

  // OIDC
  oidcIssuer: string | null;
  oidcClientId: string | null;
  oidcClientSecret: string | null; // decrypted
  oidcRedirectUri: string | null;
  oidcScopes: string | null;

  // Metadata
  idpName: string | null;
  metadataUrl: string | null;

  // User mapping
  emailAttribute: string;
  firstNameAttribute: string;
  lastNameAttribute: string;
  roleAttribute: string | null;
  defaultRole: string;

  // JIT provisioning
  jitProvisioning: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface SSOUserAttributes {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface TenantSSOInfo {
  protocol: 'saml' | 'oidc';
  isEnabled: boolean;
  enforceSso: boolean;
  idpName: string | null;
}

// ─── Database Operations ─────────────────────────────────────────────────────

/**
 * Fetch SSO configuration for a tenant.
 * Decrypts OIDC client secret if present.
 */
export async function getTenantSSOConfig(tenantId: string): Promise<SSOConfig | null> {
  const result = await sql`
    SELECT * FROM tenant_sso_configs
    WHERE tenant_id = ${tenantId}
    LIMIT 1
  `;

  if (result.length === 0) return null;

  const row = result[0];
  let clientSecret: string | null = null;
  if (row.oidc_client_secret_encrypted) {
    try {
      clientSecret = decrypt(row.oidc_client_secret_encrypted);
    } catch {
      clientSecret = null;
    }
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    protocol: row.protocol,
    isEnabled: row.is_enabled,
    enforceSso: row.enforce_sso,
    samlEntryPoint: row.saml_entry_point,
    samlIssuer: row.saml_issuer,
    samlCert: row.saml_cert,
    samlCallbackUrl: row.saml_callback_url,
    oidcIssuer: row.oidc_issuer,
    oidcClientId: row.oidc_client_id,
    oidcClientSecret: clientSecret,
    oidcRedirectUri: row.oidc_redirect_uri,
    oidcScopes: row.oidc_scopes,
    idpName: row.idp_name,
    metadataUrl: row.metadata_url,
    emailAttribute: row.email_attribute || 'email',
    firstNameAttribute: row.first_name_attribute || 'firstName',
    lastNameAttribute: row.last_name_attribute || 'lastName',
    roleAttribute: row.role_attribute,
    defaultRole: row.default_role || 'student',
    jitProvisioning: row.jit_provisioning ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get the SSO config for a tenant by subdomain.
 */
export async function getTenantSSOConfigBySubdomain(subdomain: string): Promise<SSOConfig | null> {
  const tenantResult = await sql`
    SELECT id FROM tenants WHERE subdomain = ${subdomain} LIMIT 1
  `;
  if (tenantResult.length === 0) return null;
  return getTenantSSOConfig(tenantResult[0].id);
}

/**
 * Get basic SSO info for a tenant (for login page).
 * This is a lightweight check — no decryption needed.
 */
export async function getTenantSSOInfo(tenantId: string): Promise<TenantSSOInfo | null> {
  const result = await sql`
    SELECT protocol, is_enabled, enforce_sso, idp_name
    FROM tenant_sso_configs
    WHERE tenant_id = ${tenantId} AND is_enabled = true
    LIMIT 1
  `;
  if (result.length === 0) return null;
  const row = result[0];
  return {
    protocol: row.protocol,
    isEnabled: row.is_enabled,
    enforceSso: row.enforce_sso,
    idpName: row.idp_name,
  };
}

/**
 * Upsert SSO configuration for a tenant.
 * Encrypts OIDC client secret before storing.
 */
export async function upsertSSOConfig(
  tenantId: string,
  config: {
    protocol: 'saml' | 'oidc';
    isEnabled?: boolean;
    enforceSso?: boolean;
    samlEntryPoint?: string;
    samlIssuer?: string;
    samlCert?: string;
    samlCallbackUrl?: string;
    oidcIssuer?: string;
    oidcClientId?: string;
    oidcClientSecret?: string; // plaintext — will be encrypted
    oidcRedirectUri?: string;
    oidcScopes?: string;
    idpName?: string;
    metadataUrl?: string;
    emailAttribute?: string;
    firstNameAttribute?: string;
    lastNameAttribute?: string;
    roleAttribute?: string;
    defaultRole?: string;
    jitProvisioning?: boolean;
  }
): Promise<SSOConfig> {
  const encryptedSecret = config.oidcClientSecret
    ? encrypt(config.oidcClientSecret)
    : null;

  const result = await sql`
    INSERT INTO tenant_sso_configs (
      tenant_id, protocol, is_enabled, enforce_sso,
      saml_entry_point, saml_issuer, saml_cert, saml_callback_url,
      oidc_issuer, oidc_client_id, oidc_client_secret_encrypted, oidc_redirect_uri, oidc_scopes,
      idp_name, metadata_url,
      email_attribute, first_name_attribute, last_name_attribute, role_attribute, default_role,
      jit_provisioning, updated_at
    ) VALUES (
      ${tenantId},
      ${config.protocol},
      ${config.isEnabled ?? false},
      ${config.enforceSso ?? false},
      ${config.samlEntryPoint || null},
      ${config.samlIssuer || null},
      ${config.samlCert || null},
      ${config.samlCallbackUrl || null},
      ${config.oidcIssuer || null},
      ${config.oidcClientId || null},
      ${encryptedSecret},
      ${config.oidcRedirectUri || null},
      ${config.oidcScopes || 'openid email profile'},
      ${config.idpName || null},
      ${config.metadataUrl || null},
      ${config.emailAttribute || 'email'},
      ${config.firstNameAttribute || 'firstName'},
      ${config.lastNameAttribute || 'lastName'},
      ${config.roleAttribute || null},
      ${config.defaultRole || 'student'},
      ${config.jitProvisioning ?? true},
      NOW()
    )
    ON CONFLICT (tenant_id, protocol) DO UPDATE SET
      is_enabled = EXCLUDED.is_enabled,
      enforce_sso = EXCLUDED.enforce_sso,
      saml_entry_point = EXCLUDED.saml_entry_point,
      saml_issuer = EXCLUDED.saml_issuer,
      saml_cert = EXCLUDED.saml_cert,
      saml_callback_url = EXCLUDED.saml_callback_url,
      oidc_issuer = EXCLUDED.oidc_issuer,
      oidc_client_id = EXCLUDED.oidc_client_id,
      oidc_client_secret_encrypted = COALESCE(EXCLUDED.oidc_client_secret_encrypted, tenant_sso_configs.oidc_client_secret_encrypted),
      oidc_redirect_uri = EXCLUDED.oidc_redirect_uri,
      oidc_scopes = EXCLUDED.oidc_scopes,
      idp_name = EXCLUDED.idp_name,
      metadata_url = EXCLUDED.metadata_url,
      email_attribute = EXCLUDED.email_attribute,
      first_name_attribute = EXCLUDED.first_name_attribute,
      last_name_attribute = EXCLUDED.last_name_attribute,
      role_attribute = EXCLUDED.role_attribute,
      default_role = EXCLUDED.default_role,
      jit_provisioning = EXCLUDED.jit_provisioning,
      updated_at = NOW()
    RETURNING *
  `;

  return getTenantSSOConfig(tenantId) as Promise<SSOConfig>;
}

// ─── SAML 2.0 ────────────────────────────────────────────────────────────────

/**
 * Create a SAML client instance from SSO config.
 */
function createSAMLClient(config: SSOConfig): SAML {
  if (!config.samlEntryPoint || !config.samlIssuer || !config.samlCert || !config.samlCallbackUrl) {
    throw new Error('Incomplete SAML configuration');
  }

  const samlConfig: SamlConfig = {
    entryPoint: config.samlEntryPoint,
    issuer: config.samlIssuer,
    idpCert: config.samlCert,
    callbackUrl: config.samlCallbackUrl,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    signatureAlgorithm: 'sha256',
  };

  return new SAML(samlConfig);
}

/**
 * Generate the SAML AuthnRequest redirect URL.
 * Returns the URL to redirect the user to the IdP for login.
 */
export async function initiateSAMLLogin(config: SSOConfig): Promise<string> {
  const saml = createSAMLClient(config);
  const url = await saml.getAuthorizeUrlAsync('', undefined, {});
  return url;
}

/**
 * Validate a SAML response and extract user attributes.
 * Called at the ACS callback endpoint.
 */
export async function validateSAMLResponse(
  config: SSOConfig,
  body: Record<string, string>
): Promise<SSOUserAttributes> {
  const saml = createSAMLClient(config);
  const { profile } = await saml.validatePostResponseAsync(body);

  if (!profile) {
    throw new Error('No profile returned from SAML response');
  }

  const email = extractAttribute(profile, config.emailAttribute) ||
    profile.email ||
    profile.nameID;

  if (!email) {
    throw new Error('No email found in SAML response');
  }

  const firstName = extractAttribute(profile, config.firstNameAttribute) ||
    (profile['firstName'] as string) ||
    (profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] as string) ||
    '';

  const lastName = extractAttribute(profile, config.lastNameAttribute) ||
    (profile['lastName'] as string) ||
    (profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] as string) ||
    '';

  const role = config.roleAttribute
    ? extractAttribute(profile, config.roleAttribute) || undefined
    : undefined;

  return { email, firstName, lastName, role };
}

/**
 * Extract an attribute from a SAML profile by name.
 */
function extractAttribute(profile: SamlProfile, attributeName: string): string | undefined {
  const value = profile[attributeName];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

// ─── OIDC ────────────────────────────────────────────────────────────────────

/**
 * Generate the OIDC authorization URL with PKCE.
 * Returns the URL to redirect the user to and the code verifier to store.
 */
export async function initiateOIDCLogin(
  config: SSOConfig
): Promise<{ authorizationUrl: string; codeVerifier: string; state: string }> {
  if (!config.oidcIssuer || !config.oidcClientId || !config.oidcRedirectUri) {
    throw new Error('Incomplete OIDC configuration');
  }

  // Dynamic import for ESM-only openid-client v6
  const oidc = await import('openid-client');

  const issuerUrl = new URL(config.oidcIssuer);
  const clientSecret = config.oidcClientSecret || undefined;

  const oidcConfig = await oidc.discovery(
    issuerUrl,
    config.oidcClientId,
    clientSecret,
    clientSecret ? oidc.ClientSecretPost(clientSecret) : oidc.None()
  );

  // Generate PKCE
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  // Generate state for CSRF protection
  const { randomBytes } = await import('crypto');
  const state = randomBytes(16).toString('hex');

  const scopes = config.oidcScopes || 'openid email profile';

  const authorizationUrl = oidc.buildAuthorizationUrl(oidcConfig, {
    redirect_uri: config.oidcRedirectUri,
    scope: scopes,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  return {
    authorizationUrl: authorizationUrl.toString(),
    codeVerifier,
    state,
  };
}

/**
 * Handle the OIDC callback: exchange authorization code for tokens and extract user info.
 */
export async function handleOIDCCallback(
  config: SSOConfig,
  callbackUrl: string,
  codeVerifier: string,
  expectedState: string
): Promise<SSOUserAttributes> {
  if (!config.oidcIssuer || !config.oidcClientId || !config.oidcRedirectUri) {
    throw new Error('Incomplete OIDC configuration');
  }

  const oidc = await import('openid-client');

  const issuerUrl = new URL(config.oidcIssuer);
  const clientSecret = config.oidcClientSecret || undefined;

  const oidcConfig = await oidc.discovery(
    issuerUrl,
    config.oidcClientId,
    clientSecret,
    clientSecret ? oidc.ClientSecretPost(clientSecret) : oidc.None()
  );

  // Exchange code for tokens
  const currentUrl = new URL(callbackUrl);
  const tokenResponse = await oidc.authorizationCodeGrant(oidcConfig, currentUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState,
  });

  // Get claims from ID token
  const claims = tokenResponse.claims();

  let email = claims?.email as string | undefined;
  let firstName = (claims?.given_name as string) || '';
  let lastName = (claims?.family_name as string) || '';

  // If claims don't have enough info, fetch from userinfo endpoint
  if (!email && tokenResponse.access_token) {
    try {
      const sub = claims?.sub;
      if (sub) {
        const userInfo = await oidc.fetchUserInfo(
          oidcConfig,
          tokenResponse.access_token,
          sub
        );
        email = email || (userInfo.email as string | undefined);
        firstName = firstName || (userInfo.given_name as string) || '';
        lastName = lastName || (userInfo.family_name as string) || '';
      }
    } catch {
      // userinfo fetch failed — use what we have from ID token
    }
  }

  if (!email) {
    throw new Error('No email found in OIDC response');
  }

  // Map custom attributes if configured
  if (config.emailAttribute !== 'email' && claims) {
    email = (claims[config.emailAttribute] as string) || email;
  }
  if (config.firstNameAttribute !== 'firstName' && claims) {
    firstName = (claims[config.firstNameAttribute] as string) || firstName;
  }
  if (config.lastNameAttribute !== 'lastName' && claims) {
    lastName = (claims[config.lastNameAttribute] as string) || lastName;
  }

  const role = config.roleAttribute && claims
    ? (claims[config.roleAttribute] as string) || undefined
    : undefined;

  return { email, firstName, lastName, role };
}

// ─── JIT Provisioning ────────────────────────────────────────────────────────

/**
 * Find an existing user by email+tenant or create a new one (JIT provisioning).
 * Returns the user ID for session creation.
 */
export async function findOrCreateSSOUser(
  tenantId: string,
  email: string,
  attributes: SSOUserAttributes,
  defaultRole: string = 'student'
): Promise<{ userId: string; email: string; role: string; isNew: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Look for existing user in this tenant
  const existingResult = await sql`
    SELECT id, email, role FROM users
    WHERE email = ${normalizedEmail} AND tenant_id = ${tenantId}
    LIMIT 1
  `;

  if (existingResult.length > 0) {
    const user = existingResult[0];

    // Update last login
    await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`;

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      isNew: false,
    };
  }

  // Also check for user with same email but no tenant (migrate them)
  const orphanResult = await sql`
    SELECT id, email, role FROM users
    WHERE email = ${normalizedEmail} AND tenant_id IS NULL
    LIMIT 1
  `;

  if (orphanResult.length > 0) {
    const user = orphanResult[0];
    // Assign tenant to existing user
    await sql`
      UPDATE users
      SET tenant_id = ${tenantId}, last_login_at = NOW()
      WHERE id = ${user.id}
    `;
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      isNew: false,
    };
  }

  // JIT provision: create new user
  const role = (attributes.role || defaultRole) as string;
  const displayName = [attributes.firstName, attributes.lastName].filter(Boolean).join(' ') || null;

  const insertResult = await sql`
    INSERT INTO users (
      email, first_name, last_name, display_name,
      role, tenant_id, email_verified, last_login_at
    ) VALUES (
      ${normalizedEmail},
      ${attributes.firstName || ''},
      ${attributes.lastName || ''},
      ${displayName},
      ${role},
      ${tenantId},
      true,
      NOW()
    )
    RETURNING id, email, role
  `;

  const newUser = insertResult[0];
  return {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
    isNew: true,
  };
}
