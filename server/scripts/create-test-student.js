#!/usr/bin/env node

/**
 * Script to create a test student account directly via Integration API
 * This bypasses email verification and .edu email requirement.
 *
 * Usage:
 *   node server/scripts/create-test-student.js
 *
 * Options:
 *   --email <email>       Custom email (default: test-student@testuniversity.edu)
 *   --password <password> Custom password (default: TestStudent123!)
 *   --firstName <name>    Custom first name (default: Test)
 *   --lastName <name>     Custom last name (default: Student)
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
    email: 'test-student@test.edu',
    password: 'TestStudent123!',
    firstName: 'Test',
    lastName: 'Student',
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

async function createTestStudent() {
  const options = parseArgs();
  const { email, password, firstName, lastName } = options;

  // Extract domain from email
  const emailDomain = email.split('@')[1] || 'test.edu';
  const institutionName = 'Test University';

  console.log('\n========================================');
  console.log('Creating Test Student Account');
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
      console.log('\n⚠️  User already exists!');
      console.log(`   ID: ${existingUser.id.uuid}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log('\nYou can log in with these credentials.');
      process.exit(0);
    }

    // Create the user
    console.log('Creating new student user...');
    const createResponse = await integrationSdk.users.create({
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      displayName: `${firstName} ${lastName}`,
      publicData: {
        userType: 'student',
        emailDomain: emailDomain,
        institutionName: institutionName,
        major: 'Computer Science',
        graduationYear: 2025,
        gpa: '3.5',
        bio: 'Test student account for development purposes.',
        skills: ['JavaScript', 'React', 'Node.js'],
        interests: ['Software Development', 'Data Science', 'Product Management'],
        onboardingComplete: true,
      },
      privateData: {},
      protectedData: {
        createdByScript: true,
        createdAt: new Date().toISOString(),
      },
    });

    const newUser = createResponse.data.data;

    console.log('\n✅ Success! Test Student account created.\n');
    console.log('========================================');
    console.log('LOGIN CREDENTIALS');
    console.log('========================================');
    console.log(`Email:       ${email}`);
    console.log(`Password:    ${password}`);
    console.log(`Institution: ${institutionName}`);
    console.log(`User ID:     ${newUser.id.uuid}`);
    console.log('========================================\n');
    console.log('You can now:');
    console.log('  1. Log in at http://localhost:3000/login');
    console.log('  2. Navigate to /student/dashboard');
    console.log('  3. Browse and apply to projects\n');

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

createTestStudent();
