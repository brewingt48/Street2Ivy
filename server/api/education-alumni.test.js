/**
 * Tests for the Education Alumni API
 *
 * Covers authentication, cross-tenant isolation, invitation lifecycle,
 * and scoped CRUD operations.
 */

const { verifyEducationalAdmin } = require('../api-util/security');
const { readJSON, atomicWriteJSON, _setMockData, _clearMockData } = require('../api-util/jsonStore');
const {
  createMockReq,
  createMockRes,
  createMockEducationalAdmin,
} = require('../test-utils/mockHelpers');

// ---- Mocks ---- //

jest.mock('../api-util/security', () => ({
  verifySystemAdmin: jest.fn(),
  verifyEducationalAdmin: jest.fn(),
  sanitizeString: (str, opts) => {
    if (!str) return str;
    return opts?.maxLength ? str.slice(0, opts.maxLength) : str;
  },
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isValidDomain: (domain) => /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain),
}));

jest.mock('../api-util/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, mode: 'console' }),
}));

jest.mock('../api-util/emailTemplates', () => ({
  alumniInvitation: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', templateName: 'alumniInvitation' })),
  alumniWelcome: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', templateName: 'alumniWelcome' })),
  alumniReminder: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', templateName: 'alumniReminder' })),
}));

jest.mock('../api-util/jsonStore', () => {
  let mockData = {};
  return {
    readJSON: jest.fn((filepath, defaultValue = []) => {
      return mockData[filepath] || defaultValue;
    }),
    atomicWriteJSON: jest.fn(async (filepath, data) => {
      mockData[filepath] = data;
      return true;
    }),
    _setMockData: (filepath, data) => { mockData[filepath] = data; },
    _clearMockData: () => { mockData = {}; },
  };
});

// Require the module under test AFTER mocks are set up
const alumniApi = require('./education-alumni');

// Resolve the same ALUMNI_FILE path the module uses internally
const path = require('path');
const ALUMNI_FILE = path.join(__dirname, '../data/alumni.json');

// ---- Helpers ---- //

/** Build a realistic alumni record seeded into mock data */
function seedAlumni(overrides = {}) {
  return {
    id: overrides.id || 'alum_aabbccdd11223344',
    institutionDomain: overrides.institutionDomain || 'harvard.edu',
    email: overrides.email || 'john@example.com',
    firstName: overrides.firstName || 'John',
    lastName: overrides.lastName || 'Doe',
    graduationYear: overrides.graduationYear || '2020',
    program: overrides.program || 'Computer Science',
    status: overrides.status || 'invited',
    invitationCode: overrides.invitationCode || 'abcdef1234567890abcdef1234567890',
    invitedBy: overrides.invitedBy || 'edu-admin-uuid-001',
    invitedAt: overrides.invitedAt || '2025-01-15T12:00:00.000Z',
    acceptedAt: overrides.acceptedAt || null,
    userId: overrides.userId || null,
  };
}

// ---- Test Suite ---- //

