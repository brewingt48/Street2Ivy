# Proveground Incident Response Plan

**Version:** 1.0
**Last Updated:** February 2026
**Document Owner:** Engineering & Security Team
**Review Cycle:** Quarterly

---

## 1. Purpose

This document defines Proveground's procedures for identifying, containing, eradicating, and recovering from security incidents and service disruptions. It establishes roles, responsibilities, communication protocols, and escalation paths.

---

## 2. Scope

This plan covers:
- **Security incidents**: Unauthorized access, data breaches, credential compromise, malware, denial of service
- **Service disruptions**: Application outages, database failures, third-party provider outages
- **Data incidents**: Accidental data exposure, data loss, FERPA-related incidents
- **Compliance incidents**: Regulatory inquiries, audit findings requiring immediate action

---

## 3. Severity Classification

| Severity | Description | Examples | Response Time | Notification |
|----------|-------------|----------|---------------|-------------|
| **SEV-1 (Critical)** | Active breach, data exfiltration, complete service outage | Unauthorized data access, database compromise, all users unable to access platform | Immediate (within 15 min) | All stakeholders, affected customers within 72 hours |
| **SEV-2 (High)** | Potential breach, significant degradation, vulnerability exploitation | Suspicious access patterns, partial outage affecting >25% users, critical vulnerability discovered | Within 1 hour | Engineering team, management |
| **SEV-3 (Medium)** | Contained incident, minor degradation | Failed intrusion attempt, single-feature outage, non-critical vulnerability | Within 4 hours | Engineering team |
| **SEV-4 (Low)** | Security event requiring investigation | Unusual log patterns, phishing attempt, informational vulnerability | Within 24 hours | Security lead |

---

## 4. Incident Response Team

### Core Team

| Role | Responsibility | Primary | Backup |
|------|---------------|---------|--------|
| **Incident Commander (IC)** | Overall response coordination, decision authority | CTO | Engineering Lead |
| **Technical Lead** | Investigation, containment, and remediation execution | Senior Backend Engineer | DevOps Engineer |
| **Communications Lead** | Internal/external communications, customer notification | CEO / Head of Customer Success | Marketing Lead |
| **Legal/Compliance** | Regulatory assessment, legal obligations, FERPA guidance | Legal Counsel | External Privacy Counsel |

### Escalation Path

```
Detection → Engineering On-Call → Incident Commander → Executive Team
                                                     → Legal (if data breach)
                                                     → Affected Customers (within 72 hours)
                                                     → Regulators (if required by law)
```

---

## 5. Incident Response Phases

### Phase 1: Identification

**Goal:** Detect and confirm the incident.

#### Detection Sources
- **Automated**: Sentry error alerts, health check failures, anomalous traffic patterns, rate limiting triggers
- **Internal**: Employee reports, audit log reviews, security scans
- **External**: Customer reports, vulnerability disclosures, vendor notifications, law enforcement

#### Initial Assessment Checklist
- [ ] What systems/data are affected?
- [ ] Is the incident ongoing or contained?
- [ ] What is the potential blast radius?
- [ ] Are any customer tenants affected?
- [ ] Is student PII (FERPA-protected data) involved?
- [ ] Assign severity level (SEV-1 through SEV-4)

#### Documentation
- Open incident ticket with: timestamp, reporter, initial description, severity
- Begin incident timeline log (all actions timestamped)

### Phase 2: Containment

**Goal:** Limit the scope and impact of the incident.

#### Immediate Actions (Short-Term Containment)

| Scenario | Containment Action |
|----------|-------------------|
| **Unauthorized access** | Revoke compromised sessions, rotate affected credentials, enable IP blocks |
| **Data exposure** | Disable affected API endpoints, revoke API keys, isolate affected tenant |
| **Malicious code** | Roll back to last known good deployment, disable affected features |
| **DDoS attack** | Engage Cloudflare DDoS protection rules, enable rate limiting escalation |
| **Database compromise** | Rotate database credentials, enable read-only mode, snapshot current state |
| **Third-party breach** | Disable affected integration, rotate vendor API keys |

