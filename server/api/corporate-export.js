const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

/**
 * Verify the current user is a corporate partner
 */
async function verifyCorporatePartner(req, res) {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse.data.data;
  const publicData = currentUser.attributes.profile.publicData || {};

  if (publicData.userType !== 'corporate-partner') {
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
    headers.map(header => {
      const value = row[header] !== undefined ? String(row[header]) : '';
      return `"${value.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Convert data to HTML table (for Word-like format)
 */
function toHTML(data, headers, title, companyName) {
  const tableRows = data.map(row =>
    `<tr>${headers.map(h => `<td>${row[h] !== undefined ? row[h] : ''}</td>`).join('')}</tr>`
  ).join('\n');

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
    .header-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .generated { color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="header-info">
    <p><strong>Company:</strong> ${companyName}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>
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

function formatDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * GET /api/corporate/export/:type
 *
 * Export corporate dashboard data in various formats.
 *
 * Query params:
 *   format - Export format: 'csv' (Excel) or 'html' (Word-compatible)
 *
 * Report types:
 *   - projects: All projects with details
 *   - applications: Application statistics
 *   - summary: Overall performance summary
 */
async function exportCorporateReport(req, res) {
  const { type } = req.params;
  const { format = 'csv' } = req.query;

  const validTypes = ['projects', 'applications', 'summary'];
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
    const corporatePartner = await verifyCorporatePartner(req, res);
    if (!corporatePartner) {
      return res.status(403).json({
        error: 'Access denied. Corporate partner privileges required.',
      });
    }

    const userId = corporatePartner.id.uuid;
    const companyName = corporatePartner.attributes.profile.publicData?.companyName || 'Your Company';
    const sdk = getSdk(req, res);

    let exportData;
    let headers;
    let title;
    let filename;

    switch (type) {
      case 'projects':
        exportData = await generateProjectsExport(sdk, userId);
        headers = ['Project Title', 'Status', 'Category', 'Est. Hours', 'Students Needed', 'Created'];
        title = 'Projects Report';
        filename = `projects-report-${formatDate()}`;
        break;

      case 'applications':
        exportData = await generateApplicationsExport(sdk, userId);
        headers = ['Project', 'Student', 'Status', 'Applied Date', 'Response Date'];
        title = 'Applications Report';
        filename = `applications-report-${formatDate()}`;
        break;

      case 'summary':
        exportData = await generateSummaryExport(sdk, userId);
        headers = ['Metric', 'Value'];
        title = 'Performance Summary';
        filename = `performance-summary-${formatDate()}`;
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
      const html = toHTML(exportData, headers, title, companyName);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.html"`);
      return res.send(html);
    }

  } catch (error) {
    console.error('Corporate export report error:', error);
    handleError(res, error);
  }
}

async function generateProjectsExport(sdk, userId) {
  const listingsResponse = await sdk.ownListings.query({
    authorId: userId,
    perPage: 100,
  });

  const listings = listingsResponse.data.data;

  return listings.map(listing => ({
    'Project Title': listing.attributes.title || 'Untitled',
    'Status': listing.attributes.state,
    'Category': listing.attributes.publicData?.industryCategory || 'N/A',
    'Est. Hours': listing.attributes.publicData?.estimatedHours || 'N/A',
    'Students Needed': listing.attributes.publicData?.studentsNeeded || 'N/A',
    'Created': new Date(listing.attributes.createdAt).toLocaleDateString(),
  }));
}

async function generateApplicationsExport(sdk, userId) {
  // Get all listings first
  const listingsResponse = await sdk.ownListings.query({
    authorId: userId,
    perPage: 100,
  });

  const listings = listingsResponse.data.data;
  const listingMap = new Map(listings.map(l => [l.id.uuid, l]));

  // Get transactions (applications)
  const transactionsResponse = await sdk.transactions.query({
    only: 'sale',
    perPage: 100,
    include: ['customer', 'listing'],
  });

  const transactions = transactionsResponse.data.data;
  const included = transactionsResponse.data.included || [];

  const customerMap = new Map();
  included.forEach(item => {
    if (item.type === 'user') {
      customerMap.set(item.id.uuid, item);
    }
  });

  return transactions.map(tx => {
    const listingRef = tx.relationships?.listing?.data;
    const customerRef = tx.relationships?.customer?.data;
    const listing = listingRef ? listingMap.get(listingRef.id.uuid) : null;
    const customer = customerRef ? customerMap.get(customerRef.id.uuid) : null;

    const lastTransition = tx.attributes.lastTransition || '';
    let status = 'Unknown';
    if (lastTransition.includes('apply')) status = 'Applied';
    if (lastTransition.includes('accept')) status = 'Accepted';
    if (lastTransition.includes('decline')) status = 'Declined';
    if (lastTransition.includes('complete')) status = 'Completed';

    return {
      'Project': listing?.attributes?.title || 'Unknown Project',
      'Student': customer?.attributes?.profile?.displayName || 'Unknown',
      'Status': status,
      'Applied Date': new Date(tx.attributes.createdAt).toLocaleDateString(),
      'Response Date': tx.attributes.protectedData?.respondedAt
        ? new Date(tx.attributes.protectedData.respondedAt).toLocaleDateString()
        : 'Pending',
    };
  });
}

async function generateSummaryExport(sdk, userId) {
  const listingsResponse = await sdk.ownListings.query({
    authorId: userId,
    perPage: 100,
  });

  const listings = listingsResponse.data.data;
  const activeListings = listings.filter(l => l.attributes.state === 'published');
  const closedListings = listings.filter(l => l.attributes.state === 'closed');

  const transactionsResponse = await sdk.transactions.query({
    only: 'sale',
    perPage: 100,
  });

  const transactions = transactionsResponse.data.data;

  let accepted = 0;
  let declined = 0;
  let completed = 0;

  transactions.forEach(tx => {
    const lastTransition = tx.attributes.lastTransition || '';
    if (lastTransition.includes('accept')) accepted++;
    if (lastTransition.includes('decline')) declined++;
    if (lastTransition.includes('complete')) completed++;
  });

  return [
    { Metric: 'Total Projects', Value: listings.length },
    { Metric: 'Active Projects', Value: activeListings.length },
    { Metric: 'Completed Projects', Value: closedListings.length },
    { Metric: 'Total Applications', Value: transactions.length },
    { Metric: 'Accepted Applications', Value: accepted },
    { Metric: 'Declined Applications', Value: declined },
    { Metric: 'Projects Completed', Value: completed },
    { Metric: 'Report Generated', Value: new Date().toISOString() },
  ];
}

module.exports = exportCorporateReport;
