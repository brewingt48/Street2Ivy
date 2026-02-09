/**
 * Test utility factories for endpoint testing.
 * 
 * Provides mock Express req/res objects and user factories
 * for testing API endpoints in isolation.
 * 
 * Stage 5 Production Hardening.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Create a mock Express request object
 */
function createMockReq(overrides = {}) {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    get: function(header) {
      return this.headers[header.toLowerCase()];
    },
    ...overrides,
  };
}

/**
 * Create a mock Express response object with chainable status().json()
 */
function createMockRes() {
  const res = {
    statusCode: 200,
    _json: null,
    _headers: {},
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
    send(data) {
      res._body = data;
      return res;
    },
    setHeader(key, value) {
      res._headers[key] = value;
      return res;
    },
  };
  return res;
}

/**
 * Create a mock system admin user (as returned by verifySystemAdmin)
 */
function createMockSystemAdmin(overrides = {}) {
  return {
    id: { uuid: 'admin-uuid-001' },
    attributes: {
      profile: {
        displayName: 'System Admin',
        publicData: {
          userType: 'system-admin',
          ...overrides.publicData,
        },
      },
    },
    ...overrides,
  };
}

/**
 * Create a mock educational admin user (as returned by verifyEducationalAdmin)
 */
function createMockEducationalAdmin(domain = 'harvard.edu', overrides = {}) {
  return {
    id: { uuid: overrides.uuid || 'edu-admin-uuid-001' },
    attributes: {
      profile: {
        displayName: overrides.displayName || 'Edu Admin',
        publicData: {
          userType: 'edu-admin',
          institutionDomain: domain,
          ...overrides.publicData,
        },
      },
    },
  };
}

/**
 * Create a mock alumni user
 */
function createMockAlumniUser(domain = 'harvard.edu', overrides = {}) {
  return {
    id: { uuid: overrides.uuid || 'alumni-uuid-001' },
    attributes: {
      profile: {
        displayName: overrides.displayName || 'Alumni User',
        publicData: {
          userType: 'alumni',
          institutionDomain: domain,
          ...overrides.publicData,
        },
      },
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Set up an isolated temporary data directory for tests.
 * Returns the temp dir path and a cleanup function.
 */
function setupTestDataDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's2i-test-'));
  
  // Create empty JSON files
  fs.writeFileSync(path.join(tmpDir, 'tenants.json'), '[]', 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'alumni.json'), '[]', 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'tenant-requests.json'), '[]', 'utf8');
  
  return {
    dir: tmpDir,
    cleanup: () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    },
  };
}

module.exports = {
  createMockReq,
  createMockRes,
  createMockSystemAdmin,
  createMockEducationalAdmin,
  createMockAlumniUser,
  setupTestDataDir,
};
