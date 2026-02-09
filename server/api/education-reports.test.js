/**
 * Tests for Education Reports API
 *
 * Covers: overview, export (CSV)
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
const educationReports = require('./education-reports');

// --------------- helpers --------------- //

function makeSdkStudent(id, { displayName = 'Student', emailDomain = 'harvard.edu', major, graduationYear, createdAt } = {}) {
  return {
    id: { uuid: id },
    type: 'user',
    attributes: {
      createdAt: createdAt || new Date().toISOString(),
      profile: {
        displayName,
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

function buildMockIntegrationSdk({ usersQueryResponses = [], transactionsQueryFn } = {}) {
  let callIndex = 0;

  return {
    users: {
      query: jest.fn(() => {
        const response = usersQueryResponses[callIndex] || usersQueryResponses[usersQueryResponses.length - 1];
        callIndex++;
        return Promise.resolve(response);
      }),
    },
    transactions: {
      query: transactionsQueryFn || jest.fn(() => Promise.resolve({ data: { data: [], included: [] } })),
    },
  };
}

// --------------- tests --------------- //

describe('education-reports API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Test 1: Auth rejection ---- //
  describe('overview - auth rejection', () => {
    it('returns 403 when the caller is not an educational admin', async () => {
      verifyEducationalAdmin.mockResolvedValue(null);

      const req = createMockReq({ query: { period: '30d' } });
      const res = createMockRes();

      await educationReports.overview(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json).toEqual(
        expect.objectContaining({ error: expect.stringContaining('Access denied') })
      );
    });
  });

  // ---- Test 2: Invalid period returns 400 ---- //
  describe('overview - invalid period', () => {
    it('returns 400 for an unrecognised period value', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const req = createMockReq({ query: { period: '2w' } });
      const res = createMockRes();

      await educationReports.overview(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._json.error).toMatch(/Invalid period/);
    });
  });

  // ---- Test 3: Overview with zero data returns safe values ---- //
  describe('overview - zero data returns safe values', () => {
    it('returns response without NaN or Infinity when there are no students', async () => {
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

      const req = createMockReq({ query: { period: '30d' } });
      const res = createMockRes();

      await educationReports.overview(req, res);

      expect(res.statusCode).toBe(200);

      const body = res._json;
      expect(body.period).toBe('30d');
      expect(body.totalStudentsAllTime).toBe(0);
      expect(body.current).toBeDefined();
      expect(body.previous).toBeDefined();
      expect(body.change).toBeDefined();

      // percentChange with 0 denominator should produce '0%' or '+100%', never NaN/Infinity
      const json = JSON.stringify(body);
      expect(json).not.toContain('NaN');
      expect(json).not.toContain('Infinity');

      // With 0 current and 0 previous, change.students should be '0%'
      expect(body.change.students).toBe('0%');
    });
  });

  // ---- Test 4: Export CSV format verification ---- //
  describe('export - CSV format', () => {
    it('returns a valid CSV with correct Content-Type for a students export', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const student = makeSdkStudent('s1', {
        displayName: 'Jane Doe',
        emailDomain: 'harvard.edu',
        major: 'Computer Science',
        graduationYear: '2025',
        createdAt: '2024-03-15T10:00:00Z',
      });

      const sdkResponse = {
        data: {
          data: [student],
          meta: { page: 1, perPage: 100, totalItems: 1, totalPages: 1 },
        },
      };

      const mockSdk = buildMockIntegrationSdk({ usersQueryResponses: [sdkResponse] });
      getIntegrationSdk.mockReturnValue(mockSdk);

      const req = createMockReq({ query: { type: 'students' } });
      const res = createMockRes();

      await educationReports.export(req, res);

      expect(res.statusCode).toBe(200);

      // Content-Type header should indicate CSV
      expect(res._headers['Content-Type']).toMatch(/text\/csv/);
      expect(res._headers['Content-Disposition']).toMatch(/attachment/);
      expect(res._headers['Content-Disposition']).toMatch(/\.csv/);

      // The body should be CSV text with a header row and a data row
      const csv = res._body;
      expect(typeof csv).toBe('string');

      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2); // header + at least 1 data row

      // Header row should contain expected column names
      const headerRow = lines[0];
      expect(headerRow).toContain('Name');
      expect(headerRow).toContain('Major');
      expect(headerRow).toContain('Graduation Year');

      // Data row should contain the student's info
      const dataRow = lines[1];
      expect(dataRow).toContain('Jane Doe');
      expect(dataRow).toContain('Computer Science');
      expect(dataRow).toContain('2025');
    });
  });

  // ---- Test 5: Export with invalid type returns 400 ---- //
  describe('export - invalid type', () => {
    it('returns 400 when the type query param is missing or invalid', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      // Missing type
      const req1 = createMockReq({ query: {} });
      const res1 = createMockRes();
      await educationReports.export(req1, res1);
      expect(res1.statusCode).toBe(400);
      expect(res1._json.error).toMatch(/type/i);

      // Invalid type value
      const req2 = createMockReq({ query: { type: 'grades' } });
      const res2 = createMockRes();
      await educationReports.export(req2, res2);
      expect(res2.statusCode).toBe(400);
      expect(res2._json.error).toMatch(/type/i);
    });
  });
});
