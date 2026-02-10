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
 * GET /api/admin/reports/:type
 *
 * Generate comprehensive reports for system administrators.
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

    let report;

    switch (type) {
      case 'overview':
        report = await generateOverviewReport(integrationSdk);
        break;
      case 'users':
        report = await generateUsersReport(integrationSdk);
        break;
      case 'institutions':
        report = await generateInstitutionsReport(integrationSdk);
        break;
      case 'transactions':
        report = await generateTransactionsReport(integrationSdk);
        break;
      default:
        report = {};
    }

    res.status(200).json({
      type,
      generatedAt: new Date().toISOString(),
      ...report,
    });
  } catch (error) {
    console.error('Admin reports error:', error);
    handleError(res, error);
  }
}

/**
 * Generate platform overview report
 */
async function generateOverviewReport(integrationSdk) {
  // Count users by type
  const [studentsRes, corporatesRes, eduAdminsRes] = await Promise.all([
    integrationSdk.users.query({ pub_userType: 'student', perPage: 1 }),
    integrationSdk.users.query({ pub_userType: 'corporate-partner', perPage: 1 }),
    integrationSdk.users.query({ pub_userType: 'educational-admin', perPage: 1 }),
  ]);

  const userCounts = {
    students: studentsRes.data.meta.totalItems,
    corporatePartners: corporatesRes.data.meta.totalItems,
    educationalAdmins: eduAdminsRes.data.meta.totalItems,
    total:
      studentsRes.data.meta.totalItems +
      corporatesRes.data.meta.totalItems +
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

    const transactions = txResponse.data.data;
    transactionStats.total = txResponse.data.meta.totalItems;

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
 * Generate users report with breakdown by type
 */
async function generateUsersReport(integrationSdk) {
  const userTypes = ['student', 'corporate-partner', 'educational-admin'];
  const breakdown = {};

  for (const userType of userTypes) {
    const response = await integrationSdk.users.query({
      pub_userType: userType,
      perPage: 100,
    });

    const users = response.data.data;
    const total = response.data.meta.totalItems;

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
 * Generate institutions report
 */
async function generateInstitutionsReport(integrationSdk) {
  // Get all educational admins to find institutions
  const eduAdminsResponse = await integrationSdk.users.query({
    pub_userType: 'educational-admin',
    perPage: 100,
  });

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
 * Generate transactions report
 */
async function generateTransactionsReport(integrationSdk) {
  const txResponse = await integrationSdk.transactions.query({
    perPage: 100,
    include: ['listing'],
  });

  const transactions = txResponse.data.data;
  const totalTransactions = txResponse.data.meta.totalItems;

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
