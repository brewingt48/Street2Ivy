const { getIntegrationSdkForTenant } = require('../../api-util/integrationSdk');
const { getSdk, handleError } = require('../../api-util/sdk');

/**
 * Verify the current user is a system admin
 */
async function verifySystemAdmin(req, res) {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse.data.data;
  const publicData = currentUser.attributes.profile.publicData || {};

  if (publicData.userType !== 'system-admin') {
    return null;
  }

  return currentUser;
}

/**
 * Build a tenant scope object from req.tenant (if present).
 * System admins without a tenant see all data (scope = null).
 */
function getTenantScope(req) {
  if (!req.tenant) return null;
  const scope = {};
  if (req.tenant.corporatePartnerIds && req.tenant.corporatePartnerIds.length > 0) {
    scope.corporatePartnerIds = req.tenant.corporatePartnerIds;
  }
  if (req.tenant.institutionDomain) {
    scope.institutionDomain = req.tenant.institutionDomain.toLowerCase();
  }
  return Object.keys(scope).length > 0 ? scope : null;
}

/**
 * GET /api/admin/reports/:type
 *
 * Generate comprehensive reports for system administrators.
 * When accessed through a tenant (req.tenant), results are scoped to
 * that tenant's corporatePartnerIds and/or institutionDomain.
 * System admins without a tenant restriction see all data.
 *
 * Report types:
 *   - overview: Platform-wide statistics
 *   - users: User statistics by type
 *   - institutions: Statistics grouped by institution
 *   - transactions: Transaction analytics
 */
async function getReport(req, res) {
  const { type } = req.params;

  const validTypes = ['overview', 'users', 'institutions', 'transactions'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: `Invalid report type. Valid types: ${validTypes.join(', ')}`,
    });
  }

  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
      });
    }

    const integrationSdk = getIntegrationSdkForTenant(req.tenant);
    const tenantScope = getTenantScope(req);

    let report;

    switch (type) {
      case 'overview':
        report = await generateOverviewReport(integrationSdk, tenantScope);
        break;
      case 'users':
        report = await generateUsersReport(integrationSdk, tenantScope);
        break;
      case 'institutions':
        report = await generateInstitutionsReport(integrationSdk, tenantScope);
        break;
      case 'transactions':
        report = await generateTransactionsReport(integrationSdk, tenantScope);
        break;
      default:
        report = {};
    }

    res.status(200).json({
      type,
      generatedAt: new Date().toISOString(),
      tenantScoped: !!tenantScope,
      ...report,
    });
  } catch (error) {
    console.error('Admin reports error:', error);
    handleError(res, error);
  }
}

/**
 * Generate platform overview report.
 * When tenantScope is provided, filters users by institutionDomain
 * and only counts corporate partners in corporatePartnerIds.
 */
async function generateOverviewReport(integrationSdk, tenantScope) {
  // Build user query params scoped to tenant when applicable
  const studentQuery = { pub_userType: 'student', perPage: 1 };
  const corporateQuery = { pub_userType: 'corporate-partner', perPage: 1 };
  const eduAdminQuery = { pub_userType: 'educational-admin', perPage: 1 };

  if (tenantScope?.institutionDomain) {
    studentQuery.pub_emailDomain = tenantScope.institutionDomain;
    eduAdminQuery.pub_institutionDomain = tenantScope.institutionDomain;
  }

  // Count users by type
  const [studentsRes, corporatesRes, eduAdminsRes] = await Promise.all([
    integrationSdk.users.query(studentQuery),
    integrationSdk.users.query(corporateQuery),
    integrationSdk.users.query(eduAdminQuery),
  ]);

  let corporateCount = corporatesRes.data.meta.totalItems;

  // If tenant has specific corporate partner IDs, count only those
  if (tenantScope?.corporatePartnerIds) {
    const partnerResults = await Promise.all(
      tenantScope.corporatePartnerIds.map(id =>
        integrationSdk.users
          .show({ id })
          .then(() => 1)
          .catch(() => 0)
      )
    );
    corporateCount = partnerResults.reduce((sum, v) => sum + v, 0);
  }

  const userCounts = {
    students: studentsRes.data.meta.totalItems,
    corporatePartners: corporateCount,
    educationalAdmins: eduAdminsRes.data.meta.totalItems,
    total:
      studentsRes.data.meta.totalItems +
      corporateCount +
      eduAdminsRes.data.meta.totalItems,
  };

  // Query recent transactions
  let transactionStats = {
    total: 0,
    thisMonth: 0,
    thisWeek: 0,
  };

  try {
    const txResponse = await integrationSdk.transactions.query({
      perPage: 100,
    });

    let transactions = txResponse.data.data;
    let totalItems = txResponse.data.meta.totalItems;

    // Filter transactions by tenant corporate partner IDs when scoped
    if (tenantScope?.corporatePartnerIds) {
      const partnerIdSet = new Set(tenantScope.corporatePartnerIds);
      transactions = transactions.filter(tx => {
        const providerId = tx.relationships?.provider?.data?.id?.uuid || tx.relationships?.customer?.data?.id?.uuid;
        return providerId && partnerIdSet.has(providerId);
      });
      totalItems = transactions.length;
    }

    transactionStats.total = totalItems;

    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    transactions.forEach(tx => {
      const createdAt = new Date(tx.attributes.createdAt);
      if (createdAt >= oneMonthAgo) transactionStats.thisMonth++;
      if (createdAt >= oneWeekAgo) transactionStats.thisWeek++;
    });
  } catch (e) {
    console.error('Error fetching transaction stats:', e.message);
  }

  // Calculate growth (simplified - comparing this week to estimate)
  const weeklyGrowthRate =
    transactionStats.thisMonth > 0
      ? (transactionStats.thisWeek / (transactionStats.thisMonth / 4) - 1) * 100
      : 0;

  return {
    userCounts,
    transactionStats,
    growth: {
      weeklyTransactionGrowth: Math.round(weeklyGrowthRate * 10) / 10,
    },
    platformHealth: {
      activeUsersEstimate: Math.round(userCounts.total * 0.3), // Rough estimate
      engagementRate:
        transactionStats.total > 0
          ? Math.round((transactionStats.total / userCounts.students) * 100) / 100
          : 0,
    },
  };
}

