# HECVAT Lite — Proveground

**Higher Education Community Vendor Assessment Toolkit (HECVAT) - Lite**
**Version:** 1.0
**Date:** February 2026
**Vendor:** Proveground (Street2Ivy, Inc.)
**Product:** Proveground SaaS Platform

---

## Company Information

| Field | Response |
|-------|----------|
| Company Legal Name | Street2Ivy, Inc. (d/b/a Proveground) |
| Product/Service Name | Proveground |
| Company Website | https://proveground.com |
| Primary Contact | security@proveground.com |
| Year Founded | 2024 |
| Company Headquarters | United States |
| Number of Employees | 1-10 |

---

## HCLT-01: Documentation

**Q: Do you have a publicly available security/privacy page or trust center?**
A: Yes. Our Security Whitepaper is available at docs.proveground.com/security. Privacy Policy is published at proveground.com/legal/privacy. Terms of Service at proveground.com/legal/terms.

**Q: Do you have a documented Information Security Policy?**
A: Yes. Our security practices are documented in our Security Whitepaper covering authentication, encryption, access control, incident response, and vendor management.

---

## HCLT-02: Access Control

**Q: Do you support Single Sign-On (SSO) via SAML or OIDC?**
A: Yes. We support both SAML 2.0 and OpenID Connect (OIDC) for institutional SSO. Per-tenant IdP configuration is available through our admin dashboard.

**Q: Do you support Multi-Factor Authentication (MFA)?**
A: Yes. TOTP-based MFA with backup codes. Enterprise tenants can enforce MFA for all users.

**Q: Do you implement Role-Based Access Control (RBAC)?**
A: Yes. Four roles (admin, educational_admin, student, corporate_partner) with enforced permissions. All API endpoints verify both authentication and authorization.

**Q: How are user accounts provisioned and deprovisioned?**
A: Accounts can be created via self-registration, SSO JIT provisioning, CSV bulk import, or SCIM 2.0 automated provisioning. Deprovisioning available via admin dashboard, SCIM, or user-initiated account deletion.

**Q: Do you support automatic session timeout?**
A: Yes. Sessions have a 4-hour idle timeout and 30-day maximum lifetime. Sessions are invalidated on password change.

---

## HCLT-03: Application Security

**Q: Do you perform regular vulnerability assessments?**
A: Yes. We run npm audit in our CI/CD pipeline, maintain Dependabot alerts for dependency vulnerabilities, and conduct annual penetration testing by an independent security firm.

**Q: Do you have a secure development lifecycle (SDLC)?**
A: Yes. Our development process includes: code review for all changes, automated linting and type checking, Zod schema validation on all API inputs, CSRF protection, input sanitization, and response sanitization. CI/CD pipeline enforces lint, typecheck, and security audit on every commit.

**Q: How do you protect against common web vulnerabilities (OWASP Top 10)?**
A: We implement: CSRF double-submit tokens (A01), Zod input validation (A03), bcrypt password hashing (A02), CSP headers (A07), SQL parameterization via ORM (A03), rate limiting (A04), security headers (A05), file upload validation (A08), audit logging (A09).

**Q: Do you have an incident response plan?**
A: Yes. Our documented Incident Response Plan covers identification, containment, eradication, recovery, and post-incident review. Affected customers are notified within 72 hours of a confirmed breach.

---

## HCLT-04: Data Protection

**Q: Is data encrypted in transit?**
A: Yes. TLS 1.2+ is enforced on all connections. HSTS with 2-year max-age and preload is enabled.

**Q: Is data encrypted at rest?**
A: Yes. PostgreSQL uses AWS RDS encryption (AES-256). Redis is encrypted at rest. Sensitive fields (API keys) use additional AES-256-GCM field-level encryption.

**Q: Where is customer data stored?**
A: All data is stored in AWS US-East-1 (Northern Virginia) region. No data is transferred outside the United States without explicit customer consent.

**Q: Do you have a data retention and disposal policy?**
A: Yes. Active data is retained for account duration. Deleted account data is purged within 30 days. AI conversation logs are retained for 90 days. Audit logs are retained for 7 years.

**Q: Can customers export their data?**
A: Yes. Users can export all their data via the data portability endpoint (GET /api/profile/export). Institutional admins can export aggregate reports.

**Q: Can users delete their accounts and data?**
A: Yes. Account deletion is available through platform settings with cascade deletion of all associated data. Denormalized PII is anonymized. An audit trail of the deletion is maintained.

---

