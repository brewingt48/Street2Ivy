const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { handleError, getSdk } = require('../api-util/sdk');
const { verifyCorporatePartnerApproved } = require('../api-util/corporateApproval');
const {
  sanitizeString,
  validatePagination,
  validationError,
  auditLog,
} = require('../api-util/security');

/**
 * Verify the current user has permission to search users
 * Only corporate-partner, educational-admin, and system-admin can search
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

    // Only these user types can search other users
    const allowedTypes = ['corporate-partner', 'educational-admin', 'system-admin', 'student'];

    if (!allowedTypes.includes(userType)) {
      return {
        authorized: false,
        error:
          'Access denied. Only corporate partners, educational administrators, system administrators, and students can search users.',
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
 * SECURITY: This endpoint requires authentication and only allows
 * corporate-partner, educational-admin, and system-admin to search.
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

  // Corporate partners must be approved to search users
  if (authResult.userType === 'corporate-partner') {
    const approvalResult = await verifyCorporatePartnerApproved(req, res);
    if (!approvalResult) {
      return res.status(403).json({
        error: 'Your corporate partner account requires approval before searching users.',
        approvalStatus: 'pending',
      });
    }
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

  // SECURITY: Educational admins can only search students from their institution
  if (authResult.userType === 'educational-admin' && userType !== 'student') {
    return res.status(403).json({
      error: 'Educational administrators can only search for students.',
      code: 'FORBIDDEN',
    });
  }

  // SECURITY: Students can only search for corporate partners (companies)
  if (authResult.userType === 'student' && userType !== 'corporate-partner') {
    return res.status(403).json({
      error: 'Students can only search for companies.',
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

  // Determine if any user filters are active (beyond just userType)
  const hasStudentFilters =
    userType === 'student' &&
    (sanitizedState || sanitizedGraduationYear || sanitizedSkills || sanitizedInterests || sanitizedUniversity || sanitizedMajor);
  const hasCompanyFilters =
    userType === 'corporate-partner' &&
    (sanitizedState || sanitizedIndustry || sanitizedCompanySize);
  const hasActiveFilters = hasStudentFilters || hasCompanyFilters;

  // SECURITY: For educational admins, restrict to their institution's email domain
  let institutionDomainFilter = null;
  if (authResult.userType === 'educational-admin') {
    const adminPublicData = authResult.user.attributes?.profile?.publicData || {};
    institutionDomainFilter = adminPublicData.institutionDomain || null;
  }

  try {
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

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
        companySize: sanitizedCompanySize,
      },
    });

    // Strategy: Fetch users by userType from the Integration API, then apply
    // all other filters server-side in memory. This guarantees filtering works
    // regardless of whether Sharetribe search schemas are configured for
    // extended data fields. We fetch in batches if filters are active.
    const fetchAllPages = async () => {
      const allUsers = [];
      const allIncluded = [];
      let currentPage = 1;
      const batchSize = 100; // Max per page for Integration API
      let totalPages = 1;

      do {
        const queryParams = {
          pub_userType: userType,
          include: ['profileImage'],
          'fields.image': ['variants.square-small', 'variants.square-small2x'],
          page: currentPage,
          perPage: batchSize,
        };

        // Apply institution domain filter at the API level (this one is reliable)
        if (institutionDomainFilter) {
          queryParams.pub_emailDomain = institutionDomainFilter;
        }

        const response = await integrationSdk.users.query(queryParams);
        const { data, included = [] } = response.data;
        allUsers.push(...data);
        allIncluded.push(...included);
        totalPages = response.data.meta.totalPages;
        currentPage++;
      } while (currentPage <= totalPages && currentPage <= 10); // Cap at 1000 users max

      return { allUsers, allIncluded };
    };

    // If no filters active, use simple paginated query (fast path)
    const fetchSinglePage = async () => {
      const queryParams = {
        pub_userType: userType,
        include: ['profileImage'],
        'fields.image': ['variants.square-small', 'variants.square-small2x'],
        page: pagination.page,
        perPage: pagination.perPage,
      };

      if (institutionDomainFilter) {
        queryParams.pub_emailDomain = institutionDomainFilter;
      }

      const response = await integrationSdk.users.query(queryParams);
      return {
        allUsers: response.data.data,
        allIncluded: response.data.included || [],
        meta: response.data.meta,
      };
    };

    let rawUsers, rawIncluded, apiMeta;

    if (hasActiveFilters) {
      const result = await fetchAllPages();
      rawUsers = result.allUsers;
      rawIncluded = result.allIncluded;
      apiMeta = null; // We'll compute pagination ourselves after filtering
    } else {
      const result = await fetchSinglePage();
      rawUsers = result.allUsers;
      rawIncluded = result.allIncluded;
      apiMeta = result.meta;
    }

    // Build a map of included images for quick lookup
    const imageMap = {};
    rawIncluded.forEach(item => {
      if (item.type === 'image') {
        imageMap[item.id.uuid] = item;
      }
    });

    // Transform users for the frontend
    // SECURITY: Only expose safe public data, never expose email or private data
    let users = rawUsers.map(user => {
      const profileImageRef = user.relationships?.profileImage?.data;
      const profileImage = profileImageRef ? imageMap[profileImageRef.id.uuid] : null;

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
        // Keep raw publicData for server-side filtering (stripped before response)
        _rawPublicData: rawPublicData,
      };
    });

    // Multi-tenancy: filter corporate partners to only those associated with this tenant
    const tenantPartners = req.tenant?.corporatePartnerIds;
    if (tenantPartners?.length > 0 && userType === 'corporate-partner') {
      users = users.filter(u => tenantPartners.includes(u.id));
    }

    // Apply server-side filters in memory (guaranteed to work)
    if (hasActiveFilters) {
      users = users.filter(u => {
        const pd = u._rawPublicData;

        if (userType === 'student') {
          // State: exact match
          if (sanitizedState && pd.studentState !== sanitizedState) return false;

          // Graduation year: exact match
          if (sanitizedGraduationYear && String(pd.graduationYear) !== sanitizedGraduationYear) return false;

          // Skills: has_any — check if user has at least one of the requested skills
          if (sanitizedSkills) {
            const requestedSkills = sanitizedSkills.split(',').map(s => s.trim().toLowerCase());
            const userSkills = Array.isArray(pd.skills)
              ? pd.skills.map(s => String(s).toLowerCase())
              : [];
            const hasAny = requestedSkills.some(rs => userSkills.includes(rs));
            if (!hasAny) return false;
          }

          // Interests: has_any — check if user has at least one of the requested interests
          if (sanitizedInterests) {
            const requestedInterests = sanitizedInterests.split(',').map(s => s.trim().toLowerCase());
            const userInterests = Array.isArray(pd.interests)
              ? pd.interests.map(s => String(s).toLowerCase())
              : [];
            const hasAny = requestedInterests.some(ri => userInterests.includes(ri));
            if (!hasAny) return false;
          }

          // University: case-insensitive substring match
          if (sanitizedUniversity) {
            const userUni = String(pd.university || '').toLowerCase();
            if (!userUni.includes(sanitizedUniversity.toLowerCase())) return false;
          }

          // Major: case-insensitive substring match
          if (sanitizedMajor) {
            const userMajor = String(pd.major || '').toLowerCase();
            if (!userMajor.includes(sanitizedMajor.toLowerCase())) return false;
          }
        } else if (userType === 'corporate-partner') {
          // State: exact match
          if (sanitizedState && pd.companyState !== sanitizedState) return false;

          // Industry: exact match
          if (sanitizedIndustry && pd.industry !== sanitizedIndustry) return false;

          // Company size: exact match
          if (sanitizedCompanySize && pd.companySize !== sanitizedCompanySize) return false;
        }

        return true;
      });
    }

    // Strip _rawPublicData before sending response
    users = users.map(({ _rawPublicData, ...rest }) => rest);

    // Compute pagination
    let responsePagination;
    if (hasActiveFilters) {
      // Manual pagination over filtered results
      const totalItems = users.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / pagination.perPage));
      const safePage = Math.min(pagination.page, totalPages);
      const startIdx = (safePage - 1) * pagination.perPage;
      users = users.slice(startIdx, startIdx + pagination.perPage);
      responsePagination = {
        totalItems,
        totalPages,
        page: safePage,
        perPage: pagination.perPage,
      };
    } else {
      responsePagination = {
        totalItems: apiMeta.totalItems,
        totalPages: apiMeta.totalPages,
        page: apiMeta.page,
        perPage: apiMeta.perPage,
      };
    }

    res.status(200).json({
      users,
      pagination: responsePagination,
    });
  } catch (e) {
    console.error('search-users error:', e.message || e);
    handleError(res, e);
  }
};
