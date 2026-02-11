/**
 * Student AI Coaching Access Management API
 *
 * Allows system admins to manage individual student access to AI coaching.
 * Students can be individually blocked from AI coaching even if their institution has it enabled.
 */

const fs = require('fs');
const path = require('path');
const { getIntegrationSdkForTenant } = require('../../api-util/integrationSdk');
const { handleError, getSdk } = require('../../api-util/sdk');
const { verifySystemAdmin: verifySystemAdminAuth } = require('../../api-util/security');

// Data file for blocked students
const BLOCKED_STUDENTS_FILE = path.join(__dirname, '../../data/blocked-coaching-students.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load blocked students from file
 */
function loadBlockedStudents() {
  try {
    if (fs.existsSync(BLOCKED_STUDENTS_FILE)) {
      const data = fs.readFileSync(BLOCKED_STUDENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading blocked students:', error);
  }
  return { blockedStudents: [] };
}

/**
 * Save blocked students to file
 */
function saveBlockedStudents(data) {
  try {
    fs.writeFileSync(BLOCKED_STUDENTS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving blocked students:', error);
    return false;
  }
}

/**
 * Helper to verify user is a system admin
 * Uses the Marketplace SDK (session-based) for authentication,
 * NOT the Integration SDK which doesn't support currentUser.
 */
async function verifySystemAdmin(req, res) {
  const currentUser = await verifySystemAdminAuth(req, res);
  if (!currentUser) {
    throw { status: 403, message: 'Access denied. System admin only.' };
  }
  return currentUser;
}

/**
 * GET /api/admin/student-coaching-access
 * List all blocked students with their details
 */
async function listBlockedStudents(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(req, res);

    const data = loadBlockedStudents();
    const blockedStudents = data.blockedStudents || [];

    // Enrich with student details from Sharetribe
    const enrichedStudents = [];
    for (const blocked of blockedStudents) {
      try {
        const userRes = await sdk.users.show({ id: blocked.userId });
        const user = userRes.data.data;
        const profile = user.attributes.profile;
        const publicData = profile.publicData || {};

        enrichedStudents.push({
          ...blocked,
          displayName: profile.displayName || `${profile.firstName} ${profile.lastName}`,
          email: user.attributes.email,
          institution: publicData.institutionName || publicData.emailDomain || 'Unknown',
          emailDomain: publicData.emailDomain,
        });
      } catch (userError) {
        // User might have been deleted, still include the blocked record
        enrichedStudents.push({
          ...blocked,
          displayName: 'Unknown User',
          email: 'N/A',
          institution: 'Unknown',
          deleted: true,
        });
      }
    }

    res.status(200).json({
      data: enrichedStudents,
      total: enrichedStudents.length,
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * POST /api/admin/student-coaching-access/block
 * Block a student from AI coaching
 *
 * Body: { userId, reason }
 */
async function blockStudent(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    const adminUser = await verifySystemAdmin(req, res);

    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Verify the user exists and is a student
    const userRes = await sdk.users.show({ id: userId });
    const user = userRes.data.data;
    const publicData = user.attributes.profile.publicData || {};

    if (publicData.userType !== 'student') {
      return res.status(400).json({ error: 'Can only block students from AI coaching' });
    }

    const data = loadBlockedStudents();
    const blockedStudents = data.blockedStudents || [];

    // Check if already blocked
    const existingIndex = blockedStudents.findIndex(s => s.userId === userId);
    if (existingIndex >= 0) {
      return res.status(400).json({ error: 'Student is already blocked from AI coaching' });
    }

    // Add to blocked list
    const blockEntry = {
      userId,
      reason: reason || 'No reason provided',
      blockedAt: new Date().toISOString(),
      blockedBy: adminUser.id.uuid,
    };

    blockedStudents.push(blockEntry);
    data.blockedStudents = blockedStudents;

    if (!saveBlockedStudents(data)) {
      return res.status(500).json({ error: 'Failed to save blocked student' });
    }

    res.status(200).json({
      data: blockEntry,
      message: 'Student blocked from AI coaching',
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * POST /api/admin/student-coaching-access/unblock
 * Unblock a student from AI coaching
 *
 * Body: { userId }
 */
async function unblockStudent(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(req, res);

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const data = loadBlockedStudents();
    const blockedStudents = data.blockedStudents || [];

    const existingIndex = blockedStudents.findIndex(s => s.userId === userId);
    if (existingIndex < 0) {
      return res.status(404).json({ error: 'Student is not currently blocked' });
    }

    blockedStudents.splice(existingIndex, 1);
    data.blockedStudents = blockedStudents;

    if (!saveBlockedStudents(data)) {
      return res.status(500).json({ error: 'Failed to save changes' });
    }

    res.status(200).json({
      message: 'Student unblocked from AI coaching',
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * GET /api/admin/student-coaching-access/check/:userId
 * Check if a specific student is blocked from AI coaching
 */
async function checkStudentAccess(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(req, res);

    const { userId } = req.params;

    const data = loadBlockedStudents();
    const blockedStudents = data.blockedStudents || [];

    const blocked = blockedStudents.find(s => s.userId === userId);

    res.status(200).json({
      isBlocked: !!blocked,
      blockInfo: blocked || null,
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * GET /api/admin/institutions-coaching-summary
 * Get a summary of all institutions with their AI coaching status and student counts
 */
async function getInstitutionsCoachingSummary(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(req, res);

    // Get institutions from the institutions module
    const adminInstitutions = require('./institutions');
    const institutionMemberships = adminInstitutions.getInstitutionMemberships();

    const institutions = Array.from(institutionMemberships.values());

    // Get blocked students data
    const blockedData = loadBlockedStudents();
    const blockedStudents = blockedData.blockedStudents || [];

    // For each institution, get student count and blocked count
    const institutionSummaries = [];

    for (const institution of institutions) {
      // Query students by email domain
      let studentCount = 0;
      let blockedCount = 0;

      try {
        // Note: In production, you'd want to cache this or use a more efficient query
        // For now, we'll count blocked students by their email domain
        const domainBlockedStudents = [];

        for (const blocked of blockedStudents) {
          try {
            const userRes = await sdk.users.show({ id: blocked.userId });
            const user = userRes.data.data;
            const emailDomain = user.attributes.profile.publicData?.emailDomain;
            if (emailDomain && emailDomain.toLowerCase() === institution.domain.toLowerCase()) {
              blockedCount++;
              domainBlockedStudents.push({
                ...blocked,
                displayName: user.attributes.profile.displayName ||
                  `${user.attributes.profile.firstName} ${user.attributes.profile.lastName}`,
                email: user.attributes.email,
              });
            }
          } catch (e) {
            // User might be deleted
          }
        }

        institutionSummaries.push({
          domain: institution.domain,
          name: institution.name,
          membershipStatus: institution.membershipStatus,
          aiCoachingEnabled: institution.aiCoachingEnabled,
          aiCoachingUrl: institution.aiCoachingUrl,
          blockedStudentsCount: blockedCount,
          blockedStudents: domainBlockedStudents,
          updatedAt: institution.updatedAt,
        });
      } catch (e) {
        console.error(`Error processing institution ${institution.domain}:`, e);
      }
    }

    // Sort by name
    institutionSummaries.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      data: institutionSummaries,
      total: institutionSummaries.length,
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * GET /api/admin/institution/:domain/students
 * Get all students from a specific institution with their coaching access status
 */
async function getInstitutionStudents(req, res) {
  try {
    const sdk = getIntegrationSdkForTenant(req.tenant);
    await verifySystemAdmin(req, res);

    const { domain } = req.params;
    const normalizedDomain = domain.toLowerCase();
    const { page = 1, perPage = 50 } = req.query;

    // Get blocked students data
    const blockedData = loadBlockedStudents();
    const blockedStudents = blockedData.blockedStudents || [];
    const blockedUserIds = new Set(blockedStudents.map(s => s.userId));

    // Query users with this email domain
    // Note: Sharetribe doesn't support querying by publicData fields directly,
    // so we need to fetch all students and filter
    // In production, you'd want a more efficient solution

    const usersRes = await sdk.users.query({
      pub_userType: 'student',
      perPage: 100, // Get more to filter
      page: 1,
    });

    const allStudents = usersRes.data.data;

    // Filter by email domain
    const domainStudents = allStudents.filter(user => {
      const emailDomain = user.attributes.profile.publicData?.emailDomain;
      return emailDomain && emailDomain.toLowerCase() === normalizedDomain;
    });

    // Add coaching access status
    const studentsWithStatus = domainStudents.map(user => {
      const profile = user.attributes.profile;
      const isBlocked = blockedUserIds.has(user.id.uuid);
      const blockInfo = blockedStudents.find(s => s.userId === user.id.uuid);

      return {
        id: user.id.uuid,
        displayName: profile.displayName || `${profile.firstName} ${profile.lastName}`,
        email: user.attributes.email,
        emailDomain: profile.publicData?.emailDomain,
        aiCoachingBlocked: isBlocked,
        blockReason: blockInfo?.reason || null,
        blockedAt: blockInfo?.blockedAt || null,
      };
    });

    // Paginate
    const startIndex = (parseInt(page) - 1) * parseInt(perPage);
    const paginatedStudents = studentsWithStatus.slice(startIndex, startIndex + parseInt(perPage));

    res.status(200).json({
      data: paginatedStudents,
      pagination: {
        page: parseInt(page),
        perPage: parseInt(perPage),
        totalItems: studentsWithStatus.length,
        totalPages: Math.ceil(studentsWithStatus.length / parseInt(perPage)),
      },
    });
  } catch (e) {
    handleError(res, e);
  }
}

/**
 * Check if a student has access to AI coaching (for use by other modules)
 * Returns true if the student has access, false if blocked
 */
function hasCoachingAccess(userId) {
  const data = loadBlockedStudents();
  const blockedStudents = data.blockedStudents || [];
  return !blockedStudents.some(s => s.userId === userId);
}

module.exports = {
  listBlocked: listBlockedStudents,
  block: blockStudent,
  unblock: unblockStudent,
  checkAccess: checkStudentAccess,
  getInstitutionsSummary: getInstitutionsCoachingSummary,
  getInstitutionStudents: getInstitutionStudents,
  hasCoachingAccess,
};
