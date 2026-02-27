# Proveground Data Residency & Hosting Documentation

**Effective Date:** February 23, 2026
**Version:** 1.0
**Classification:** Public

---

## 1. Hosting Infrastructure

### Primary Application

| Component | Provider | Region | Certification |
|-----------|----------|--------|---------------|
| **Application servers** | Heroku (Salesforce) on AWS | US-East-1 (N. Virginia, USA) | SOC 1/2/3, ISO 27001, FedRAMP |
| **PostgreSQL database** | Heroku Postgres on AWS RDS | US-East-1 (N. Virginia, USA) | SOC 1/2/3, ISO 27001, FedRAMP |
| **Redis cache** | Heroku Data for Redis on AWS | US-East-1 (N. Virginia, USA) | SOC 1/2/3, ISO 27001 |
| **DNS & CDN** | Heroku Edge (AWS CloudFront) | Global edge locations, origin in US-East-1 | SOC 2, ISO 27001 |

### Third-Party Sub-Processors

| Service | Provider | Purpose | Data Region | Data Processed |
|---------|----------|---------|-------------|----------------|
| **AI Processing** | Anthropic (Claude API) | AI coaching, matching insights, portfolio intelligence | United States | Prompts containing student/project data (no PII stored by Anthropic per DPA) |
| **Email Delivery** | Mailgun (Sinch) | Transactional emails | US (AWS) | Email addresses, names, email content |
| **Media Storage** | Cloudinary | Profile photos, uploaded documents, video hosting | US (AWS US-East-1) | Uploaded images, documents, videos |
| **Source Control** | GitHub (Microsoft) | Application source code | United States | Source code only (no customer data) |
| **Error Monitoring** | Sentry (Functional Software) | Application error tracking | US (GCP us-central1) | Error stack traces, request metadata (no PII by policy) |

---

## 2. Data Classification & Storage Locations

### Where Each Data Type Lives

| Data Category | Storage Location | Encrypted at Rest | Encrypted in Transit | Backup Location |
|--------------|-----------------|-------------------|---------------------|-----------------|
| **Student PII** (name, email, phone, address) | Heroku Postgres, US-East-1 | Yes (AES-256) | Yes (TLS 1.2+) | Heroku Postgres WAL archive, US-East-1 |
| **Authentication credentials** (password hashes, MFA secrets) | Heroku Postgres, US-East-1 | Yes (AES-256 + bcrypt/AES-GCM) | Yes (TLS 1.2+) | Heroku Postgres WAL archive, US-East-1 |
| **Academic records** (GPA, major, university, FERPA-protected data) | Heroku Postgres, US-East-1 | Yes (AES-256) | Yes (TLS 1.2+) | Heroku Postgres WAL archive, US-East-1 |
| **Application data** (cover letters, project submissions) | Heroku Postgres, US-East-1 | Yes (AES-256) | Yes (TLS 1.2+) | Heroku Postgres WAL archive, US-East-1 |
| **Match scores & analytics** | Heroku Postgres, US-East-1 | Yes (AES-256) | Yes (TLS 1.2+) | Heroku Postgres WAL archive, US-East-1 |
| **AI conversation logs** | Heroku Postgres, US-East-1 | Yes (AES-256) | Yes (TLS 1.2+) | Heroku Postgres WAL archive, US-East-1 |
| **Uploaded media** (photos, resumes, videos) | Cloudinary CDN, origin US-East-1 | Yes (AES-256) | Yes (TLS 1.2+) | Cloudinary redundant storage |
| **Session tokens** | Heroku Postgres + Redis, US-East-1 | Yes (AES-256) | Yes (TLS 1.2+) | N/A (ephemeral) |
| **Audit logs** | Heroku Postgres, US-East-1 | Yes (AES-256) | Yes (TLS 1.2+) | Heroku Postgres WAL archive, US-East-1 |
| **SSO/IdP configuration** (SAML certs, OIDC secrets) | Heroku Postgres, US-East-1 | Yes (AES-256-GCM application-level encryption) | Yes (TLS 1.2+) | Heroku Postgres WAL archive, US-East-1 |
| **FERPA consent records** | Heroku Postgres, US-East-1 | Yes (AES-256) | Yes (TLS 1.2+) | Heroku Postgres WAL archive, US-East-1 |

---

## 3. Data Sovereignty & Cross-Border Transfers

### Current State

**All customer data is stored and processed within the United States.**

- Primary data store: AWS US-East-1 (Virginia)
- Database backups: AWS US-East-1 (Virginia)
- No customer data is transferred to, stored in, or processed from servers outside the United States
- CDN edge caches may temporarily cache static assets (CSS, JS, images) at global edge locations, but no PII is cached at edge nodes

### AI Data Processing

When AI features are used:
- Prompts are sent to Anthropic's API endpoints in the United States
- Anthropic does **not** retain customer data for training purposes (per our Data Processing Agreement)
- AI responses are stored in our PostgreSQL database in US-East-1
- Students may opt out of AI processing via the FERPA consent preferences; opted-out users' data is never sent to AI providers

### International Users

Proveground may be accessed by users outside the United States (e.g., international students). In these cases:
- User-submitted data travels over TLS 1.2+ encrypted connections to our US-based servers
- All data is stored in the United States regardless of the user's geographic location
- Proveground does not operate data centers or store data outside the United States

---

## 4. Encryption Standards

### At Rest

