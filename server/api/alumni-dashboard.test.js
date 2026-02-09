/**
 * Tests for Alumni Dashboard API
 *
 * Covers: the single default-export handler (GET /api/alumni/dashboard)
 * Mocks: getSdk + handleError (sdk), getIntegrationSdk (integrationSdk)
 */

const {
  createMockReq,
  createMockRes,
  createMockAlumniUser,
} = require('../test-utils/mockHelpers');

jest.mock('../api-util/sdk', () => ({
  getSdk: jest.fn(),
  handleError: jest.fn((res, error) => {
    res.status(error.status || 500).json({ error: error.message || 'Internal server error' });
  }),
}));

jest.mock('../api-util/integrationSdk', () => ({
  getIntegrationSdk: jest.fn(),
}));

const { getSdk, handleError } = require('../api-util/sdk');
const { getIntegrationSdk } = require('../api-util/integrationSdk');
const alumniDashboard = require('./alumni-dashboard');

// --------------- helpers --------------- //

/**
 * Build a currentUser response as returned by sdk.currentUser.show()
 */
function buildCurrentUserResponse(user) {
  return { data: { data: user } };
}

/**
 * Build a mock Sharetribe Marketplace SDK (the per-request SDK from getSdk)
 */
function buildMockMarketplaceSdk(currentUser) {
  return {
    currentUser: {
      show: jest.fn(() => Promise.resolve(buildCurrentUserResponse(currentUser))),
    },
  };
}

/**
 * Build a mock Integration SDK with stubbed listings.query and transactions.query
 */
function buildMockIntegrationSdk({ listings = [], transactions = [] } = {}) {
  return {
    listings: {
      query: jest.fn(() =>
        Promise.resolve({
          data: {
            data: listings,
            included: [],
          },
        })
      ),
    },
    transactions: {
      query: jest.fn(() =>
        Promise.resolve({
          data: {
            data: transactions,
          },
        })
      ),
    },
  };
}

function makeListing(id, { title = 'Project', state = 'published' } = {}) {
  return {
    id: { uuid: id },
    type: 'listing',
    attributes: {
      title,
      state,
      createdAt: new Date().toISOString(),
    },
  };
}

function makeTransaction(id, { lastTransition = 'transition/request-payment', listingId = 'listing-1' } = {}) {
  return {
    id: { uuid: id },
    type: 'transaction',
    attributes: {
      lastTransition,
      createdAt: new Date().toISOString(),
    },
    relationships: {
      listing: {
        data: { id: { uuid: listingId } },
      },
    },
  };
}

// --------------- tests --------------- //

