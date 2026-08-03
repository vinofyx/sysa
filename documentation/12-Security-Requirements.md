# Security Requirements
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Owner** | Security Engineer, reviewed by Backend/DevOps Architects |

---

## 1. Purpose
Defines the security controls required to protect donor financial data, donor/volunteer PII, and administrative access for a public donation platform. This document governs implementation and pre-launch security review; it does not itself constitute a penetration test report.

## 2. Threat Model Summary

| Asset | Primary Threats |
|---|---|
| Donor PII (name, email, phone, PAN) | Data breach, unauthorized admin access, third-party leakage |
| Payment flow | Payment fraud, webhook spoofing, man-in-the-middle |
| Admin credentials | Credential stuffing, phishing, weak passwords |
| Public content | Defacement via compromised admin account, XSS injection |
| Volunteer résumés/uploads | Malicious file upload, unauthorized access |
| Availability | DDoS, resource exhaustion during high-traffic donation drives |

## 3. Authentication & Session Security

| ID | Requirement |
|---|---|
| SEC-AUTH-01 | Admin passwords hashed with bcrypt or argon2 (never plaintext, never reversible encryption). |
| SEC-AUTH-02 | Minimum password policy enforced: ≥ 10 characters, complexity guidance shown at creation. |
| SEC-AUTH-03 | Session tokens (JWT) signed with a strong secret, short-lived access tokens with refresh-token rotation. |
| SEC-AUTH-04 | Account lockout / exponential backoff after repeated failed login attempts (mitigates credential stuffing/brute force). |
| SEC-AUTH-05 | Password reset links are single-use and expire within 30 minutes. |
| SEC-AUTH-06 | Multi-factor authentication (MFA) available for Super Admin accounts. | *Recommended for Phase 2 if budget allows — flagged as a Should Have, not launch-blocking.* |

## 4. Authorization

| ID | Requirement |
|---|---|
| SEC-AUTHZ-01 | Every admin API endpoint enforces server-side RBAC per [10-Roles-and-Permissions.md](10-Roles-and-Permissions.md) — no reliance on client-side route guarding alone. |
| SEC-AUTHZ-02 | Donor-facing "view own history" endpoints scope queries strictly to the authenticated donor's own `donor_id` — verified via automated test to prevent Insecure Direct Object Reference (IDOR). |
| SEC-AUTHZ-03 | All unauthorized access attempts return a generic 403/404 (no information leakage about record existence) and are written to the audit log. |

## 5. Payment Security

| ID | Requirement |
|---|---|
| SEC-PAY-01 | No raw card, CVV, or full payment credential data is transmitted to or stored on Ashram-controlled servers. All card capture occurs within Razorpay's hosted Checkout/iframe. |
| SEC-PAY-02 | Razorpay webhook payloads are verified via HMAC signature check before any donation status is updated. |
| SEC-PAY-03 | Razorpay API keys (secret key) stored in a managed secrets store / environment variables, never committed to source control. |
| SEC-PAY-04 | Donation amount is validated/recalculated server-side before creating a payment order — the client never dictates the final charged amount unvalidated. |
| SEC-PAY-05 | All payment-related traffic occurs over HTTPS with no mixed-content resources on checkout pages. |

## 6. Data Protection

