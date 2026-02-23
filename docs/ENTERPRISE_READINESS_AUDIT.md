# PROVEGROUND: Enterprise Readiness Audit & Roadmap

**Date:** February 23, 2026
**Version:** 1.0
**Platform:** Proveground (formerly Street2Ivy)
**Current Deployment:** Heroku (street2ivy-dev, v222)
**Architecture:** Next.js 14 App Router, PostgreSQL, Mailgun, Cloudinary, Anthropic Claude

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Gap Analysis Matrix](#2-gap-analysis-matrix)
3. [Prioritized Roadmap](#3-prioritized-roadmap)
4. [Resource Estimates](#4-resource-estimates)
5. [Risk Register](#5-risk-register)
6. [Sales Readiness Checklist](#6-sales-readiness-checklist)

---

## 1. Executive Summary

Proveground has a **strong product foundation** — genuine multi-tenancy, feature gating across 26 flags, an AI coaching layer, a match engine, outcomes dashboards, and the beginnings of a solid security stack (CSRF, bcrypt, audit logging, session management, CSP headers, Zod validation). The platform is functional and deployed.

However, the platform is **not enterprise-ready** in its current state. Five critical gaps block institutional sales:

1. **No SSO/SAML/OIDC** — Every university IT department requires this. 501 stubs exist but zero implementation.
2. **No MFA** — Baseline requirement for SOC 2 and institutional security policies.
3. **No FERPA compliance layer** — Zero consent mechanisms, no directory information controls, student PII shared with corporate partners and AI vendors without documented consent.
4. **No LTI 1.3** — The standard integration protocol for university LMS ecosystems. Completely absent.
5. **In-memory rate limiting & lockout** — Cannot scale beyond a single Heroku dyno without Redis, creating both security and availability gaps.

**Maturity Assessment:**

| Domain | Score | Descriptor |
|--------|-------|-----------|
| Core Product & UX | 7/10 | Functional, needs polish |
| Multi-Tenancy | 8/10 | Strong architecture |
| Authentication | 5/10 | Solid base, missing SSO/MFA |
| Authorization | 6/10 | RBAC exists, enforcement gaps |
| Data Privacy / FERPA | 2/10 | Critical gap |
| Security Infrastructure | 6/10 | Good headers/CSRF, needs hardening |
| Observability | 2/10 | No Sentry, no APM, minimal health checks |
| Infrastructure / HA | 3/10 | Single-dyno, no DR plan |
| Accessibility (WCAG 2.2) | 4/10 | Radix base is good, gaps in custom components |
| Enterprise Integrations | 2/10 | Handshake only, no LTI/SIS/SCIM |
| Documentation | 1/10 | No API docs, no VPAT, no security whitepaper |
| Compliance Certifications | 0/10 | No SOC 2, no ISO 27001, no HECVAT |

---

## 2. Gap Analysis Matrix

### 2.1 Security Certifications

| Requirement | Current Status | Priority | Effort | Dependencies |
|---|---|---|---|---|
| **SOC 2 Type II** | Not started | P0 | 6-12 months | MFA, audit logging, access reviews, vendor management, incident response plan |
| **ISO 27001** | Not started | P2 | 12-18 months | SOC 2 controls as foundation |
| **HECVAT (Higher Ed)** | Not started | P1 | 2-3 months (questionnaire) | Requires SOC 2 progress, FERPA compliance, documented security practices |
| **HECVAT Lite** | Not started | P0 | 2-4 weeks (questionnaire) | Can start now with current security posture |
| **Penetration Test** | Not performed | P0 | 2-4 weeks | External vendor, fix critical findings before enterprise sales |
| **Vulnerability Scanning** | Not implemented | P1 | 1-2 weeks | Snyk/Dependabot for dependencies, SAST for code |

### 2.2 Security Infrastructure

| Requirement | Current Status | Priority | Effort | Dependencies |
|---|---|---|---|---|
| **SSO / SAML 2.0** | 501 stub, 3 route files | P0 | 3-4 weeks | `@node-saml/passport-saml` or `saml2-js`, IdP metadata storage, tenant SSO config UI |
| **SSO / OIDC** | Not started | P0 | 2-3 weeks | `openid-client`, integrates with same SSO config as SAML |
| **MFA (TOTP)** | 501 stub, 3 route files | P0 | 2-3 weeks | `otplib`, TOTP secret encryption, backup codes, enrollment flow |
| **MFA (SMS)** | Not started | P2 | 1-2 weeks | Twilio/SNS, phone number verification |
| **SCIM 2.0 Provisioning** | Not started | P1 | 4-6 weeks | User lifecycle management, group mapping, schema compliance |
| **Redis (rate limit/lockout)** | In-memory Map() only | P0 | 1-2 days | Heroku Data for Redis addon |
| **Row-Level Security (DB)** | Only on `network_applications` (with bypass flaw) | P1 | 2-3 weeks | Apply RLS to `users`, `listings`, `project_applications`, `ai_messages`, `notifications` |
| **Role enforcement gaps** | Corporate routes lack role checks | P0 | 2-3 days | Add `requireRole()` calls to ~20 API routes |
| **Session hardening** | `sameSite: 'lax'`, 30-day TTL | P1 | 1 day | Change to `strict`, reduce TTL to 7-14 days, add concurrent session limits |
| **Nonce-based CSP** | `'unsafe-inline'` in script-src | P2 | 1-2 weeks | Next.js nonce middleware integration |
| **Email verification token hashing** | Stored as plaintext | P1 | 0.5 days | SHA-256 hash like password reset tokens |
| **CRON_SECRET enforcement** | Skipped if env var missing | P0 | 0.5 days | Fail-closed: return 500 if not configured |
| **Breach corpus check** | Not implemented | P2 | 1-2 days | HaveIBeenPwned API integration |

### 2.3 Compliance — FERPA

| Requirement | Current Status | Priority | Effort | Dependencies |
|---|---|---|---|---|
| **FERPA disclosure notice** | Not implemented | P0 | 1 week | Registration flow update, legal copy |
| **Written consent for data sharing** | Not implemented | P0 | 2-3 weeks | Consent records table, consent flow before corporate partner views student data, withdrawal mechanism |
| **Directory information designation** | Not implemented | P1 | 1-2 weeks | UI for students to select directory vs non-directory fields, enforcement in API responses |
| **Annual FERPA rights notification** | Not implemented | P1 | 1 week | Email template, cron job, acknowledgment tracking |
| **Record correction mechanism** | Not implemented | P2 | 1 week | Student-initiated correction request flow |
| **Data Processing Agreement with Anthropic** | Not executed | P0 | Legal process | Required before sending student PII to Claude API |
| **AI training opt-out enforcement** | UI exists, never checked in AI routes | P0 | 1-2 days | Check `aiTrainingOptOut` flag in all `/api/ai/` routes |
| **Parental consent (minors)** | Not implemented | P2 | 2-3 weeks | Age gate, parent/guardian consent flow |

### 2.4 Compliance — State Privacy & AI Laws

| Requirement | Current Status | Priority | Effort | Dependencies |
|---|---|---|---|---|
| **Privacy Policy (published)** | Table exists, content empty | P0 | 1 week | Legal review, tenant-scoped versioning |
| **Cookie consent banner** | Not implemented (legacy code not ported) | P0 | 1 week | `react-cookie-consent` or custom, CCPA/GDPR modes |
| **Right to deletion / account deletion** | Not implemented | P0 | 2-3 weeks | Cascade deletion, denormalized PII cleanup, audit trail |
| **Data portability / export** | No user-facing export | P1 | 1-2 weeks | `GET /api/profile/export` returning all user data as JSON/ZIP |
| **Data retention policies** | Not implemented | P1 | 2 weeks | TTL-based cleanup cron, configurable retention per data type |
| **AI transparency disclosure** | AI disclaimer exists | Done | — | `AI_DISCLAIMER_TEXT` and `AI_FAIRNESS_CONSTRAINTS` already implemented |
| **AI opt-in consent (not opt-out)** | Default is opted-in | P1 | 1 day | Invert default, require affirmative consent |
| **Small cohort re-identification protection** | Not implemented | P2 | 1 week | Min cohort size (k=5) before sending aggregates to AI |

### 2.5 Enterprise Features

| Requirement | Current Status | Priority | Effort | Dependencies |
|---|---|---|---|---|
| **LTI 1.3 Integration** | Not started | P1 | 6-8 weeks | `ltijs` library, platform registration, deep linking, grade passback |
| **SIS Integration (Banner/Workday)** | Not started | P2 | 8-12 weeks per SIS | API adapters, enrollment sync, external ID mapping |
| **Admin user impersonation** | Not implemented | P2 | 1-2 weeks | "Act as" with full audit trail |
| **Bulk user import (CSV)** | Not implemented | P1 | 1-2 weeks | CSV upload, validation, batch creation |
| **Webhook notifications** | Not started | P2 | 3-4 weeks | Webhook registration, event dispatch, retry logic, signing |
| **API documentation (OpenAPI)** | Not started | P1 | 2-3 weeks | Swagger/OpenAPI spec, dev portal |
| **API versioning** | Not implemented | P2 | 1-2 weeks | `/v1/` prefix, version negotiation |
| **Custom domain (CNAME)** | Not implemented | P2 | 2-3 weeks | SSL cert provisioning, DNS verification |
| **PDF report export** | Not implemented | P1 | 1-2 weeks | `@react-pdf/renderer` or Puppeteer |
| **Notification preferences** | Not implemented | P1 | 1-2 weeks | Per-type opt-in/out, digest frequency |

### 2.6 Infrastructure

| Requirement | Current Status | Priority | Effort | Dependencies |
|---|---|---|---|---|
| **Error tracking (Sentry)** | Not implemented | P0 | 0.5 days | `@sentry/nextjs` integration |
| **CI/CD pipeline** | Not implemented | P0 | 1-2 days | GitHub Actions: lint, typecheck, test, deploy |
| **Health check (comprehensive)** | DB-only check exists | P1 | 1 day | Add Mailgun, Cloudinary, Anthropic checks + liveness/readiness split |
| **Graceful shutdown** | Not implemented | P1 | 0.5 days | `SIGTERM` handler in `server.js` |
| **CDN** | Not implemented | P1 | 1-2 days | Cloudflare or Fastly in front of Heroku |
| **Migration tracking** | Two parallel systems, no tracking table | P1 | 1-2 days | Consolidate, add `schema_migrations` table |
| **Connection pooling (PgBouncer)** | Not configured | P1 | 0.5 days | Heroku `heroku-pgbouncer` buildpack before multi-dyno |
| **APM / performance monitoring** | Not implemented | P2 | 1-2 days | Datadog or New Relic integration |
| **DR plan / runbook** | Not documented | P1 | 2-3 days | RTO/RPO targets, backup verification, escalation |
| **Structured request logging** | Not implemented | P2 | 1 day | Request middleware with method/path/status/duration |
| **SSE → Redis pub/sub** | DB polling every 10s | P2 | 1-2 weeks | Replace with Redis pub/sub for multi-dyno |
| **`.env.example` completeness** | Missing Cloudinary, CRON_SECRET, SESSION_SECRET | P0 | 0.5 days | Document all required env vars |

### 2.7 Accessibility (WCAG 2.2 AA)

| Requirement | Current Status | Priority | Effort | Dependencies |
|---|---|---|---|---|
| **Radix UI primitives** | Used for Dialog, Select, Toast, Tabs, Tooltip, DropdownMenu | Partial | — | Good foundation for a11y |
| **Skip navigation link** | Not implemented | P1 | 0.5 days | Add skip-to-main-content link |
| **Heading hierarchy** | Not audited | P1 | 1-2 days | Ensure h1→h2→h3 on every page |
| **ARIA landmarks** | Partial (no `<main>`, `<nav>`, `<aside>` in many pages) | P1 | 2-3 days | Add landmark roles to layout components |
| **Focus management (route changes)** | Not implemented | P1 | 1 day | Focus management on client-side navigation |
| **Color contrast audit** | Not performed | P1 | 2-3 days | Automated scan + manual review |
| **Form error association** | Inconsistent (`aria-describedby` not used) | P1 | 2-3 days | Link error messages to inputs via `aria-describedby` |
| **`autocomplete` attributes** | Missing on all forms | P2 | 1 day | Add `autocomplete` to email, name, phone fields |
| **Touch target sizes (44x44)** | Not verified | P2 | 1-2 days | Audit mobile tap targets |
| **Keyboard trap audit** | Not performed | P1 | 1 day | Verify no traps in modals, sheets, dropdowns |
| **a11y automated testing** | Not set up | P1 | 1 day | Add `axe-core` or `jest-axe` to CI |
| **VPAT (Section 508)** | Not created | P1 | 1-2 weeks | Required for federal/state institution sales |
| **Accessibility statement page** | Not created | P1 | 0.5 days | Public-facing compliance statement |

### 2.8 Documentation & Sales Enablement

| Requirement | Current Status | Priority | Effort | Dependencies |
|---|---|---|---|---|
| **Security whitepaper** | Not created | P0 | 1-2 weeks | Architecture overview, encryption, access controls, compliance |
| **HECVAT Lite questionnaire** | Not completed | P0 | 2-4 weeks | Security documentation, vendor list, incident response plan |
| **Privacy policy (published)** | Empty in database | P0 | 1 week | Legal review |
| **Terms of service** | Empty in database | P0 | 1 week | Legal review |
| **API documentation** | Not started | P1 | 2-3 weeks | OpenAPI spec |
| **Incident response plan** | Not documented | P0 | 1 week | Response team, communication template, escalation path |
| **Vendor management register** | Not documented | P1 | 1 week | Anthropic, Mailgun, Cloudinary, Heroku — DPA status for each |
| **Data flow diagram** | Not documented | P1 | 2-3 days | Visual map of PII flow through system |
| **BAA/DPA with Anthropic** | Not executed | P0 | Legal process | Required for FERPA + student PII |
| **Uptime SLA documentation** | Not defined | P1 | 1 day | Target: 99.9% with measurement method |

---

## 3. Prioritized Roadmap

### Phase 0: Critical Blockers (0-30 days)

*Goal: Remove deal-breaker gaps that would fail any institutional security review.*

| # | Item | Effort | Owner |
|---|------|--------|-------|
| 0.1 | **Redis for rate limiting & account lockout** | 1-2 days | Backend |
| 0.2 | **Fix role enforcement gaps** — Add `requireRole()` to all corporate, student, education API routes (~20 files) | 2-3 days | Backend |
| 0.3 | **CRON_SECRET fail-closed** — Return 500 if env var not set | 0.5 days | Backend |
| 0.4 | **Sentry error tracking** — `@sentry/nextjs` integration | 0.5 days | Backend |
| 0.5 | **CI/CD pipeline** — GitHub Actions (lint, typecheck, deploy) | 1-2 days | DevOps |
| 0.6 | **AI training opt-out enforcement** — Check `aiTrainingOptOut` in all `/api/ai/` routes | 1-2 days | Backend |
| 0.7 | **Privacy policy + Terms of Service** — Publish actual content | 1 week | Legal + Eng |
| 0.8 | **Cookie consent banner** | 1 week | Frontend |
| 0.9 | **Right to deletion endpoint** — `DELETE /api/account` with cascade + audit trail | 2-3 weeks | Backend |
| 0.10 | **`.env.example` + `app.json`** — Document all required env vars | 0.5 days | DevOps |
| 0.11 | **Incident response plan** — Document response procedures | 1 week | Management |
| 0.12 | **HECVAT Lite questionnaire** — Complete with current capabilities | 2-4 weeks | Security + Management |
| 0.13 | **Security whitepaper** — Architecture, encryption, access controls | 1-2 weeks | Eng + Management |

**Phase 0 Total: ~6-8 weeks** (parallelizable — eng work is ~3-4 weeks, legal/docs in parallel)

---

### Phase 1: Enterprise Table Stakes (1-3 months)

*Goal: Meet the minimum bar for Tier 1 university RFP responses.*

| # | Item | Effort | Owner |
|---|------|--------|-------|
| 1.1 | **SSO / SAML 2.0 + OIDC** — Full implementation with tenant-level IdP config | 4-6 weeks | Backend |
| 1.2 | **MFA (TOTP)** — Enrollment, verification, backup codes, admin enforcement | 2-3 weeks | Backend |
| 1.3 | **FERPA consent layer** — Consent records, consent-gated data sharing, withdrawal | 3-4 weeks | Backend + Frontend |
| 1.4 | **FERPA disclosure notice** — Registration flow, annual notification | 1-2 weeks | Frontend + Legal |
| 1.5 | **Data Processing Agreement with Anthropic** | Legal process | Legal |
| 1.6 | **Row-Level Security** — Apply RLS policies to core tables | 2-3 weeks | Backend |
| 1.7 | **Penetration test** — External vendor engagement | 2-4 weeks | Security |
| 1.8 | **VPAT / Accessibility statement** — Section 508 compliance documentation | 1-2 weeks | Compliance |
| 1.9 | **Accessibility quick wins** — Skip nav, heading hierarchy, ARIA landmarks, color contrast | 2-3 weeks | Frontend |
| 1.10 | **PDF report export** | 1-2 weeks | Backend |
| 1.11 | **Bulk user import (CSV)** | 1-2 weeks | Backend |
| 1.12 | **Data portability endpoint** | 1-2 weeks | Backend |
| 1.13 | **Graceful shutdown + health check expansion** | 1-2 days | Backend |
| 1.14 | **CDN deployment** (Cloudflare) | 1-2 days | DevOps |
| 1.15 | **Vendor management register** — DPAs for all sub-processors | 1 week | Legal + Eng |
| 1.16 | **Migration system consolidation** | 1-2 days | Backend |

**Phase 1 Total: ~3 months** (1-2 senior engineers + legal resources)

---

### Phase 2: Competitive Differentiation (3-6 months)

*Goal: Win RFPs against established competitors by exceeding baseline expectations.*

| # | Item | Effort | Owner |
|---|------|--------|-------|
| 2.1 | **LTI 1.3 Integration** — Deep linking, grade passback, Canvas/Blackboard launch | 6-8 weeks | Backend |
| 2.2 | **SCIM 2.0 Provisioning** — Automated user lifecycle management | 4-6 weeks | Backend |
| 2.3 | **SOC 2 Type I** — Engage auditor, implement remaining controls | 3-6 months | Security + Eng |
| 2.4 | **OpenAPI documentation + developer portal** | 2-3 weeks | Backend |
| 2.5 | **Webhook notification system** | 3-4 weeks | Backend |
| 2.6 | **Notification preferences** — Per-type opt-in/out, digest mode | 1-2 weeks | Full Stack |
| 2.7 | **Data retention policies** — Automated TTL-based cleanup | 2 weeks | Backend |
| 2.8 | **WCAG 2.2 AA full compliance** — Comprehensive audit + remediation | 4-6 weeks | Frontend |
| 2.9 | **Directory information opt-out** | 1-2 weeks | Backend + Frontend |
| 2.10 | **Custom domain support (CNAME)** | 2-3 weeks | Backend + DevOps |
| 2.11 | **Nonce-based CSP** (eliminate `unsafe-inline`) | 1-2 weeks | Backend |
| 2.12 | **Session hardening** — Strict sameSite, shorter TTL, concurrent limits | 1 week | Backend |
| 2.13 | **APM integration** (Datadog) | 1-2 days | DevOps |
| 2.14 | **SSE → Redis pub/sub migration** | 1-2 weeks | Backend |

**Phase 2 Total: ~6 months** (2-3 engineers + security consultant)

---

### Phase 3: Market Leadership (6-12 months)

*Goal: Enterprise-grade platform competing with Handshake, Symplicity, 12Twenty.*

| # | Item | Effort | Owner |
|---|------|--------|-------|
| 3.1 | **SOC 2 Type II** — Complete audit cycle (6-12 months of evidence) | Ongoing | Security |
| 3.2 | **ISO 27001 certification** | 12-18 months | Security |
| 3.3 | **SIS integrations** (Banner, Workday, PeopleSoft) | 8-12 weeks each | Backend |
| 3.4 | **Full HECVAT questionnaire** | 2-3 months | Security + Eng |
| 3.5 | **FedRAMP readiness** (if targeting federal institutions) | 12-18 months | Security + DevOps |
| 3.6 | **Multi-region deployment** | 4-6 weeks | DevOps |
| 3.7 | **Database read replicas** | 1-2 weeks | DevOps |
| 3.8 | **Admin impersonation ("act as")** | 1-2 weeks | Backend |
| 3.9 | **API versioning** | 1-2 weeks | Backend |
| 3.10 | **MFA (SMS/hardware key)** | 2-3 weeks | Backend |
| 3.11 | **Password history enforcement** | 1 week | Backend |
| 3.12 | **Field-level encryption for PII** | 3-4 weeks | Backend |
| 3.13 | **Scheduled report delivery** | 1-2 weeks | Backend |
| 3.14 | **White-label email (per-tenant SMTP)** | 2-3 weeks | Backend |

**Phase 3 Total: ~12 months** (dedicated security team + 2-3 engineers)

---

## 4. Resource Estimates

### Phase 0 (0-30 days)

| Resource | Allocation | Estimated Cost |
|---|---|---|
| Senior Backend Engineer | 1 FTE, 4 weeks | $12,000-16,000 |
| Frontend Engineer | 0.5 FTE, 2 weeks (cookie consent, settings) | $4,000-6,000 |
| Legal Counsel (privacy policy, ToS) | 10-15 hours | $3,000-7,500 |
| Heroku Redis addon (mini) | Monthly | $5/month |
| Sentry (Team plan) | Monthly | $26/month |
| **Phase 0 Total** | | **~$20,000-30,000** |

### Phase 1 (1-3 months)

| Resource | Allocation | Estimated Cost |
|---|---|---|
| Senior Backend Engineer | 1 FTE, 12 weeks | $36,000-48,000 |
| Frontend Engineer | 0.5 FTE, 6 weeks | $12,000-18,000 |
| Security Consultant (pen test) | 2-4 weeks engagement | $10,000-30,000 |
| Legal (DPAs, FERPA review) | 20-30 hours | $6,000-15,000 |
| VPAT/Accessibility Consultant | 1-2 weeks | $5,000-10,000 |
| Infrastructure (Redis Standard, Sentry, CDN) | Monthly | ~$100/month |
| **Phase 1 Total** | | **~$70,000-120,000** |

### Phase 2 (3-6 months)

| Resource | Allocation | Estimated Cost |
|---|---|---|
| Backend Engineers | 2 FTE, 6 months | $144,000-192,000 |
| Frontend Engineer | 1 FTE, 6 months (accessibility) | $60,000-80,000 |
| Security/Compliance Lead | 0.5 FTE, 6 months | $50,000-70,000 |
| SOC 2 Auditor (Type I) | Engagement | $20,000-50,000 |
| Infrastructure upgrades | Monthly | ~$500/month |
| **Phase 2 Total** | | **~$280,000-400,000** |

### Phase 3 (6-12 months)

| Resource | Allocation | Estimated Cost |
|---|---|---|
| Engineering Team (3-4) | 12 months | $360,000-500,000 |
| Security/Compliance Team (2) | 12 months | $200,000-280,000 |
| SOC 2 Type II Audit | Annual | $30,000-75,000 |
| ISO 27001 Certification | One-time + annual | $50,000-100,000 |
| Infrastructure (production-grade) | Monthly | ~$2,000-5,000/month |
| **Phase 3 Total** | | **~$660,000-980,000** |

### Total Investment: ~$1.0M-1.5M over 12 months

---

## 5. Risk Register

| # | Risk | Likelihood | Impact | Severity | Mitigation | Phase |
|---|------|-----------|--------|----------|-----------|-------|
| **R1** | **FERPA violation** — Student PII shared with corporate partners/Anthropic without consent; potential DOE investigation | High | Critical | **P0** | Implement consent layer (Phase 1.3), execute Anthropic DPA (Phase 1.5), enforce AI opt-out immediately (Phase 0.6) | 0+1 |
| **R2** | **Data breach via role enforcement gaps** — Corporate partner API routes lack role checks; any authenticated user can access corporate dashboard data | High | High | **P0** | Add `requireRole()` to all role-specific routes (Phase 0.2) | 0 |
| **R3** | **Rate limiting bypass on multi-dyno** — In-memory rate limiter and account lockout reset on restart; cannot scale horizontally | Medium | High | **P0** | Redis migration (Phase 0.1) | 0 |
| **R4** | **RFP disqualification: no SSO** — Every Tier 1 university requires SAML/OIDC; instant disqualification without it | Certain | Critical | **P0** | SSO implementation (Phase 1.1) | 1 |
| **R5** | **Tenant data leakage** — App-level tenant isolation with no DB-level RLS; one bad query exposes cross-tenant data; existing RLS on `network_applications` has bypass flaw | Medium | Critical | **P1** | Implement RLS on core tables (Phase 1.6), fix existing RLS bypass | 1 |
| **R6** | **No error visibility in production** — No Sentry/APM; errors are silent; user-reported bugs are the only detection mechanism | High | Medium | **P0** | Sentry integration (Phase 0.4) | 0 |
| **R7** | **CRON endpoints publicly accessible** — If `CRON_SECRET` env var is not set, all cron routes skip authentication entirely | Medium | High | **P0** | Fail-closed guard (Phase 0.3) | 0 |
| **R8** | **No disaster recovery plan** — No documented RTO/RPO, no backup verification, no runbook for database corruption or provider outages | Medium | High | **P1** | DR documentation (Phase 1.13), health check expansion | 1 |
| **R9** | **Accessibility lawsuit risk** — No VPAT, no accessibility statement, custom components (star rating, settings toggles) lack ARIA attributes; DOJ increasingly enforcing web a11y in education | Medium | High | **P1** | Quick wins (Phase 1.9), VPAT (Phase 1.8), full audit (Phase 2.8) | 1+2 |
| **R10** | **Vendor dependency without DPA** — Sending student PII to Anthropic, Mailgun, Cloudinary without Data Processing Agreements; any vendor breach creates institutional liability | High | High | **P0** | Execute DPAs with all sub-processors (Phase 0 legal, Phase 1.15) | 0+1 |

---

## 6. Sales Readiness Checklist for Tier 1 University RFPs

### Hard Requirements (Must-Have Before First RFP Response)

| # | Requirement | Status | Blocker? |
|---|---|---|---|
| 1 | SSO / SAML 2.0 support | Not implemented | **YES** |
| 2 | MFA (at minimum TOTP) | Not implemented | **YES** |
| 3 | FERPA compliance documentation | Not implemented | **YES** |
| 4 | SOC 2 Type I (or in-progress letter) | Not started | **YES** (can use "in progress" letter) |
| 5 | HECVAT Lite questionnaire completed | Not started | **YES** |
| 6 | Published privacy policy | Empty | **YES** |
| 7 | Penetration test report | Not performed | **YES** |
| 8 | Accessibility statement / VPAT | Not created | **YES** |
| 9 | Data Processing Agreements with sub-processors | Not executed | **YES** |
| 10 | Incident response plan | Not documented | **YES** |
| 11 | 99.9% uptime SLA documentation | Not defined | Soft blocker |
| 12 | Data residency / hosting location documentation | Not documented | Soft blocker |

### Competitive Differentiators (Nice-to-Have)

| # | Feature | Status | Competitive Advantage |
|---|---|---|---|
| 1 | LTI 1.3 integration with Canvas/Blackboard | Not started | Major — reduces adoption friction |
| 2 | SCIM provisioning | Not started | Significant — automated user management |
| 3 | SOC 2 Type II | Not started | Standard expectation for Tier 1 |
| 4 | ISO 27001 | Not started | Differentiator vs. smaller competitors |
| 5 | OpenAPI documentation | Not started | Enables custom integrations |
| 6 | Webhook API | Not started | Enables IT automation |
| 7 | WCAG 2.2 AA certified | Not audited | Required by many public institutions |
| 8 | SIS integration (Banner/Workday) | Not started | Major — eliminates manual data entry |
| 9 | Custom domain support | Not implemented | Brand perception for large universities |
| 10 | Multi-region deployment | Not implemented | Data sovereignty requirements |

### What CAN Be Sold Today

| Strength | Evidence |
|---|---|
| Multi-tenant architecture | Subdomain-based routing, feature gating per plan |
| AI coaching with fairness constraints | Documented `AI_FAIRNESS_CONSTRAINTS`, `AI_DISCLAIMER_TEXT` |
| Outcomes analytics dashboard | 8+ metric types, Executive Summary, engagement funnel |
| Security headers (HSTS, CSP, CSRF) | Production-deployed, independently verifiable |
| Audit logging | DB + log drain, 14 event types |
| Password policy (NIST 800-63B aligned) | 12-char min, complexity, blocklist |
| Handshake EDU integration | Encrypted API keys, skill demand sync |
| Match engine with explainability | 9-factor scoring with human-readable breakdowns |

### Minimum Viable Enterprise Package (Target: 90 days)

To respond to your first Tier 1 university RFP, complete:

1. **Phase 0** (all items) — 4-6 weeks
2. **Phase 1 items:** 1.1 (SSO), 1.2 (MFA), 1.3-1.4 (FERPA), 1.5 (Anthropic DPA), 1.7 (pen test), 1.8 (VPAT)
3. **SOC 2 Type I engagement letter** — "in progress" with target date

This gets you past the first security review gate. Full Phase 1 completion (3 months) makes you competitive. Phase 2 makes you a serious contender against Handshake and Symplicity.

---

## Appendix A: Current Security Architecture

```
┌─────────────────────────────────────────────────┐
│                  EDGE (Heroku Router)            │
│  ┌─────────────────────────────────────────────┐│
│  │          Next.js Middleware                   ││
│  │  • Null byte injection block                 ││
│  │  • Request body size limits (1MB/10MB)       ││
│  │  • CSRF double-submit validation             ││
│  │  • Session cookie → x-session-id header      ││
│  │  • Subdomain → x-tenant-* headers            ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────┐
│              APPLICATION LAYER                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Auth     │ │ RBAC     │ │ Security         │ │
│  │ • bcrypt │ │ • 4 roles│ │ • Rate limit     │ │
│  │ • DB     │ │ • require│ │ • Account lockout│ │
│  │   session│ │   Role() │ │ • Audit log      │ │
│  │ • 4hr    │ │ • require│ │ • Zod validation │ │
│  │   idle   │ │   Auth() │ │ • Input sanitize │ │
│  │ • 30d    │ │          │ │ • Response strip  │ │
│  │   max    │ │          │ │ • File upload sec │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│  ┌──────────────────────────────────────────────┐│
│  │          Response Headers                     ││
│  │  HSTS (2yr, preload) | CSP | X-Frame-Options ││
│  │  X-Content-Type-Options | Referrer-Policy     ││
│  │  Permissions-Policy                           ││
│  └──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────┐
│              DATA LAYER                           │
│  ┌──────────────────┐  ┌───────────────────────┐ │
│  │ PostgreSQL       │  │ External Services     │ │
│  │ • pgcrypto bcrypt│  │ • Anthropic (AI)      │ │
│  │ • sessions table │  │ • Mailgun (email)     │ │
│  │ • audit_log      │  │ • Cloudinary (media)  │ │
│  │ • App-level RLS  │  │ • Heroku Scheduler    │ │
│  │ • SSL in prod    │  │                       │ │
│  └──────────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Appendix B: What Exists Today (Inventory)

| Category | Implemented | Count/Detail |
|---|---|---|
| API Routes | Auth, CRUD, AI, Analytics, Cron, Notifications | ~100+ routes |
| UI Components | shadcn/ui + Radix primitives | ~25 base components |
| Database Tables | Users, Tenants, Listings, Applications, Messages, Skills, Match Scores, AI, Handshake, Notifications, Audit, Reports, Portfolios | ~30+ tables |
| Email Templates | Transactional emails via Mailgun | 10 templates |
| Cron Jobs | Match recompute, Streaks, Metrics, Handshake sync | 4 endpoints |
| Feature Flags | Plan-based gating | 26 flags across 3 tiers |
| Roles | admin, student, corporate_partner, educational_admin | 4 roles |
| AI Features | Chat coaching, Candidate screening, Bio improvement, Institutional analytics, Match engine | 5 AI-powered features |
| Security | CSRF, Rate limiting, Lockout, Audit logging, Headers, Sanitization | Full security module |
| Migrations | Manual SQL files | 16 migration files |
