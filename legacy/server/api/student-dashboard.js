const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * GET /api/listings/query
 *
 * Server-side endpoint for querying published listings.
 * Used by the Student Dashboard to check if project listings exist.
 *
 * Query params:
 *   pub_listingType - filter by listing type in publicData (e.g. "project")
 *   perPage         - results per page (default: 10, max: 100)
 *
 * Requires an authenticated user session.
 * Uses the Integration SDK (admin-level) to query all published listings.
 */
const queryListings = async (req, res) => {
  try {
    // Verify the user is authenticated
    const sdk = getSdk(req, res);
    await sdk.currentUser.show();

    const { pub_listingType, perPage = '10' } = req.query;
    const sanitizedPerPage = Math.min(Math.max(parseInt(perPage, 10) || 10, 1), 100);

    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    const queryParams = {
      states: ['published'],
      perPage: sanitizedPerPage,
      include: ['author', 'images'],
      'fields.listing': [
        'title',
        'description',
        'price',
        'publicData',
        'state',
        'createdAt',
      ],
      'fields.image': ['variants.listing-card', 'variants.listing-card-2x'],
    };

    // Filter by listing type if provided
    if (pub_listingType) {
      queryParams.pub_listingType = pub_listingType;
    }

    const response = await integrationSdk.listings.query(queryParams);

    const { data, included = [], meta } = response.data;

    // Build maps for included entities
    const includedMap = {};
    included.forEach(entity => {
      const key = `${entity.type}-${entity.id.uuid}`;
      includedMap[key] = entity;
    });

    // Resolve relationships for each listing
    const listings = data.map(listing => {
      const authorRef = listing.relationships?.author?.data;
      let author = null;
      if (authorRef) {
        const authorKey = `user-${authorRef.id.uuid}`;
        author = includedMap[authorKey] || null;
      }

      const imageRefs = listing.relationships?.images?.data || [];
      const images = imageRefs
        .map(ref => includedMap[`image-${ref.id.uuid}`])
        .filter(Boolean);

      return {
        ...listing,
        author,
        images,
      };
    });

    res.status(200).json({
      data: listings,
      meta: meta || {},
    });
  } catch (error) {
    console.error('student-dashboard queryListings error:', error);
    handleError(res, error);
  }
};

/**
 * GET /api/transactions/query
 *
 * Server-side endpoint for querying the current user's transactions.
 * Used by the Student Dashboard to fetch the student's applications/orders.
 *
 * Query params:
 *   only    - transaction type filter (e.g. "order")
 *   perPage - results per page (default: 10, max: 100)
 *
 * Uses the user-scoped SDK (session-based) so it naturally returns
 * only transactions belonging to the authenticated user.
 */
const queryTransactions = async (req, res) => {
  try {
    const sdk = getSdk(req, res);

    const { only = 'order', perPage = '10' } = req.query;
    const sanitizedPerPage = Math.min(Math.max(parseInt(perPage, 10) || 10, 1), 100);

    const queryParams = {
      only,
      perPage: sanitizedPerPage,
      include: ['listing', 'provider', 'provider.profileImage'],
      'fields.listing': ['title', 'description', 'publicData', 'state'],
      'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'profile.publicData'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
    };

    const response = await sdk.transactions.query(queryParams);

    const { data, included = [], meta } = response.data;

    // Build a map of included entities for easy lookup
    const includedMap = {};
    included.forEach(entity => {
      const key = `${entity.type}-${entity.id.uuid}`;
      includedMap[key] = entity;
    });

    // Resolve relationships inline so the frontend can access tx.listing, tx.provider directly
    const transactions = data.map(tx => {
      const listingRef = tx.relationships?.listing?.data;
      let listing = null;
      if (listingRef) {
        listing = includedMap[`listing-${listingRef.id.uuid}`] || null;
      }

      const providerRef = tx.relationships?.provider?.data;
      let provider = null;
      if (providerRef) {
        provider = includedMap[`user-${providerRef.id.uuid}`] || null;

        // Resolve provider's profile image if available
        if (provider) {
          const profileImageRef = provider.relationships?.profileImage?.data;
          if (profileImageRef) {
            provider.profileImage = includedMap[`image-${profileImageRef.id.uuid}`] || null;
          }
        }
      }

      return {
        ...tx,
        listing,
        provider,
      };
    });

    res.status(200).json({
      data: transactions,
      meta: meta || {},
    });
  } catch (error) {
    console.error('student-dashboard queryTransactions error:', error);
    handleError(res, error);
  }
};

module.exports = {
  queryListings,
  queryTransactions,
};
