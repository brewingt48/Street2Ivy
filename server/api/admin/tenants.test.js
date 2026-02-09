/**
 * Admin Tenants API — Endpoint Tests
 * Stage 5 Production Hardening
 *
 * Tests all CRUD handlers plus public resolve and by-domain lookup.
 * The tenants module loads an in-memory Map from disk at require() time,
 * so the jsonStore mock must be registered BEFORE the module is imported.
 */

const path = require('path');

// ---------------------------------------------------------------------------
// Mocks — registered before require('./tenants') so loadTenants() sees them
// ---------------------------------------------------------------------------

jest.mock('../../api-util/security', () => ({
  verifySystemAdmin: jest.fn(),
  verifyEducationalAdmin: jest.fn(),
  sanitizeString: (str, opts) => {
    if (!str) return str;
    return opts?.maxLength ? str.slice(0, opts.maxLength) : str;
  },
  isValidEmail: email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isValidDomain: domain =>
    /^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain),
}));

jest.mock('../../api-util/jsonStore', () => ({
  readJSON: jest.fn().mockReturnValue([]),
  atomicWriteJSON: jest.fn().mockResolvedValue(true),
}));

const {
  createMockReq,
  createMockRes,
  createMockSystemAdmin,
  createMockEducationalAdmin,
} = require('../../test-utils/mockHelpers');

const { verifySystemAdmin, verifyEducationalAdmin } = require('../../api-util/security');
const { atomicWriteJSON } = require('../../api-util/jsonStore');
const tenants = require('./tenants');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convenience: build a minimal valid tenant body */
function validTenantBody(overrides = {}) {
  return {
    id: 'test-university',
    name: 'Test University',
    domain: 'test.street2ivy.com',
    status: 'active',
    sharetribeClientId: 'cli_abc123',
    sharetribeClientSecret: 'secret-value-longtext',
    integrationApiKey: 'key-abcdef123456',
    branding: {
      marketplaceColor: '#A51C30',
    },
    features: { aiCoaching: true },
    institutionDomain: 'test.edu',
    contactEmail: 'admin@test.edu',
    ...overrides,
  };
}

/**
 * Seed a tenant into the in-memory store by calling create().
 * Returns the response object so callers can inspect it if needed.
 */