## HCLT-05: FERPA Compliance

**Q: Does the application handle FERPA-protected education records?**
A: Yes. Proveground handles student academic and professional development data that may constitute education records under FERPA.

**Q: How do you ensure FERPA compliance?**
A: Written consent is required before student data is shared with corporate partners. Students can designate directory vs. non-directory information. Annual FERPA rights notifications are sent. Record correction mechanisms are available. All data sharing is logged in the audit trail.

**Q: Do you have a Data Processing Agreement (DPA) available?**
A: Yes. We execute DPAs with all institutional customers. Our DPA includes FERPA-specific provisions.

**Q: Who is the data owner?**
A: The educational institution remains the data owner. Proveground acts as a data processor/school official under the institution's FERPA policies.

---

## HCLT-06: Accessibility

**Q: Does your product comply with Section 508 and WCAG 2.2 AA?**
A: We are actively working toward WCAG 2.2 AA compliance. Our application is built on Radix UI primitives which provide strong accessibility foundations (keyboard navigation, screen reader support, ARIA attributes). A VPAT document is in development with target completion Q2 2026.

**Q: Do you have a Voluntary Product Accessibility Template (VPAT)?**
A: A VPAT is currently in development. Our accessibility remediation roadmap addresses: skip navigation, heading hierarchy, ARIA landmarks, color contrast, form error association, and reduced motion support.

---

## HCLT-07: Third-Party Risk

**Q: Do you use third-party sub-processors?**
A: Yes. Our sub-processors are:

| Sub-Processor | Purpose | DPA |
|---------------|---------|-----|
| Anthropic | AI features | Yes |
| Heroku (Salesforce) | Hosting | Yes |
| AWS | Infrastructure | Yes |
| Mailgun | Email | Yes |
| Cloudinary | Media storage | Yes |
| Cloudflare | CDN/WAF | Yes |
| Sentry | Error tracking | Yes |

**Q: Do all sub-processors have DPAs in place?**
A: Yes. Data Processing Agreements are executed with all sub-processors.

**Q: Do your sub-processors maintain security certifications?**
A: Yes. All sub-processors maintain SOC 2 Type II or equivalent certifications.

---

## HCLT-08: Business Continuity

**Q: What is your uptime SLA?**
A: 99.9% uptime SLA for production environments, measured monthly.

**Q: Do you have a disaster recovery plan?**
A: Yes. RTO: 4 hours. RPO: 1 hour. Automated daily backups with continuous WAL archiving. DR plan tested quarterly.

**Q: How do you handle service outages?**
A: Automated health monitoring with Sentry and external checks. On-call engineering rotation. Status page updated within 30 minutes of detection. Post-incident reviews after every SEV-1/SEV-2 event.

---

## HCLT-09: AI & Automated Decision-Making

**Q: Does your product use AI or machine learning?**
A: Yes. Proveground uses AI for career coaching, candidate screening assistance, portfolio optimization, and student-opportunity matching.

**Q: How do you ensure AI fairness and transparency?**
A: All AI features include documented fairness constraints preventing discrimination based on protected characteristics. AI-generated content is clearly labeled. Match score breakdowns provide human-readable explanations. No autonomous hiring decisions — AI provides recommendations only.

**Q: Can users opt out of AI features?**
A: Yes. Users can set an AI training opt-out preference. This flag is enforced across all AI API endpoints.

**Q: Is student data used to train AI models?**
A: No. Student data is not used for model training. Anthropic's Claude API processes data for inference only, governed by our DPA. Users who set the opt-out flag have additional protections.

---

## HCLT-10: Compliance Certifications

| Certification | Status |
|--------------|--------|
| SOC 2 Type I | In progress (target Q3 2026) |
| SOC 2 Type II | Planned (target Q1 2027) |
| ISO 27001 | Planned |
| FERPA Compliant | Yes |
| CCPA/CPRA Compliant | Yes |
| GDPR Applicable Controls | Yes |
| WCAG 2.2 AA | In progress |
| HECVAT Full | Planned |
| Penetration Test | Annual (most recent: [date]) |

---

## Additional Information

### Insurance
- Cyber liability insurance: [Policy details to be provided]
- General liability insurance: [Policy details to be provided]

### Contact for Security Inquiries
- Email: security@proveground.com
- For vulnerability reports: security@proveground.com (PGP key available)
- For FERPA-related inquiries: privacy@proveground.com

---

*This HECVAT Lite response is current as of the date shown above. For the most current information, contact security@proveground.com.*