describe('Education Alumni API', () => {
  beforeEach(() => {
    _clearMockData();
    jest.clearAllMocks();
  });

  // ============================================================
  // 1. Auth rejection (non-edu-admin gets 403)
  // ============================================================
  describe('invite - auth rejection', () => {
    it('returns 403 when caller is not an educational admin', async () => {
      verifyEducationalAdmin.mockResolvedValue(null);

      const req = createMockReq({
        body: { email: 'alum@test.com', firstName: 'Jane', lastName: 'Doe' },
      });
      const res = createMockRes();

      await alumniApi.invite(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toMatch(/access denied/i);
    });
  });

  // ============================================================
  // 2. Cross-tenant isolation (admin A cannot see admin B's alumni)
  // ============================================================
  describe('list - cross-tenant isolation', () => {
    it('returns only alumni belonging to the requesting admin institution', async () => {
      const harvardAdmin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(harvardAdmin);

      const harvardAlum = seedAlumni({ institutionDomain: 'harvard.edu', email: 'h@h.com' });
      const mitAlum = seedAlumni({ id: 'alum_other', institutionDomain: 'mit.edu', email: 'm@m.com' });
      _setMockData(ALUMNI_FILE, [harvardAlum, mitAlum]);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await alumniApi.list(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toHaveLength(1);
      expect(res._json.data[0].institutionDomain).toBe('harvard.edu');
    });
  });

  // ============================================================
  // 3. Invite happy path (returns 201 with alumni data)
  // ============================================================
  describe('invite - happy path', () => {
    it('creates a new alumni record and returns 201', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);
      _setMockData(ALUMNI_FILE, []);

      const req = createMockReq({
        body: {
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          graduationYear: '2022',
          program: 'Biology',
        },
      });
      const res = createMockRes();

      await alumniApi.invite(req, res);

      expect(res.statusCode).toBe(201);
      expect(res._json.data).toMatchObject({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        institutionDomain: 'harvard.edu',
        status: 'invited',
        graduationYear: '2022',
        program: 'Biology',
      });
      expect(res._json.data.id).toMatch(/^alum_/);
      expect(res._json.data.invitationCode).toBeTruthy();
      expect(res._json.data.invitationCode.length).toBe(32);
      expect(atomicWriteJSON).toHaveBeenCalledWith(ALUMNI_FILE, expect.any(Array));
    });
  });

  // ============================================================
  // 4. Invite duplicate email returns 409
  // ============================================================
  describe('invite - duplicate email', () => {
    it('returns 409 when the same email has already been invited for the same institution', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const existing = seedAlumni({ email: 'dupe@example.com', institutionDomain: 'harvard.edu' });
      _setMockData(ALUMNI_FILE, [existing]);

      const req = createMockReq({
        body: { email: 'dupe@example.com', firstName: 'Dupe', lastName: 'User' },
      });
      const res = createMockRes();

      await alumniApi.invite(req, res);

      expect(res.statusCode).toBe(409);
      expect(res._json.error).toMatch(/already been invited/i);
    });
  });

  // ============================================================
  // 5. Verify invitation - valid code
  // ============================================================
  describe('verifyInvitation - valid code', () => {
    it('returns { data: { valid: true, alumni: {...} } } for a valid invitation code', async () => {
      const alum = seedAlumni({ invitationCode: 'valid1234567890valid1234567890ab', status: 'invited' });
      _setMockData(ALUMNI_FILE, [alum]);

      const req = createMockReq({ params: { code: 'valid1234567890valid1234567890ab' } });
      const res = createMockRes();

      await alumniApi.verifyInvitation(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data.valid).toBe(true);
      expect(res._json.data.alumni).toMatchObject({
        firstName: alum.firstName,
        lastName: alum.lastName,
        email: alum.email,
        institutionDomain: alum.institutionDomain,
      });
      // Should NOT expose sensitive fields
      expect(res._json.data.alumni.invitationCode).toBeUndefined();
      expect(res._json.data.alumni.invitedBy).toBeUndefined();
    });
  });

  // ============================================================
  // 6. Verify invitation - invalid code returns 404
  // ============================================================
  describe('verifyInvitation - invalid code', () => {
    it('returns 404 for an invitation code that does not exist', async () => {
      _setMockData(ALUMNI_FILE, []);

      const req = createMockReq({ params: { code: 'nonexistent0000000000000000000000' } });
      const res = createMockRes();

      await alumniApi.verifyInvitation(req, res);

      expect(res.statusCode).toBe(404);
      expect(res._json.valid).toBe(false);
    });
  });

  // ============================================================
  // 7. Verify invitation - already accepted returns 410
  // ============================================================
  describe('verifyInvitation - already accepted', () => {
    it('returns 410 when the invitation has already been accepted', async () => {
      const alum = seedAlumni({
        invitationCode: 'accepted12345678accepted12345678',
        status: 'accepted',
        acceptedAt: '2025-02-01T00:00:00.000Z',
        userId: 'user-123',
      });
      _setMockData(ALUMNI_FILE, [alum]);

      const req = createMockReq({ params: { code: 'accepted12345678accepted12345678' } });
      const res = createMockRes();

      await alumniApi.verifyInvitation(req, res);

      expect(res.statusCode).toBe(410);
      expect(res._json.valid).toBe(false);
      expect(res._json.error).toMatch(/already been accepted/i);
    });
  });

  // ============================================================
  // 8. Accept invitation happy path
  // ============================================================
  describe('acceptInvitation - happy path', () => {
    it('accepts the invitation and updates the alumni record', async () => {
      const code = 'acceptme1234567890acceptme123456';
      const alum = seedAlumni({ invitationCode: code, status: 'invited' });
      _setMockData(ALUMNI_FILE, [alum]);

      const req = createMockReq({
        body: { invitationCode: code, userId: 'user-abc-123' },
      });
      const res = createMockRes();

      await alumniApi.acceptInvitation(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data.status).toBe('accepted');
      expect(res._json.data.userId).toBe('user-abc-123');
      expect(res._json.data.acceptedAt).toBeTruthy();
      expect(atomicWriteJSON).toHaveBeenCalledWith(ALUMNI_FILE, expect.any(Array));
    });
  });

  // ============================================================
  // 9. Delete alumni - scoped check (cross-tenant gets 403)
  // ============================================================
  describe('delete - cross-tenant scope check', () => {
    it('returns 403 when an admin tries to delete alumni from another institution', async () => {
      const mitAdmin = createMockEducationalAdmin('mit.edu', { uuid: 'mit-admin-uuid' });
      verifyEducationalAdmin.mockResolvedValue(mitAdmin);

      const harvardAlum = seedAlumni({ id: 'alum_harvard01', institutionDomain: 'harvard.edu' });
      _setMockData(ALUMNI_FILE, [harvardAlum]);

      const req = createMockReq({ params: { id: 'alum_harvard01' } });
      const res = createMockRes();

      await alumniApi.delete(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toMatch(/your own institution/i);
      // Ensure the record was NOT deleted
      expect(atomicWriteJSON).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 10. Resend invitation - regenerates code
  // ============================================================
  describe('resend - regenerates invitation code', () => {
    it('generates a new invitation code and updates the timestamp', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const originalCode = 'original1234567890original123456';
      const alum = seedAlumni({
        id: 'alum_resend01',
        institutionDomain: 'harvard.edu',
        invitationCode: originalCode,
        status: 'invited',
        invitedAt: '2025-01-01T00:00:00.000Z',
      });
      _setMockData(ALUMNI_FILE, [alum]);

      const req = createMockReq({ params: { id: 'alum_resend01' } });
      const res = createMockRes();

      await alumniApi.resend(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data.status).toBe('invited');
      // The invitation code must have been regenerated
      expect(res._json.data.invitationCode).not.toBe(originalCode);
      expect(res._json.data.invitationCode.length).toBe(32);
      // The invitedAt timestamp must have been updated
      expect(res._json.data.invitedAt).not.toBe('2025-01-01T00:00:00.000Z');
      expect(atomicWriteJSON).toHaveBeenCalledWith(ALUMNI_FILE, expect.any(Array));
    });
  });
});
