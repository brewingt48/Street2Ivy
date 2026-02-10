#!/usr/bin/env node

/**
 * Script to create a test educational institution account directly via Integration API
 * This bypasses email verification.
 *
 * This user type represents a university representative who has self-signed up
 * and can later be promoted to educational-admin by a system admin.
 *
 * Usage:
 *   node server/scripts/create-test-edu-institution.js
 *
 * Options:
 *   --email <email>       Custom email (default: test-edu-institution@testuniversity.edu)
 *   --password <password> Custom password (default: TestEduInst123!)
 *   --firstName <name>    Custom first name (default: Test)
 *   --lastName <name>     Custom last name (default: Institution)
 *
 * Prerequisites:
 *   - SHARETRIBE_INTEGRATION_API_CLIENT_ID and SHARETRIBE_INTEGRATION_API_CLIENT_SECRET
 *     must be set in your .env file
 */

require('dotenv').config();

const sharetribeSdk = require('sharetribe-flex-integration-sdk');

const clientId = process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID || process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
const clientSecret = process.env.SHARETRIBE_INTEGRATION_API_CLIENT_SECRET || process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Error: Missing Integration API credentials.');
  console.error(
    'Please ensure SHARETRIBE_INTEGRATION_API_CLIENT_ID and SHARETRIBE_INTEGRATION_API_CLIENT_SECRET are set in your .env file.'
  );
  process.exit(1);
}

const integrationSdk = sharetribeSdk.createInstance({
  clientId,
  clientSecret,
});

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    email: 'test-edu-institution@testuniversity.edu',
    password: 'TestEduInst123!',
    firstName: 'Test',
    lastName: 'Institution',
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
    }
  }

  return options;
}

async function createTestEduInstitution() {
  const options = parseArgs();
  const { email, password, firstName, lastName } = options;

  const emailDomain = email.split('@')[1] || 'testuniversity.edu';
  const institutionName = 'Test University';

  console.log('\n========================================');
  console.log('Creating Test Educational Institution Account');
  console.log('========================================\n');

  try {
    // Check if user already exists
    console.log('Checking if user already exists...');
    const existingUsers = await integrationSdk.users.query({
      email: email,
    });

    if (existingUsers.data.data.length > 0) {
      const existingUser = existingUsers.data.data[0];
      console.log('\n⚠️  User already exists!');
      console.log(`   ID: ${existingUser.id.uuid}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log('\nYou can log in with these credentials.');
      process.exit(0);
    }

    // Create the user
    console.log('Creating new educational institution user...');
    const createResponse = await integrationSdk.users.create({
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      displayName: `${firstName} ${lastName}`,
      publicData: {
        userType: 'educational-institution',
        institutionName: institutionName,
        institutionDomain: emailDomain,
        emailDomain: emailDomain,
        adminRole: 'career-services',
        adminDepartment: 'Career Center',
        approvalStatus: 'pending',
      },
      privateData: {},
      protectedData: {
        createdByScript: true,
        createdAt: new Date().toISOString(),
      },
    });

    const newUser = createResponse.data.data;

    console.log('\n✅ Success! Test Educational Institution account created.\n');
    console.log('========================================');
    console.log('LOGIN CREDENTIALS');
    console.log('========================================');
    console.log(`Email:       ${email}`);
    console.log(`Password:    ${password}`);
    console.log(`Institution: ${institutionName}`);
    console.log(`User ID:     ${newUser.id.uuid}`);
    console.log(`Status:      Pending Approval`);
    console.log('========================================\n');
    console.log('You can now:');
    console.log('  1. Log in at http://localhost:3000/login');
    console.log('  2. This user is pending approval (simulates real signup flow)');
    console.log('  3. A system admin can promote this user to educational-admin\n');

  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }

    // Common error handling
    if (error.status === 409 || error.message?.includes('email-taken')) {
      console.log('\nThe email is already taken. Try logging in with:');
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
    }

    process.exit(1);
  }
}

createTestEduInstitution();
