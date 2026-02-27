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
 * Convert data to CSV format
 */
function toCSV(data, headers) {
  const headerRow = headers.map(h => `"${h}"`).join(',');
  const dataRows = data.map(row =>
    headers
      .map(header => {
        const value = row[header] !== undefined ? String(row[header]) : '';
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Convert data to HTML table (for Word-like format)
 */
function toHTML(data, headers, title) {
  const tableRows = data
    .map(
      row =>
        `<tr>${headers.map(h => `<td>${row[h] !== undefined ? row[h] : ''}</td>`).join('')}</tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #0084FF; padding-bottom: 10px; }
    h2 { color: #666; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th { background-color: #0084FF; color: white; padding: 12px; text-align: left; }
    td { border: 1px solid #ddd; padding: 10px; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .stat { display: inline-block; margin-right: 30px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #0084FF; }
    .stat-label { font-size: 12px; color: #666; }
    .generated { color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="generated">Generated: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * GET /api/admin/export/:type
 *
 * Export admin reports in various formats.
 *
 * Query params:
 *   format - Export format: 'csv' (Excel) or 'html' (Word-compatible)
 *
 * Report types:
 *   - overview: Platform-wide statistics
 *   - users: User statistics by type
 *   - institutions: Statistics grouped by institution
 *   - transactions: Transaction analytics
 */
async function exportReport(req, res) {
  const { type } = req.params;
  const { format = 'csv' } = req.query;

  const validTypes = ['overview', 'users', 'institutions', 'transactions'];
  const validFormats = ['csv', 'html'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: `Invalid report type. Valid types: ${validTypes.join(', ')}`,
    });
  }

  if (!validFormats.includes(format)) {
    return res.status(400).json({
      error: `Invalid format. Valid formats: ${validFormats.join(', ')}`,
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
    let exportData;
    let headers;
    let title;
    let filename;

    switch (type) {
      case 'overview':
        exportData = await generateOverviewExport(integrationSdk);
        headers = ['Metric', 'Value'];
        title = 'Platform Overview Report';
        filename = `street2ivy-overview-${formatDate()}`;
        break;

      case 'users':
        exportData = await generateUsersExport(integrationSdk);
        headers = ['User Type', 'Total', 'Active', 'Banned', 'New This Month'];
        title = 'Users Report';
        filename = `street2ivy-users-${formatDate()}`;
        break;

      case 'institutions':
        exportData = await generateInstitutionsExport(integrationSdk);
        headers = ['Institution Name', 'Domain', 'Student Count', 'Admin Count'];
        title = 'Institutions Report';
        filename = `street2ivy-institutions-${formatDate()}`;
        break;

      case 'transactions':
        exportData = await generateTransactionsExport(integrationSdk);
        headers = ['State', 'Count', 'Percentage'];
        title = 'Transactions Report';
        filename = `street2ivy-transactions-${formatDate()}`;
        break;

      default:
        exportData = [];
        headers = [];
        title = 'Report';
        filename = 'report';
    }

    if (format === 'csv') {
      const csv = toCSV(exportData, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    } else if (format === 'html') {
      const html = toHTML(exportData, headers, title);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.html"`);
      return res.send(html);
    }
  } catch (error) {
    console.error('Admin export report error:', error);
    handleError(res, error);
  }
}

function formatDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

async function generateOverviewExport(integrationSdk) {
  const [studentsRes, corporatesRes, eduAdminsRes] = await Promise.all([
    integrationSdk.users.query({ pub_userType: 'student', perPage: 1 }),
    integrationSdk.users.query({ pub_userType: 'corporate-partner', perPage: 1 }),
    integrationSdk.users.query({ pub_userType: 'educational-admin', perPage: 1 }),
  ]);

  const studentCount = studentsRes.data.meta.totalItems;
  const corporateCount = corporatesRes.data.meta.totalItems;
  const eduAdminCount = eduAdminsRes.data.meta.totalItems;
  const totalUsers = studentCount + corporateCount + eduAdminCount;

  // Get transaction stats
  let totalTransactions = 0;
  try {
    const txResponse = await integrationSdk.transactions.query({ perPage: 1 });
    totalTransactions = txResponse.data.meta.totalItems;
  } catch (e) {
    console.error('Error fetching transactions:', e.message);
  }

  return [
    { Metric: 'Total Users', Value: totalUsers },
    { Metric: 'Students', Value: studentCount },
    { Metric: 'Corporate Partners', Value: corporateCount },
    { Metric: 'Educational Admins', Value: eduAdminCount },
    { Metric: 'Total Transactions', Value: totalTransactions },
    { Metric: 'Report Generated', Value: new Date().toISOString() },
  ];
}

async function generateUsersExport(integrationSdk) {
  const userTypes = ['student', 'corporate-partner', 'educational-admin'];
  const results = [];

  for (const userType of userTypes) {
    const response = await integrationSdk.users.query({
      pub_userType: userType,
      perPage: 100,
    });

    const users = response.data.data;
    const total = response.data.meta.totalItems;

    const active = users.filter(u => !u.attributes.banned && !u.attributes.deleted).length;
    const banned = users.filter(u => u.attributes.banned).length;

    const now = new Date();
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const newThisMonth = users.filter(u => new Date(u.attributes.createdAt) >= oneMonthAgo).length;

    results.push({
      'User Type': userType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      Total: total,
      Active: active,
      Banned: banned,
      'New This Month': newThisMonth,
    });
  }

  return results;
}

async function generateInstitutionsExport(integrationSdk) {
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

  const results = [];

  for (const [domain, name] of institutionDomains) {
    try {
      const studentsResponse = await integrationSdk.users.query({
        pub_userType: 'student',
        pub_emailDomain: domain.toLowerCase(),
        perPage: 1,
      });

      results.push({
        'Institution Name': name || 'Unknown',
        Domain: domain,
        'Student Count': studentsResponse.data.meta.totalItems,
        'Admin Count': eduAdmins.filter(
          a => a.attributes.profile.publicData?.institutionDomain === domain
        ).length,
      });
    } catch (e) {
      results.push({
        'Institution Name': name || 'Unknown',
        Domain: domain,
        'Student Count': 'N/A',
        'Admin Count': 1,
      });
    }
  }

  // Sort by student count
  results.sort((a, b) => (b['Student Count'] || 0) - (a['Student Count'] || 0));

  return results;
}

async function generateTransactionsExport(integrationSdk) {
  const txResponse = await integrationSdk.transactions.query({
    perPage: 100,
  });

  const transactions = txResponse.data.data;
  const totalTransactions = txResponse.data.meta.totalItems;

  // Count by state
  const byState = {
    applied: 0,
    accepted: 0,
    declined: 0,
    completed: 0,
    reviewed: 0,
    other: 0,
  };

  transactions.forEach(tx => {
    const lastTransition = tx.attributes.lastTransition;

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
  });

  const total = transactions.length;

  return Object.entries(byState).map(([state, count]) => ({
    State: state.charAt(0).toUpperCase() + state.slice(1),
    Count: count,
    Percentage: total > 0 ? `${Math.round((count / total) * 100)}%` : '0%',
  }));
}

module.exports = exportReport;
