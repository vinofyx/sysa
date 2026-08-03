# Non-Functional Requirements (NFR)
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Traceability** | Elaborates [02-SRS.md §5](02-SRS.md#5-non-functional-requirements-summary) |

---

## 1. Conventions
- **ID format**: `NFR-<Category>-<Number>`.
- Each requirement includes a measurable target where applicable — "production-ready" NFRs must be testable, not aspirational.

---

## 2. Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-PERF-01 | Public page Largest Contentful Paint (LCP) | < 2.5s on simulated 4G, median device |
| NFR-PERF-02 | Public page Time to Interactive (TTI) | < 3.5s on simulated 4G |
| NFR-PERF-03 | API response time for standard read endpoints (page content, gallery listing) | p95 < 400ms |
| NFR-PERF-04 | API response time for donation-initiation endpoint | p95 < 800ms (excludes external Razorpay round-trip) |
| NFR-PERF-05 | Image assets served via CDN with responsive `srcset`/next-gen formats (WebP/AVIF) | All gallery/hero images |
| NFR-PERF-06 | Admin dashboard initial load | < 3s on broadband |

## 3. Scalability

| ID | Requirement | Target |
|---|---|---|
| NFR-SCALE-01 | The system shall handle traffic spikes during appeal campaigns or festival-season donation drives without degradation. | Support ≥ 500 concurrent users at launch scale, horizontally scalable beyond via stateless API design. |
| NFR-SCALE-02 | The application server tier shall be horizontally scalable (stateless API instances behind a load balancer). | Architecture supports adding instances without code change. |
| NFR-SCALE-03 | The database shall support read-replica scaling as donation/content volume grows. | PostgreSQL with managed read-replica capability (see [11-Technology-Stack.md](11-Technology-Stack.md)). |
| NFR-SCALE-04 | Media storage shall scale independently of application compute. | Object storage (Cloudinary/S3) decoupled from app servers. |

## 4. Availability & Reliability

| ID | Requirement | Target |
|---|---|---|
| NFR-AVAIL-01 | System uptime | ≥ 99.5% monthly (excludes pre-announced maintenance windows) |
| NFR-AVAIL-02 | Scheduled maintenance windows | Communicated to admin users ≥ 24 hours in advance; scheduled outside peak donation hours where possible |
| NFR-AVAIL-03 | Automated database backups | Daily full backup, retained ≥ 30 days |
| NFR-AVAIL-04 | Disaster recovery — Recovery Point Objective (RPO) | ≤ 24 hours |
| NFR-AVAIL-05 | Disaster recovery — Recovery Time Objective (RTO) | ≤ 8 hours |
| NFR-AVAIL-06 | Payment webhook processing shall be idempotent and retry-safe. | No duplicate donation records on webhook redelivery |

## 5. Security

Full detail in [12-Security-Requirements.md](12-Security-Requirements.md). Summary NFRs:

| ID | Requirement | Target |
|---|---|---|
| NFR-SEC-01 | All traffic encrypted in transit | TLS 1.2+ enforced site-wide; HTTP → HTTPS redirect |
| NFR-SEC-02 | No raw payment card data stored on Ashram infrastructure | PCI-DSS SAQ-A scope via Razorpay hosted checkout |
| NFR-SEC-03 | Admin passwords stored using industry-standard hashing | bcrypt/argon2, never plaintext or reversible encryption |
| NFR-SEC-04 | Role-based access control enforced server-side on every admin API call | No client-side-only authorization checks |
| NFR-SEC-05 | Protection against OWASP Top 10 vulnerabilities | Verified via security review before launch (see [12-Security-Requirements.md](12-Security-Requirements.md)) |
| NFR-SEC-06 | Personally identifiable donor information (PII) access restricted to authorized roles only | Enforced per [10-Roles-and-Permissions.md](10-Roles-and-Permissions.md) |

## 6. Usability

| ID | Requirement | Target |
|---|---|---|
| NFR-USE-01 | Public site navigable and donation-completable on a mobile device without horizontal scrolling or zoom. | Verified on iPhone SE-class (375px) and standard Android viewports |
| NFR-USE-02 | Admin CMS usable by non-technical committee staff without developer assistance for routine content updates. | Validated via usability walkthrough with a designated non-technical Ashram admin user before go-live |
| NFR-USE-03 | Donation checkout flow completed in ≤ 4 user steps (select category/amount → donor details → payment → confirmation). | UX flow audit |
| NFR-USE-04 | Error messages shall be in plain language, bilingual, and actionable (not raw system/stack errors). | QA test pass |

## 7. Accessibility

| ID | Requirement | Target |
|---|---|---|
| NFR-ACC-01 | Public website shall conform to WCAG 2.1 Level AA. | Automated (axe-core) + manual screen-reader spot check before launch |
| NFR-ACC-02 | All images shall have meaningful `alt` text (bilingual where content-bearing). | Content audit |
| NFR-ACC-03 | Color contrast ratios shall meet WCAG AA minimums (4.5:1 body text). | Automated contrast checker in CI |
| NFR-ACC-04 | All interactive elements shall be keyboard-navigable. | Manual keyboard-only test pass |

## 8. Maintainability

| ID | Requirement | Target |
|---|---|---|
| NFR-MAINT-01 | Codebase shall follow a documented style guide and be linted in CI. | ESLint/Prettier (or stack equivalent) enforced on every PR |
| NFR-MAINT-02 | All environment configuration shall be externalized (no hardcoded secrets/URLs in code). | `.env`-based config, secrets in a managed secret store |
| NFR-MAINT-03 | System architecture shall separate content/data changes (admin CMS) from code deployments. | Non-technical staff never require a code deploy to update text/images |
| NFR-MAINT-04 | Automated test coverage for critical paths (donation flow, auth, RBAC). | ≥ 70% coverage on payment and auth modules specifically |

## 9. Portability / Compatibility

| ID | Requirement | Target |
|---|---|---|
| NFR-PORT-01 | Public site shall render correctly on the last 2 major versions of Chrome, Safari, Edge, Firefox. | Cross-browser QA pass |
| NFR-PORT-02 | Public site shall render correctly on iOS Safari and Android Chrome (last 2 major OS versions). | Device/BrowserStack QA pass |
| NFR-PORT-03 | Infrastructure shall avoid vendor lock-in where reasonably possible (containerized deployment). | Docker-based deployment portable across VPS/cloud providers |

## 10. Compliance & Legal

| ID | Requirement | Target |
|---|---|---|
| NFR-COMP-01 | Donation receipts shall reference the Ashram's PAN and (once available) 12A/80G status per Indian tax-exemption disclosure norms. | Content correctness reviewed against supplied certificates once available |
| NFR-COMP-02 | The platform shall include a Privacy Policy and Terms of Use appropriate to a donation-processing non-profit. | Legally reviewed text (client/legal counsel to supply or approve — see [16-Assumptions-and-Dependencies.md](16-Assumptions-and-Dependencies.md)) |
| NFR-COMP-03 | Cookie/analytics consent mechanism shall be implemented if legally required for the target audience. | Consent banner implemented; scope confirmed with client |

## 11. Localization

| ID | Requirement | Target |
|---|---|---|
| NFR-LOC-01 | All public-facing content shall support English and Telugu with correct Unicode rendering. | Verified across target browsers/devices |
| NFR-LOC-02 | Currency shall be displayed in Indian Rupees (₹/INR) with Indian numbering format (lakh/crore grouping) where appropriate. | Content review |
| NFR-LOC-03 | Dates shall be displayed in an unambiguous format (e.g., "03 Aug 2026") to avoid DD/MM vs MM/DD confusion. | Content review |

## 12. NFR Verification Summary

| Category | Verification Method | Owned By |
|---|---|---|
| Performance | Lighthouse CI, load testing (e.g., k6) | DevOps Engineer / QA Engineer |
| Scalability | Load/stress test before launch | DevOps Engineer |
| Availability | Uptime monitoring (e.g., UptimeRobot/Pingdom), backup verification drills | DevOps Engineer |
| Security | Manual + automated security review, dependency scanning | Security Engineer |
| Usability/Accessibility | Manual usability session + automated a11y scan | UI/UX Designer, QA Engineer |
| Maintainability | Code review checklist, CI lint/test gates | Frontend/Backend Architects |
| Compliance | Legal/content review checklist | Project Manager + Client |

---
**Related Documents:** [02-SRS.md](02-SRS.md) · [03-Functional-Requirements.md](03-Functional-Requirements.md) · [12-Security-Requirements.md](12-Security-Requirements.md) · [MASTER_PROJECT_PLAN.md](MASTER_PROJECT_PLAN.md)
