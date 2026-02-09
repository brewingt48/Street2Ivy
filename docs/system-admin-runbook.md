# System Administrator Runbook

> Street2Ivy Platform — Operations, Configuration & Maintenance

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Configuration](#2-environment-configuration)
3. [Tenant Management](#3-tenant-management)
4. [User Administration](#4-user-administration)
5. [Email Service](#5-email-service)
6. [Data Files & Backup](#6-data-files--backup)
7. [Security](#7-security)
8. [Monitoring & Logs](#8-monitoring--logs)
9. [Content Management](#9-content-management)
10. [Incident Response](#10-incident-response)

---

## 1. Architecture Overview

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Redux, CSS Modules |
| Backend | Node.js + Express (API proxy & custom endpoints) |
| Marketplace Engine | Sharetribe Flex SDK |
| Database | Sharetribe hosted (users, listings, transactions) + local JSON files (tenants, alumni, email logs) |
| Email | Nodemailer + configurable SMTP provider |
| Auth | Sharetribe SDK auth + Facebook OAuth + Google OAuth |
| Hosting | Any Node.js host (Render, Railway, Heroku, AWS, etc.) |

### Request Flow

```
Browser → React SPA → /api/* → Express apiRouter → {
  Sharetribe SDK calls (users, listings, transactions)
  Local JSON operations (tenants, alumni, email logs)
  SMTP sends (via nodemailer)
}
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `server/` | Express backend: API routes, utilities, tests |
| `server/api/` | Custom API endpoint handlers |
| `server/api/admin/` | System admin-only endpoints |
| `server/api-util/` | Shared utilities (security, email, JSON store, etc.) |
| `server/data/` | Persistent JSON data files |
| `server/test-utils/` | Test helpers and factories |
| `src/` | React frontend application |
| `src/containers/` | Page-level React components |
| `src/components/` | Reusable UI components |
| `src/translations/` | i18n translation files |
| `docs/` | Documentation |

### Data Files

| File | Purpose | Backup |
|------|---------|--------|
| `server/data/tenants.json` | Institution tenant records | `.bak` auto-backup on write |
| `server/data/alumni.json` | Alumni invitation records | `.bak` auto-backup on write |
| `server/data/tenant-requests.json` | Pending tenant access requests | `.bak` auto-backup on write |
| `server/data/email-log.json` | Email send history (last 1000) | `.bak` auto-backup on write |
| `server/data/institutions.json` | Approved institution list | `.bak` auto-backup on write |

---

## 2. Environment Configuration

### Complete Environment Variable Reference

Copy `.env-template` to `.env` and configure:

#### Mandatory — Platform Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_SHARETRIBE_SDK_CLIENT_ID` | Yes | `change-me` | Sharetribe Flex client ID |
| `SHARETRIBE_SDK_CLIENT_SECRET` | For privileged transitions | — | Sharetribe client secret |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | For payments | — | Stripe publishable key |
| `REACT_APP_MAPBOX_ACCESS_TOKEN` | For maps | — | Mapbox access token |

#### Marketplace Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_MARKETPLACE_ROOT_URL` | Yes | `http://localhost:3000` | Public URL (no trailing slash) |
| `REACT_APP_MARKETPLACE_NAME` | No | `Street2Ivy` | Marketplace display name |
| `REACT_APP_ENV` | No | `production` | Environment: `development`, `test`, `production` |
| `REACT_APP_CSP` | No | `report` | Content Security Policy mode: `report` or `block` |

#### Social Login / SSO

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_FACEBOOK_APP_ID` | No | — | Facebook OAuth app ID |
| `FACEBOOK_APP_SECRET` | No | — | Facebook OAuth secret |
| `REACT_APP_GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth secret |

#### Email Service (Stage 6)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_ENABLED` | No | `true` | Set `false` to disable all email sending |
| `SMTP_HOST` | No | — | SMTP server hostname (e.g., `smtp.sendgrid.net`) |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP authentication username |
| `SMTP_PASS` | No | — | SMTP authentication password |
| `SMTP_SECURE` | No | `false` | Set `true` for TLS on port 465 |
| `EMAIL_FROM` | No | `SMTP_USER` or `noreply@street2ivy.com` | Sender email address |
| `EMAIL_FROM_NAME` | No | `Street2Ivy` | Sender display name |
| `EMAIL_RATE_LIMIT` | No | `50` | Maximum emails per minute |
| `EMAIL_MAX_RETRIES` | No | `2` | Retry count on transient failures |

#### SSL & Proxy

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_SHARETRIBE_USING_SSL` | No | — | Set `true` if using SSL |
| `SERVER_SHARETRIBE_TRUST_PROXY` | No | — | Set `true` behind a reverse proxy |

#### Analytics

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_GOOGLE_ANALYTICS_ID` | No | — | GA4 measurement ID (starts with `G-`) |
| `REACT_APP_PLAUSIBLE_DOMAINS` | No | — | Plausible analytics domains (comma-separated) |

#### Caching

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TTL` | No | `0` | Cache TTL for proxied SDK calls (seconds) |
| `TTL_ASSETS_BY_VERSION` | No | `86400` | Cache TTL for versioned assets (seconds) |

#### Development & Debug

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VERBOSE` | No | — | Set `true` for verbose server logging |
| `PREVENT_DATA_LOADING_IN_SSR` | No | — | Set `true` to skip SSR data loading |
| `BASIC_AUTH_USERNAME` | No | — | Basic auth username (for staging) |
| `BASIC_AUTH_PASSWORD` | No | — | Basic auth password (for staging) |
| `REACT_APP_SENTRY_DSN` | No | — | Sentry error tracking DSN |

### Email Service Configuration Modes

| SMTP Configured | EMAIL_ENABLED | Behavior |
|-----------------|---------------|----------|
| Yes | `true` (default) | Emails sent via SMTP |
| Yes | `false` | Emails suppressed, logged as "disabled" |
| No | `true` (default) | **Graceful degradation**: emails logged to console |
| No | `false` | Emails suppressed, logged as "disabled" |

---

## 3. Tenant Management

### What Is a Tenant?

A tenant represents an educational institution with a branded portal on Street2Ivy. Each tenant has:

- A unique ID (e.g., `harvard`)
- An institution domain (e.g., `harvard.edu`)
- Branding configuration (colors, logo, name)
- Feature toggles (AI coaching, NDA, assessments)
- A status lifecycle

### Tenant Statuses

| Status | Meaning |
|--------|---------|
| `pending-request` | Institution has requested access but hasn't been approved |
| `onboarding` | Approved — edu-admin is setting up branding |
| `trial` | Active with trial limitations |
| `active` | Fully operational |
| `inactive` | Deactivated (no student access) |
| `suspended` | Temporarily disabled by system admin |

### Managing Tenants (Admin Dashboard)

Navigate to `/admin/tenants` in the Admin Dashboard:

- **Create Tenant** — Fill in ID, name, domain, institution domain, contact info, and status.
- **Edit Tenant** — Update any field. Changes are immediate.
- **Delete Tenant** — Permanently removes the tenant. Students from that institution lose their branded experience.
- **Update Branding** — Modify portal name, color, and logo URL.

### Tenant Request Flow

1. Edu-admin visits `/education/dashboard` with no existing tenant.
2. They submit a **Request Portal Access** form.
3. Request appears in Admin Dashboard > Tenants tab > "Pending Requests" section.
4. System admin clicks **Approve** (auto-creates tenant in `onboarding` status) or **Reject** (with optional reason).
5. Edu-admin receives email notification of the decision.
6. If approved, edu-admin sees the onboarding wizard on their next visit.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/tenants` | List all tenants |
| GET | `/api/admin/tenants/:tenantId` | Get single tenant |
| POST | `/api/admin/tenants` | Create tenant |
| PUT | `/api/admin/tenants/:tenantId` | Update tenant |
| DELETE | `/api/admin/tenants/:tenantId` | Delete tenant |
| PUT | `/api/admin/tenants/:tenantId/branding` | Update branding only |
| GET | `/api/tenants/resolve` | Public tenant resolution (by domain header) |
| GET | `/api/tenants/by-institution/:domain` | Lookup tenant by institution domain |

---

## 4. User Administration

### User Types

| Type | Access Level | Description |
|------|-------------|-------------|
| `system-admin` | Full platform access | System administrators (you) |
| `educational-admin` | Institution-scoped | Career services administrators |
| `alumni` | Alumni dashboard | Verified alumni (invitation-only) |
| `student` | Student features | Registered students |
| `company` / `corporate` | Corporate dashboard | Corporate partners |

### User Management (Admin Dashboard)

Navigate to `/admin/users`:

- **Search** by name, email, or user type.
- **Filter** by user type and status (active, blocked, pending).
- **Block/Unblock** users — blocked users cannot log in.
- **Approve/Reject** pending users (for waitlisted students).
- **Delete** user accounts.
- **Create Admin** — Create new system administrator accounts (Admin Dashboard > Create Admin tab).

### Educational Admin Management

Navigate to `/admin` > Institutions tab:

- **View all edu-admin applications** at `/api/admin/educational-admin-applications`.
- **Approve** — Converts the user to educational admin status.
- **Reject** — Denies the application.
- **Update Subscription** — Manage institution subscription tiers.

### Audit Logs

Access audit logs at `/api/admin/audit-logs` — tracks security-relevant actions:

- User blocks/unblocks
- Admin account creation
- Tenant creation/deletion
- Sensitive configuration changes

---

## 5. Email Service

### Overview

The email service (Stage 6) provides transactional emails with:

- **Graceful degradation** — works without SMTP configured (console-only mode).
- **Rate limiting** — configurable sliding window (default: 50/minute).
- **Retry logic** — exponential backoff with jitter on transient failures.
- **Persistent logging** — all sends logged to `server/data/email-log.json`.

### Email Templates

| Template | Trigger | Description |
|----------|---------|-------------|
| `alumniInvitation` | Edu-admin invites alumni | Branded invitation with unique join link |
| `alumniWelcome` | Alumni accepts invitation | Welcome email confirming account creation |
| `alumniReminder` | Edu-admin resends invitation | Reminder with regenerated invitation code |
| `tenantRequestReceived` | Edu-admin submits tenant request | Confirmation that request was submitted |
| `tenantApproved` | System admin approves request | Notification that portal is ready for setup |
| `tenantRejected` | System admin rejects request | Notification with optional rejection reason |

All templates support **tenant branding** (colors, logos, marketplace name).

### Admin Email Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/email/status` | Service health check |
| POST | `/api/admin/email/verify` | Test SMTP connection |
| GET | `/api/admin/email/preview/:templateName` | Render template with sample data |
| POST | `/api/admin/email/test` | Send a test email (rate limited) |
| GET | `/api/admin/email/log` | View email send history |

### Monitoring Email Health

Check email service status:

```bash
curl -H "Authorization: Bearer <admin-token>" \
  https://your-domain.com/api/admin/email/status
```

Response includes:

- `enabled` — Whether EMAIL_ENABLED is true.
- `smtpConfigured` — Whether SMTP credentials are set.
- `smtpReady` — Whether the SMTP transporter is initialized.
- `rateLimit` — Current rate limit status (sent/limit/remaining).
- `availableTemplates` — List of all template names.

### Verifying SMTP Connection

```bash
curl -X POST -H "Authorization: Bearer <admin-token>" \
  https://your-domain.com/api/admin/email/verify
```

Returns `{ connected: true }` or `{ connected: false, reason: "..." }`.

### Previewing Templates

Open in a browser for HTML preview:

```
GET /api/admin/email/preview/alumniInvitation?format=html
```

Or get JSON with subject + HTML:

```
GET /api/admin/email/preview/alumniInvitation
```

### Email Log Queries

```
GET /api/admin/email/log?limit=100&status=failed
GET /api/admin/email/log?templateName=alumniInvitation
```

Status values: `sent`, `failed`, `logged` (console mode), `disabled`, `rate_limited`.

---

## 6. Data Files & Backup

### JSON Store

All local data uses the **jsonStore** utility (`server/api-util/jsonStore.js`):

- **Atomic writes** — Data is written to a `.tmp` file, then atomically renamed. Prevents corruption from crashes mid-write.
- **Automatic backups** — A `.bak` file is created before each write.
- **Read fallback** — If a `.json` file is corrupted, the system automatically falls back to the `.bak` file.
- **File mutex** — In-memory async mutex prevents concurrent write corruption.

### Startup Validation

On server start, `apiRouter.js` validates all JSON data files:

```
[apiRouter] Data file warning: tenants.json — File does not exist
```

This is a **warning**, not an error. Missing files are created automatically on first write.

### Manual Backup

```bash
# Back up all data files
cp server/data/tenants.json server/data/tenants.json.manual-backup
cp server/data/alumni.json server/data/alumni.json.manual-backup
cp server/data/tenant-requests.json server/data/tenant-requests.json.manual-backup
cp server/data/email-log.json server/data/email-log.json.manual-backup
```

### Recovering from Corruption

If a JSON file is corrupted:

1. The system automatically falls back to the `.bak` file on read.
2. If the `.bak` is also corrupt, the file returns its default value (empty array `[]`).
3. To manually recover: `cp server/data/tenants.json.bak server/data/tenants.json`

### Data Retention

- **Email logs** — Automatically trimmed to the last 1,000 entries.
- **Tenant data** — Retained indefinitely until manually deleted.
- **Alumni records** — Retained indefinitely. Delete via API or admin dashboard.
- **Tenant requests** — Retained indefinitely (for audit trail). Contains both pending and resolved requests.

---

## 7. Security

### Authentication Model

| Layer | Mechanism |
|-------|-----------|
| User auth | Sharetribe SDK session tokens |
| System admin verification | `verifySystemAdmin()` — checks `publicData.userType === 'system-admin'` |
| Edu-admin verification | `verifyEducationalAdmin()` — checks `publicData.userType === 'educational-admin'` + validates `institutionDomain` |
| Rate limiting | `standardRateLimit` (general) + `strictRateLimit` (sensitive endpoints) |
| CSRF protection | Token-based via `/api/csrf-token` |

### Admin Access Verification

Every admin endpoint calls `verifySystemAdmin(req, res)` which:

1. Extracts the session token from the request.
2. Calls Sharetribe SDK to validate the token and get the current user.
3. Checks `user.attributes.profile.publicData.userType === 'system-admin'`.
4. Returns 403 if any step fails.

### Edu-Admin Scope Isolation

Educational admin endpoints call `verifyEducationalAdmin(req, res)` which:

1. Validates the user is an educational admin.
2. Extracts `institutionDomain` from the user's `publicData`.
3. All queries are scoped to that domain — an admin at `harvard.edu` cannot access `mit.edu` data.

### Input Sanitization

- All string inputs pass through `sanitizeString()` (XSS prevention, length limits).
- Email inputs validated via `isValidEmail()`.
- Template data escaped via `escapeHtml()` before rendering.
- JSON data validated on startup via `validateJSONFile()`.

### Security Headers

All API responses include:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### Rate Limiting

| Endpoint Type | Rate Limit |
|---------------|------------|
| Standard API endpoints | `standardRateLimit` (100 req/15min per IP) |
| Sensitive endpoints (email test, password validate) | `strictRateLimit` (10 req/15min per IP) |
| Email sends | Configurable sliding window (default 50/min) |

### Secret Masking

When tenant records with API secrets are returned via API:

- Secrets are masked: `****` + last 4 characters.
- Full secrets are never exposed in API responses.

---

## 8. Monitoring & Logs

### Server Console Logs

The server logs key operations to stdout:

```
[EmailService] SMTP transporter initialized (smtp.sendgrid.net:587)
[EmailService] Email sent: john@example.com | Subject | messageId: <abc@smtp>
[EmailService] Rate limited. 50/50 emails sent in window.
Tenant created: harvard (Harvard University)
Alumni invited: alum_abc123 (jane@example.com) by edu-admin-001
Tenant request submitted: req_xyz for harvard.edu
```

### Email Monitoring

1. **Service Status** — `GET /api/admin/email/status`
2. **SMTP Connection** — `POST /api/admin/email/verify`
3. **Send History** — `GET /api/admin/email/log`
4. **Failed Emails** — `GET /api/admin/email/log?status=failed`
5. **Rate Limit Status** — Included in status response

### Health Check Indicators

| Check | How to Verify |
|-------|---------------|
| Server running | `curl https://your-domain.com/api/csrf-token` returns 200 |
| Sharetribe connection | Any authenticated API call succeeds |
| SMTP connection | `POST /api/admin/email/verify` returns `connected: true` |
| Data file integrity | No warnings in startup logs |
| Rate limiting | `GET /api/admin/email/status` shows remaining > 0 |

### Test Suite

Run the full test suite to verify system integrity:

```bash
yarn test-server
# Expected: 16 test suites, 250 tests, all passing
```

Test coverage includes:

- API endpoint authentication and authorization.
- CRUD operations for tenants, alumni, email.
- Input validation and error handling.
- Rate limiting and retry logic.
- Email service graceful degradation.

---

## 9. Content Management

### CMS

The Admin Dashboard includes a CMS for managing:

- **Hero section** — Landing page hero content, images, videos.
- **Legal pages** — Terms of service, privacy policy, custom legal pages.
- **Blog** — Blog posts with categories, drafts, and publishing.
- **Coaching config** — AI coaching system prompts and configuration.

### CMS Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/content` | Get all CMS content |
| GET | `/api/admin/content/:section` | Get specific section |
| PUT | `/api/admin/content/:section` | Update section |
| POST | `/api/admin/content/:section/items` | Add item to section |
| PUT | `/api/admin/content/:section/items/:itemId` | Update item |
| DELETE | `/api/admin/content/:section/items/:itemId` | Delete item |
| POST | `/api/admin/content/reset` | Reset to defaults |

### Blog Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/blog/posts` | List all blog posts |
| POST | `/api/admin/blog/posts` | Create blog post |
| PUT | `/api/admin/blog/posts/:postId` | Update blog post |
| DELETE | `/api/admin/blog/posts/:postId` | Delete blog post |
| GET | `/api/admin/blog/categories` | List categories |
| POST | `/api/admin/blog/categories` | Add category |
| DELETE | `/api/admin/blog/categories/:category` | Delete category |
| PUT | `/api/admin/blog/settings` | Update blog settings |

### File Uploads

Upload logos, favicons, hero images/videos:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/upload/logo` | Upload logo image |
| POST | `/api/admin/upload/favicon` | Upload favicon |
| POST | `/api/admin/upload/hero-image` | Upload hero image |
| POST | `/api/admin/upload/hero-video` | Upload hero video |
| DELETE | `/api/admin/upload/:filename` | Delete uploaded file |

---

## 10. Incident Response

### Email Service Down

**Symptoms:** Emails not being sent, `status=failed` entries in email log.

**Steps:**
1. Check `GET /api/admin/email/status` — is SMTP configured and ready?
2. Run `POST /api/admin/email/verify` — does SMTP connect?
3. Check SMTP credentials in environment variables.
4. Check rate limit status — are you rate limited?
5. Check SMTP provider status page (SendGrid, SES, etc.).
6. **Fallback:** The system automatically falls back to console logging. No data is lost — emails are logged with status `logged` and can be re-sent later.

### Data File Corruption

**Symptoms:** API returns empty data unexpectedly, startup warnings about data files.

**Steps:**
1. Check server startup logs for `Data file warning` messages.
2. The system automatically uses `.bak` files as fallback.
3. If `.bak` is also corrupt: restore from your most recent manual backup.
4. If no backup exists: the file initializes as an empty array `[]`. You'll need to re-create any lost data.

### User Cannot Access Dashboard

**Symptoms:** User sees "Access Restricted" on their dashboard.

**Steps:**
1. Verify the user's `userType` in Sharetribe Console.
2. For edu-admins: verify their `institutionDomain` is set correctly in `publicData`.
3. For edu-admins: verify their institution has an active tenant (not suspended).
4. For alumni: verify they accepted their invitation (status should be `accepted`).
5. For system admins: verify `publicData.userType === 'system-admin'`.

### Tenant Portal Not Showing Branding

**Symptoms:** Institution portal shows default branding instead of custom.

**Steps:**
1. Check tenant status — must be `active` (not `onboarding` or `suspended`).
2. Verify branding fields are set: `GET /api/admin/tenants/:tenantId`.
3. Check that the tenant's `institutionDomain` matches the user's email domain.
4. Clear browser cache — branding changes are immediate but may be cached client-side.

### High Error Rate

**Symptoms:** Multiple 500 errors in server logs.

**Steps:**
1. Check server memory and disk space.
2. Run `yarn test-server` — if tests fail, a code deployment may have introduced a regression.
3. Check `VERBOSE=true` for detailed request logging.
4. Check Sharetribe Console for API health/rate limits.
5. Check data file sizes — `email-log.json` is auto-trimmed to 1,000 entries, but other files grow indefinitely.

### Rollback Procedure

If a deployment causes issues:

1. Revert to the previous Git commit.
2. Restore data files from `.bak` or manual backups.
3. Restart the server.
4. Run `yarn test-server` to verify integrity.

---

*Last updated: February 2026*
*Street2Ivy Platform Documentation*
