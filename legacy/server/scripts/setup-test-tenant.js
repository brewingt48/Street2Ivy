#!/usr/bin/env node

/**
 * Script to set up a white-label school tenant for testing.
 *
 * Creates:
 *   1. A tenant entry in tenants.json (using the default Sharetribe credentials)
 *   2. An educational admin user for the school
 *   3. Two corporate partner users — one pending, one approved
 *   4. A test student user
 *
 * Since this reuses the same Sharetribe account (default credentials),
 * all users are in the same marketplace. The tenant just provides
 * subdomain routing, branding, and partner management isolation.
 *
 * Usage:
 *   node server/scripts/setup-test-tenant.js
 *
 * Options:
 *   --subdomain <name>   Custom subdomain (default: testschool)
 *   --school <name>      School name (default: Test School University)
 *   --domain <domain>    Institution email domain (default: testschool.edu)
 *
 * NOTE: All test user passwords are randomly generated and printed to the
 * console after creation. Copy them from the output.
 *
 * Prerequisites:
 *   - SHARETRIBE_INTEGRATION_API_CLIENT_ID and SHARETRIBE_INTEGRATION_API_CLIENT_SECRET
 *     must be set in your .env file
 *
 * After running this script:
 *   - Access the tenant at http://testschool.localhost:3000 (or via X-Tenant-ID header)
 *   - Or use ?tenant=testschool query param in development
 */

require('dotenv').config();

const crypto = require('crypto');
const marketplaceSdkLib = require('sharetribe-flex-sdk');
const integrationSdkLib = require('sharetribe-flex-integration-sdk');
const path = require('path');

const marketplaceClientId = process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID;
const integrationClientId =
  process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID ||
  process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
const integrationClientSecret =
  process.env.SHARETRIBE_INTEGRATION_API_CLIENT_SECRET ||
  process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;

if (!marketplaceClientId) {
  console.error('Error: Missing REACT_APP_SHARETRIBE_SDK_CLIENT_ID in .env');
  process.exit(1);
}
if (!integrationClientId || !integrationClientSecret) {
  console.error('Error: Missing Integration API credentials in .env');
  process.exit(1);
}

const sdk = marketplaceSdkLib.createInstance({
  clientId: marketplaceClientId,
});

const integrationSdk = integrationSdkLib.createInstance({
  clientId: integrationClientId,
  clientSecret: integrationClientSecret,
});

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    subdomain: 'testschool',
    schoolName: 'Test School University',
    domain: 'testschool.edu',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--subdomain' && args[i + 1]) {
      options.subdomain = args[++i];
    } else if (args[i] === '--school' && args[i + 1]) {
      options.schoolName = args[++i];
    } else if (args[i] === '--domain' && args[i + 1]) {
      options.domain = args[++i];
    }
  }

  return options;
}

async function findOrCreateUser(email, password, firstName, lastName, publicData) {
  const existingUsers = await integrationSdk.users.query({});
  const exactMatch = existingUsers.data.data.find(
    u => u.attributes.email === email
  );

  if (exactMatch) {
    const user = exactMatch;
    console.log(`  ⚠️  User already exists: ${email} (ID: ${user.id.uuid})`);

    // Update publicData to ensure it's correct
    await integrationSdk.users.updateProfile({
      id: user.id.uuid,
      publicData,
    });
    console.log(`     Updated publicData for existing user.`);

    return { user, isNew: false, password };
  }

  // Create via Marketplace SDK (signup)
  const createResponse = await sdk.currentUser.create({
    email,
    password,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    publicData,
  });

  const user = createResponse.data.data;
  console.log(`  ✅ Created: ${email} (ID: ${user.id.uuid})`);

  // Logout after each create so we can create the next user
  try { await sdk.logout(); } catch (e) { /* ignore */ }

  return { user, isNew: true, password };
}

