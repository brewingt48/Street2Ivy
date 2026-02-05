const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { handleError, getSdk } = require('../api-util/sdk');

/**
 * GET /api/search-users
 *
 * Server-side endpoint for searching users by extended data fields.
 * Uses the Integration API (which supports users.query) since the
 * Marketplace API only supports users.show (single user by ID).
 *
 * Query params:
 *   userType       - 'student' or 'corporate-partner' (required)
 *   state          - US state abbreviation (maps to pub_studentState or pub_companyState)
 *   university     - keyword match on pub_university
 *   major          - keyword match on pub_major
 *   skills         - comma-separated, matched with has_any on pub_skills
 *   interests      - comma-separated, matched with has_any on pub_interests
 *   graduationYear - exact match on pub_graduationYear
 *   industry       - exact match on pub_industry
 *   companySize    - exact match on pub_companySize
 *   page           - pagination page (default: 1)
 *   perPage        - results per page (default: 20, max: 100)
 */
module.exports = (req, res) => {
  const {
    userType,
    state,
    university,
    major,
    skills,
    interests,
    graduationYear,
    industry,
    companySize,
    page = '1',
    perPage = '20',
  } = req.query;

  // Validate required param
  if (!userType || !['student', 'corporate-partner'].includes(userType)) {
    return res.status(400).json({
      error: 'userType query parameter is required and must be "student" or "corporate-partner".',
    });
  }

  // Build the Integration API query params
  const queryParams = {
    pub_userType: userType,
    include: ['profileImage'],
    'fields.image': [
      'variants.square-small',
      'variants.square-small2x',
    ],
    page: parseInt(page, 10),
    perPage: Math.min(parseInt(perPage, 10) || 20, 100),
  };

  // Add filters based on user type
  if (userType === 'student') {
    if (state) queryParams.pub_studentState = state;
    if (graduationYear) queryParams.pub_graduationYear = graduationYear;
    if (skills) queryParams.pub_skills = `has_any:${skills}`;
    if (interests) queryParams.pub_interests = `has_any:${interests}`;
    // For text fields (university, major), Integration API supports keyword matching
    if (university) queryParams.pub_university = university;
    if (major) queryParams.pub_major = major;
  } else if (userType === 'corporate-partner') {
    if (state) queryParams.pub_companyState = state;
    if (industry) queryParams.pub_industry = industry;
    if (companySize) queryParams.pub_companySize = companySize;
  }

  try {
    const integrationSdk = getIntegrationSdk();

    integrationSdk.users
      .query(queryParams)
      .then(response => {
        const { data, included = [] } = response.data;

        // Build a map of included images for quick lookup
        const imageMap = {};
        included.forEach(item => {
          if (item.type === 'image') {
            imageMap[item.id.uuid] = item;
          }
        });

        // Transform users for the frontend
        const users = data.map(user => {
          const profileImageRef = user.relationships?.profileImage?.data;
          const profileImage = profileImageRef ? imageMap[profileImageRef.id.uuid] : null;

          return {
            id: user.id.uuid,
            type: user.type,
            attributes: {
              banned: user.attributes.banned,
              deleted: user.attributes.deleted,
              createdAt: user.attributes.createdAt,
              profile: {
                displayName: user.attributes.profile.displayName,
                abbreviatedName: user.attributes.profile.abbreviatedName,
                bio: user.attributes.profile.bio,
                publicData: user.attributes.profile.publicData || {},
              },
            },
            profileImage: profileImage
              ? {
                  id: profileImage.id.uuid,
                  type: profileImage.type,
                  attributes: profileImage.attributes,
                }
              : null,
          };
        });

        const pagination = response.data.meta;

        res.status(200).json({
          users,
          pagination: {
            totalItems: pagination.totalItems,
            totalPages: pagination.totalPages,
            page: pagination.page,
            perPage: pagination.perPage,
          },
        });
      })
      .catch(e => {
        console.error('Integration API search-users error:', e);
        handleError(res, e);
      });
  } catch (e) {
    // Handle getIntegrationSdk() errors (e.g., missing CLIENT_SECRET)
    console.error('search-users setup error:', e.message);
    res.status(500).json({ error: e.message });
  }
};
