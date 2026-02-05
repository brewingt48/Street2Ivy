const sharetribeIntegrationSdk = require('sharetribe-flex-integration-sdk');

// Integration API can use its own credentials, or fall back to the Marketplace API ones
const CLIENT_ID =
  process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID ||
  process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID;
const CLIENT_SECRET =
  process.env.SHARETRIBE_INTEGRATION_API_CLIENT_SECRET || process.env.SHARETRIBE_SDK_CLIENT_SECRET;
const BASE_URL = process.env.REACT_APP_SHARETRIBE_SDK_BASE_URL;
const TRANSIT_VERBOSE = process.env.REACT_APP_SHARETRIBE_SDK_TRANSIT_VERBOSE === 'true';

const baseUrlMaybe = BASE_URL ? { baseUrl: BASE_URL } : {};

/**
 * Create an Integration API SDK instance.
 *
 * The Integration API uses CLIENT_ID + CLIENT_SECRET for authentication
 * (no user token needed). It provides access to admin-level endpoints
 * like users.query() which are not available in the Marketplace API.
 */
const getIntegrationSdk = () => {
  if (!CLIENT_SECRET) {
    throw new Error(
      'Integration SDK requires SHARETRIBE_SDK_CLIENT_SECRET to be set. ' +
        'Get it from Sharetribe Console → Build → Applications.'
    );
  }

  return sharetribeIntegrationSdk.createInstance({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    transitVerbose: TRANSIT_VERBOSE,
    ...baseUrlMaybe,
  });
};

module.exports = { getIntegrationSdk };
