#!/usr/bin/env node

/**
 * Script to create a test educational admin account directly via Integration API
 * This bypasses email verification.
 *
 * Usage:
 *   node server/scripts/create-test-edu-admin.js
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

async function createTestEduAdmin() {
  const testEmail = 'test-edu-admin@testuniversity.edu';
  const testPassword = 'TestEduAdmin123!';
  const institutionName = 'Test University';
  const emailDomain = 'testuniversity.edu';

  console.log('\n========================================');
  console.log('Creating Test Educational Admin Account');
  console.log('========================================\n');

  try {
    // Check if user already exists
    console.log('Checking if user already exists...');
    const existingUsers = await integrationSdk.users.query({
      email: testEmail,
    });

    if (existingUsers.data.data.length > 0) {
      const existingUser = existingUsers.data.data[0];
      console.log('\n⚠️  User already exists!');
      console.log(`   ID: ${existingUser.id.uuid}`);
      console.log(`   Email: ${testEmail}`);
      console.log(`   Password: ${testPassword}`);
      console.log('\nYou can log in with these credentials.');
      process.exit(0);
    }

    // Create the user
    console.log('Creating new user...');
    const createResponse = await integrationSdk.users.create({
      email: testEmail,
      password: testPassword,
      firstName: 'Test',
      lastName: 'EduAdmin',
      displayName: 'Test EduAdmin',
      publicData: {
        userType: 'educational-admin',
        emailDomain: emailDomain,
        institutionName: institutionName,
        institutionDomain: emailDomain,
        adminRole: 'career-services',
        approvalStatus: 'approved',
        approvedAt: new Date().toISOString(),
      },
      privateData: {},
      protectedData: {
        createdByScript: true,
        createdAt: new Date().toISOString(),
      },
    });

    const newUser = createResponse.data.data;

    console.log('\n✅ Success! Test Educational Admin created.\n');
    console.log('========================================');
    console.log('LOGIN CREDENTIALS');
    console.log('========================================');
    console.log(`Email:       ${testEmail}`);
    console.log(`Password:    ${testPassword}`);
    console.log(`Institution: ${institutionName}`);
    console.log(`User ID:     ${newUser.id.uuid}`);
    console.log('========================================\n');
    console.log('You can now:');
    console.log('  1. Log in at http://localhost:3000/login');
    console.log('  2. Navigate to /education/dashboard');
    console.log('  3. View students from your institution\n');

  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }

    // Common error handling
    if (error.status === 409 || error.message?.includes('email-taken')) {
      console.log('\nThe email is already taken. Try logging in with:');
      console.log(`  Email: ${testEmail}`);
      console.log(`  Password: ${testPassword}`);
    }

    process.exit(1);
  }
}

createTestEduAdmin();
