/**
 * SSO / SAML Enterprise Identity Provider Integration Stubs
 *
 * IMPLEMENTATION STATUS: Not yet implemented.
 *
 * Full SSO implementation requires:
 * 1. npm package: passport-saml (SAML 2.0 authentication)
 * 2. npm package: passport-openidconnect (OIDC support)
 * 3. IdP metadata configuration per institution
 * 4. Attribute mapping from SAML assertions to Sharetribe user profiles
 * 5. SP certificate generation and management
 * 6. IdP-initiated and SP-initiated SSO flows
 *
 * Architecture:
 * - Institution domain -> IdP configuration mapping (stored in admin CMS or env vars)
 * - SAML assertion consumer service (ACS) endpoint
 * - IdP metadata XML endpoint
 * - Integration with existing Sharetribe loginWithIdp flow
 * - Automatic user provisioning (JIT) from SAML attributes
 *
 * The existing auth flow (passport + Sharetribe loginWithIdp) already supports
 * custom identity providers via the OIDC proxy pattern:
 * https://www.sharetribe.com/docs/cookbook-social-logins-and-sso/setup-open-id-connect-proxy/
 */

async function getSsoConfig(req, res) {
  return res.status(200).json({
    ssoAvailable: false,
    providers: [],
    message: 'SSO/SAML integration is not yet available. This feature is under development.',
  });
}

async function initiateSso(req, res) {
  return res.status(501).json({
    error: 'SSO is not yet implemented.',
    code: 'SSO_NOT_AVAILABLE',
  });
}

async function ssoCallback(req, res) {
  return res.status(501).json({
    error: 'SSO callback is not yet implemented.',
    code: 'SSO_NOT_AVAILABLE',
  });
}

async function ssoMetadata(req, res) {
  return res.status(501).json({
    error: 'SSO metadata is not yet available.',
    code: 'SSO_NOT_AVAILABLE',
  });
}

module.exports = {
  getConfig: getSsoConfig,
  initiate: initiateSso,
  callback: ssoCallback,
  metadata: ssoMetadata,
};
