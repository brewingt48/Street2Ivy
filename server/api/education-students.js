/**
 * Education Students API
 *
 * Provides institution-scoped student list and stats for educational admins.
 * Uses the Integration SDK to query students by email domain.
 */

const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { verifyEducationalAdmin } = require('../api-util/security');

/**
 * List students for the current educational admin's institution
 * GET /api/education/students
 *
 * Query params:
 *   - page: Page number (default 1)
 *   - perPage: Results per page (default 20, max 100)
 *   - search: Case-insensitive search across displayName
 *   - major: Filter by major
 *   - graduationYear: Filter by graduation year
 *   - sort: Sort field ('name', 'date', 'activity') — default 'date'
 */
async function listStudents(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const institutionDomain = user.attributes?.profile?.publicData?.institutionDomain;
    if (!institutionDomain) {
      return res.status(400).json({ error: 'No institution domain found for your account.' });
    }

    const {
      page = '1',
      perPage = '20',
      search,
      major,
      graduationYear,
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedPerPage = Math.min(Math.max(1, parseInt(perPage, 10) || 20), 100);

    const integrationSdk = getIntegrationSdk();

    // Build query params for Integration SDK
    const queryParams = {
      pub_userType: 'student',
      pub_emailDomain: institutionDomain.toLowerCase(),
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
      page: parsedPage,
      perPage: parsedPerPage,
    };

    // Add optional filters
    if (major) {
      queryParams.pub_major = major;
    }
    if (graduationYear) {
      queryParams.pub_graduationYear = graduationYear;
    }

    const response = await integrationSdk.users.query(queryParams);
    const { data: studentsData, included = [], meta } = response.data;

    // Build image map
    const imageMap = {};
    included.forEach(item => {
      if (item.type === 'image') {
        imageMap[item.id.uuid] = item;
      }
    });

    // Transform students
    let students = studentsData.map(student => {
      const profileImageRef = student.relationships?.profileImage?.data;
      const profileImage = profileImageRef ? imageMap[profileImageRef.id.uuid] : null;
      const publicData = student.attributes.profile.publicData || {};

      return {
        id: student.id.uuid,
        displayName: student.attributes.profile.displayName,
        abbreviatedName: student.attributes.profile.abbreviatedName,
        createdAt: student.attributes.createdAt,
        publicData: {
          university: publicData.university,
          major: publicData.major,
          graduationYear: publicData.graduationYear,
          emailDomain: publicData.emailDomain,
        },
        profileImage: profileImage
          ? {
              id: profileImage.id.uuid,
              variants: profileImage.attributes?.variants || {},
            }
          : null,
      };
    });

    // Client-side search filter on displayName
    if (search && typeof search === 'string' && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      students = students.filter(s =>
        (s.displayName || '').toLowerCase().includes(searchLower)
      );
    }

    res.status(200).json({
      data: students,
      pagination: {
        page: meta.page,
        perPage: meta.perPage,
        total: meta.totalItems,
        totalPages: meta.totalPages,
      },
    });
  } catch (e) {
    console.error('Error listing education students:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get aggregate student stats for the current educational admin's institution
 * GET /api/education/students/stats
 */
async function studentStats(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const institutionDomain = user.attributes?.profile?.publicData?.institutionDomain;
    if (!institutionDomain) {
      return res.status(400).json({ error: 'No institution domain found for your account.' });
    }

    const integrationSdk = getIntegrationSdk();

    // Fetch all students for this institution (paginated)
    let allStudents = [];
    let page = 1;
    const batchSize = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await integrationSdk.users.query({
        pub_userType: 'student',
        pub_emailDomain: institutionDomain.toLowerCase(),
        page,
        perPage: batchSize,
      });

      const pageStudents = response.data.data;
      allStudents = allStudents.concat(pageStudents);

      if (pageStudents.length < batchSize || allStudents.length >= 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }

    const totalStudents = allStudents.length;

    // Aggregate majors and graduation years
    const majorCounts = {};
    const gradYearCounts = {};

    allStudents.forEach(student => {
      const publicData = student.attributes?.profile?.publicData || {};
      const major = publicData.major;
      const gradYear = publicData.graduationYear;

      if (major) {
        majorCounts[major] = (majorCounts[major] || 0) + 1;
      }
      if (gradYear) {
        gradYearCounts[gradYear] = (gradYearCounts[gradYear] || 0) + 1;
      }
    });

    // Sort majors by count descending
    const topMajors = Object.entries(majorCounts)
      .map(([major, count]) => ({ major, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Sort graduation years
    const graduationYearBreakdown = Object.entries(gradYearCounts)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year.localeCompare(a.year));

    // Sample transaction activity for active student count
    let activeStudents = 0;
    let totalApplications = 0;

    if (allStudents.length > 0) {
      try {
        // Query transactions for a sample of students
        const sampleIds = allStudents.slice(0, 50).map(s => s.id.uuid);
        const txResults = await Promise.all(
          sampleIds.map(async studentId => {
            try {
              const txResponse = await integrationSdk.transactions.query({
                customerId: studentId,
              });
              return txResponse.data.data.length;
            } catch {
              return 0;
            }
          })
        );

        activeStudents = txResults.filter(count => count > 0).length;
        totalApplications = txResults.reduce((sum, count) => sum + count, 0);

        // Extrapolate if we only sampled
        if (allStudents.length > 50) {
          const ratio = allStudents.length / 50;
          activeStudents = Math.round(activeStudents * ratio);
          totalApplications = Math.round(totalApplications * ratio);
        }
      } catch (e) {
        console.error('Error fetching student transaction stats:', e.message);
      }
    }

    const engagementRate = totalStudents > 0
      ? Math.round((activeStudents / totalStudents) * 100)
      : 0;

    const averageApplicationsPerStudent = totalStudents > 0
      ? Math.round((totalApplications / totalStudents) * 10) / 10
      : 0;

    res.status(200).json({
      totalStudents,
      activeStudents,
      averageApplicationsPerStudent,
      topMajors,
      graduationYearBreakdown,
      engagementRate,
    });
  } catch (e) {
    console.error('Error fetching education student stats:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  list: listStudents,
  stats: studentStats,
};
