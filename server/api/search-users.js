const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { handleError, getSdk } = require('../api-util/sdk');
const {
  sanitizeString,
  validatePagination,
  validationError,
  auditLog,
} = require('../api-util/security');

/**
 * Verify the current user has permission to search users.
 *
 * Allowed user types:
 *   - student             – can search corporate-partner only (browse companies)
 *   - corporate-partner   – can search students
 *   - educational-admin   – can search students (scoped to institution)
 *   - system-admin        – can search any user type
 */
async function verifySearchPermission(req, res) {
  try {
    const sdk = getSdk(req, res);
    const userResponse = await sdk.currentUser.show();
    const currentUser = userResponse?.data?.data;

    if (!currentUser) {
      return { authorized: false, error: 'Authentication required', status: 401 };
    }

    const publicData = currentUser.attributes?.profile?.publicData || {};
    const userType = publicData.userType;

    // User types that are allowed to search other users
    const allowedTypes = ['student', 'corporate-partner', 'educational-admin', 'system-admin'];

    if (!allowedTypes.includes(userType)) {
      return {
        authorized: false,
        error:
          'Access denied. You do not have permission to search users.',
        status: 403,
      };
    }

    return { authorized: true, user: currentUser, userType };
  } catch (e) {
    return { authorized: false, error: 'Authentication failed', status: 401 };
  }
}

/**
 * GET /api/search-users
 *
 * Server-side endpoint for searching users by extended data fields.
 * Uses the Integration API (which supports users.query) since the
 * Marketplace API only supports users.show (single user by ID).
 *
 * SECURITY: This endpoint requires authentication. Allowed callers:
 *   - student             → can only search for corporate-partner
 *   - corporate-partner   → can search for students
 *   - educational-admin   → can search for students (scoped to institution)
 *   - system-admin        → can search any user type
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
module.exports = async (req, res) => {
  // SECURITY: Verify user has permission to search
  const authResult = await verifySearchPermission(req, res);
  if (!authResult.authorized) {
    return res.status(authResult.status).json({
      error: authResult.error,
      code: authResult.status === 401 ? 'AUTH_REQUIRED' : 'FORBIDDEN',
    });
  }

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
    return validationError(
      res,
      'userType query parameter is required and must be "student" or "corporate-partner".',
      'userType'
    );
  }

  // SECURITY: Students can only browse corporate partners (company search)
  if (authResult.userType === 'student' && userType !== 'corporate-partner') {
    return res.status(403).json({
      error: 'Students can only search for corporate partners.',
      code: 'FORBIDDEN',
    });
  }

  // SECURITY: Educational admins can only search students from their institution
  if (authResult.userType === 'educational-admin' && userType !== 'student') {
    return res.status(403).json({
      error: 'Educational administrators can only search for students.',
      code: 'FORBIDDEN',
    });
  }

  // Validate and sanitize pagination
  const pagination = validatePagination(page, perPage);

  // Sanitize string inputs
  const sanitizedState = sanitizeString(state, { maxLength: 2 });
  const sanitizedUniversity = sanitizeString(university, { maxLength: 200 });
  const sanitizedMajor = sanitizeString(major, { maxLength: 200 });
  const sanitizedSkills = sanitizeString(skills, { maxLength: 500 });
  const sanitizedInterests = sanitizeString(interests, { maxLength: 500 });
  const sanitizedGraduationYear = sanitizeString(graduationYear, { maxLength: 4 });
  const sanitizedIndustry = sanitizeString(industry, { maxLength: 100 });
  const sanitizedCompanySize = sanitizeString(companySize, { maxLength: 50 });

  // Build the Integration API query params
  const queryParams = {
    pub_userType: userType,
    include: ['profileImage'],
    'fields.image': ['variants.square-small', 'variants.square-small2x'],
    page: pagination.page,
    perPage: pagination.perPage,
  };

  // SECURITY: For educational admins, restrict to their institution's email domain
  if (authResult.userType === 'educational-admin') {
    const adminPublicData = authResult.user.attributes?.profile?.publicData || {};
    const institutionDomain = adminPublicData.institutionDomain;

    if (institutionDomain) {
      queryParams.pub_emailDomain = institutionDomain;
    }
  }

  // Add filters based on user type
  if (userType === 'student') {
    if (sanitizedState) queryParams.pub_studentState = sanitizedState;
    if (sanitizedGraduationYear) queryParams.pub_graduationYear = sanitizedGraduationYear;
    if (sanitizedSkills) queryParams.pub_skills = `has_any:${sanitizedSkills}`;
    if (sanitizedInterests) queryParams.pub_interests = `has_any:${sanitizedInterests}`;
    if (sanitizedUniversity) queryParams.pub_university = sanitizedUniversity;
    if (sanitizedMajor) queryParams.pub_major = sanitizedMajor;
  } else if (userType === 'corporate-partner') {
    if (sanitizedState) queryParams.pub_companyState = sanitizedState;
    if (sanitizedIndustry) queryParams.pub_industry = sanitizedIndustry;
    if (sanitizedCompanySize) queryParams.pub_companySize = sanitizedCompanySize;
  }

  try {
    const integrationSdk = getIntegrationSdk();

    // Audit log the search
    auditLog('USER_SEARCH', {
      searcherUserId: authResult.user.id.uuid,
      searcherUserType: authResult.userType,
      searchedUserType: userType,
      filters: {
        state: sanitizedState,
        university: sanitizedUniversity,
        major: sanitizedMajor,
        graduationYear: sanitizedGraduationYear,
        industry: sanitizedIndustry,
      },
    });

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
        // SECURITY: Only expose safe public data, never expose email or private data
        const users = data.map(user => {
          const profileImageRef = user.relationships?.profileImage?.data;
          const profileImage = profileImageRef ? imageMap[profileImageRef.id.uuid] : null;

          // Filter publicData to only include safe fields
          const rawPublicData = user.attributes.profile.publicData || {};
          const safePublicData = {
            userType: rawPublicData.userType,
            university: rawPublicData.university,
            major: rawPublicData.major,
            graduationYear: rawPublicData.graduationYear,
            studentState: rawPublicData.studentState,
            skills: rawPublicData.skills,
            interests: rawPublicData.interests,
            companyName: rawPublicData.companyName,
            companyState: rawPublicData.companyState,
            industry: rawPublicData.industry,
            companySize: rawPublicData.companySize,
            // Exclude: email, emailDomain, phone, and other sensitive fields
          };

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
                publicData: safePublicData,
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

        const paginationMeta = response.data.meta;

        res.status(200).json({
          users,
          pagination: {
            totalItems: paginationMeta.totalItems,
            totalPages: paginationMeta.totalPages,
            page: paginationMeta.page,
            perPage: paginationMeta.perPage,
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
    res.status(500).json({ error: 'Internal server error' });
  }
};
