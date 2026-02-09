/**
 * Education Reports API
 *
 * Provides institution-scoped reports and CSV export for educational admins.
 * Reuses CSV export patterns from admin/export-report.js.
 */

const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { verifyEducationalAdmin } = require('../api-util/security');

// ================ HELPERS ================ //

/**
 * Convert data to CSV format (reused from admin/export-report.js pattern)
 */
function toCSV(data, headers) {
  const headerRow = headers.map(h => `"${h}"`).join(',');
  const dataRows = data.map(row =>
    headers
      .map(header => {
        const value = row[header] !== undefined ? String(row[header]) : '';
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Calculate percentage change between two numbers
 */
function percentChange(current, previous) {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = Math.round(((current - previous) / previous) * 100);
  return change >= 0 ? `+${change}%` : `${change}%`;
}

/**
 * Get a date N days ago
 */
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Get period boundaries (current and previous) based on period string
 */
function getPeriodBoundaries(period) {
  const now = new Date();
  let currentStart, previousStart, previousEnd;

  switch (period) {
    case '30d':
      currentStart = daysAgo(30);
      previousStart = daysAgo(60);
      previousEnd = daysAgo(30);
      break;
    case '90d':
      currentStart = daysAgo(90);
      previousStart = daysAgo(180);
      previousEnd = daysAgo(90);
      break;
    case '1y':
      currentStart = daysAgo(365);
      previousStart = daysAgo(730);
      previousEnd = daysAgo(365);
      break;
    case 'all':
    default:
      currentStart = new Date('2020-01-01');
      previousStart = new Date('2020-01-01');
      previousEnd = new Date('2020-01-01');
      break;
  }

  return { currentStart, now, previousStart, previousEnd };
}

// ================ API HANDLERS ================ //

/**
 * Get reports overview with period comparison
 * GET /api/education/reports/overview
 *
 * Query params:
 *   - period: '30d', '90d', '1y', 'all' (default '30d')
 */
async function overview(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const institutionDomain = user.attributes?.profile?.publicData?.institutionDomain;
    if (!institutionDomain) {
      return res.status(400).json({ error: 'No institution domain found for your account.' });
    }

    const period = req.query.period || '30d';
    const validPeriods = ['30d', '90d', '1y', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: `Invalid period. Must be one of: ${validPeriods.join(', ')}` });
    }

    const { currentStart, now, previousStart, previousEnd } = getPeriodBoundaries(period);
    const integrationSdk = getIntegrationSdk();

    // Fetch all students for this institution
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

      allStudents = allStudents.concat(response.data.data);
      if (response.data.data.length < batchSize || allStudents.length >= 1000) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Count students by period
    const currentStudents = allStudents.filter(
      s => new Date(s.attributes.createdAt) >= currentStart && new Date(s.attributes.createdAt) <= now
    ).length;
    const previousStudents = period === 'all' ? allStudents.length : allStudents.filter(
      s => new Date(s.attributes.createdAt) >= previousStart && new Date(s.attributes.createdAt) < previousEnd
    ).length;

    // Fetch transaction stats for current period
    let currentApplications = 0;
    let currentAcceptances = 0;
    let currentCompletions = 0;
    let previousApplications = 0;
    let previousAcceptances = 0;
    let previousCompletions = 0;

    // Sample up to 50 students for transaction data
    const sampleStudents = allStudents.slice(0, 50);

    if (sampleStudents.length > 0) {
      try {
        const txResults = await Promise.all(
          sampleStudents.map(async student => {
            try {
              const txResponse = await integrationSdk.transactions.query({
                customerId: student.id.uuid,
              });
              return txResponse.data.data;
            } catch {
              return [];
            }
          })
        );

        txResults.flat().forEach(tx => {
          const createdAt = new Date(tx.attributes.createdAt);
          const lastTransition = tx.attributes.lastTransition;
          const isAccepted = lastTransition === 'transition/accept';
          const isCompleted = [
            'transition/mark-completed',
            'transition/review-1-by-provider',
            'transition/review-1-by-customer',
            'transition/review-2-by-provider',
            'transition/review-2-by-customer',
          ].includes(lastTransition);

          // Current period
          if (createdAt >= currentStart && createdAt <= now) {
            currentApplications++;
            if (isAccepted) currentAcceptances++;
            if (isCompleted) currentCompletions++;
          }

          // Previous period
          if (period !== 'all' && createdAt >= previousStart && createdAt < previousEnd) {
            previousApplications++;
            if (isAccepted) previousAcceptances++;
            if (isCompleted) previousCompletions++;
          }
        });

        // Extrapolate if sampled
        if (allStudents.length > 50) {
          const ratio = allStudents.length / 50;
          currentApplications = Math.round(currentApplications * ratio);
          currentAcceptances = Math.round(currentAcceptances * ratio);
          currentCompletions = Math.round(currentCompletions * ratio);
          previousApplications = Math.round(previousApplications * ratio);
          previousAcceptances = Math.round(previousAcceptances * ratio);
          previousCompletions = Math.round(previousCompletions * ratio);
        }
      } catch (e) {
        console.error('Error fetching transaction stats for reports:', e.message);
      }
    }

    res.status(200).json({
      current: {
        students: period === 'all' ? allStudents.length : currentStudents,
        applications: currentApplications,
        acceptances: currentAcceptances,
        completions: currentCompletions,
      },
      previous: {
        students: previousStudents,
        applications: previousApplications,
        acceptances: previousAcceptances,
        completions: previousCompletions,
      },
      change: {
        students: percentChange(period === 'all' ? allStudents.length : currentStudents, previousStudents),
        applications: percentChange(currentApplications, previousApplications),
        acceptances: percentChange(currentAcceptances, previousAcceptances),
        completions: percentChange(currentCompletions, previousCompletions),
      },
      period,
      totalStudentsAllTime: allStudents.length,
    });
  } catch (e) {
    console.error('Error generating education reports overview:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Export education report as CSV
 * GET /api/education/reports/export
 *
 * Query params:
 *   - type: 'students' | 'projects' (required)
 *   - format: 'csv' (default)
 */
async function exportReport(req, res) {
  try {
    const user = await verifyEducationalAdmin(req, res);
    if (!user) {
      return res.status(403).json({ error: 'Access denied. Educational administrator privileges required.' });
    }

    const institutionDomain = user.attributes?.profile?.publicData?.institutionDomain;
    if (!institutionDomain) {
      return res.status(400).json({ error: 'No institution domain found for your account.' });
    }

    const { type } = req.query;
    if (!type || !['students', 'projects'].includes(type)) {
      return res.status(400).json({ error: 'type query param is required. Must be "students" or "projects".' });
    }

    const integrationSdk = getIntegrationSdk();

    if (type === 'students') {
      // Fetch all students
      let allStudents = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await integrationSdk.users.query({
          pub_userType: 'student',
          pub_emailDomain: institutionDomain.toLowerCase(),
          page,
          perPage: 100,
        });
        allStudents = allStudents.concat(response.data.data);
        if (response.data.data.length < 100 || allStudents.length >= 2000) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // Transform for CSV
      const headers = ['Name', 'Email Domain', 'University', 'Major', 'Graduation Year', 'Joined'];
      const rows = allStudents.map(student => {
        const pd = student.attributes?.profile?.publicData || {};
        return {
          'Name': student.attributes?.profile?.displayName || 'Unknown',
          'Email Domain': pd.emailDomain || '',
          'University': pd.university || '',
          'Major': pd.major || '',
          'Graduation Year': pd.graduationYear || '',
          'Joined': student.attributes?.createdAt ? new Date(student.attributes.createdAt).toISOString().split('T')[0] : '',
        };
      });

      const csv = toCSV(rows, headers);
      const filename = `education-students-report-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);

    } else if (type === 'projects') {
      // Fetch listings (projects) that have institutionDomain matching
      // Note: We query transactions involving students from this institution
      let allStudents = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await integrationSdk.users.query({
          pub_userType: 'student',
          pub_emailDomain: institutionDomain.toLowerCase(),
          page,
          perPage: 100,
        });
        allStudents = allStudents.concat(response.data.data);
        if (response.data.data.length < 100 || allStudents.length >= 500) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // Query transactions for students to build project data
      const projectData = [];
      const sampleStudents = allStudents.slice(0, 50);

      for (const student of sampleStudents) {
        try {
          const txResponse = await integrationSdk.transactions.query({
            customerId: student.id.uuid,
            include: ['listing'],
          });

          txResponse.data.data.forEach(tx => {
            const listing = txResponse.data.included?.find(
              i => i.type === 'listing' && i.id.uuid === tx.relationships?.listing?.data?.id?.uuid
            );

            projectData.push({
              'Student': student.attributes?.profile?.displayName || 'Unknown',
              'Project Title': listing?.attributes?.title || 'N/A',
              'Status': tx.attributes.lastTransition || 'Unknown',
              'Applied Date': tx.attributes.createdAt ? new Date(tx.attributes.createdAt).toISOString().split('T')[0] : '',
              'Last Updated': tx.attributes.lastTransitionedAt ? new Date(tx.attributes.lastTransitionedAt).toISOString().split('T')[0] : '',
            });
          });
        } catch {
          // Skip failed queries
        }
      }

      const headers = ['Student', 'Project Title', 'Status', 'Applied Date', 'Last Updated'];
      const csv = toCSV(projectData, headers);
      const filename = `education-projects-report-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    }
  } catch (e) {
    console.error('Error exporting education report:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  overview,
  export: exportReport,
};
