# API Reference

> Street2Ivy Platform — Complete API Endpoint Documentation
>
> Base URL: `/api` (all endpoints are prefixed with `/api` in the main server)
>
> **Total Endpoints: 169**

---

## Table of Contents

1. [Public Endpoints](#1-public-endpoints) (9 routes)
2. [Authentication](#2-authentication) (7 routes)
3. [Tenant Management — System Admin](#3-tenant-management--system-admin) (12 routes)
4. [Education — Tenant (Edu-Admin Scoped)](#4-education--tenant-edu-admin-scoped) (6 routes)
5. [Education — Students](#5-education--students) (3 routes)
6. [Education — Alumni](#6-education--alumni) (6 routes)
7. [Education — Reports](#7-education--reports) (2 routes)
8. [Alumni Dashboard](#8-alumni-dashboard) (1 route)
9. [Email Admin — System Admin](#9-email-admin--system-admin) (5 routes)
10. [Sharetribe Proxy & Core Marketplace](#10-sharetribe-proxy--core-marketplace) (118 routes)

---

## Authentication

Most endpoints require authentication via Sharetribe SDK session tokens passed in the request cookies/headers. The following access levels exist:

| Level | Verification Function | Description |
|-------|----------------------|-------------|
| **Public** | None | No authentication required |
| **Authenticated** | SDK session token | Any logged-in user |
| **System Admin** | `verifySystemAdmin()` | `publicData.userType === 'system-admin'` |
| **Edu-Admin** | `verifyEducationalAdmin()` | `publicData.userType === 'educational-admin'` + institution domain scoping |
| **Alumni** | SDK token + type check | `publicData.userType === 'alumni'` |

### Standard Error Responses

| Status | Body | Meaning |
|--------|------|---------|
| `400` | `{ error: "..." }` | Bad request / validation error |
| `401` | `{ error: "..." }` | Not authenticated |
| `403` | `{ error: "Access denied..." }` | Insufficient permissions |
| `404` | `{ error: "..." }` | Resource not found |
| `429` | `{ error: "..." }` | Rate limited |
| `500` | `{ error: "Internal server error" }` | Server error |

---

## 1. Public Endpoints

*No authentication required. 9 routes.*

### `GET /csrf-token`

Returns a CSRF token for form submissions.

**Response:** `{ csrfToken: "..." }`

---

### `POST /validate-password`

Validates a password against security requirements.

**Body:** `{ password: string }`

**Response:** `{ valid: boolean, errors: string[] }`

---

### `GET /security-config`

Returns public security configuration (password rules, etc.).

**Response:** `{ data: { passwordMinLength, ... } }`

---

### `GET /institutions/check/:domain`

Checks if an institution domain is approved for registration.

**Params:** `domain` — Institution domain (e.g., `harvard.edu`)

**Response:** `{ data: { exists: boolean, institution: {...} } }`

---

### `GET /institutions/my-institution`

Returns the institution associated with the current user's email domain.

**Response:** `{ data: { institution: {...} } }`

---

### `GET /tenants/resolve`

Public tenant resolution. Detects which tenant portal to display based on the request origin domain or query parameter.

**Query:** `domain` (optional) — Override domain for resolution

**Response:** `{ data: { tenant: {...} | null } }`

---

### `GET /content`

Returns public CMS content for the landing page.

**Response:** `{ data: { hero: {...}, features: [...], ... } }`

---

### `GET /legal`

Returns list of available legal pages.

**Response:** `{ data: [{ pageType, title, ... }] }`

---

### `GET /legal/:pageType`

Returns a specific legal page content.

**Params:** `pageType` — e.g., `terms-of-service`, `privacy-policy`

**Response:** `{ data: { pageType, title, content, ... } }`

---

## 2. Authentication

*OAuth & login routes. 7 routes.*

### `GET /initiate-login-as`

Initiates Sharetribe "login as" flow (admin impersonation).

**Auth:** System admin

**Query:** `user_id` — Target user ID

---

### `GET /login-as`

Completes the "login as" flow.

---

### `POST /auth/create-user-with-idp`

Creates a new user account via identity provider (Facebook/Google).

**Body:** `{ idpId, idpClientId, idpToken, ... }`

---

### `GET /auth/facebook`

Initiates Facebook OAuth authentication flow.

---

### `GET /auth/facebook/callback`

Facebook OAuth callback URL.

---

### `GET /auth/google`

Initiates Google OAuth authentication flow.

---

### `GET /auth/google/callback`

Google OAuth callback URL.

---

## 3. Tenant Management — System Admin

*System admin CRUD for institution tenants. 12 routes.*

### `GET /admin/tenants`

List all tenants.

**Auth:** System admin

**Response:** `{ data: [{ id, name, domain, institutionDomain, status, branding, features, ... }] }`

---

### `GET /admin/tenants/:tenantId`

Get a single tenant by ID.

**Auth:** System admin

**Params:** `tenantId` — Tenant identifier (e.g., `harvard`)

**Response:** `{ data: { id, name, domain, institutionDomain, status, branding, features, contact, ... } }`

---

### `POST /admin/tenants`

Create a new tenant.

**Auth:** System admin

**Body:**
```json
{
  "id": "harvard",
  "name": "Harvard University",
  "domain": "harvard.street2ivy.com",
  "institutionDomain": "harvard.edu",
  "status": "active",
  "contact": { "name": "Dr. Smith", "email": "smith@harvard.edu" },
  "branding": { "marketplaceName": "Harvard x Street2Ivy", "marketplaceColor": "#A51C30" }
}
```

**Response:** `201 { data: { tenant } }`

---

### `PUT /admin/tenants/:tenantId`

Update a tenant.

**Auth:** System admin

**Body:** Any tenant fields to update.

**Response:** `{ data: { tenant } }`

---

### `DELETE /admin/tenants/:tenantId`

Delete a tenant permanently.

**Auth:** System admin

**Response:** `{ data: null, message: "Tenant deleted" }`

---

### `PUT /admin/tenants/:tenantId/branding`

Update only the branding fields for a tenant.

**Auth:** System admin

**Body:**
```json
{
  "marketplaceName": "Harvard x Street2Ivy",
  "marketplaceColor": "#A51C30",
  "logoUrl": "https://example.com/logo.png"
}
```

**Response:** `{ data: { tenant } }`

---

### `GET /tenants/by-institution/:domain`

Look up a tenant by institution domain.

**Auth:** System admin or edu-admin

**Params:** `domain` — Institution domain (e.g., `harvard.edu`)

**Response:** `{ data: { tenant } }`

---

### `GET /admin/tenant-requests`

List all tenant access requests.

**Auth:** System admin

**Response:** `{ data: [{ id, institutionName, institutionDomain, adminName, adminEmail, status, submittedAt, ... }] }`

---

### `POST /admin/tenant-requests/:id/approve`

Approve a tenant request. Auto-creates a tenant in `onboarding` status.

**Auth:** System admin

**Params:** `id` — Request ID

**Response:** `{ data: { request, tenant } }`

---

### `POST /admin/tenant-requests/:id/reject`

Reject a tenant request.

**Auth:** System admin

**Params:** `id` — Request ID

**Body:** `{ reason: "Optional rejection reason" }`

**Response:** `{ data: { request } }`

---

### `POST /educational-admin/apply`

Submit an educational admin application.

**Auth:** Authenticated user

**Body:** `{ institutionName, adminName, ... }`

**Response:** `{ data: { application } }`

---

### `GET /admin/educational-admin-applications`

List all educational admin applications.

**Auth:** System admin

**Response:** `{ data: [{ id, userId, status, ... }] }`

---

## 4. Education — Tenant (Edu-Admin Scoped)

*Institution tenant management for educational admins. 6 routes.*

### `GET /education/tenant`

Get the current edu-admin's tenant (auto-detected from institution domain).

**Auth:** Edu-admin

**Response:** `{ data: { tenant } }`

---

### `PUT /education/tenant/branding`

Update branding for the edu-admin's own tenant.

**Auth:** Edu-admin

**Body:**
```json
{
  "marketplaceName": "Harvard x Street2Ivy",
  "marketplaceColor": "#A51C30",
  "logoUrl": "https://example.com/logo.png"
}
```

**Response:** `{ data: { tenant } }`

---

### `PUT /education/tenant/settings`

Update feature toggles for the edu-admin's own tenant.

**Auth:** Edu-admin

**Body:**
```json
{
  "aiCoaching": true,
  "nda": false,
  "assessments": true
}
```

**Response:** `{ data: { tenant } }`

---

### `POST /education/tenant/activate`

Activate a tenant (transition from `onboarding` to `active`).

**Auth:** Edu-admin

**Response:** `{ data: { tenant } }`

---

### `POST /education/tenant-request`

Submit a request for a new institution portal.

**Auth:** Edu-admin (without existing tenant)

**Body:**
```json
{
  "institutionName": "Stanford University",
  "adminName": "Dr. Johnson",
  "adminEmail": "johnson@stanford.edu",
  "reason": "We want to connect our students with industry partners"
}
```

**Response:** `201 { data: { request } }`

**Side effect:** Sends `tenantRequestReceived` email (non-blocking).

---

### `POST /education/tenant/logo`

Upload a logo image for the tenant.

**Auth:** Edu-admin

**Body:** Multipart form data with image file.

**Response:** `{ data: { logoUrl, tenant } }`

---

## 5. Education — Students

*Student data access for educational admins. 3 routes.*

### `GET /education/students`

List students from the edu-admin's institution.

**Auth:** Edu-admin

**Query:**
- `page` (default: 1)
- `perPage` (default: 25, max: 100)
- `search` — Search by name/major

**Response:** `{ data: [{ id, attributes, activity, profileImage }], pagination: { page, perPage, totalItems, totalPages } }`

---

### `GET /education/students/stats`

Get aggregated student statistics.

**Auth:** Edu-admin

**Response:**
```json
{
  "data": {
    "totalStudents": 150,
    "activeStudents": 89,
    "engagementRate": 59,
    "topMajors": [{ "major": "Computer Science", "count": 42 }]
  }
}
```

---

### `GET /education/students/:studentId/transactions`

Get a specific student's project transactions/applications.

**Auth:** Edu-admin

**Params:** `studentId` — Sharetribe user ID

**Response:** `{ data: [{ transaction details }] }`

---

## 6. Education — Alumni

*Alumni invitation management for educational admins. 6 routes.*

### `POST /education/alumni/invite`

Invite an alumni to join the institution's network.

**Auth:** Edu-admin

**Body:**
```json
{
  "email": "jane@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "graduationYear": "2020",
  "program": "Computer Science"
}
```

**Response:** `201 { data: { id, email, firstName, lastName, status: "invited", invitationCode, ... } }`

**Side effect:** Sends `alumniInvitation` email (non-blocking).

---

### `GET /education/alumni`

List all alumni for the edu-admin's institution.

**Auth:** Edu-admin

**Query:**
- `page` (default: 1)
- `perPage` (default: 50)

**Response:** `{ data: [{ id, firstName, lastName, email, status, graduationYear, program, invitedAt, acceptedAt }] }`

---

### `GET /education/alumni/verify-invitation/:code`

Verify an alumni invitation code (public — used during join flow).

**Params:** `code` — 32-character hex invitation code

**Response:** `{ data: { valid: true, alumni: { firstName, lastName, institutionDomain, ... } } }`

**Error:** `{ data: { valid: false, reason: "..." } }` (invalid/expired/already-accepted)

---

### `POST /education/alumni/accept-invitation`

Accept an alumni invitation and link to a user account.

**Body:**
```json
{
  "invitationCode": "abc123...",
  "userId": "user-uuid-123"
}
```

**Response:** `{ data: { alumni } }`

**Side effect:** Sends `alumniWelcome` email (non-blocking).

---

### `DELETE /education/alumni/:id`

Remove an alumni invitation record.

**Auth:** Edu-admin (must own the institution)

**Params:** `id` — Alumni record ID

**Response:** `{ data: null }`

---

### `PUT /education/alumni/:id/resend`

Resend an alumni invitation (regenerates invitation code).

**Auth:** Edu-admin (must own the institution)

**Params:** `id` — Alumni record ID

**Response:** `{ data: { alumni } }`

**Side effect:** Sends `alumniReminder` email (non-blocking).

---

## 7. Education — Reports

*Analytics and export for educational admins. 2 routes.*

### `GET /education/reports/overview`

Get performance overview report for the institution.

**Auth:** Edu-admin

**Query:** `period` — `30d`, `90d`, `1y`, `all` (default: `30d`)

**Response:**
```json
{
  "data": {
    "period": "30d",
    "currentPeriod": {
      "totalStudents": 150,
      "newStudents": 12,
      "totalApplications": 340,
      "newApplications": 45,
      "acceptanceRate": "23%",
      "completionRate": "85%"
    },
    "previousPeriod": { ... },
    "percentChange": { ... }
  }
}
```

---

### `GET /education/reports/export`

Export a CSV report.

**Auth:** Edu-admin

**Query:** `type` — `summary`, `students`, `engagement`

**Response:** CSV file download (Content-Type: `text/csv`)

---

## 8. Alumni Dashboard

*Dashboard data for alumni users. 1 route.*

### `GET /alumni/dashboard`

Get alumni dashboard data (stats, recent activity, profile).

**Auth:** Alumni user

**Response:**
```json
{
  "data": {
    "stats": {
      "projectsCreated": 3,
      "activeProjects": 1,
      "totalApplications": 12
    },
    "recentActivity": [{ "id": "...", "title": "...", "createdAt": "..." }],
    "profile": {
      "currentCompany": "Google",
      "currentRole": "Senior Engineer",
      "graduationYear": "2018"
    },
    "institutionDomain": "harvard.edu"
  }
}
```

---

## 9. Email Admin — System Admin

*Email service management. 5 routes.*

### `GET /admin/email/status`

Get email service health status.

**Auth:** System admin

**Response:**
```json
{
  "data": {
    "enabled": true,
    "smtpConfigured": true,
    "smtpReady": true,
    "smtpHost": "smtp.sendgrid.net:587",
    "fromEmail": "noreply@street2ivy.com",
    "rateLimit": { "sent": 5, "limit": 50, "remaining": 45, "resetMs": 42000 },
    "availableTemplates": ["alumniInvitation", "alumniWelcome", "alumniReminder", "tenantRequestReceived", "tenantApproved", "tenantRejected"]
  }
}
```

---

### `POST /admin/email/verify`

Test SMTP connection.

**Auth:** System admin

**Response:** `{ data: { connected: true } }` or `{ data: { connected: false, reason: "..." } }`

---

### `GET /admin/email/preview/:templateName`

Preview an email template rendered with sample data.

**Auth:** System admin

**Params:** `templateName` — One of: `alumniInvitation`, `alumniWelcome`, `alumniReminder`, `tenantRequestReceived`, `tenantApproved`, `tenantRejected`

**Query:**
- `format` — `html` (returns raw HTML) or `json` (default, returns subject + HTML)

**Response (JSON):**
```json
{
  "data": {
    "templateName": "alumniInvitation",
    "subject": "You're Invited to Join Harvard University on Street2Ivy",
    "html": "<html>...</html>",
    "sampleData": { ... }
  }
}
```

**Response (HTML):** Raw HTML rendered in browser.

---

### `POST /admin/email/test`

Send a test email using a template with sample data.

**Auth:** System admin

**Rate limit:** `strictRateLimit` (10 req/15min)

**Body:**
```json
{
  "templateName": "alumniInvitation",
  "to": "test@example.com",
  "data": { "firstName": "Custom Name" }
}
```

**Response:** `{ data: { success: true, mode: "smtp", messageId: "..." } }`

---

### `GET /admin/email/log`

View email send history.

**Auth:** System admin

**Query:**
- `limit` — Max entries (default: 50, max: 200)
- `status` — Filter: `sent`, `failed`, `logged`, `disabled`, `rate_limited`
- `templateName` — Filter by template

**Response:**
```json
{
  "data": [{
    "id": "email_1706...",
    "to": "jane@example.com",
    "subject": "You're Invited...",
    "templateName": "alumniInvitation",
    "status": "sent",
    "messageId": "<abc@smtp>",
    "timestamp": "2026-02-07T10:30:00Z"
  }],
  "total": 1
}
```

---

## 10. Sharetribe Proxy & Core Marketplace

*Standard marketplace functionality. 118 routes.*

### Transaction & Line Items (4 routes)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/transaction-line-items` | Calculate line items for a transaction |
| POST | `/initiate-privileged` | Initiate a privileged transaction |
| POST | `/transition-privileged` | Perform a privileged transition |
| POST | `/transaction-transition` | Perform a standard transaction transition |

### Account Management (2 routes)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/delete-account` | Delete the current user's account |
| GET | `/search-users` | Search users by query |

### Admin User Management (10 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users` | Sys admin | List users (with search/filter) |
| GET | `/admin/users/pending` | Sys admin | List pending users |
| POST | `/admin/users/create-admin` | Sys admin | Create admin account |
| GET | `/admin/users/:userId` | Sys admin | Get user details |
| POST | `/admin/users/:userId/block` | Sys admin | Block user |
| POST | `/admin/users/:userId/unblock` | Sys admin | Unblock user |
| POST | `/admin/users/:userId/approve` | Sys admin | Approve pending user |
| POST | `/admin/users/:userId/reject` | Sys admin | Reject pending user |
| DELETE | `/admin/users/:userId` | Sys admin | Delete user |
| GET | `/admin/audit-logs` | Sys admin | View audit logs |

### Admin Messaging (4 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/messages` | Sys admin | Send admin message |
| GET | `/admin/messages` | Sys admin | List messages |
| POST | `/admin/messages/:messageId/read` | Sys admin | Mark message read |
| GET | `/admin/messages/unread-count` | Sys admin | Get unread count |

### Education Dashboard (1 route)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/education/dashboard` | Edu-admin | Get dashboard overview data |

### Education Messages (2 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/education/messages` | Edu-admin | Send message to student/support |
| GET | `/education/messages` | Edu-admin | List sent/received messages |

### Educational Admin Applications (5 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/educational-admin-applications/stats` | Sys admin | Application stats |
| POST | `/admin/educational-admin-applications/:id/approve` | Sys admin | Approve application |
| POST | `/admin/educational-admin-applications/:id/reject` | Sys admin | Reject application |
| GET | `/admin/educational-admins` | Sys admin | List all edu-admins |
| PUT | `/admin/educational-admins/:userId/subscription` | Sys admin | Update subscription |

### Corporate Dashboard (5 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/corporate/dashboard-stats` | Corporate | Dashboard statistics |
| GET | `/corporate/applications` | Corporate | List applications |
| GET | `/corporate/export/:type` | Corporate | Export report CSV |
| GET | `/corporate/invites` | Corporate | List sent invites |
| GET | `/corporate/invites/:inviteId` | Corporate | Get invite details |

### Company Listings & Spending (4 routes)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/invite-to-apply` | Send invite-to-apply to a student |
| GET | `/company/:authorId/listings` | Get listings by company |
| GET | `/company/:companyId/spending` | Get company spending report |
| GET | `/companies/spending-report` | Get all companies spending report |

### User Statistics (1 route)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/user-stats/:userId` | Get user statistics |

### Deposit Management (7 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/check-deposit-status/:transactionId` | Auth | Check deposit status |
| GET | `/admin/deposits` | Sys admin | List all deposits |
| GET | `/admin/deposits/:transactionId` | Sys admin | Get deposit status |
| POST | `/admin/deposits/:transactionId/confirm` | Sys admin | Confirm deposit |
| POST | `/admin/deposits/:transactionId/revoke` | Sys admin | Revoke deposit |
| GET | `/admin/corporate-deposits` | Sys admin | List corporate deposits |
| GET | `/admin/corporate-deposits/:partnerId` | Sys admin | Get partner deposits |

### Corporate Deposit Actions (3 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/corporate-deposits/:transactionId/clear-hold` | Sys admin | Clear work hold |
| POST | `/admin/corporate-deposits/:transactionId/reinstate-hold` | Sys admin | Reinstate work hold |
| POST | `/admin/corporate-deposits/:partnerId/clear-all-holds` | Sys admin | Clear all holds for partner |

### Institution Management (6 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/institutions` | Sys admin | List all institutions |
| GET | `/admin/institutions/:domain` | Sys admin | Get institution by domain |
| POST | `/admin/institutions` | Sys admin | Create/update institution |
| POST | `/admin/institutions/:domain/status` | Sys admin | Update institution status |
| DELETE | `/admin/institutions/:domain` | Sys admin | Delete institution |
| POST | `/admin/institutions/:domain/coaching` | Sys admin | Update coaching config |

### Admin Reports & Export (2 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/reports/:type` | Sys admin | Get report data |
| GET | `/admin/export/:type` | Sys admin | Export report CSV |

### Content Management (7 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/content` | Sys admin | Get all CMS content |
| GET | `/admin/content/:section` | Sys admin | Get section |
| PUT | `/admin/content/:section` | Sys admin | Update section |
| POST | `/admin/content/:section/items` | Sys admin | Add item |
| PUT | `/admin/content/:section/items/:itemId` | Sys admin | Update item |
| DELETE | `/admin/content/:section/items/:itemId` | Sys admin | Delete item |
| POST | `/admin/content/reset` | Sys admin | Reset to defaults |

### Blog Management (10 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/blog/posts` | Sys admin | List posts |
| GET | `/admin/blog/posts/:postId` | Sys admin | Get post |
| POST | `/admin/blog/posts` | Sys admin | Create post |
| PUT | `/admin/blog/posts/:postId` | Sys admin | Update post |
| DELETE | `/admin/blog/posts/:postId` | Sys admin | Delete post |
| GET | `/admin/blog/categories` | Sys admin | List categories |
| POST | `/admin/blog/categories` | Sys admin | Add category |
| DELETE | `/admin/blog/categories/:category` | Sys admin | Delete category |
| PUT | `/admin/blog/settings` | Sys admin | Update blog settings |
| GET | `/blog/posts` | Public | List published posts |

### Blog Public (1 route)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/blog/posts/:slug` | Public | Get published post by slug |

### AI Coaching Configuration (3 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/coaching-config` | Sys admin | Get coaching config |
| PUT | `/admin/coaching-config` | Sys admin | Update coaching config |
| GET | `/coaching-config/public` | Public | Get public coaching config |

### Student AI Coaching Access (6 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/student-coaching-access` | Sys admin | List blocked students |
| POST | `/admin/student-coaching-access/block` | Sys admin | Block student coaching |
| POST | `/admin/student-coaching-access/unblock` | Sys admin | Unblock student coaching |
| GET | `/admin/student-coaching-access/check/:userId` | Sys admin | Check student access |
| GET | `/admin/institutions-coaching-summary` | Sys admin | Institutions coaching summary |
| GET | `/admin/institution/:domain/students` | Sys admin | Get institution students |

### Student Waitlist (4 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/student-waitlist` | Public | Add to waitlist |
| GET | `/admin/student-waitlist` | Sys admin | List waitlist |
| PUT | `/admin/student-waitlist/:entryId` | Sys admin | Update entry |
| DELETE | `/admin/student-waitlist/:entryId` | Sys admin | Delete entry |

### File Upload (5 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/upload/logo` | Sys admin | Upload logo |
| POST | `/admin/upload/favicon` | Sys admin | Upload favicon |
| POST | `/admin/upload/hero-image` | Sys admin | Upload hero image |
| POST | `/admin/upload/hero-video` | Sys admin | Upload hero video |
| DELETE | `/admin/upload/:filename` | Sys admin | Delete file |

### Project Workspace (4 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/project-workspace/:transactionId` | Auth | Get workspace data |
| POST | `/project-workspace/:transactionId/messages` | Auth | Send workspace message |
| POST | `/project-workspace/:transactionId/accept-nda` | Auth | Accept NDA |
| POST | `/project-workspace/:transactionId/mark-read` | Auth | Mark messages read |

### NDA E-Signature (7 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/nda/upload` | Auth | Upload NDA document |
| GET | `/nda/:listingId` | Auth | Get NDA document |
| POST | `/nda/request-signature/:transactionId` | Auth | Request signature |
| GET | `/nda/signature-status/:transactionId` | Auth | Get signature status |
| POST | `/nda/sign/:transactionId` | Auth | Sign NDA |
| GET | `/nda/download/:transactionId` | Auth | Download signed NDA |
| POST | `/nda/webhook` | Public | NDA webhook callback |

### Student Assessments (5 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/assessments/criteria` | Auth | Get assessment criteria |
| POST | `/assessments` | Auth | Submit assessment |
| GET | `/assessments/pending` | Auth | Get pending assessments |
| GET | `/assessments/transaction/:transactionId` | Auth | Get by transaction |
| GET | `/assessments/student/:studentId` | Auth | Get student assessments |

### Notification Center (4 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Auth | List notifications |
| GET | `/notifications/unread-count` | Auth | Get unread count |
| POST | `/notifications/:notificationId/read` | Auth | Mark notification read |
| POST | `/notifications/read-all` | Auth | Mark all read |

### Message Attachments (6 routes)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/attachments/upload` | Auth | Upload attachment |
| GET | `/attachments` | Auth | List attachments |
| GET | `/attachments/:id` | Auth | Get attachment info |
| GET | `/attachments/:id/download` | Auth | Download attachment |
| GET | `/attachments/:id/preview` | Auth | Preview attachment |
| DELETE | `/attachments/:id` | Auth | Delete attachment |

---

## Route Count Summary

| Section | Routes |
|---------|--------|
| 1. Public | 9 |
| 2. Authentication | 7 |
| 3. Tenant Management (System Admin) | 12 |
| 4. Education — Tenant (Edu-Admin) | 6 |
| 5. Education — Students | 3 |
| 6. Education — Alumni | 6 |
| 7. Education — Reports | 2 |
| 8. Alumni Dashboard | 1 |
| 9. Email Admin | 5 |
| 10. Sharetribe Proxy & Marketplace | 118 |
| **TOTAL** | **169** |

---

*Last updated: February 2026*
*Street2Ivy Platform Documentation*