async function seedTenant(body) {
  verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
  const req = createMockReq({ body });
  const res = createMockRes();
  await tenants.create(req, res);
  return res;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Admin Tenants API', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the in-memory Map between tests by performing a list,
    // deleting every entry.  Because the module keeps private state we
    // drive the reset through the public API.
    // First — make sure we are admin so list/delete work.
    verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
  });

  afterEach(async () => {
    // Clean up any tenants created during the test so state does not leak.
    verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
    const listReq = createMockReq();
    const listRes = createMockRes();
    await tenants.list(listReq, listRes);

    if (listRes._json && listRes._json.data) {
      for (const t of listRes._json.data) {
        const delReq = createMockReq({ params: { tenantId: t.id } });
        const delRes = createMockRes();
        await tenants.delete(delReq, delRes);
      }
    }
  });

  // =========================================================================
  // TEST 1 — Auth rejection: non-admin gets 403
  // =========================================================================
  describe('auth rejection', () => {
    it('should reject non-admin users with 403 on list', async () => {
      verifySystemAdmin.mockResolvedValue(null);

      const req = createMockReq();
      const res = createMockRes();

      await tenants.list(req, res);

      expect(res.statusCode).toBe(403);
      expect(res._json.error).toBeDefined();
      expect(res._json.error).toMatch(/access denied/i);
    });
  });

  // =========================================================================
  // TEST 2 — Create tenant happy path
  // =========================================================================
  describe('createTenant', () => {
    it('should create a tenant and return 201 with masked secrets', async () => {
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      const body = validTenantBody();
      const req = createMockReq({ body });
      const res = createMockRes();

      await tenants.create(req, res);

      expect(res.statusCode).toBe(201);
      expect(res._json.data).toBeDefined();

      const data = res._json.data;
      expect(data.id).toBe('test-university');
      expect(data.name).toBe('Test University');
      expect(data.domain).toBe('test.street2ivy.com');
      expect(data.status).toBe('active');

      // Secrets should be masked with '****' + last 4 chars
      expect(data.sharetribeClientSecret).toMatch(/^\*{4}.{4}$/);
      expect(data.sharetribeClientSecret).toBe('****text');
      expect(data.integrationApiKey).toMatch(/^\*{4}.{4}$/);
      expect(data.integrationApiKey).toBe('****3456');

      // Non-secret fields should be intact
      expect(data.sharetribeClientId).toBe('cli_abc123');

      // Branding & features
      expect(data.branding.marketplaceColor).toBe('#A51C30');
      expect(data.features.aiCoaching).toBe(true);

      // Timestamps
      expect(data.createdAt).toBeDefined();
      expect(data.updatedAt).toBeDefined();

      // saveTenants should have been called
      expect(atomicWriteJSON).toHaveBeenCalled();
    });

    // =========================================================================
    // TEST 3 — Create tenant validation: missing required fields
    // =========================================================================
    it('should return 400 when required fields are missing', async () => {
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      const req = createMockReq({
        body: { name: 'No ID University' },
      });
      const res = createMockRes();

      await tenants.create(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._json.error).toMatch(/missing required fields/i);
    });

    // =========================================================================
    // TEST 4 — Create tenant duplicate ID returns 409
    // =========================================================================
    it('should return 409 for duplicate tenant ID', async () => {
      // Seed the first tenant
      await seedTenant(validTenantBody());

      // Attempt to create a second tenant with the same ID but different domain
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      const req = createMockReq({
        body: validTenantBody({ domain: 'other.street2ivy.com', institutionDomain: 'other.edu' }),
      });
      const res = createMockRes();

      await tenants.create(req, res);

      expect(res.statusCode).toBe(409);
      expect(res._json.error).toMatch(/already exists/i);
    });

    // =========================================================================
    // TEST 5 — Create tenant duplicate domain returns 409
    // =========================================================================
    it('should return 409 for duplicate domain', async () => {
      // Seed the first tenant
      await seedTenant(validTenantBody());

      // Attempt a new tenant with a different ID but the same domain
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      const req = createMockReq({
        body: validTenantBody({
          id: 'another-university',
          institutionDomain: 'another.edu',
          // domain intentionally the same
        }),
      });
      const res = createMockRes();

      await tenants.create(req, res);

      expect(res.statusCode).toBe(409);
      expect(res._json.error).toMatch(/domain.*already assigned/i);
    });
  });

  // =========================================================================
  // TEST 6 — List tenants with status filter
  // =========================================================================
  describe('listTenants', () => {
    it('should filter tenants by status query param', async () => {
      // Seed two tenants with different statuses
      await seedTenant(validTenantBody({ id: 'active-uni', domain: 'active.s2i.com', status: 'active', institutionDomain: 'active.edu' }));
      await seedTenant(validTenantBody({ id: 'trial-uni', domain: 'trial.s2i.com', status: 'trial', institutionDomain: 'trial.edu' }));

      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());

      // List with status=active
      const reqActive = createMockReq({ query: { status: 'active' } });
      const resActive = createMockRes();
      await tenants.list(reqActive, resActive);

      expect(resActive.statusCode).toBe(200);
      expect(resActive._json.data.length).toBe(1);
      expect(resActive._json.data[0].id).toBe('active-uni');
      expect(resActive._json.total).toBe(1);

      // List with status=trial
      const reqTrial = createMockReq({ query: { status: 'trial' } });
      const resTrial = createMockRes();
      await tenants.list(reqTrial, resTrial);

      expect(resTrial.statusCode).toBe(200);
      expect(resTrial._json.data.length).toBe(1);
      expect(resTrial._json.data[0].id).toBe('trial-uni');

      // List without filter returns both
      const reqAll = createMockReq();
      const resAll = createMockRes();
      await tenants.list(reqAll, resAll);

      expect(resAll._json.data.length).toBe(2);
      expect(resAll._json.total).toBe(2);
    });
  });

  // =========================================================================
  // TEST 7 — Get single tenant returns masked secrets
  // =========================================================================
  describe('getTenant', () => {
    it('should return a single tenant with masked secrets', async () => {
      await seedTenant(validTenantBody());

      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      const req = createMockReq({ params: { tenantId: 'test-university' } });
      const res = createMockRes();

      await tenants.get(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toBeDefined();
      expect(res._json.data.id).toBe('test-university');

      // Secrets masked
      expect(res._json.data.sharetribeClientSecret).toBe('****text');
      expect(res._json.data.integrationApiKey).toBe('****3456');

      // Non-secret fields present
      expect(res._json.data.name).toBe('Test University');
      expect(res._json.data.contactEmail).toBe('admin@test.edu');
    });
  });

  // =========================================================================
  // TEST 8 — Update tenant happy path
  // =========================================================================
  describe('updateTenant', () => {
    it('should update an existing tenant and return 200', async () => {
      await seedTenant(validTenantBody());

      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      const req = createMockReq({
        params: { tenantId: 'test-university' },
        body: {
          name: 'Updated University Name',
          status: 'inactive',
          features: { nda: true },
        },
      });
      const res = createMockRes();

      await tenants.update(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data.name).toBe('Updated University Name');
      expect(res._json.data.status).toBe('inactive');
      expect(res._json.data.features.nda).toBe(true);
      // Original feature should be merged
      expect(res._json.data.features.aiCoaching).toBe(true);
      // updatedAt should be refreshed
      expect(res._json.data.updatedAt).toBeDefined();
      expect(atomicWriteJSON).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // TEST 9 — Delete tenant returns { data: null, message }
  // =========================================================================
  describe('deleteTenant', () => {
    it('should delete a tenant and return { data: null, message }', async () => {
      await seedTenant(validTenantBody());

      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      const req = createMockReq({ params: { tenantId: 'test-university' } });
      const res = createMockRes();

      await tenants.delete(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toBeNull();
      expect(res._json.message).toBeDefined();
      expect(res._json.message).toMatch(/test-university/);

      // Confirm it is actually gone
      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      const getReq = createMockReq({ params: { tenantId: 'test-university' } });
      const getRes = createMockRes();
      await tenants.get(getReq, getRes);

      expect(getRes.statusCode).toBe(404);
    });
  });

  // =========================================================================
  // TEST 10 — Branding validation: invalid hex color returns 400
  // =========================================================================
  describe('updateBranding', () => {
    it('should return 400 for invalid hex color', async () => {
      await seedTenant(validTenantBody());

      verifySystemAdmin.mockResolvedValue(createMockSystemAdmin());
      const req = createMockReq({
        params: { tenantId: 'test-university' },
        body: {
          marketplaceColor: 'not-a-hex-color',
        },
      });
      const res = createMockRes();

      await tenants.updateBranding(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._json.error).toMatch(/invalid branding/i);
      expect(res._json.details).toBeDefined();
      expect(res._json.details.length).toBeGreaterThan(0);
      expect(res._json.details[0]).toMatch(/marketplaceColor/);
    });
  });

  // =========================================================================
  // TEST 11 — Resolve tenant: returns only public fields for active tenant
  // =========================================================================
  describe('resolveTenant', () => {
    it('should return only public fields for an active tenant', async () => {
      await seedTenant(validTenantBody());

      const req = createMockReq({ query: { domain: 'test.street2ivy.com' } });
      const res = createMockRes();

      await tenants.resolve(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toBeDefined();

      const data = res._json.data;

      // Public fields present
      expect(data.id).toBe('test-university');
      expect(data.name).toBe('Test University');
      expect(data.domain).toBe('test.street2ivy.com');
      expect(data.status).toBe('active');
      expect(data.branding).toBeDefined();
      expect(data.features).toBeDefined();

      // Admin-only / secret fields must NOT be present
      expect(data.sharetribeClientId).toBeUndefined();
      expect(data.sharetribeClientSecret).toBeUndefined();
      expect(data.integrationApiKey).toBeUndefined();
      expect(data.contactEmail).toBeUndefined();
      expect(data.institutionDomain).toBeUndefined();
      expect(data.createdAt).toBeUndefined();
      expect(data.updatedAt).toBeUndefined();
    });

    // =========================================================================
    // TEST 12 — Resolve tenant: returns { data: null } for unknown domain
    // =========================================================================
    it('should return { data: null } for an unknown domain', async () => {
      const req = createMockReq({ query: { domain: 'nonexistent.street2ivy.com' } });
      const res = createMockRes();

      await tenants.resolve(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._json.data).toBeNull();
    });
  });
});
