/**
 * Tests for Education Students API
 *
 * Covers: listStudents, studentStats
 * Mocks: verifyEducationalAdmin (security), getIntegrationSdk (integrationSdk)
 */

const {
  createMockReq,
  createMockRes,
  createMockEducationalAdmin,
} = require('../test-utils/mockHelpers');

jest.mock('../api-util/security', () => ({
  verifyEducationalAdmin: jest.fn(),
}));

jest.mock('../api-util/integrationSdk', () => ({
  getIntegrationSdk: jest.fn(),
}));

const { verifyEducationalAdmin } = require('../api-util/security');
const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { list, stats } = require('./education-students');

// --------------- helpers --------------- //

/**
 * Build a fake Sharetribe user object as returned by integrationSdk.users.query
 */
function makeSdkStudent(id, { displayName = 'Student', major, graduationYear, emailDomain = 'harvard.edu' } = {}) {
  return {
    id: { uuid: id },
    type: 'user',
    attributes: {
      createdAt: new Date().toISOString(),
      profile: {
        displayName,
        abbreviatedName: displayName.charAt(0),
        publicData: {
          userType: 'student',
          emailDomain,
          university: 'Harvard',
          major: major || null,
          graduationYear: graduationYear || null,
        },
      },
    },
    relationships: {
      profileImage: { data: null },
    },
  };
}

/**
 * Return a stub integrationSdk whose users.query and transactions.query
 * resolve with the provided data.
 */
function buildMockIntegrationSdk({ usersQueryResponses = [], transactionsQueryFn } = {}) {
  let callIndex = 0;

  const mockSdk = {
    users: {
      query: jest.fn(() => {
        const response = usersQueryResponses[callIndex] || usersQueryResponses[usersQueryResponses.length - 1];
        callIndex++;
        return Promise.resolve(response);
      }),
    },
    transactions: {
      query: transactionsQueryFn || jest.fn(() => Promise.resolve({ data: { data: [] } })),
    },
  };

  return mockSdk;
}

// --------------- tests --------------- //

describe('education-students API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Test 1: Auth rejection ---- //
  describe('list - auth rejection', () => {
    it('returns 403 when the caller is not an educational admin', async () => {
      verifyEducationalAdmin.mockResolvedValue(null);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await list(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json).toEqual(
        expect.objectContaining({ error: expect.stringContaining('Access denied') })
      );
    });
  });

  // ---- Test 2: List returns students scoped by institutionDomain ---- //
  describe('list - scoped student list', () => {
    it('queries the Integration SDK with the admin institutionDomain and returns paginated data', async () => {
      const admin = createMockEducationalAdmin('mit.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const student1 = makeSdkStudent('s1', { displayName: 'Alice', emailDomain: 'mit.edu' });
      const student2 = makeSdkStudent('s2', { displayName: 'Bob', emailDomain: 'mit.edu' });

      const sdkResponse = {
        data: {
          data: [student1, student2],
          included: [],
          meta: { page: 1, perPage: 20, totalItems: 2, totalPages: 1 },
        },
      };

      const mockSdk = buildMockIntegrationSdk({ usersQueryResponses: [sdkResponse] });
      getIntegrationSdk.mockReturnValue(mockSdk);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await list(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toHaveLength(2);
      expect(res._json.data[0].displayName).toBe('Alice');
      expect(res._json.data[1].displayName).toBe('Bob');
      expect(res._json.pagination).toEqual({
        page: 1,
        perPage: 20,
        total: 2,
        totalPages: 1,
      });

      // Verify the SDK was called with the correct domain
      expect(mockSdk.users.query).toHaveBeenCalledWith(
        expect.objectContaining({
          pub_userType: 'student',
          pub_emailDomain: 'mit.edu',
        })
      );
    });
  });

  // ---- Test 3: Stats with zero students ---- //
  describe('stats - zero students returns safe values', () => {
    it('returns 0 for engagementRate and averageApplicationsPerStudent (no NaN)', async () => {
      const admin = createMockEducationalAdmin('empty.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const emptyResponse = {
        data: {
          data: [],
          meta: { page: 1, perPage: 100, totalItems: 0, totalPages: 0 },
        },
      };

      const mockSdk = buildMockIntegrationSdk({ usersQueryResponses: [emptyResponse] });
      getIntegrationSdk.mockReturnValue(mockSdk);

      const req = createMockReq({ query: {} });
      const res = createMockRes();

      await stats(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.totalStudents).toBe(0);
      expect(res._json.activeStudents).toBe(0);
      expect(res._json.engagementRate).toBe(0);
      expect(res._json.averageApplicationsPerStudent).toBe(0);
      expect(res._json.topMajors).toEqual([]);
      expect(res._json.graduationYearBreakdown).toEqual([]);

      // Ensure no NaN/Infinity leaked into the response
      const json = JSON.stringify(res._json);
      expect(json).not.toContain('NaN');
      expect(json).not.toContain('Infinity');
    });
  });

  // ---- Test 4: Pagination limits enforced ---- //
  describe('list - pagination perPage capped at 100', () => {
    it('clamps perPage to 100 even when a larger value is requested', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const sdkResponse = {
        data: {
          data: [],
          included: [],
          meta: { page: 1, perPage: 100, totalItems: 0, totalPages: 0 },
        },
      };

      const mockSdk = buildMockIntegrationSdk({ usersQueryResponses: [sdkResponse] });
      getIntegrationSdk.mockReturnValue(mockSdk);

      const req = createMockReq({ query: { perPage: '500', page: '1' } });
      const res = createMockRes();

      await list(req, res);

      expect(res.statusCode).toBe(200);

      // The SDK should have been called with perPage capped at 100
      expect(mockSdk.users.query).toHaveBeenCalledWith(
        expect.objectContaining({ perPage: 100 })
      );
    });
  });
});