/**
 * Generate users report with breakdown by type.
 * When tenantScope is provided, filters students by institutionDomain
 * and corporate partners by corporatePartnerIds.
 */
async function generateUsersReport(integrationSdk, tenantScope) {
  const userTypes = ['student', 'corporate-partner', 'educational-admin'];
  const breakdown = {};

  for (const userType of userTypes) {
    const queryParams = {
      pub_userType: userType,
      perPage: 100,
    };

    // Apply tenant-scoped filters
    if (tenantScope?.institutionDomain) {
      if (userType === 'student') {
        queryParams.pub_emailDomain = tenantScope.institutionDomain;
      } else if (userType === 'educational-admin') {
        queryParams.pub_institutionDomain = tenantScope.institutionDomain;
      }
    }

    const response = await integrationSdk.users.query(queryParams);

    let users = response.data.data;
    let total = response.data.meta.totalItems;

    // For corporate partners, filter by tenant's allowed partner IDs
    if (userType === 'corporate-partner' && tenantScope?.corporatePartnerIds) {
      const partnerIdSet = new Set(tenantScope.corporatePartnerIds);
      users = users.filter(u => partnerIdSet.has(u.id?.uuid));
      total = users.length;
    }

    // Count active vs banned
    const active = users.filter(u => !u.attributes.banned && !u.attributes.deleted).length;
    const banned = users.filter(u => u.attributes.banned).length;
    const deleted = users.filter(u => u.attributes.deleted).length;

    // Count by creation date (this month)
    const now = new Date();
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const newThisMonth = users.filter(u => new Date(u.attributes.createdAt) >= oneMonthAgo).length;

    breakdown[userType] = {
      total,
      active,
      banned,
      deleted,
      newThisMonth,
    };
  }

  return {
    breakdown,
    summary: {
      totalUsers: Object.values(breakdown).reduce((sum, b) => sum + b.total, 0),
      totalActive: Object.values(breakdown).reduce((sum, b) => sum + b.active, 0),
      totalBanned: Object.values(breakdown).reduce((sum, b) => sum + b.banned, 0),
      newUsersThisMonth: Object.values(breakdown).reduce((sum, b) => sum + b.newThisMonth, 0),
    },
  };
}

/**
 * Generate institutions report.
 * When tenantScope is provided with institutionDomain, only that
 * institution is included in the report.
 */