describe('alumni-dashboard API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Test 1: Non-alumni user gets 403 ---- //
  describe('non-alumni user', () => {
    it('returns 403 when the authenticated user is not of type alumni', async () => {
      const nonAlumniUser = {
        id: { uuid: 'user-123' },
        attributes: {
          profile: {
            displayName: 'Regular Student',
            publicData: {
              userType: 'student',
              institutionDomain: 'harvard.edu',
            },
          },
        },
      };

      const mockSdk = buildMockMarketplaceSdk(nonAlumniUser);
      getSdk.mockReturnValue(mockSdk);

      const req = createMockReq();
      const res = createMockRes();

      await alumniDashboard(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json).toEqual(
        expect.objectContaining({ error: expect.stringContaining('Access denied') })
      );
    });
  });

  // ---- Test 2: Alumni user gets dashboard data with correct shape ---- //
  describe('alumni user - dashboard data shape', () => {
    it('returns 200 with stats, recentActivity, institutionDomain, and profile', async () => {
      const alumniUser = createMockAlumniUser('mit.edu', {
        displayName: 'Alumni Jane',
        publicData: {
          userType: 'alumni',
          institutionDomain: 'mit.edu',
          currentCompany: 'Acme Corp',
          currentRole: 'Engineer',
          graduationYear: '2020',
        },
      });

      const mockMarketplaceSdk = buildMockMarketplaceSdk(alumniUser);
      getSdk.mockReturnValue(mockMarketplaceSdk);

      const listing1 = makeListing('l1', { title: 'Project Alpha', state: 'published' });
      const listing2 = makeListing('l2', { title: 'Project Beta', state: 'closed' });

      const tx1 = makeTransaction('tx1', { lastTransition: 'transition/accept', listingId: 'l1' });
      const tx2 = makeTransaction('tx2', { lastTransition: 'transition/request-payment', listingId: 'l1' });
      const tx3 = makeTransaction('tx3', { lastTransition: 'transition/accept', listingId: 'l2' });

      const mockIntSdk = buildMockIntegrationSdk({
        listings: [listing1, listing2],
        transactions: [tx1, tx2, tx3],
      });
      getIntegrationSdk.mockReturnValue(mockIntSdk);

      const req = createMockReq();
      const res = createMockRes();

      await alumniDashboard(req, res);

      expect(res.statusCode).toBe(200);

      const body = res._json;

      // stats shape
      expect(body.stats).toBeDefined();
      expect(typeof body.stats.projectsCreated).toBe('number');
      expect(typeof body.stats.activeProjects).toBe('number');
      expect(typeof body.stats.totalApplications).toBe('number');

      expect(body.stats.projectsCreated).toBe(2);
      expect(body.stats.totalApplications).toBe(3);
      // 2 accepted transactions on 2 distinct listings => 2 active projects
      expect(body.stats.activeProjects).toBe(2);

      // recentActivity shape
      expect(Array.isArray(body.recentActivity)).toBe(true);
      expect(body.recentActivity.length).toBeLessThanOrEqual(5);
      body.recentActivity.forEach(item => {
        expect(item).toHaveProperty('type', 'listing');
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('state');
        expect(item).toHaveProperty('createdAt');
      });

      // profile shape
      expect(body.profile).toBeDefined();
      expect(body.profile.displayName).toBe('Alumni Jane');
      expect(body.profile.currentCompany).toBe('Acme Corp');
      expect(body.profile.currentRole).toBe('Engineer');
      expect(body.profile.graduationYear).toBe('2020');

      // institutionDomain
      expect(body.institutionDomain).toBe('mit.edu');
    });
  });

  // ---- Test 3: Response includes stats, recentActivity, profile ---- //
  describe('alumni user - minimal data still returns all required keys', () => {
    it('returns all top-level keys even when the alumni has zero listings and transactions', async () => {
      const alumniUser = createMockAlumniUser('stanford.edu', {
        displayName: 'New Alumni',
        publicData: {
          userType: 'alumni',
          institutionDomain: 'stanford.edu',
        },
      });

      const mockMarketplaceSdk = buildMockMarketplaceSdk(alumniUser);
      getSdk.mockReturnValue(mockMarketplaceSdk);

      const mockIntSdk = buildMockIntegrationSdk({ listings: [], transactions: [] });
      getIntegrationSdk.mockReturnValue(mockIntSdk);

      const req = createMockReq();
      const res = createMockRes();

      await alumniDashboard(req, res);

      expect(res.statusCode).toBe(200);

      const body = res._json;
      expect(body).toHaveProperty('stats');
      expect(body).toHaveProperty('recentActivity');
      expect(body).toHaveProperty('profile');
      expect(body).toHaveProperty('institutionDomain');

      expect(body.stats.projectsCreated).toBe(0);
      expect(body.stats.activeProjects).toBe(0);
      expect(body.stats.totalApplications).toBe(0);
      expect(body.recentActivity).toEqual([]);
    });
  });

  // ---- Test 4: SDK error is handled gracefully ---- //
  describe('SDK error handling', () => {
    it('delegates to handleError when the marketplace SDK throws', async () => {
      const sdkError = new Error('Token expired');
      sdkError.status = 401;
      sdkError.statusText = 'Unauthorized';
      sdkError.data = {};

      const failingSdk = {
        currentUser: {
          show: jest.fn(() => Promise.reject(sdkError)),
        },
      };
      getSdk.mockReturnValue(failingSdk);

      const req = createMockReq();
      const res = createMockRes();

      await alumniDashboard(req, res);

      // handleError should have been called with the response and the error
      expect(handleError).toHaveBeenCalledTimes(1);
      expect(handleError).toHaveBeenCalledWith(res, sdkError);

      // Our mock handleError sets status + json on the res
      expect(res.statusCode).toBe(401);
      expect(res._json).toEqual(
        expect.objectContaining({ error: 'Token expired' })
      );
    });
  });
});
