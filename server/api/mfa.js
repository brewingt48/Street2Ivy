/**
 * Multi-Factor Authentication (MFA) API Stubs
 *
 * IMPLEMENTATION STATUS: Not yet implemented.
 *
 * Full MFA implementation requires:
 * 1. npm package: speakeasy (TOTP generation/verification)
 * 2. npm package: qrcode (QR code generation for authenticator apps)
 * 3. Sharetribe user metadata for storing encrypted MFA secrets
 * 4. Recovery codes generation and secure storage
 * 5. Client-side MFA enrollment flow (QR code scanning + verification)
 * 6. Client-side MFA challenge on login
 *
 * Architecture:
 * - MFA secret stored in user privateData (encrypted at rest via Sharetribe)
 * - Recovery codes hashed and stored in user privateData
 * - Session-based MFA verification flag
 * - Integration with existing Sharetribe auth flow
 */

const { getSdk, handleError } = require('../api-util/sdk');

async function getMfaStatus(req, res) {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    return res.status(200).json({
      enabled: false,
      available: false,
      message: 'Multi-factor authentication is not yet available. This feature is under development.',
    });
  } catch (error) {
    handleError(res, error);
  }
}

async function enrollMfa(req, res) {
  return res.status(501).json({
    error: 'MFA enrollment is not yet implemented.',
    code: 'MFA_NOT_AVAILABLE',
  });
}

async function verifyMfa(req, res) {
  return res.status(501).json({
    error: 'MFA verification is not yet implemented.',
    code: 'MFA_NOT_AVAILABLE',
  });
}

async function disableMfa(req, res) {
  return res.status(501).json({
    error: 'MFA management is not yet implemented.',
    code: 'MFA_NOT_AVAILABLE',
  });
}

module.exports = {
  getStatus: getMfaStatus,
  enroll: enrollMfa,
  verify: verifyMfa,
  disable: disableMfa,
};