#### Evidence Preservation
- Capture database snapshots before any remediation changes
- Export relevant audit logs and application logs
- Screenshot any anomalous UI states
- Record timeline of all containment actions

### Phase 3: Eradication

**Goal:** Remove the root cause and prevent recurrence.

#### Root Cause Analysis
1. Review audit logs for the incident window
2. Analyze application logs (Sentry, Heroku log drain)
3. Review database query logs if applicable
4. Check for indicators of compromise (IOCs) across all tenants
5. Identify the vulnerability or failure that enabled the incident

#### Remediation Actions
- Patch the vulnerability
- Update affected dependencies
- Strengthen access controls if insufficient
- Add monitoring for the specific attack vector
- Update firewall / WAF rules

### Phase 4: Recovery

**Goal:** Restore normal operations with verification.

#### Recovery Checklist
- [ ] Deploy patched code to production
- [ ] Verify all services are healthy (health check endpoints)
- [ ] Confirm affected data is restored or secured
- [ ] Run smoke tests on affected features
- [ ] Re-enable any disabled features/endpoints
- [ ] Verify monitoring is active for the affected systems
- [ ] Confirm no residual compromise indicators

#### Customer Communication
- Notify affected tenants with:
  - Description of the incident (what happened)
  - Impact assessment (what data was affected, if any)
  - Actions taken (what we did)
  - Preventive measures (what we're doing to prevent recurrence)
  - Contact information for questions

### Phase 5: Post-Incident

**Goal:** Learn from the incident and improve defenses.

#### Post-Incident Review (within 5 business days)
1. **Timeline reconstruction**: Complete chronological record of the incident
2. **Root cause analysis**: Identify the fundamental cause (not just the symptom)
3. **Response evaluation**: What worked? What didn't? Where were delays?
4. **Action items**: Specific, assigned, time-bound improvements
5. **Documentation update**: Update this IRP, runbooks, and monitoring based on lessons learned

#### Post-Incident Report Template

```markdown
## Incident Report: [Title]
**Date:** [Date]
**Severity:** SEV-[1-4]
**Duration:** [Start time] to [Resolution time]
**Impact:** [Number of affected users/tenants, data impact]

### Summary
[1-2 paragraph description]

### Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | [Event description] |

### Root Cause
[Description of the fundamental cause]

### Impact Assessment
- Users affected: [count]
- Tenants affected: [list]
- Data impact: [description]
- FERPA data involved: [yes/no]
- Financial impact: [estimated]

### Resolution
[What was done to resolve the incident]

### Preventive Measures
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action item] | [Name] | [Date] | [Status] |

### Lessons Learned
[Key takeaways and process improvements]
```

---

## 6. Communication Templates

### Internal Notification (Slack/Email)

```
🚨 INCIDENT: [Brief description]
Severity: SEV-[1-4]
Status: [Investigating | Contained | Resolved]
IC: [Name]
Impact: [Brief impact statement]
Next Update: [Time]
War Room: [Link]
```

### Customer Notification (Email)

```
Subject: Security Notification - Proveground

Dear [Institution Name],

We are writing to inform you of a security incident that may affect your
institution's data on the Proveground platform.

What happened: [Description]
When it happened: [Timeframe]
What data was affected: [Specific data types]
What we've done: [Remediation steps]
What you should do: [Recommended actions]

We take the security of your data seriously and are committed to
transparency. We will provide updates as our investigation continues.

If you have questions, please contact security@proveground.com.

Sincerely,
The Proveground Security Team
```

### Regulatory Notification (for FERPA-reportable incidents)

Notification to the Department of Education and/or state regulators must include:
- Nature and scope of the breach
- Type of educational records compromised
- Number of affected individuals
- Steps taken to mitigate harm
- Contact information for affected individuals

**Timeline**: File within required timeframe per applicable state breach notification laws (varies: 30-90 days depending on jurisdiction).

---

## 7. FERPA-Specific Procedures

Given Proveground handles FERPA-protected educational records, additional procedures apply:

### FERPA Incident Classification
- **Category A**: Unauthorized disclosure of education records to a third party
- **Category B**: Unauthorized access to education records (no confirmed disclosure)
- **Category C**: Loss of records containing student PII

### FERPA Response Requirements
1. Immediately assess whether education records were accessed or disclosed
2. Determine if the access qualifies as a FERPA violation or falls under a permitted exception
3. Notify the educational institution (tenant) as the data owner
4. The institution decides whether to notify the Department of Education
5. Document the incident and remediation in the audit log
6. Cooperate with institutional investigation if requested

### Student Notification
Under FERPA, the educational institution (not Proveground) is responsible for notifying affected students. Proveground will:
- Provide the institution with all necessary information to make notifications
- Assist with identifying affected students
- Support the institution's communication efforts

---

## 8. Runbooks

### Runbook: Database Credential Rotation

1. Generate new database credentials via Heroku CLI
2. Update `DATABASE_URL` in Heroku config
3. Verify application connectivity
4. Revoke old credentials
5. Update any backup scripts using old credentials

### Runbook: Session Invalidation (All Users)

1. Execute: `DELETE FROM sessions;` on production database
2. All users will be required to re-authenticate
3. Monitor login success rates for 30 minutes
4. Document reason in incident log

### Runbook: API Key Rotation (Anthropic/Mailgun/Cloudinary)

1. Generate new API key in vendor dashboard
2. Update Heroku config var (e.g., `ANTHROPIC_API_KEY`)
3. Verify functionality with test request
4. Revoke old API key in vendor dashboard
5. Update `.env.example` if key name changed

### Runbook: Emergency Deployment Rollback

1. `heroku releases --app street2ivy-dev` to find last good release
2. `heroku rollback vXXX --app street2ivy-dev` to roll back
3. Verify health check: `curl https://street2ivy-dev.herokuapp.com/api/health`
4. Monitor Sentry for new errors
5. Document reason in incident log

### Runbook: Tenant Data Isolation Verification

1. Review audit logs for cross-tenant access attempts
2. Run tenant isolation test queries:
   ```sql
   -- Check for users accessing data outside their tenant
   SELECT DISTINCT al.user_id, al.tenant_id, u.tenant_id as user_tenant
   FROM audit_log al
   JOIN users u ON u.id = al.user_id
   WHERE al.tenant_id != u.tenant_id
   AND al.created_at > NOW() - INTERVAL '24 hours';
   ```
3. If violations found, escalate to SEV-2

---

## 9. Testing & Maintenance

### Tabletop Exercises
- Conducted quarterly with the incident response team
- Scenarios rotate through: data breach, service outage, vendor compromise, insider threat
- Results documented and action items tracked

### Plan Review
- This document is reviewed quarterly
- Updated after every SEV-1 or SEV-2 incident
- Updated when team composition changes
- Version controlled in the repository

### Contact List Maintenance
- On-call rotation updated monthly
- All team members verify contact information quarterly
- Backup contacts confirmed annually

---

## 10. External Resources

| Resource | Contact | When to Engage |
|----------|---------|---------------|
| Legal Counsel | [Firm Name / Contact] | Any confirmed data breach, regulatory inquiry |
| Cyber Insurance | [Provider / Policy Number] | SEV-1 incidents, potential claims |
| Forensics Firm | [Firm Name / Contact] | SEV-1 with suspected APT or sophisticated attack |
| Law Enforcement | FBI IC3 (ic3.gov), Local FBI field office | Criminal activity, significant data theft |
| FERPA Compliance | Family Policy Compliance Office, DOE | FERPA violations (via institutional partner) |

---

*This Incident Response Plan is a living document. All team members are responsible for understanding their roles and responsibilities as defined herein.*
