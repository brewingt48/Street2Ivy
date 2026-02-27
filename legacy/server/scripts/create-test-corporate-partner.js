#!/usr/bin/env node

/**
 * Script to create a test corporate partner account via Marketplace SDK + Integration SDK.
 * Uses Marketplace SDK to create the user (signup), then Integration SDK to set publicData.
 *
 * Usage:
 *   node server/scripts/create-test-corporate-partner.js
 *
 * Options:
 *   --email <email>       Custom email (default: partner@testcompany.com)
 *   --password <password> Custom password (default: randomly generated)
 *   --approved            Create as already approved (default: pending)
 *
 * NOTE: When no --password is provided, a random password is generated and
 * printed to the console. Copy it from the output.
 *
 * Prerequisites:
 *   - REACT_APP_SHARETRIBE_SDK_CLIENT_ID and SHARETRIBE_INTEGRATION_API_CLIENT_ID
 *     must be set in your .env file
 */

require('dotenv').config();

const crypto = require('crypto');
const marketplaceSdk = require('sharetribe-flex-sdk');
const integrationSdkLib = require('sharetribe-flex-integration-sdk');

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

const sdk = marketplaceSdk.createInstance({
  clientId: marketplaceClientId,
});

const integrationSdk = integrationSdkLib.createInstance({
  clientId: integrationClientId,
  clientSecret: integrationClientSecret,
});

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  // Generated passwords are printed to console — see script output
  const options = {
    email: 'partner@testcompany.com',
    password: crypto.randomBytes(16).toString('hex') + 'A1!',
    firstName: 'Test',
    lastName: 'Partner',
    approved: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[++i];
    } else if (args[i] === '--password' && args[i + 1]) {
      options.password = args[++i];
    } else if (args[i] === '--firstName' && args[i + 1]) {
      options.firstName = args[++i];
    } else if (args[i] === '--lastName' && args[i + 1]) {
      options.lastName = args[++i];
    } else if (args[i] === '--approved') {
      options.approved = true;
    }
  }

  return options;
}

async function createTestCorporatePartner() {
  const options = parseArgs();
  const { email, password, firstName, lastName, approved } = options;
  const emailDomain = email.split('@')[1] || 'testcompany.com';
  const approvalStatus = approved ? 'approved' : 'pending';

  console.log('\n========================================');
  console.log('Creating Test Corporate Partner Account');
  console.log(`Approval status: ${approvalStatus}`);
  console.log('========================================\n');

  try {
    // Check if user already exists (exact email match)
    console.log('Checking if user already exists...');
    const existingUsers = await integrationSdk.users.query({});
    const exactMatch = existingUsers.data.data.find(
      u => u.attributes.email === email
    );

    if (exactMatch) {
      const existingUser = exactMatch;
      const existingStatus =
        existingUser.attributes.profile.publicData?.approvalStatus || '(none)';
      console.log('\n⚠️  User already exists!');
      console.log(`   ID: ${existingUser.id.uuid}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Approval Status: ${existingStatus}`);
      console.log('\nYou can log in with these credentials.');
      process.exit(0);
    }

    // Create the user via Marketplace SDK (signup)
    console.log('Creating new corporate partner user...');
    const createResponse = await sdk.currentUser.create({
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      displayName: `${firstName} ${lastName}`,
      publicData: {
        userType: 'corporate-partner',
        emailDomain: emailDomain,
        companyName: 'Test Company Inc.',
        industry: 'technology',
        companySize: '51-200',
        companyState: 'CA',
        department: 'Engineering',
        companyWebsite: 'https://testcompany.com',
        companyDescription:
          'A test company for verifying the corporate partner approval flow.',
        approvalStatus: approvalStatus,
        onboardingComplete: true,
      },
    });

    const newUser = createResponse.data.data;

    console.log('\n✅ Success! Test Corporate Partner created.\n');
    console.log('========================================');
    console.log('LOGIN CREDENTIALS');
    console.log('========================================');
    console.log(`Email:           ${email}`);
    console.log(`Password:        ${password}`);
    console.log(`Company:         Test Company Inc.`);
    console.log(`Approval Status: ${approvalStatus}`);
    console.log(`User ID:         ${newUser.id.uuid}`);
    console.log('========================================\n');

    if (approved) {
      console.log('You can now:');
      console.log('  1. Log in at http://localhost:3000/login');
      console.log('  2. Navigate to /corporate/dashboard');
      console.log('  3. Post projects and manage applications\n');
    } else {
      console.log('This partner is PENDING approval. You can now:');
      console.log('  1. Log in at http://localhost:3000/login');
      console.log('  2. Navigate to /corporate/dashboard — should see "Pending" gate');
      console.log('  3. Log in as system admin and approve via Admin Dashboard');
      console.log('  4. Or use the API: POST /api/admin/users/<userId>/approve\n');
    }
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }

    if (error.status === 409 || error.message?.includes('email-taken')) {
      console.log('\nThe email is already taken. Try logging in with:');
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
    }

    process.exit(1);
  }
}

createTestCorporatePartner();
