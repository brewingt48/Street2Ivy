#!/usr/bin/env node

/**
 * Master script to create ALL test user accounts for Street2Ivy
 * Creates one account for each user type so you can test the entire application.
 *
 * Usage:
 *   node server/scripts/create-all-test-users.js
 *
 * This will create the following accounts:
 *   1. Student           - test-student@test.edu           / TestStudent123!
 *   2. Corporate Partner  - test-corporate@acmecorp.com    / TestCorporate123!
 *   3. Educational Inst.  - test-edu-institution@testuniversity.edu / TestEduInst123!
 *   4. Educational Admin  - test-edu-admin@testuniversity.edu / TestEduAdmin123!
 *   5. System Admin       - test-sysadmin@street2ivy.com   / TestSysAdmin123!
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

// =============================================
// Test user definitions for all 5 user types
// =============================================

const testUsers = [
  {
    label: 'Student',
    email: 'test-student@test.edu',
    password: 'TestStudent123!',
    firstName: 'Test',
    lastName: 'Student',
    displayName: 'Test Student',
    publicData: {
      userType: 'student',
      emailDomain: 'test.edu',
      institutionName: 'Test University',
      university: 'Test University',
      major: 'Computer Science',
      graduationYear: '2026',
      skills: ['leadership', 'communication', 'problem-solving', 'data-analysis'],
      studentState: 'CA',
      interests: ['technology', 'finance', 'startups'],
      onboardingComplete: true,
    },
    dashboardPath: '/student/dashboard',
    loginUrl: 'http://localhost:3000/login',
  },
  {
    label: 'Corporate Partner',
    email: 'test-corporate@acmecorp.com',
    password: 'TestCorporate123!',
    firstName: 'Test',
    lastName: 'Corporate',
    displayName: 'Test Corporate',
    publicData: {
      userType: 'corporate-partner',
      companyName: 'Acme Corporation',
      industry: 'technology',
      companySize: '201-500',
      companyState: 'CA',
      department: 'Engineering',
      companyWebsite: 'https://www.acmecorp.com',
      companyDescription:
        'Acme Corporation is a leading technology company focused on innovative solutions. We offer exciting internship and career opportunities for college students.',
      approvalStatus: 'approved',
    },
    dashboardPath: '/corporate/dashboard',
    loginUrl: 'http://localhost:3000/login',
  },
  {
    label: 'Educational Institution',
    email: 'test-edu-institution@testuniversity.edu',
    password: 'TestEduInst123!',
    firstName: 'Test',
    lastName: 'Institution',
    displayName: 'Test Institution',
    publicData: {
      userType: 'educational-institution',
      institutionName: 'Test University',
      institutionDomain: 'testuniversity.edu',
      emailDomain: 'testuniversity.edu',
      adminRole: 'career-services',
      adminDepartment: 'Career Center',
      approvalStatus: 'pending',
    },
    dashboardPath: '/',
    loginUrl: 'http://localhost:3000/login',
  },
  {
    label: 'Educational Admin',
    email: 'test-edu-admin@testuniversity.edu',
    password: 'TestEduAdmin123!',
    firstName: 'Test',
    lastName: 'EduAdmin',
    displayName: 'Test EduAdmin',
    publicData: {
      userType: 'educational-admin',
      emailDomain: 'testuniversity.edu',
      institutionName: 'Test University',
      institutionDomain: 'testuniversity.edu',
      adminRole: 'career-services',
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
    },
    dashboardPath: '/education/dashboard',
    loginUrl: 'http://localhost:3000/login',
  },
  {
    label: 'System Admin',
    email: 'test-sysadmin@street2ivy.com',
    password: 'TestSysAdmin123!',
    firstName: 'Test',
    lastName: 'Admin',
    displayName: 'Test Admin',
    publicData: {
      userType: 'system-admin',
    },
    dashboardPath: '/admin',
    loginUrl: 'http://localhost:3000/admin/login',
  },
];

// =============================================
// Create user helper
// =============================================

async function createOrCheckUser(userDef) {
  try {
    // Check if user already exists
    const existingUsers = await integrationSdk.users.query({
      email: userDef.email,
    });

    if (existingUsers.data.data.length > 0) {
      const existingUser = existingUsers.data.data[0];
      return {
        status: 'exists',
        userId: existingUser.id.uuid,
        ...userDef,
      };
    }

    // Create the user
    const createResponse = await integrationSdk.users.create({
      email: userDef.email,
      password: userDef.password,
      firstName: userDef.firstName,
      lastName: userDef.lastName,
      displayName: userDef.displayName,
      publicData: userDef.publicData,
      privateData: {},
      protectedData: {
        createdByScript: true,
        createdAt: new Date().toISOString(),
      },
    });

    const newUser = createResponse.data.data;
    return {
      status: 'created',
      userId: newUser.id.uuid,
      ...userDef,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      ...userDef,
    };
  }
}

// =============================================
// Main execution
// =============================================

async function createAllTestUsers() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║        Street2Ivy - Create All Test Users               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const results = [];

  for (const userDef of testUsers) {
    process.stdout.write(`  Creating ${userDef.label}... `);
    const result = await createOrCheckUser(userDef);
    results.push(result);

    if (result.status === 'created') {
      console.log('✅ Created');
    } else if (result.status === 'exists') {
      console.log('⚠️  Already exists');
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  }

  // Print summary table
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                          TEST ACCOUNT CREDENTIALS                               ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                                 ║');

  for (const result of results) {
    const statusIcon = result.status === 'error' ? '❌' : '✅';
    console.log(`║  ${statusIcon} ${result.label.padEnd(25)}`);
    if (result.status !== 'error') {
      console.log(`║     Email:     ${result.email}`);
      console.log(`║     Password:  ${result.password}`);
      console.log(`║     Login:     ${result.loginUrl}`);
      console.log(`║     Dashboard: ${result.dashboardPath}`);
    } else {
      console.log(`║     Error:     ${result.error}`);
    }
    console.log('║');
  }

  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝');

  // Summary
  const created = results.filter(r => r.status === 'created').length;
  const existing = results.filter(r => r.status === 'exists').length;
  const errors = results.filter(r => r.status === 'error').length;

  console.log(`\nSummary: ${created} created, ${existing} already existed, ${errors} errors`);

  if (errors > 0) {
    console.log('\n⚠️  Some accounts failed to create. Check the errors above.');
    process.exit(1);
  }

  console.log('\n🎉 All test accounts are ready! You can log in and test each user type.\n');
}

createAllTestUsers();
