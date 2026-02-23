# Proveground Service Level Agreement (SLA)

**Effective Date:** February 23, 2026
**Version:** 1.0
**Applies To:** All Proveground Enterprise and Professional plan customers

---

## 1. Service Availability Commitment

Proveground commits to **99.9% monthly uptime** for the platform, measured as:

```
Uptime % = ((Total Minutes in Month - Downtime Minutes) / Total Minutes in Month) x 100
```

This translates to a maximum of **43 minutes and 28 seconds** of unplanned downtime per month.

### What Counts as Downtime

Downtime is defined as any period of **5 or more consecutive minutes** during which the Proveground application is completely unavailable to all users of a tenant, as measured by our external monitoring systems.

### What Does NOT Count as Downtime

- **Scheduled maintenance** (announced 48+ hours in advance via email and in-app notification)
- **Emergency security patches** (announced as soon as practicable)
- **Issues caused by client-side factors** (browser incompatibility, network issues, DNS propagation)
- **Third-party service outages** beyond our control (AWS/Heroku infrastructure, Anthropic AI API, Cloudinary, Mailgun)
- **Force majeure events** (natural disasters, government actions, internet backbone failures)
- **Tenant-initiated actions** that degrade their own service (e.g., misconfigured SSO, excessive API usage)

---

## 2. Maintenance Windows

| Type | Window | Notice |
|------|--------|--------|
| **Scheduled maintenance** | Saturdays 2:00 AM - 6:00 AM ET | 48 hours minimum |
| **Emergency security patches** | As needed | Best-effort advance notice |
| **Database maintenance** | Saturdays 3:00 AM - 5:00 AM ET | 72 hours |
| **Feature deployments** | Weekdays, rolling deploys (zero-downtime) | Release notes within 24 hours |

Scheduled maintenance windows are not counted toward downtime calculations.

---

## 3. Support Tiers & Response Times

### Enterprise Plan

| Severity | Description | Initial Response | Update Frequency | Resolution Target |
|----------|-------------|-----------------|------------------|-------------------|
| **SEV-1: Critical** | Platform completely unavailable; data breach suspected | 30 minutes | Every 30 minutes | 4 hours |
| **SEV-2: Major** | Core feature non-functional (login, matching, applications) | 2 hours | Every 2 hours | 8 business hours |
| **SEV-3: Minor** | Non-critical feature degraded; workaround available | 8 business hours | Daily | 5 business days |
| **SEV-4: Low** | Cosmetic issues, feature requests, general questions | 2 business days | As needed | Best effort |

### Professional Plan

| Severity | Description | Initial Response | Update Frequency | Resolution Target |
|----------|-------------|-----------------|------------------|-------------------|
| **SEV-1: Critical** | Platform completely unavailable | 1 hour | Every hour | 8 hours |
| **SEV-2: Major** | Core feature non-functional | 4 business hours | Every 4 hours | 2 business days |
| **SEV-3: Minor** | Non-critical feature degraded | 1 business day | Every 2 days | 10 business days |
| **SEV-4: Low** | Cosmetic issues, feature requests | 3 business days | As needed | Best effort |

### Starter Plan

| Severity | Initial Response | Resolution Target |
|----------|-----------------|-------------------|
| **SEV-1** | 4 business hours | 1 business day |
| **SEV-2** | 1 business day | 5 business days |
| **SEV-3/4** | 3 business days | Best effort |

**Business hours:** Monday-Friday, 9:00 AM - 6:00 PM Eastern Time, excluding US federal holidays.

**SEV-1 support** for Enterprise customers is available **24/7/365** via the emergency contact channel.

---

## 4. Support Channels

| Channel | Availability | Plans |
|---------|-------------|-------|
| **Email** (support@proveground.com) | Business hours | All plans |
| **In-app support widget** | Business hours | Professional, Enterprise |
| **Dedicated Slack channel** | Business hours | Enterprise |
| **Emergency hotline** | 24/7 for SEV-1 | Enterprise |
| **Dedicated Customer Success Manager** | Business hours | Enterprise |