| Layer | Method | Key Management |
|-------|--------|---------------|
| **Database storage** | AWS RDS AES-256 encryption | AWS KMS managed keys |
| **Database backups** | AWS RDS AES-256 encryption | AWS KMS managed keys |
| **Redis cache** | AWS ElastiCache AES-256 encryption | AWS KMS managed keys |
| **Application-level secrets** (SSO certs, MFA secrets, API keys) | AES-256-GCM | Application ENCRYPTION_KEY in Heroku config vars (encrypted at rest by Heroku) |
| **Password hashes** | bcrypt (cost factor 10) | N/A (one-way hash) |
| **Backup codes** | SHA-256 hash | N/A (one-way hash) |

### In Transit

| Connection | Protocol | Minimum Version |
|------------|----------|-----------------|
| **Client to application** | TLS | 1.2 |
| **Application to database** | TLS | 1.2 (SSL required) |
| **Application to Redis** | TLS | 1.2 |
| **Application to Anthropic API** | TLS | 1.2 |
| **Application to Mailgun** | TLS | 1.2 |
| **Application to Cloudinary** | TLS | 1.2 |
| **Internal Heroku routing** | TLS | 1.2 |

### Key Rotation

- AWS KMS keys: Automatic annual rotation
- Application ENCRYPTION_KEY: Manual rotation with re-encryption migration (documented in incident response plan)
- Database credentials: Rotatable via Heroku credential rotation (documented in runbook)

---

## 5. Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| **Active user data** | Duration of account + 30 days after deletion request | Cascade deletion from all tables |
| **Deleted user data** | Purged within 30 days of deletion request | Hard delete with anonymization of rated applications |
| **Audit logs** | 7 years (FERPA requirement) | Automated purge after retention period |
| **FERPA consent records** | 7 years after last consent action | Retained for legal defensibility |
| **Session data** | 30 days maximum | Automatic expiry + cleanup |
| **AI conversation logs** | Duration of account | Deleted with account |
| **Database backups** | 7 days (continuous WAL), 30 days (snapshots) | Automatic rotation |
| **Error monitoring data** | 90 days | Automatic purge by Sentry |
| **Email delivery logs** | 30 days | Automatic purge by Mailgun |

---

## 6. Physical Security

Proveground does not operate its own data centers. All infrastructure is hosted on **Amazon Web Services (AWS)** via Heroku. AWS physical security controls include:

- **24/7 staffed security** at all data center facilities
- **Biometric access controls** and multi-factor authentication for physical entry
- **Video surveillance** with 90-day retention
- **Environmental controls** (fire suppression, climate control, flood detection)
- **Redundant power** (UPS, diesel generators)
- **SOC 2 Type II certified** data center operations
- **ISO 27001 certified** information security management

AWS compliance reports are available via [AWS Artifact](https://aws.amazon.com/artifact/).

---

## 7. Network Security

| Control | Implementation |
|---------|---------------|
| **DDoS protection** | AWS Shield Standard (automatic) |
| **Web Application Firewall** | Heroku router + application-level rate limiting |
| **Rate limiting** | Per-IP and per-user with Redis-backed cross-dyno enforcement |
| **Account lockout** | 5 failed attempts triggers 15-minute lockout |
| **CSRF protection** | Double-submit cookie pattern on all mutation endpoints |
| **Content Security Policy** | Strict CSP headers preventing XSS |
| **HSTS** | 2-year max-age with preload |

---

## 8. Compliance Certifications

### Infrastructure Provider (AWS/Heroku)

| Certification | Status |
|--------------|--------|
| SOC 1 Type II | Current |
| SOC 2 Type II | Current |
| SOC 3 | Current |
| ISO 27001 | Current |
| ISO 27017 | Current |
| ISO 27018 | Current |
| FedRAMP Moderate | Current |
| PCI DSS Level 1 | Current |

### Proveground Application

| Certification | Status |
|--------------|--------|
| FERPA compliance | Implemented (consent layer, directory preferences, data filtering) |
| HECVAT Lite | Completed (available upon request) |
| VPAT 2.4 (WCAG 2.2) | Completed (available upon request) |
| SOC 2 Type I | In progress |
| Penetration test | Scheduled |

---

## 9. Data Portability

Customers and individual users can export their data at any time:

- **Individual users:** JSON export via Settings > Export Your Data (`GET /api/profile/export`)
- **Tenant administrators:** Bulk data export available upon request
- **Format:** JSON with structured schema, timestamped and versioned
- **Scope:** All user-associated data including profile, applications, ratings, messages, AI conversations, portfolio, skills, match scores, and notifications

---

## 10. Sub-Processor Management

Proveground maintains a current list of sub-processors. Changes to sub-processors will be communicated to Enterprise customers with **30 days advance notice**, providing an opportunity to object.

Current sub-processor list (as of February 2026):

| Sub-Processor | Service | Data Access | DPA Status |
|--------------|---------|-------------|------------|
| Amazon Web Services (via Heroku/Salesforce) | Infrastructure hosting | All data (encrypted) | Covered by Heroku DPA |
| Anthropic | AI processing | Prompt data (no retention) | In progress |
| Mailgun (Sinch) | Email delivery | Email addresses, names | Covered by Mailgun DPA |
| Cloudinary | Media storage | Uploaded files | Covered by Cloudinary DPA |
| Sentry (Functional Software) | Error monitoring | Error metadata (no PII) | Covered by Sentry DPA |

---

## Contact

**Data Protection Inquiries:** privacy@proveground.com
**Security Team:** security@proveground.com
**Enterprise Sales:** sales@proveground.com
