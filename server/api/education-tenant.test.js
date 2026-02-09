/**
 * Tests for the Education Tenant API
 *
 * Covers authentication, secret masking, branding validation,
 * suspended-tenant blocking, and tenant request lifecycle
 * (submit, approve, reject).
 */

const { verifyEducationalAdmin, verifySystemAdmin } = require('../api-util/security');
const { readJSON, atomicWriteJSON, _setMockData, _clearMockData } = require('../api-util/jsonStore');
const {
  createMockReq,
  createMockRes,
  createMockSystemAdmin,
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
  tenantRequestReceived: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', templateName: 'tenantRequestReceived' })),
  tenantApproved: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', templateName: 'tenantApproved' })),
  tenantRejected: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', templateName: 'tenantRejected' })),
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
const tenantApi = require('./education-tenant');

// Resolve the same file paths the module uses internally
const path = require('path');
const TENANTS_FILE = path.join(__dirname, '../data/tenants.json');
const TENANT_REQUESTS_FILE = path.join(__dirname, '../data/tenant-requests.json');

// ---- Helpers ---- //

/** Build a realistic tenant record for seeding mock data */
function seedTenant(overrides = {}) {
  return {
    id: overrides.id || 'harvard',
    name: overrides.name || 'Harvard University',
    domain: overrides.domain || 'harvard.street2ivy.com',
    institutionDomain: overrides.institutionDomain || 'harvard.edu',
    contactEmail: overrides.contactEmail || 'admin@harvard.edu',
    status: overrides.status || 'active',
    sharetribeClientSecret: overrides.sharetribeClientSecret || 'secret-abcdefgh-12345678',
    integrationApiKey: overrides.integrationApiKey || 'apikey-zzzzzzzz-99998888',
    branding: overrides.branding || {
      marketplaceColor: '#A51C30',
      colorPrimaryButton: '#A51C30',
      marketplaceName: 'Harvard Alumni Network',
      logoUrl: null,
      faviconUrl: null,
      brandImageUrl: null,
    },
    features: overrides.features || {
      aiCoaching: true,
      nda: false,
      assessments: false,
    },
    createdAt: overrides.createdAt || '2025-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt || '2025-01-15T00:00:00.000Z',
  };
}

/** Build a realistic tenant request for seeding mock data */
function seedTenantRequest(overrides = {}) {
  return {
    id: overrides.id || 'req_aabbccdd11223344',
    institutionDomain: overrides.institutionDomain || 'stanford.edu',
    institutionName: overrides.institutionName || 'Stanford University',
    adminName: overrides.adminName || 'Prof. Oak',
    adminEmail: overrides.adminEmail || 'oak@stanford.edu',
    reason: overrides.reason || 'Would like to connect our alumni network.',
    userId: overrides.userId || 'edu-admin-uuid-002',
    status: overrides.status || 'pending',
    submittedAt: overrides.submittedAt || '2025-02-01T00:00:00.000Z',
    reviewedAt: overrides.reviewedAt || null,
  };
}

// ---- Test Suite ---- //

describe('Education Tenant API', () => {
  beforeEach(() => {
    _clearMockData();
    jest.clearAllMocks();
  });

  // ============================================================
  // 1. Auth rejection on getMyTenant
  // ============================================================
  describe('getMyTenant - auth rejection', () => {
    it('returns 403 when caller is not an educational admin', async () => {
      verifyEducationalAdmin.mockResolvedValue(null);

      const req = createMockReq();
      const res = createMockRes();

      await tenantApi.getMyTenant(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toMatch(/access denied/i);
    });
  });

  // ============================================================
  // 2. Get own tenant returns masked data
  // ============================================================
  describe('getMyTenant - returns masked secrets', () => {
    it('masks sharetribeClientSecret and integrationApiKey with **** prefix', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const tenant = seedTenant({
        institutionDomain: 'harvard.edu',
        sharetribeClientSecret: 'secret-abcdefgh-12345678',
        integrationApiKey: 'apikey-zzzzzzzz-99998888',
      });
      _setMockData(TENANTS_FILE, [tenant]);

      const req = createMockReq();
      const res = createMockRes();

      await tenantApi.getMyTenant(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._json.data;
      expect(data).toBeTruthy();

      // Secret should show ****<last4>
      expect(data.sharetribeClientSecret).toBe('****5678');
      expect(data.integrationApiKey).toBe('****8888');

      // Should still contain non-secret fields
      expect(data.name).toBe('Harvard University');
      expect(data.institutionDomain).toBe('harvard.edu');
    });
  });

  // ============================================================
  // 3. Branding validation (invalid hex color returns 400)
  // ============================================================
  describe('updateBranding - invalid hex color', () => {
    it('returns 400 when marketplaceColor is not a valid hex color', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const tenant = seedTenant({ institutionDomain: 'harvard.edu', status: 'active' });
      _setMockData(TENANTS_FILE, [tenant]);

      const req = createMockReq({
        body: { marketplaceColor: 'not-a-color' },
      });
      const res = createMockRes();

      await tenantApi.updateBranding(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._json.error).toMatch(/invalid branding/i);
      expect(res._json.details).toEqual(
        expect.arrayContaining([expect.stringMatching(/marketplaceColor/)])
      );
    });
  });

  // ============================================================
  // 4. Suspended tenant blocked from updateBranding
  // ============================================================
  describe('updateBranding - suspended tenant', () => {
    it('returns 403 when the tenant is suspended', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const tenant = seedTenant({ institutionDomain: 'harvard.edu', status: 'suspended' });
      _setMockData(TENANTS_FILE, [tenant]);

      const req = createMockReq({
        body: { marketplaceColor: '#FF0000' },
      });
      const res = createMockRes();

      await tenantApi.updateBranding(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toMatch(/suspended/i);
      expect(atomicWriteJSON).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 5. Suspended tenant blocked from updateSettings
  // ============================================================
  describe('updateSettings - suspended tenant', () => {
    it('returns 403 when the tenant is suspended', async () => {
      const admin = createMockEducationalAdmin('harvard.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      const tenant = seedTenant({ institutionDomain: 'harvard.edu', status: 'suspended' });
      _setMockData(TENANTS_FILE, [tenant]);

      const req = createMockReq({
        body: { aiCoaching: true },
      });
      const res = createMockRes();

      await tenantApi.updateSettings(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toMatch(/suspended/i);
      expect(atomicWriteJSON).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 6. Tenant request happy path (201)
  // ============================================================
  describe('submitTenantRequest - happy path', () => {
    it('creates a new tenant request and returns 201', async () => {
      const admin = createMockEducationalAdmin('stanford.edu');
      verifyEducationalAdmin.mockResolvedValue(admin);

      // No existing tenants or requests for this domain
      _setMockData(TENANTS_FILE, []);
      _setMockData(TENANT_REQUESTS_FILE, []);

      const req = createMockReq({
        body: {
          institutionName: 'Stanford University',
          adminName: 'Prof. Oak',
          adminEmail: 'oak@stanford.edu',
          reason: 'Connect our alumni.',
        },
      });
      const res = createMockRes();

      await tenantApi.submitTenantRequest(req, res);

      expect(res.statusCode).toBe(201);
      const data = res._json.data;
      expect(data.id).toMatch(/^req_/);
      expect(data.institutionDomain).toBe('stanford.edu');
      expect(data.institutionName).toBe('Stanford University');
      expect(data.adminEmail).toBe('oak@stanford.edu');
      expect(data.status).toBe('pending');
      expect(data.submittedAt).toBeTruthy();
      expect(atomicWriteJSON).toHaveBeenCalledWith(TENANT_REQUESTS_FILE, expect.any(Array));
    });
  });

  // ============================================================
  // 7. Approve request creates new tenant (system admin only)
  // ============================================================
  describe('approveTenantRequest - system admin creates tenant', () => {
    it('approves the request, creates a new tenant, and returns both', async () => {
      const sysAdmin = createMockSystemAdmin();
      verifySystemAdmin.mockResolvedValue(sysAdmin);

      const request = seedTenantRequest({
        id: 'req_approve01',
        institutionDomain: 'yale.edu',
        institutionName: 'Yale University',
        adminEmail: 'admin@yale.edu',
        status: 'pending',
      });
      _setMockData(TENANT_REQUESTS_FILE, [request]);
      _setMockData(TENANTS_FILE, []);

      const req = createMockReq({ params: { id: 'req_approve01' } });
      const res = createMockRes();

      await tenantApi.approveTenantRequest(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._json.data;

      // Request should be marked approved
      expect(data.request.status).toBe('approved');
      expect(data.request.reviewedAt).toBeTruthy();

      // A new tenant should have been created
      expect(data.tenant).toBeTruthy();
      expect(data.tenant.institutionDomain).toBe('yale.edu');
      expect(data.tenant.name).toBe('Yale University');
      expect(data.tenant.status).toBe('onboarding');
      expect(data.tenant.id).toBe('yale-university');

      // Verify both stores were persisted
      expect(atomicWriteJSON).toHaveBeenCalledWith(TENANT_REQUESTS_FILE, expect.any(Array));
      expect(atomicWriteJSON).toHaveBeenCalledWith(TENANTS_FILE, expect.any(Array));
    });

    it('returns 403 when caller is not a system admin', async () => {
      verifySystemAdmin.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'req_approve01' } });
      const res = createMockRes();

      await tenantApi.approveTenantRequest(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toMatch(/system administrator/i);
    });
  });

  // ============================================================
  // 8. Reject request (system admin only)
  // ============================================================
  describe('rejectTenantRequest - system admin rejects', () => {
    it('rejects the request and records the reason', async () => {
      const sysAdmin = createMockSystemAdmin();
      verifySystemAdmin.mockResolvedValue(sysAdmin);

      const request = seedTenantRequest({
        id: 'req_reject01',
        status: 'pending',
      });
      _setMockData(TENANT_REQUESTS_FILE, [request]);

      const req = createMockReq({
        params: { id: 'req_reject01' },
        body: { reason: 'Insufficient documentation provided.' },
      });
      const res = createMockRes();

      await tenantApi.rejectTenantRequest(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._json.data;
      expect(data.status).toBe('rejected');
      expect(data.reviewedAt).toBeTruthy();
      expect(data.rejectionReason).toBe('Insufficient documentation provided.');
      expect(atomicWriteJSON).toHaveBeenCalledWith(TENANT_REQUESTS_FILE, expect.any(Array));
    });

    it('returns 403 when caller is not a system admin', async () => {
      verifySystemAdmin.mockResolvedValue(null);

      const req = createMockReq({
        params: { id: 'req_reject01' },
        body: { reason: 'No.' },
      });
      const res = createMockRes();

      await tenantApi.rejectTenantRequest(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toMatch(/system administrator/i);
    });
  });
});
