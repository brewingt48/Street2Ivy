const crypto = require('crypto');

const CLIENT_ID = process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID;
const ROOT_URL = process.env.REACT_APP_MARKETPLACE_ROOT_URL;
const CONSOLE_URL = process.env.SERVER_SHARETRIBE_CONSOLE_URL || 'https://console.sharetribe.com';
const USING_SSL = process.env.REACT_APP_SHARETRIBE_USING_SSL === 'true';

/**
 * Validate that a target path is safe for redirect (prevents open redirect vulnerability)
 * Only allows relative paths within the application
 */
const validateTargetPath = (targetPath) => {
  if (!targetPath || typeof targetPath !== 'string') {
    return null;
  }

  // Remove any whitespace
  const path = targetPath.trim();

  // Must start with / (relative path)
  if (!path.startsWith('/')) {
    console.warn('[SECURITY] Rejected target_path: must be relative path starting with /');
    return null;
  }

  // Block protocol-relative URLs (//example.com)
  if (path.startsWith('//')) {
    console.warn('[SECURITY] Rejected target_path: protocol-relative URLs not allowed');
    return null;
  }

  // Block javascript: and data: URLs
  if (/^\/\s*javascript:/i.test(path) || /^\/\s*data:/i.test(path)) {
    console.warn('[SECURITY] Rejected target_path: javascript/data protocols not allowed');
    return null;
  }

  // Block backslash which can be converted to forward slash by browsers
  if (path.includes('\\')) {
    console.warn('[SECURITY] Rejected target_path: backslashes not allowed');
    return null;
  }

  // Limit length to prevent DoS
  if (path.length > 2000) {
    console.warn('[SECURITY] Rejected target_path: exceeds maximum length');
    return null;
  }

  // Decode and re-check for encoded attacks
  try {
    const decoded = decodeURIComponent(path);
    if (decoded.startsWith('//') || decoded.includes('\\') ||
        /javascript:/i.test(decoded) || /data:/i.test(decoded)) {
      console.warn('[SECURITY] Rejected target_path: encoded attack detected');
      return null;
    }
  } catch (e) {
    // Invalid URL encoding
    console.warn('[SECURITY] Rejected target_path: invalid URL encoding');
    return null;
  }

  return path;
};

// redirect_uri param used when initiating a login as authentication flow and
// when requesting a token using an authorization code
const loginAsRedirectUri = `${ROOT_URL.replace(/\/$/, '')}/api/login-as`;

// Cookies used for authorization code authentication.
const stateKey = `st-${CLIENT_ID}-oauth2State`;
const codeVerifierKey = `st-${CLIENT_ID}-pkceCodeVerifier`;

// Cookies used for additional login information
const targetPathKey = `st-${CLIENT_ID}-targetPath`;

/**
 * Makes a base64 string URL friendly by
 * replacing unaccepted characters.
 */
const urlifyBase64 = base64Str =>
  base64Str
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

// Initiates an authorization code authentication flow. This authentication flow
// enables marketplace operators that have an ongoing Console session to log
// into their marketplace as a user of the marketplace.
//
// The authorization code is requested from Console and it is used to request a
// token from the Sharetribe Auth API.
//
// This endpoint will return a 302 to Console which requests the authorization
// code. Console returns a 302 with the code to the `redirect_uri` that is
// passed in this response. The request to the redirect URI is handled with the
// `/login-as` endpoint.
module.exports = (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).send('Missing query parameter: user_id.');
  }
  if (!ROOT_URL) {
    return res.status(409).send('Marketplace canonical root URL is missing.');
  }

  const state = urlifyBase64(crypto.randomBytes(32).toString('base64'));
  const codeVerifier = urlifyBase64(crypto.randomBytes(32).toString('base64'));
  const hash = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64');
  const codeChallenge = urlifyBase64(hash);
  const authorizeServerUrl = `${CONSOLE_URL}/api/authorize-as`;
  const { target_path: targetPath } = req.query || {};

  const location = `${authorizeServerUrl}?\
response_type=code&\
client_id=${CLIENT_ID}&\
redirect_uri=${loginAsRedirectUri}&\
user_id=${userId}&\
state=${state}&\
code_challenge=${codeChallenge}&\
code_challenge_method=S256`;

  const cookieOpts = {
    maxAge: 1000 * 30, // 30 seconds
    secure: USING_SSL,
    httpOnly: true, // Prevent XSS access to auth cookies
    sameSite: 'lax', // CSRF protection
  };

  res.cookie(stateKey, state, cookieOpts);
  res.cookie(codeVerifierKey, codeVerifier, cookieOpts);

  // Validate target path to prevent open redirect attacks
  const validatedTargetPath = validateTargetPath(targetPath);
  if (validatedTargetPath) {
    res.cookie(targetPathKey, validatedTargetPath, cookieOpts);
  }

  return res.redirect(location);
};
