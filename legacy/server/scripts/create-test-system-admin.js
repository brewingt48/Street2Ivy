#!/usr/bin/env node

/**
 * Script to create a test system admin account directly via Integration API
 * This bypasses email verification and creates the user as a system-admin.
 *
 * Usage:
 *   node server/scripts/create-test-system-admin.js
 *
 * Options:
 *   --email <email>       Custom email (default: test-sysadmin@street2ivy.com)
 *   --password <password> Custom password (default: randomly generated)
 *   --firstName <name>    Custom first name (default: Test)
 *   --lastName <name>     Custom last name (default: Admin)
 *
 * NOTE: When no --password is provided, a random password is generated and
 * printed to the console. Copy it from the output.
 *
 * Prerequisites:
 *   - SHARETRIBE_INTEGRATION_API_CLIENT_ID and SHARETRIBE_INTEGRATION_API_CLIENT_SECRET
 *     must be set in your .env file
 */

require('dotenv').config();

const crypto = require('crypto');
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
  // Generated passwords are printed to console — see script output
  const options = {
    email: 'test-sysadmin@street2ivy.com',
    password: crypto.randomBytes(16).toString('hex') + 'A1!',
    firstName: 'Test',
    lastName: 'Admin',
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

async function createTestSystemAdmin() {
  const options = parseArgs();
  const { email, password, firstName, lastName } = options;

  console.log('\n========================================');
  console.log('Creating Test System Admin Account');
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
    console.log('Creating new system admin user...');
    const createResponse = await integrationSdk.users.create({
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      displayName: `${firstName} ${lastName}`,
      publicData: {
        userType: 'system-admin',
      },
      privateData: {},
      protectedData: {
        createdByScript: true,
        createdAt: new Date().toISOString(),
      },
    });

    const newUser = createResponse.data.data;

    console.log('\n✅ Success! Test System Admin account created.\n');
    console.log('========================================');
    console.log('LOGIN CREDENTIALS');
    console.log('========================================');
    console.log(`Email:       ${email}`);
    console.log(`Password:    ${password}`);
    console.log(`User ID:     ${newUser.id.uuid}`);
    console.log('========================================\n');
    console.log('You can now:');
    console.log('  1. Log in at http://localhost:3000/admin/login');
    console.log('  2. Navigate to /admin to access the Admin Dashboard');
    console.log('  3. Manage users, approve accounts, and configure the platform\n');

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

createTestSystemAdmin();
