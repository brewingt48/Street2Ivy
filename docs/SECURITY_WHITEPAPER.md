# Proveground Security Whitepaper

**Version:** 1.0
**Last Updated:** February 2026
**Classification:** Public

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Authentication & Access Control](#3-authentication--access-control)
4. [Data Protection](#4-data-protection)
5. [Network & Infrastructure Security](#5-network--infrastructure-security)
6. [Application Security](#6-application-security)
7. [AI & Machine Learning Security](#7-ai--machine-learning-security)
8. [Compliance & Certifications](#8-compliance--certifications)
9. [Incident Response](#9-incident-response)
10. [Vendor Management](#10-vendor-management)
11. [Business Continuity](#11-business-continuity)

---

## 1. Executive Summary

Proveground is a multi-tenant SaaS platform connecting student-athletes with professional development opportunities through AI-powered matching, coaching, and analytics. Security is fundamental to our architecture — we handle sensitive educational records, personally identifiable information (PII), and institutional data that demands the highest level of protection.

This whitepaper describes the security controls, architecture decisions, and compliance commitments that protect our customers' data.

### Key Security Highlights

- **Multi-tenant isolation** with subdomain-based routing and application-level data segregation
- **NIST 800-63B aligned** password policy (12-character minimum, complexity requirements, blocklist)
- **bcrypt password hashing** (cost factor 10) delegated to PostgreSQL pgcrypto
- **Comprehensive audit logging** across 14 event types with dual persistence (database + log drain)
- **CSRF protection** via double-submit cookie pattern on all state-changing operations
- **Content Security Policy (CSP)** with strict directives including HSTS preload
- **Input validation** on every API endpoint using Zod schema validation
- **Response sanitization** stripping PII from API responses based on caller role
- **Rate limiting** on authentication, read, and write operations
- **Account lockout** after 5 failed authentication attempts (15-minute lockout window)
- **Redis-backed** rate limiting and session management for horizontal scalability
- **SSO/SAML 2.0 and OIDC** support for institutional identity providers
- **Multi-Factor Authentication (MFA)** via TOTP with encrypted backup codes
- **AI fairness constraints** with documented bias mitigation in all AI features

---

## 2. Architecture Overview

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Application | Next.js 14 (App Router) | Server-side rendering, API routes |
| Database | PostgreSQL 16 | Primary data store with pgcrypto extension |
| Cache / Sessions | Redis | Rate limiting, account lockout, session store |
| Email | Mailgun | Transactional email delivery |
| Media | Cloudinary | Image/document storage and transformation |
| AI | Anthropic Claude | AI coaching, matching, analytics |
| Hosting | Heroku | PaaS with managed SSL and routing |
| CDN | Cloudflare | Edge caching, DDoS protection, WAF |

### Multi-Tenant Architecture

Proveground operates a shared-infrastructure, logically-isolated multi-tenant model:

- **Routing**: Each tenant is identified by a unique subdomain (e.g., `holy-cross-football.proveground.com`)
- **Data isolation**: All database queries are scoped by `tenant_id` — enforced at both the application layer and via PostgreSQL Row-Level Security (RLS) policies
- **Feature gating**: 26 feature flags gated by subscription tier (Starter, Professional, Enterprise)
- **Branding**: Per-tenant customizable landing pages, logos, colors, and content

---

## 3. Authentication & Access Control

### Authentication Methods

#### Password-Based Authentication
- Passwords are hashed using **bcrypt** (cost factor 10) via PostgreSQL's pgcrypto extension
- Password policy follows **NIST 800-63B** guidelines:
  - Minimum 12 characters
  - Complexity requirements (uppercase, lowercase, digit, special character)
  - Blocklist of common passwords (10,000+ entries)
  - No arbitrary rotation requirements (per NIST guidance)
- Account lockout after 5 failed attempts within a rolling window (15-minute lockout)
- Rate limiting on authentication endpoints (10 attempts per minute per IP)

#### Single Sign-On (SSO)
- **SAML 2.0** support for institutional identity providers (Okta, Azure AD, Google Workspace, Shibboleth)
- **OpenID Connect (OIDC)** as an alternative SSO protocol
- Per-tenant IdP configuration with metadata validation
- JIT (Just-In-Time) user provisioning from SSO assertions
- Optional SSO enforcement (disable password login for tenant)

#### Multi-Factor Authentication (MFA)
- **TOTP-based** MFA using RFC 6238 compliant implementation
- QR code enrollment flow with manual secret entry fallback
- Encrypted backup codes (8 single-use codes) for account recovery
- Tenant-level MFA enforcement for enterprise plans
- Grace period for MFA enrollment after admin enables requirement

### Session Management

- Server-side sessions stored in PostgreSQL with cryptographically random session IDs
- Session cookie: `s2i.sid`, `HttpOnly`, `Secure` (production), `SameSite=Strict`
- 4-hour idle timeout with automatic cleanup
- 30-day maximum session lifetime
- Concurrent session limits per user
- Immediate session invalidation on password change or account lockout
- `deleteUserSessions()` function for administrative forced logout

### Role-Based Access Control (RBAC)

Four defined roles with enforced permissions:

| Role | Description | Access Scope |
|------|-------------|-------------|
| `admin` | Platform administrator | Full system access |
| `educational_admin` | Institution administrator | Tenant-scoped admin operations |
| `student` | Student user | Own profile, applications, AI features |
| `corporate_partner` | Corporate partner | Listings, applicant review, talent pool |

- Every API route enforces authentication via `requireAuth()`
- Role-specific routes enforce authorization via `requireRole()`
- Tenant scoping ensures users can only access data within their institution

---

## 4. Data Protection

### Encryption

#### In Transit
- **TLS 1.2+** enforced on all connections
- **HSTS** with 2-year max-age, `includeSubDomains`, and `preload` directive
- SSL certificates managed by Heroku with automatic renewal
- Database connections encrypted via SSL in production

#### At Rest
- PostgreSQL data encrypted at rest via AWS RDS storage encryption (AES-256)
- Heroku Redis encrypted at rest
- **Field-level encryption** for sensitive API keys and integration credentials using AES-256-GCM
- Cloudinary media stored with server-side encryption

### PII Handling

- **Response sanitization**: API responses automatically strip PII fields based on the caller's role
- **Input sanitization**: All user inputs sanitized to prevent XSS and injection attacks
- **Denormalized PII**: Application records containing student names/emails are anonymized on account deletion
- **AI data minimization**: Only necessary context sent to AI providers; full PII is not included in AI prompts where avoidable

### Data Retention

- Active user data retained for the duration of the account
- Audit logs retained for 7 years (configurable per compliance requirement)
- Deleted account data purged within 30 days of deletion request
- AI conversation history retained for 90 days, then automatically purged
- Session records purged after expiration

### Backup & Recovery

- Automated daily database backups via Heroku PGBackups
- Point-in-time recovery (PITR) available with continuous WAL archiving
- Backup encryption at rest using AWS KMS
- Backup restoration tested quarterly
- RTO: 4 hours | RPO: 1 hour (with continuous protection)

---

## 5. Network & Infrastructure Security

### Edge Security

- **Cloudflare WAF** (Web Application Firewall) protecting against OWASP Top 10
- **DDoS protection** at network and application layers
- **Bot management** to prevent credential stuffing and scraping
- IP reputation filtering

### Security Headers

All responses include:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `Content-Security-Policy` | Strict with nonce-based script allowlisting | Prevent XSS |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leakage |
| `Permissions-Policy` | Restricted camera, microphone, geolocation | Limit browser APIs |

### Request Validation

- **Null byte injection** blocking in middleware
- **Request body size limits**: 1MB default, 10MB for file uploads
- **Zod schema validation** on every API endpoint — malformed requests rejected before processing
- **File upload validation**: Magic byte verification, extension blocklist, size limits

---

## 6. Application Security

### CSRF Protection

- **Double-submit cookie pattern**: A CSRF token is set as an HttpOnly cookie and must be included in a custom header (X-CSRF-Token) on all state-changing requests
- Validation occurs in Next.js middleware before the request reaches any API route
- GET, HEAD, and OPTIONS requests are exempt (safe methods)

### Input Validation

- **Zod schemas** define strict type contracts for every API endpoint
- Unknown fields are stripped (preventing mass assignment attacks)
- String lengths are bounded to prevent denial-of-service via oversized payloads
- Email, URL, and enum fields are validated against their respective formats

### Output Encoding

- React's default JSX escaping prevents XSS in rendered output
- Rich text content is sanitized before rendering
- API responses are JSON-encoded with proper Content-Type headers

### Dependency Management

- `npm audit` run in CI pipeline on every build
- Dependabot alerts enabled for known vulnerabilities
- Dependencies reviewed before upgrades
- Lock file (package-lock.json) committed to prevent supply chain attacks

### Rate Limiting

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 10 requests | Per minute |
| Read operations | 60 requests | Per minute |
| Write operations | 30 requests | Per minute |
| AI features | 20 requests | Per minute |
| File uploads | 10 requests | Per minute |

Rate limiting is backed by Redis for consistency across application instances.

### Audit Logging

14 auditable event types are logged to both the database and the application log drain:

- `login_success`, `login_failure`
- `password_change`, `password_reset_request`, `password_reset_complete`
- `mfa_enroll`, `mfa_verify`, `mfa_disable`
- `role_change`, `account_lockout`, `account_deleted`
- `data_export`, `consent_change`
- `admin_action`

Each log entry includes: timestamp, user ID, IP address, user agent, event type, metadata, and tenant ID.

---

## 7. AI & Machine Learning Security

### AI Feature Overview

Proveground uses Anthropic's Claude API for five AI-powered features:

1. **AI Coaching Chat** — Personalized career guidance for student-athletes
2. **Candidate Screening** — AI-assisted applicant evaluation for corporate partners
3. **Portfolio Bio Generation** — AI-assisted professional biography writing
4. **Institutional Analytics** — AI-generated insights from aggregate program data
5. **Match Engine** — 9-factor compatibility scoring between students and opportunities

### AI Security Controls

- **Data minimization**: Only necessary context is included in AI prompts; full database records are not sent
- **Opt-out enforcement**: Users who set `aiTrainingOptOut = true` have their data flagged in all AI API calls to prevent use in model training
- **Fairness constraints**: All AI features include documented AI_FAIRNESS_CONSTRAINTS ensuring:
  - No discrimination based on protected characteristics
  - Athletic status is not used as a negative factor
  - Socioeconomic indicators are excluded from evaluation
- **AI disclaimers**: All AI-generated content is clearly labeled with AI_DISCLAIMER_TEXT
- **Prompt injection prevention**: User inputs are sanitized before inclusion in AI prompts
- **No autonomous decision-making**: AI provides recommendations; all final decisions require human action
- **Data Processing Agreement**: Executed with Anthropic covering FERPA-protected data handling

### Responsible AI Commitment

- Regular bias audits of AI matching and screening outputs
- Human-in-the-loop review for all AI-assisted hiring decisions
- Transparent AI decision explanations (match score breakdowns are human-readable)
- Opt-out mechanism for users who prefer not to use AI features

---

## 8. Compliance & Certifications

### Current Compliance Status

| Framework | Status | Target Date |
|-----------|--------|------------|
| **FERPA** | Compliant — consent-based data sharing, annual notifications, opt-out mechanisms | Current |
| **CCPA/CPRA** | Compliant — right to deletion, data portability, opt-out of data selling | Current |
| **HECVAT Lite** | Completed | Current |
| **SOC 2 Type I** | In progress | Q3 2026 |
| **SOC 2 Type II** | Planned | Q1 2027 |
| **WCAG 2.2 AA** | In progress — Radix UI foundation, remediation underway | Q2 2026 |
| **Section 508** | VPAT in development | Q2 2026 |
| **GDPR** | Applicable controls implemented (consent, deletion, portability) | Current |

### FERPA Compliance

As a platform handling educational records, Proveground implements specific FERPA safeguards:

- **Written consent** required before any student data is shared with corporate partners
- **Directory information** designation allows students to control which fields are publicly visible
- **Annual rights notification** sent to all active students
- **Record correction** mechanism for students to request data corrections
- **Minimum necessary** principle applied to all data sharing
- **Audit trail** for all data access and sharing events
- **Data Processing Agreements** with all sub-processors handling student data

### Data Residency

- All data stored in **AWS US-East-1** (Northern Virginia) region
- Database backups stored in the same region
- No data transfers outside the United States without explicit customer consent

---

## 9. Incident Response

Proveground maintains a documented Incident Response Plan (IRP) covering:

1. **Identification** — Automated monitoring (Sentry, health checks) and human reporting channels
2. **Containment** — Immediate isolation procedures for compromised components
3. **Eradication** — Root cause analysis and remediation
4. **Recovery** — Service restoration with verification
5. **Post-Incident** — Retrospective, customer notification, and process improvement

### Notification Commitments

- **Security incidents**: Affected customers notified within 72 hours of confirmed breach
- **Service disruptions**: Status page updated within 30 minutes of detection
- **Planned maintenance**: 48-hour advance notice via email

See our full Incident Response Plan (docs/INCIDENT_RESPONSE_PLAN.md) for details.

---

## 10. Vendor Management

All third-party vendors processing customer data are evaluated and documented:

| Vendor | Purpose | Data Processed | DPA Status | SOC 2 |
|--------|---------|---------------|-----------|-------|
| **Anthropic** | AI features | De-identified student context | Executed | Yes |
| **Heroku (Salesforce)** | Hosting | All application data | Platform DPA | Yes |
| **AWS (via Heroku)** | Infrastructure | All application data | Platform DPA | Yes |
| **Mailgun** | Email delivery | Email addresses, names | Executed | Yes |
| **Cloudinary** | Media storage | Uploaded images/documents | Executed | Yes |
| **Cloudflare** | CDN / WAF | Request metadata | Executed | Yes |
| **Sentry** | Error tracking | Error context (no PII) | Executed | Yes |

### Vendor Security Requirements

- All vendors must maintain SOC 2 Type II or equivalent certification
- Data Processing Agreements (DPAs) executed with all sub-processors
- Annual vendor security review
- Vendor list disclosed to customers upon request

---

## 11. Business Continuity

### Availability Target

- **99.9% uptime SLA** for production environments
- Measured on a monthly basis using external monitoring
- Excludes planned maintenance windows (communicated 48 hours in advance)

### Disaster Recovery

| Metric | Target |
|--------|--------|
| Recovery Time Objective (RTO) | 4 hours |
| Recovery Point Objective (RPO) | 1 hour |
| Backup Frequency | Continuous (WAL archiving) + daily snapshots |
| Backup Retention | 30 days |
| DR Testing | Quarterly |

### High Availability

- Application runs on multiple dynos with automatic load balancing
- Database with automated failover and read replicas
- Redis with persistence and automatic recovery
- CDN edge caching for static assets and API responses
- Health check endpoints for automated monitoring and alerting

---

## Contact

For security inquiries, vulnerability reports, or compliance questions:

- **Security Team**: security@proveground.com
- **Privacy Team**: privacy@proveground.com
- **Vulnerability Disclosure**: security@proveground.com (PGP key available on request)

---

*This document is reviewed and updated quarterly. The most current version is always available at docs.proveground.com/security.*
