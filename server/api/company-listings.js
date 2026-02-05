const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { handleError, getSdk } = require('../api-util/sdk');
const { sanitizeString, validatePagination } = require('../api-util/security');

/**
 * GET /api/company/:authorId/listings
 *
 * Server-side endpoint for fetching a company's (corporate partner's) open listings.
 * Uses the Integration API to query listings by author ID.
 *
 * This endpoint is accessible to authenticated students to view open projects
 * from corporate partners they are browsing.
 *
 * Query params:
 *   page     - pagination page (default: 1)
 *   perPage  - results per page (default: 10, max: 50)
 */
module.exports = async (req, res) => {
  const { authorId } = req.params;
  const { page = '1', perPage = '10' } = req.query;

  if (!authorId) {
    return res.status(400).json({
      error: 'Author ID is required',
      code: 'MISSING_AUTHOR_ID',
    });
  }

  // Sanitize and validate inputs
  const sanitizedAuthorId = sanitizeString(authorId, { maxLength: 50 });
  const pagination = validatePagination(page, perPage, 50); // max 50 per page

  try {
    const integrationSdk = getIntegrationSdk();

    // Query open/published listings by this author
    const response = await integrationSdk.listings.query({
      authorId: sanitizedAuthorId,
      states: ['published'], // Only show published/open listings
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
      page: pagination.page,
      perPage: pagination.perPage,
    });

    const { data, included = [], meta } = response.data;

    // Build image map for quick lookup
    const imageMap = {};
    included.forEach(item => {
      if (item.type === 'image') {
        imageMap[item.id.uuid] = item;
      }
    });

    // Transform listings for the frontend
    const listings = data.map(listing => {
      const imageRefs = listing.relationships?.images?.data || [];
      const images = imageRefs
        .map(ref => imageMap[ref.id.uuid])
        .filter(Boolean)
        .map(img => ({
          id: img.id.uuid,
          type: img.type,
          attributes: img.attributes,
        }));

      const publicData = listing.attributes.publicData || {};

      return {
        id: listing.id.uuid,
        type: listing.type,
        attributes: {
          title: listing.attributes.title,
          description: listing.attributes.description,
          price: listing.attributes.price,
          state: listing.attributes.state,
          createdAt: listing.attributes.createdAt,
          publicData: {
            projectType: publicData.projectType,
            duration: publicData.duration,
            compensationType: publicData.compensationType,
            requiredSkills: publicData.requiredSkills,
            location: publicData.location,
            // Only include safe public fields
          },
        },
        images,
      };
    });

    res.status(200).json({
      listings,
      pagination: {
        totalItems: meta.totalItems,
        totalPages: meta.totalPages,
        page: meta.page,
        perPage: meta.perPage,
      },
    });
  } catch (e) {
    console.error('company-listings error:', e);
    handleError(res, e);
  }
};
