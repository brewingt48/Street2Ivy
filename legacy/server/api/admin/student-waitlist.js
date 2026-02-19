/**
 * Student Waitlist API
 *
 * Manages students who attempted to register from non-partner institutions.
 * This data is valuable for institutional outreach and sales.
 *
 * Persistence: SQLite via server/api-util/db.js
 */

const db = require('../../api-util/db');
const { verifySystemAdmin, auditLog, getClientIP, sanitizeString, isValidEmail } = require('../../api-util/security');

/**
 * Extract institution name from email domain (best effort)
 */
function guessInstitutionName(domain) {
  if (!domain) return 'Unknown';

  let name = domain
    .replace(/\.(edu|ac\.uk|ac\.jp|edu\.au|edu\.cn)$/i, '')
    .replace(/\.(com|org|net)$/i, '');

  name = name
    .split(/[-_.]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return name || 'Unknown Institution';
}

/**
 * POST /api/student-waitlist
 * Add a student to the waitlist (public endpoint, no auth required)
 */
async function addToWaitlist(req, res) {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const emailParts = email.toLowerCase().split('@');
    if (emailParts.length !== 2) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    const domain = emailParts[1];

    const sanitizedFirstName = sanitizeString(firstName, { maxLength: 100 }) || '';
    const sanitizedLastName = sanitizeString(lastName, { maxLength: 100 }) || '';

    // Check if email already exists
    const existing = db.waitlist.getByEmail(email.toLowerCase());

    if (existing) {
      // Update existing entry
      db.waitlist.update(existing.id, {
        attempts: (existing.attempts || 1) + 1,
        lastAttemptAt: new Date().toISOString(),
        firstName: sanitizedFirstName || existing.firstName,
        lastName: sanitizedLastName || existing.lastName,
      });
    } else {
      // Add new entry
      const entry = {
        id: `waitlist-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        email: email.toLowerCase(),
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        domain: domain,
        institutionName: guessInstitutionName(domain),
        createdAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        attempts: 1,
        contacted: false,
        notes: '',
      };
      db.waitlist.create(entry);
    }

    res.status(201).json({
      success: true,
      message: 'You have been added to our waitlist. We will notify you when your school joins Campus2Career!',
    });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    res.status(500).json({ error: 'Failed to add to waitlist' });
  }
}

/**
 * GET /api/admin/student-waitlist
 * List all waitlist entries (admin only)
 */
async function listWaitlist(req, res) {
  try {
    const currentUser = await verifySystemAdmin(req, res);
    if (!currentUser) {
      auditLog('UNAUTHORIZED_WAITLIST_ACCESS', {
        ip: getClientIP(req),
        path: req.path,
        method: 'GET',
      });
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
        code: 'FORBIDDEN',
      });
    }

    const { page = '1', perPage = '50', domain, search, contacted } = req.query;

    let entries = db.waitlist.getAll();

    // Apply filters
    if (domain) {
      entries = entries.filter(e => e.domain.toLowerCase().includes(domain.toLowerCase()));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      entries = entries.filter(e =>
        e.email.toLowerCase().includes(searchLower) ||
        e.firstName?.toLowerCase().includes(searchLower) ||
        e.lastName?.toLowerCase().includes(searchLower) ||
        e.institutionName?.toLowerCase().includes(searchLower)
      );
    }
    if (contacted === 'true') {
      entries = entries.filter(e => e.contacted);
    } else if (contacted === 'false') {
      entries = entries.filter(e => !e.contacted);
    }

    // Sort by date (newest first) - already sorted by DB, but ensure
    entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const pageNum = parseInt(page, 10);
    const perPageNum = parseInt(perPage, 10);
    const startIndex = (pageNum - 1) * perPageNum;
    const paginatedEntries = entries.slice(startIndex, startIndex + perPageNum);

    // Aggregate stats by domain (use full list before filtering)
    const allEntries = db.waitlist.getAll();
    const domainStats = {};
    allEntries.forEach(e => {
      if (!domainStats[e.domain]) {
        domainStats[e.domain] = {
          domain: e.domain,
          institutionName: e.institutionName,
          count: 0,
          totalAttempts: 0,
        };
      }
      domainStats[e.domain].count++;
      domainStats[e.domain].totalAttempts += e.attempts || 1;
    });

    const topDomains = Object.values(domainStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.status(200).json({
      entries: paginatedEntries,
      pagination: {
        totalItems: entries.length,
        totalPages: Math.ceil(entries.length / perPageNum),
        page: pageNum,
        perPage: perPageNum,
      },
      stats: {
        totalEntries: allEntries.length,
        uniqueDomains: Object.keys(domainStats).length,
        topDomains,
      },
    });
  } catch (error) {
    console.error('Error listing waitlist:', error);
    res.status(500).json({ error: 'Failed to load waitlist' });
  }
}

/**
 * PUT /api/admin/student-waitlist/:entryId
 * Update a waitlist entry (mark as contacted, add notes, etc.)
 */
async function updateWaitlistEntry(req, res) {
  try {
    const currentUser = await verifySystemAdmin(req, res);
    if (!currentUser) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
        code: 'FORBIDDEN',
      });
    }

    const { entryId } = req.params;
    const { contacted, notes, institutionName } = req.body;

    const entry = db.waitlist.getById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    const updates = {
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id?.uuid,
    };
    if (contacted !== undefined) updates.contacted = !!contacted;
    if (notes !== undefined) updates.notes = sanitizeString(notes, { maxLength: 1000 }) || '';
    if (institutionName !== undefined) updates.institutionName = sanitizeString(institutionName, { maxLength: 200 }) || entry.institutionName;

    const updated = db.waitlist.update(entryId, updates);

    auditLog('WAITLIST_ENTRY_UPDATED', {
      entryId,
      userId: currentUser.id?.uuid,
      ip: getClientIP(req),
    });

    res.status(200).json({
      data: updated,
      message: 'Waitlist entry updated successfully',
    });
  } catch (error) {
    console.error('Error updating waitlist entry:', error);
    res.status(500).json({ error: 'Failed to update waitlist entry' });
  }
}

/**
 * DELETE /api/admin/student-waitlist/:entryId
 * Delete a waitlist entry
 */
async function deleteWaitlistEntry(req, res) {
  try {
    const currentUser = await verifySystemAdmin(req, res);
    if (!currentUser) {
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
        code: 'FORBIDDEN',
      });
    }

    const { entryId } = req.params;

    if (!db.waitlist.getById(entryId)) {
      return res.status(404).json({ error: 'Waitlist entry not found' });
    }

    db.waitlist.delete(entryId);

    auditLog('WAITLIST_ENTRY_DELETED', {
      entryId,
      userId: currentUser.id?.uuid,
      ip: getClientIP(req),
    });

    res.status(200).json({
      message: 'Waitlist entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting waitlist entry:', error);
    res.status(500).json({ error: 'Failed to delete waitlist entry' });
  }
}

module.exports = {
  addToWaitlist,
  listWaitlist,
  updateWaitlistEntry,
  deleteWaitlistEntry,
};