async function setupTestTenant() {
  const options = parseArgs();
  const { subdomain, schoolName, domain } = options;

  console.log('\n========================================================');
  console.log(`Setting up white-label tenant: ${schoolName}`);
  console.log(`Subdomain: ${subdomain} | Domain: ${domain}`);
  console.log('========================================================\n');

  // ── Step 1: Create tenant ──────────────────────────────────────────

  console.log('Step 1: Creating tenant entry...');

  // We require the tenant registry — this loads tenants.json
  const tenantRegistry = require(path.join(__dirname, '../api-util/tenantRegistry'));

  let tenant;
  try {
    const existing = tenantRegistry.getTenantById(subdomain);
    if (existing) {
      console.log(`  ⚠️  Tenant "${subdomain}" already exists. Updating...`);
      tenant = tenantRegistry.updateTenant(subdomain, {
        name: schoolName,
        displayName: `${schoolName} on Campus2Career`,
        institutionDomain: domain,
      });
    } else {
      tenant = tenantRegistry.createTenant({
        subdomain,
        name: schoolName,
        displayName: `${schoolName} on Campus2Career`,
        institutionDomain: domain,
        sharetribe: {
          // Reuse the same Sharetribe account for testing
          clientId: process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID,
          clientSecret: process.env.SHARETRIBE_SDK_CLIENT_SECRET,
          integrationClientId: clientId,
          integrationClientSecret: clientSecret,
        },
        features: {
          requireCorporateApproval: true,
        },
      });
    }
    console.log(`  ✅ Tenant "${subdomain}" ready (ID: ${tenant.id})\n`);
  } catch (err) {
    console.error(`  ❌ Error creating tenant: ${err.message}`);
    process.exit(1);
  }

  // ── Step 2: Create educational admin ────────────────────────────────

  console.log('Step 2: Creating educational admin...');

  const eduAdminEmail = `admin@${domain}`;
  // Generated passwords are printed to console — see script output
  const eduAdminPassword = crypto.randomBytes(16).toString('hex') + 'A1!';

  const eduAdminResult = await findOrCreateUser(
    eduAdminEmail,
    eduAdminPassword,
    'School',
    'Admin',
    {
      userType: 'educational-admin',
      emailDomain: domain,
      institutionName: schoolName,
      institutionDomain: domain,
      adminRole: 'career-services',
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
    }
  );
  console.log('');

  // ── Step 3: Create pending corporate partner ────────────────────────

  console.log('Step 3: Creating PENDING corporate partner...');

  const pendingPartnerEmail = `pending-partner@${subdomain}corp.com`;
  const pendingPartnerPassword = crypto.randomBytes(16).toString('hex') + 'A1!';

  const pendingResult = await findOrCreateUser(
    pendingPartnerEmail,
    pendingPartnerPassword,
    'Pending',
    'Partner',
    {
      userType: 'corporate-partner',
      emailDomain: `${subdomain}corp.com`,
      companyName: 'Pending Corp',
      industry: 'technology',
      companySize: '11-50',
      companyState: 'NY',
      department: 'Engineering',
      companyDescription: 'A pending corporate partner for testing approval flow.',
      approvalStatus: 'pending',
      onboardingComplete: true,
    }
  );
  console.log('');

  // ── Step 4: Create approved corporate partner ───────────────────────

  console.log('Step 4: Creating APPROVED corporate partner...');

  const approvedPartnerEmail = `approved-partner@${subdomain}corp.com`;
  const approvedPartnerPassword = crypto.randomBytes(16).toString('hex') + 'A1!';

  const approvedResult = await findOrCreateUser(
    approvedPartnerEmail,
    approvedPartnerPassword,
    'Approved',
    'Partner',
    {
      userType: 'corporate-partner',
      emailDomain: `${subdomain}corp.com`,
      companyName: 'Approved Corp',
      industry: 'finance',
      companySize: '201-500',
      companyState: 'CA',
      department: 'Marketing',
      companyDescription: 'An approved corporate partner for testing.',
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      onboardingComplete: true,
    }
  );

  // Add approved partner to tenant's corporatePartnerIds
  const approvedPartnerId = approvedResult.user.id.uuid;
  if (!tenant.corporatePartnerIds.includes(approvedPartnerId)) {
    tenantRegistry.updateTenant(subdomain, {
      corporatePartnerIds: [...tenant.corporatePartnerIds, approvedPartnerId],
    });
    console.log(`  Added to tenant corporatePartnerIds.`);
  }
  console.log('');

  // ── Step 5: Create a test student ───────────────────────────────────

  console.log('Step 5: Creating test student...');

  const studentEmail = `student@${domain}`;
  const studentPassword = crypto.randomBytes(16).toString('hex') + 'A1!';

  await findOrCreateUser(studentEmail, studentPassword, 'Test', 'Student', {
    userType: 'student',
    emailDomain: domain,
    institutionName: schoolName,
    major: 'Business Administration',
    graduationYear: 2026,
    skills: ['Marketing', 'Data Analysis', 'Project Management'],
    onboardingComplete: true,
  });
  console.log('');

  // ── Summary ─────────────────────────────────────────────────────────

  console.log('========================================================');
  console.log('TEST SETUP COMPLETE');
  console.log('========================================================\n');

  console.log(`Tenant: ${schoolName} (${subdomain})`);
  console.log(`Access: http://localhost:3000?tenant=${subdomain}`);
  console.log(`   or:  curl -H "X-Tenant-ID: ${subdomain}" http://localhost:3000\n`);

  console.log('Test Accounts:\n');

  console.log('  1. EDUCATIONAL ADMIN (can manage partners):');
  console.log(`     Email:    ${eduAdminEmail}`);
  console.log(`     Password: ${eduAdminPassword}`);
  console.log(`     Dashboard: /education/dashboard → "Corporate Partners" tab\n`);

  console.log('  2. PENDING CORPORATE PARTNER (should see approval gate):');
  console.log(`     Email:    ${pendingPartnerEmail}`);
  console.log(`     Password: ${pendingPartnerPassword}`);
  console.log(`     Dashboard: /corporate/dashboard → should show "Pending Approval"\n`);

  console.log('  3. APPROVED CORPORATE PARTNER (full dashboard access):');
  console.log(`     Email:    ${approvedPartnerEmail}`);
  console.log(`     Password: ${approvedPartnerPassword}`);
  console.log(`     Dashboard: /corporate/dashboard → should show full dashboard\n`);

  console.log('  4. STUDENT:');
  console.log(`     Email:    ${studentEmail}`);
  console.log(`     Password: ${studentPassword}\n`);

  console.log('Testing Steps:');
  console.log('  1. Log in as PENDING partner → verify "Pending Approval" gate');
  console.log('  2. Log in as EDUCATIONAL ADMIN → go to Corporate Partners tab');
  console.log('  3. Approve the pending partner from the Partners tab');
  console.log('  4. Log back in as the partner → verify full dashboard access');
  console.log('  5. Go back to admin → reject or remove the partner');
  console.log('  6. Verify the partner sees the rejection/pending gate again\n');

  console.log('For the DEFAULT (non-white-label) platform:');
  console.log('  Run: node server/scripts/create-test-corporate-partner.js');
  console.log('  Then approve via system admin at /admin\n');
}

setupTestTenant().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  if (err.data) {
    console.error('Details:', JSON.stringify(err.data, null, 2));
  }
  process.exit(1);
});
