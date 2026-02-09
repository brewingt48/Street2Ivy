/**
 * Alumni Referral System API
 *
 * Allows alumni to generate referral links and track students who sign up via those links.
 * Referral data is stored in a JSON file scoped by alumniUserId.
 *
 * Endpoints:
 *   GET  /api/alumni/referral-link       — Generate/retrieve referral link for current alumni
 *   GET  /api/alumni/referrals           — List students referred by current alumni
 *   POST /api/alumni/referrals/track     — Track a referral (called during student signup)
 *   GET  /api/alumni/referrals/stats     — Get referral stats for current alumni
 */

const path = require('path');
const crypto = require('crypto');
const { getSdk, handleError } = require('../api-util/sdk');
const { readJSON, atomicWriteJSON } = require('../api-util/jsonStore');
const { sanitizeString } = require('../api-util/security');

const REFERRALS_FILE = path.join(__dirname, '../data/referrals.json');

// ================ HELPERS ================ //

function loadReferrals() {
  return readJSON(REFERRALS_FILE, []);
}

async function saveReferrals(referralsList) {
  return atomicWriteJSON(REFERRALS_FILE, referralsList);
}

function generateReferralCode() {
  return 'ref_' + crypto.randomBytes(6).toString('hex');
}

// ================ API HANDLERS ================ //

/**
 * GET /api/alumni/referral-link
 *
 * Returns or generates a unique referral code for the authenticated alumni.
 * The referral code is stored in a lookup map within the referrals file metadata.
 */
async function getReferralLink(req, res) {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};

    if (publicData.userType !== 'alumni') {
      return res.status(403).json({ error: 'Only alumni users can generate referral links.' });
    }

    const userId = currentUser.id.uuid;
    const referrals = loadReferrals();

    // Check if this alumni already has a referral code
    let alumniReferral = referrals.find(
      r => r.type === 'referral_code' && r.alumniUserId === userId
    );

    if (!alumniReferral) {
      // Generate a new referral code
      alumniReferral = {
        type: 'referral_code',
        alumniUserId: userId,
        alumniName: currentUser.attributes.profile.displayName || 'Alumni',
        institutionDomain: publicData.institutionDomain || null,
        referralCode: generateReferralCode(),
        createdAt: new Date().toISOString(),
      };
      referrals.push(alumniReferral);
      await saveReferrals(referrals);
    }

    res.status(200).json({
      data: {
        referralCode: alumniReferral.referralCode,
        alumniName: alumniReferral.alumniName,
        institutionDomain: alumniReferral.institutionDomain,
        createdAt: alumniReferral.createdAt,
      },
    });
  } catch (error) {
    console.error('Error getting referral link:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/alumni/referrals
 *
 * List all students referred by the current alumni.
 */
async function listReferrals(req, res) {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};

    if (publicData.userType !== 'alumni') {
      return res.status(403).json({ error: 'Only alumni users can view referrals.' });
    }

    const userId = currentUser.id.uuid;
    const referrals = loadReferrals();

    // Find this alumni's referral code
    const alumniReferral = referrals.find(
      r => r.type === 'referral_code' && r.alumniUserId === userId
    );

    if (!alumniReferral) {
      return res.status(200).json({ data: [], total: 0 });
    }

    // Find all students referred with this code
    const referred = referrals
      .filter(r => r.type === 'student_referral' && r.referralCode === alumniReferral.referralCode)
      .sort((a, b) => new Date(b.signedUpAt) - new Date(a.signedUpAt));

    res.status(200).json({
      data: referred.map(r => ({
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        signedUpAt: r.signedUpAt,
        hasApplied: r.hasApplied || false,
        projectsApplied: r.projectsApplied || 0,
      })),
      total: referred.length,
    });
  } catch (error) {
    console.error('Error listing referrals:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/alumni/referrals/track
 *
 * Track a student signup from a referral link.
 * Called during student signup when a referral code is present.
 *
 * Body: { referralCode, studentUserId, studentName, studentEmail }
 */
async function trackReferral(req, res) {
  try {
    const { referralCode, studentUserId, studentName, studentEmail } = req.body;

    if (!referralCode || !studentUserId) {
      return res.status(400).json({ error: 'referralCode and studentUserId are required.' });
    }

    const referrals = loadReferrals();

    // Verify the referral code exists
    const alumniReferral = referrals.find(
      r => r.type === 'referral_code' && r.referralCode === referralCode
    );

    if (!alumniReferral) {
      return res.status(404).json({ error: 'Invalid referral code.' });
    }

    // Check for duplicate tracking
    const existing = referrals.find(
      r => r.type === 'student_referral' && r.studentUserId === studentUserId
    );

    if (existing) {
      return res.status(200).json({ data: existing, message: 'Referral already tracked.' });
    }

    // Create tracking record
    const trackingRecord = {
      type: 'student_referral',
      referralCode: sanitizeString(referralCode, { maxLength: 50 }),
      alumniUserId: alumniReferral.alumniUserId,
      studentUserId: sanitizeString(studentUserId, { maxLength: 100 }),
      studentName: sanitizeString(studentName || 'Student', { maxLength: 200 }),
      studentEmail: sanitizeString(studentEmail || '', { maxLength: 254 }),
      signedUpAt: new Date().toISOString(),
      hasApplied: false,
      projectsApplied: 0,
    };

    referrals.push(trackingRecord);
    await saveReferrals(referrals);

    console.log(
      `Referral tracked: student ${studentUserId} referred by alumni ${alumniReferral.alumniUserId} (code: ${referralCode})`
    );

    res.status(201).json({ data: trackingRecord });
  } catch (error) {
    console.error('Error tracking referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/alumni/referrals/stats
 *
 * Get referral statistics for the current alumni.
 */
async function getReferralStats(req, res) {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};

    if (publicData.userType !== 'alumni') {
      return res.status(403).json({ error: 'Only alumni users can view referral stats.' });
    }

    const userId = currentUser.id.uuid;
    const referrals = loadReferrals();

    // Find this alumni's referral code
    const alumniReferral = referrals.find(
      r => r.type === 'referral_code' && r.alumniUserId === userId
    );

    if (!alumniReferral) {
      return res.status(200).json({
        data: {
          referralCode: null,
          totalReferred: 0,
          totalApplied: 0,
          conversionRate: 0,
        },
      });
    }

    const referred = referrals.filter(
      r => r.type === 'student_referral' && r.referralCode === alumniReferral.referralCode
    );

    const totalReferred = referred.length;
    const totalApplied = referred.filter(r => r.hasApplied).length;
    const conversionRate = totalReferred > 0 ? Math.round((totalApplied / totalReferred) * 100) : 0;

    res.status(200).json({
      data: {
        referralCode: alumniReferral.referralCode,
        totalReferred,
        totalApplied,
        conversionRate,
      },
    });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    handleError(res, error);
  }
}

module.exports = {
  getReferralLink,
  listReferrals,
  trackReferral,
  getReferralStats,
};