| ID | Requirement |
|---|---|
| SEC-DATA-01 | All data in transit encrypted via TLS 1.2+; HTTP requests redirected to HTTPS. |
| SEC-DATA-02 | Database backups encrypted at rest. |
| SEC-DATA-03 | Donor PII (email, phone, PAN) never exposed in public API responses or client-side bundles. |
| SEC-DATA-04 | Volunteer résumé uploads scanned for file-type validity (allow-list: PDF/DOC/DOCX) and size limits; stored in a non-publicly-browsable storage path. |
| SEC-DATA-05 | Donor recognition on public pages requires explicit `recognition_opt_in = true` — privacy-by-default (cross-referenced with [08-Database-Requirements.md §4](08-Database-Requirements.md#4-data-integrity--business-rules)). |
| SEC-DATA-06 | PAN numbers (where collected for 80G receipts) are masked in all admin UI list views (e.g., `ABKAS****K`) and only fully visible in the single-record detail view to authorized Finance Admin/Super Admin roles. |

## 7. Application Security (OWASP Top 10 Mitigations)

| OWASP Category | Mitigation |
|---|---|
| Injection (SQLi) | Parameterized queries / ORM usage exclusively — no raw string-concatenated SQL |
| Broken Authentication | See §3 |
| Sensitive Data Exposure | See §6 |
| XML External Entities (XXE) | No XML parsing of untrusted input in the planned architecture (JSON-based APIs) |
| Broken Access Control | See §4 |
| Security Misconfiguration | Hardened HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security); default admin credentials never shipped |
| Cross-Site Scripting (XSS) | Output encoding on all user-generated content (contact submissions, rich-text CMS fields sanitized on render); Content Security Policy enforced |
| Insecure Deserialization | No unsafe deserialization of untrusted payloads |
| Using Components with Known Vulnerabilities | Automated dependency scanning (e.g., `npm audit`, Dependabot/Snyk) in CI pipeline |
| Insufficient Logging & Monitoring | Audit log (see [08-Database-Requirements.md](08-Database-Requirements.md) `audit_log`), error tracking (Sentry), uptime monitoring |

## 8. Infrastructure Security

| ID | Requirement |
|---|---|
| SEC-INFRA-01 | Production database not directly internet-accessible — reachable only from the application tier's private network. |
| SEC-INFRA-02 | Server SSH access restricted to key-based authentication; password SSH login disabled. |
| SEC-INFRA-03 | Regular OS/dependency patching cadence defined in the DevOps runbook (see [14-Project-Timeline.md](14-Project-Timeline.md) Phase — Maintenance). |
| SEC-INFRA-04 | Rate limiting on public API endpoints (especially donation-initiation and contact-form endpoints) to mitigate abuse/DDoS. |
| SEC-INFRA-05 | Bot/CAPTCHA protection (e.g., hCaptcha/reCAPTCHA or honeypot) on Contact Us and Volunteer forms. |

## 9. Compliance Considerations

| ID | Requirement |
|---|---|
| SEC-COMP-01 | Donor consent captured for storing PII, referencing a published Privacy Policy (content pending — see [16-Assumptions-and-Dependencies.md](16-Assumptions-and-Dependencies.md)). |
| SEC-COMP-02 | Platform handles Indian donor data — data residency preference (India-region hosting) to be confirmed with client during infrastructure setup. |
| SEC-COMP-03 | CSR partner data, once the entity-mismatch conflict in [DOCUMENT_ANALYSIS.md](../docs/DOCUMENT_ANALYSIS.md) §5 is resolved, must only be published with the CSR partner organization's explicit consent. |

## 10. Pre-Launch Security Checklist

- [ ] Dependency vulnerability scan clean (no High/Critical unresolved)
- [ ] OWASP Top 10 review completed and findings remediated
- [ ] Razorpay webhook signature verification tested against simulated payloads
- [ ] RBAC matrix tested — each role verified to be blocked from out-of-scope actions (§4)
- [ ] TLS configuration verified (SSL Labs A rating or equivalent target)
- [ ] Backup restoration drill completed successfully
- [ ] Admin account default/test credentials removed from staging→production promotion
- [ ] Privacy Policy and Terms of Use published (pending client/legal content — see [16-Assumptions-and-Dependencies.md](16-Assumptions-and-Dependencies.md))

## 11. Incident Response

| Step | Action |
|---|---|
| Detection | Monitoring/alerting (Sentry, uptime monitor, anomalous audit-log activity) |
| Containment | Revoke compromised credentials/API keys immediately; DevOps runbook defines rollback procedure |
| Notification | Ashram leadership (President/General Secretary) notified within 24 hours of a confirmed data-security incident involving donor data |
| Remediation & Review | Root-cause analysis documented; corrective action tracked to closure |

---
**Related Documents:** [04-Non-Functional-Requirements.md](04-Non-Functional-Requirements.md) · [10-Roles-and-Permissions.md](10-Roles-and-Permissions.md) · [11-Technology-Stack.md](11-Technology-Stack.md) · [13-API-Requirements.md](13-API-Requirements.md) · [MASTER_PROJECT_PLAN.md](MASTER_PROJECT_PLAN.md)