---

## 5. Service Credits

If Proveground fails to meet the 99.9% uptime commitment in any calendar month, affected customers are eligible for service credits:

| Monthly Uptime | Service Credit (% of monthly fee) |
|---------------|-----------------------------------|
| 99.0% - 99.9% | 10% |
| 95.0% - 99.0% | 25% |
| 90.0% - 95.0% | 50% |
| Below 90.0% | 100% |

### Credit Request Process

1. Customer submits a credit request within **30 days** of the affected month
2. Request must include dates, times, and description of the service disruption
3. Proveground validates against monitoring data within **5 business days**
4. Approved credits are applied to the next billing cycle

### Limitations

- Service credits are the **sole and exclusive remedy** for failure to meet the uptime SLA
- Credits cannot exceed **100% of the monthly fee** for the affected service
- Credits are not redeemable for cash and do not carry over beyond 12 months

---

## 6. Performance Targets

In addition to availability, Proveground targets the following performance benchmarks:

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Page load time** (server-side render) | < 2 seconds | P95 across all tenants |
| **API response time** | < 500ms | P95 for non-AI endpoints |
| **AI feature response time** | < 10 seconds | P95 for AI-powered features |
| **Search/matching latency** | < 3 seconds | P95 for match engine queries |
| **File upload processing** | < 30 seconds | P95 for files under 10MB |

Performance targets are best-effort goals and are not subject to service credits.

---

## 7. Data Backup & Recovery

| Component | Backup Frequency | Retention | Recovery Time Objective (RTO) | Recovery Point Objective (RPO) |
|-----------|-----------------|-----------|-------------------------------|-------------------------------|
| **PostgreSQL database** | Continuous WAL archiving + daily snapshots | 7 days (continuous), 30 days (snapshots) | 4 hours | 5 minutes |
| **Uploaded media** (Cloudinary) | Real-time replication | Indefinite | 1 hour | Near-zero |
| **Application code** | Git (GitHub) | Indefinite | 30 minutes (redeploy) | Near-zero |
| **Configuration & secrets** | Heroku config vars (encrypted) | Point-in-time | 1 hour | Last known good |

---

## 8. Disaster Recovery

- **Primary region:** AWS US-East-1 (Virginia) via Heroku
- **Database failover:** Heroku PostgreSQL with automated failover for Standard and Premium tiers
- **DNS failover:** Automated health checks with failover routing
- **Full DR test:** Conducted annually; results available to Enterprise customers upon request

---

## 9. Monitoring & Transparency

- **Status page:** Proveground maintains a public status page for real-time service health
- **Incident communication:** Email notifications for SEV-1 and SEV-2 incidents within 15 minutes of detection
- **Post-incident reports:** Root Cause Analysis (RCA) provided within 5 business days for SEV-1 incidents
- **Monthly uptime reports:** Available to Enterprise customers upon request

---

## 10. SLA Exclusions for AI-Powered Features

AI-powered features (AI Coaching, Match Insights, Portfolio Intelligence, Talent Insights, Project Scoping) depend on third-party AI infrastructure (Anthropic Claude API). While Proveground monitors and manages these integrations:

- AI feature availability is **not included** in the 99.9% uptime calculation
- Proveground targets **99.5% availability** for AI features as a best-effort goal
- When AI features are unavailable, all non-AI platform functionality remains fully operational
- Proveground maintains graceful degradation: AI feature outages display informative messages and do not block core workflows

---

## 11. Changes to This SLA

Proveground may update this SLA with **30 days written notice** to affected customers. Changes will not reduce service level commitments during an active contract term.

---

## Contact

**General Support:** support@proveground.com
**Enterprise Emergency:** Available via dedicated Slack channel or emergency hotline (provided during onboarding)
**SLA Credit Requests:** billing@proveground.com
