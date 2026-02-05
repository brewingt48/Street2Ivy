#!/usr/bin/env node

/**
 * Script to promote an existing user to system-admin
 *
 * Usage:
 *   node server/scripts/promote-to-admin.js <user-email>
 *
 * Example:
 *   node server/scripts/promote-to-admin.js admin@example.com
 *
 * Prerequisites:
 *   - SHARETRIBE_INTEGRATION_CLIENT_ID and SHARETRIBE_INTEGRATION_CLIENT_SECRET
 *     must be set in your .env file
 */

require('dotenv').config();

const sharetribeSdk = require('sharetribe-flex-integration-sdk');

const clientId = process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
const clientSecret = process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Error: Missing Integration API credentials.');
  console.error(
    'Please ensure SHARETRIBE_INTEGRATION_CLIENT_ID and SHARETRIBE_INTEGRATION_CLIENT_SECRET are set in your .env file.'
  );
  process.exit(1);
}

const integrationSdk = sharetribeSdk.createInstance({
  clientId,
  clientSecret,
});

const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Usage: node server/scripts/promote-to-admin.js <user-email>');
  console.error('Example: node server/scripts/promote-to-admin.js admin@example.com');
  process.exit(1);
}

async function promoteToAdmin(email) {
  console.log(`\nSearching for user with email: ${email}...`);

  try {
    // Search for user by email
    const usersResponse = await integrationSdk.users.query({
      email: email,
    });

    const users = usersResponse.data.data;

    if (users.length === 0) {
      console.error(`\nError: No user found with email "${email}"`);
      console.error('Please make sure the user has already signed up.');
      process.exit(1);
    }

    const user = users[0];
    const userId = user.id.uuid;
    const currentPublicData = user.attributes.profile.publicData || {};
    const currentUserType = currentPublicData.userType;

    console.log(`\nFound user:`);
    console.log(`  ID: ${userId}`);
    console.log(
      `  Name: ${user.attributes.profile.displayName ||
        user.attributes.profile.firstName + ' ' + user.attributes.profile.lastName}`
    );
    console.log(`  Current userType: ${currentUserType || '(none)'}`);

    if (currentUserType === 'system-admin') {
      console.log(`\nThis user is already a system-admin. No changes needed.`);
      process.exit(0);
    }

    // Update user's publicData to set userType to system-admin
    console.log(`\nPromoting user to system-admin...`);

    await integrationSdk.users.updateProfile({
      id: userId,
      publicData: {
        ...currentPublicData,
        userType: 'system-admin',
      },
    });

    console.log(`\n✅ Success! User "${email}" has been promoted to system-admin.`);
    console.log(`\nYou can now:`);
    console.log(`  1. Log in as this user at your marketplace`);
    console.log(`  2. Navigate to /admin to access the Admin Dashboard`);
    console.log(`  3. Manage users, send messages, and view reports`);
  } catch (error) {
    console.error('\nError promoting user:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

promoteToAdmin(userEmail);
