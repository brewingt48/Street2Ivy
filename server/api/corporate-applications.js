const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * GET /api/corporate/applications
 *
 * Returns all student applications for the corporate partner's projects,
 * grouped by listing (project).
 *
 * Returns:
 *   {
 *     applications: [
 *       {
 *         id: { uuid: "..." },
 *         attributes: {
 *           createdAt: "...",
 *           lastTransition: "...",
 *           lastTransitionedAt: "...",
 *           ...
 *         },
 *         customer: { ... },
 *         listing: { ... }
 *       }
 *     ],
 *     listings: {
 *       "listing-id": { id: {...}, attributes: {...} }
 *     }
 *   }
 */
module.exports = async (req, res) => {
  try {
    // Step 1: Get current user and verify they are a corporate partner
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};
    const userType = publicData.userType;

    // Allow both 'corporate-partner' and 'corporate' for flexibility
    if (userType !== 'corporate-partner' && userType !== 'corporate') {
      return res.status(403).json({
        error: 'Access denied. Only corporate partners can access this page.',
      });
    }

    const currentUserId = currentUser.id.uuid;

    // Step 2: Query all listings owned by this user
    const listingsResponse = await sdk.ownListings.query({
      perPage: 100,
      'fields.listing': ['title', 'publicData', 'state', 'price', 'description'],
    });

    const listings = listingsResponse.data.data;
    const listingsMap = {};
    listings.forEach(listing => {
      listingsMap[listing.id.uuid] = listing;
    });

    // Step 3: Query transactions where the current user is the provider
    const integrationSdk = getIntegrationSdk();

    const transactionsResponse = await integrationSdk.transactions.query({
      providerId: currentUserId,
      include: ['customer', 'customer.profileImage', 'listing'],
      'fields.user': [
        'profile.displayName',
        'profile.abbreviatedName',
        'profile.publicData',
        'deleted',
        'banned',
      ],
      'fields.listing': ['title', 'publicData'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
      perPage: 100,
    });

    const transactions = transactionsResponse.data.data;
    const included = transactionsResponse.data.included || [];

    // Build a map of included entities for easy lookup
    const includedMap = {};
    included.forEach(entity => {
      const key = `${entity.type}-${entity.id.uuid}`;
      includedMap[key] = entity;
    });

    // Enhance transactions with included data
    const applications = transactions.map(tx => {
      // Get customer from included
      const customerRef = tx.relationships?.customer?.data;
      let customer = null;
      if (customerRef) {
        const customerKey = `user-${customerRef.id.uuid}`;
        customer = includedMap[customerKey] || null;

        // Also get profile image if available
        if (customer) {
          const profileImageRef = customer.relationships?.profileImage?.data;
          if (profileImageRef) {
            const imageKey = `image-${profileImageRef.id.uuid}`;
            customer.profileImage = includedMap[imageKey] || null;
          }
        }
      }

      // Get listing from included or our listings map
      const listingRef = tx.relationships?.listing?.data;
      let listing = null;
      if (listingRef) {
        const listingKey = `listing-${listingRef.id.uuid}`;
        listing = includedMap[listingKey] || listingsMap[listingRef.id.uuid] || null;
      }

      return {
        ...tx,
        customer,
        listing,
      };
    });

    // Step 4: Return response
    res.status(200).json({
      applications,
      listings: listingsMap,
    });
  } catch (error) {
    console.error('Corporate applications error:', error);
    handleError(res, error);
  }
};
