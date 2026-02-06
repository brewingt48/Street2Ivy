#!/usr/bin/env node

/**
 * Script to promote an existing user to educational-admin
 *
 * Usage:
 *   node server/scripts/promote-to-educational-admin.js <user-email> <institution-name> [options]
 *
 * Options:
 *   --deposit-paid       Mark that the institution has paid the deposit
 *   --ai-coaching        Mark that the institution has signed off on AI coaching
 *
 * Examples:
 *   node server/scripts/promote-to-educational-admin.js career-services@harvard.edu "Harvard University"
 *   node server/scripts/promote-to-educational-admin.js career-services@harvard.edu "Harvard University" --deposit-paid --ai-coaching
 *
 * Prerequisites:
 *   - SHARETRIBE_INTEGRATION_CLIENT_ID and SHARETRIBE_INTEGRATION_CLIENT_SECRET
 *     must be set in your .env file
 */

require('dotenv').config();

const sharetribeSdk = require('sharetribe-flex-integration-sdk');

const clientId = process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID || process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
const clientSecret = process.env.SHARETRIBE_INTEGRATION_API_CLIENT_SECRET || process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;

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

// Parse arguments
const args = process.argv.slice(2);
const userEmail = args.find(arg => !arg.startsWith('--') && arg.includes('@'));
const institutionName = args.find(arg => !arg.startsWith('--') && !arg.includes('@'));
const depositPaid = args.includes('--deposit-paid');
const aiCoachingApproved = args.includes('--ai-coaching');

if (!userEmail || !institutionName) {
  console.error('Usage: node server/scripts/promote-to-educational-admin.js <user-email> <institution-name> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --deposit-paid       Mark that the institution has paid the deposit');
  console.error('  --ai-coaching        Mark that the institution has signed off on AI coaching');
  console.error('');
  console.error('Examples:');
  console.error('  node server/scripts/promote-to-educational-admin.js career-services@harvard.edu "Harvard University"');
  console.error('  node server/scripts/promote-to-educational-admin.js career-services@harvard.edu "Harvard University" --deposit-paid --ai-coaching');
  process.exit(1);
}

// Extract domain from email
function extractDomain(email) {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : null;
}

async function promoteToEducationalAdmin(email, institution, options) {
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
    const emailDomain = extractDomain(email);

    console.log(`\nFound user:`);
    console.log(`  ID: ${userId}`);
    console.log(
      `  Name: ${user.attributes.profile.displayName ||
        user.attributes.profile.firstName + ' ' + user.attributes.profile.lastName}`
    );
    console.log(`  Email: ${email}`);
    console.log(`  Current userType: ${currentUserType || '(none)'}`);

    if (currentUserType === 'educational-admin') {
      console.log(`\nThis user is already an educational-admin.`);
      console.log(`Updating institution info...`);
    }

    // Update user's publicData
    console.log(`\nPromoting user to educational-admin...`);
    console.log(`  Institution: ${institution}`);
    console.log(`  Domain: ${emailDomain}`);
    console.log(`  Deposit Paid: ${options.depositPaid ? 'Yes' : 'No'}`);
    console.log(`  AI Coaching Approved: ${options.aiCoachingApproved ? 'Yes' : 'No'}`);

    const newPublicData = {
      ...currentPublicData,
      userType: 'educational-admin',
      institutionName: institution,
      institutionDomain: emailDomain,
      emailDomain: emailDomain,
      // Institution subscription status
      depositPaid: options.depositPaid,
      depositPaidDate: options.depositPaid ? new Date().toISOString() : currentPublicData.depositPaidDate || null,
      aiCoachingApproved: options.aiCoachingApproved,
      aiCoachingApprovedDate: options.aiCoachingApproved ? new Date().toISOString() : currentPublicData.aiCoachingApprovedDate || null,
    };

    await integrationSdk.users.updateProfile({
      id: userId,
      publicData: newPublicData,
    });

    console.log(`\n✅ Success! User "${email}" has been promoted to educational-admin.`);
    console.log(`\nConfiguration:`);
    console.log(`  Institution Name: ${institution}`);
    console.log(`  Institution Domain: ${emailDomain}`);
    console.log(`  Deposit Paid: ${options.depositPaid ? '✅ Yes' : '❌ No'}`);
    console.log(`  AI Coaching Approved: ${options.aiCoachingApproved ? '✅ Yes' : '❌ No'}`);
    console.log(`\nThis admin will be able to see students with @${emailDomain} email addresses.`);

    if (!options.depositPaid) {
      console.log(`\n⚠️  Note: Deposit has not been marked as paid.`);
      console.log(`   Students from this institution will NOT have access to AI coaching features.`);
      console.log(`   To update, run: node server/scripts/promote-to-educational-admin.js ${email} "${institution}" --deposit-paid --ai-coaching`);
    }

    console.log(`\nYou can now:`);
    console.log(`  1. Log in as this user at your marketplace`);
    console.log(`  2. Navigate to /education/dashboard to access the Education Dashboard`);
    console.log(`  3. View students, send messages, and download reports`);
  } catch (error) {
    console.error('\nError promoting user:', error.message);
    if (error.data) {
      console.error('Details:', JSON.stringify(error.data, null, 2));
    }
    process.exit(1);
  }
}

promoteToEducationalAdmin(userEmail, institutionName, { depositPaid, aiCoachingApproved });