async function generateInstitutionsReport(integrationSdk, tenantScope) {
  // Get all educational admins to find institutions
  const eduAdminQuery = {
    pub_userType: 'educational-admin',
    perPage: 100,
  };

  // If tenant-scoped, only query admins for this institution
  if (tenantScope?.institutionDomain) {
    eduAdminQuery.pub_institutionDomain = tenantScope.institutionDomain;
  }

  const eduAdminsResponse = await integrationSdk.users.query(eduAdminQuery);

  const eduAdmins = eduAdminsResponse.data.data;

  // Extract unique institution domains
  const institutionDomains = new Map();
  eduAdmins.forEach(admin => {
    const domain = admin.attributes.profile.publicData?.institutionDomain;
    const name = admin.attributes.profile.publicData?.institutionName;
    if (domain && !institutionDomains.has(domain)) {
      institutionDomains.set(domain, name);
    }
  });

  // For each institution, count students
  const institutions = [];

  for (const [domain, name] of institutionDomains) {
    try {
      const studentsResponse = await integrationSdk.users.query({
        pub_userType: 'student',
        pub_emailDomain: domain.toLowerCase(),
        perPage: 1,
      });

      institutions.push({
        domain,
        name,
        studentCount: studentsResponse.data.meta.totalItems,
        adminCount: eduAdmins.filter(
          a => a.attributes.profile.publicData?.institutionDomain === domain
        ).length,
      });
    } catch (e) {
      institutions.push({
        domain,
        name,
        studentCount: 0,
        adminCount: 1,
        error: 'Could not fetch student count',
      });
    }
  }

  // Sort by student count (descending)
  institutions.sort((a, b) => b.studentCount - a.studentCount);

  return {
    totalInstitutions: institutions.length,
    institutions,
    summary: {
      totalStudentsWithInstitution: institutions.reduce((sum, i) => sum + i.studentCount, 0),
      avgStudentsPerInstitution:
        institutions.length > 0
          ? Math.round(
              institutions.reduce((sum, i) => sum + i.studentCount, 0) / institutions.length
            )
          : 0,
    },
  };
}

/**
 * Generate transactions report.
 * When tenantScope is provided with corporatePartnerIds, only
 * transactions involving those partners are included.
 */
async function generateTransactionsReport(integrationSdk, tenantScope) {
  const txResponse = await integrationSdk.transactions.query({
    perPage: 100,
    include: ['listing'],
  });

  let transactions = txResponse.data.data;
  let totalTransactions = txResponse.data.meta.totalItems;

  // Filter transactions by tenant corporate partner IDs when scoped
  if (tenantScope?.corporatePartnerIds) {
    const partnerIdSet = new Set(tenantScope.corporatePartnerIds);
    transactions = transactions.filter(tx => {
      const providerId = tx.relationships?.provider?.data?.id?.uuid || tx.relationships?.customer?.data?.id?.uuid;
      return providerId && partnerIdSet.has(providerId);
    });
    totalTransactions = transactions.length;
  }

  // Aggregate by state
  const byState = {
    applied: 0,
    accepted: 0,
    declined: 0,
    completed: 0,
    reviewed: 0,
    other: 0,
  };

  // Aggregate by month
  const byMonth = {};

  // Calculate average time to decision
  let decisionTimes = [];
  let completionTimes = [];

  transactions.forEach(tx => {
    const lastTransition = tx.attributes.lastTransition;

    // Count by state
    if (lastTransition === 'transition/apply') {
      byState.applied++;
    } else if (lastTransition === 'transition/accept') {
      byState.accepted++;
    } else if (lastTransition === 'transition/decline') {
      byState.declined++;
    } else if (lastTransition === 'transition/mark-completed') {
      byState.completed++;
    } else if (lastTransition.includes('review')) {
      byState.reviewed++;
    } else {
      byState.other++;
    }

    // Count by month
    const createdAt = new Date(tx.attributes.createdAt);
    const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
    byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;

    // Calculate timing metrics
    if (lastTransition === 'transition/accept' || lastTransition === 'transition/decline') {
      const created = new Date(tx.attributes.createdAt);
      const decided = new Date(tx.attributes.lastTransitionedAt);
      const days = (decided - created) / (1000 * 60 * 60 * 24);
      decisionTimes.push(days);
    }

    if (lastTransition === 'transition/mark-completed' || lastTransition.includes('review')) {
      const created = new Date(tx.attributes.createdAt);
      const completed = new Date(tx.attributes.lastTransitionedAt);
      const days = (completed - created) / (1000 * 60 * 60 * 24);
      completionTimes.push(days);
    }
  });

  // Calculate averages
  const avgDecisionTime =
    decisionTimes.length > 0 ? decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length : 0;

  const avgCompletionTime =
    completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

  // Calculate rates
  const acceptanceRate =
    byState.accepted + byState.declined > 0
      ? byState.accepted / (byState.accepted + byState.declined)
      : 0;

  const completionRate =
    byState.accepted > 0 ? (byState.completed + byState.reviewed) / byState.accepted : 0;

  return {
    totalTransactions,
    byState,
    byMonth,
    metrics: {
      avgDaysToDecision: Math.round(avgDecisionTime * 10) / 10,
      avgDaysToCompletion: Math.round(avgCompletionTime * 10) / 10,
      acceptanceRate: Math.round(acceptanceRate * 100),
      completionRate: Math.round(completionRate * 100),
    },
  };
}

module.exports = getReport;
