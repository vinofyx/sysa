# Deployment Architecture
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Phase** | 2 — Enterprise System Design & UI/UX |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Builds On** | [11-Technology-Stack.md](../documentation/11-Technology-Stack.md) (Phase 1, unmodified) |

---

## 1. Purpose
Defines the deployment topology, environment strategy, and CI/CD pipeline for the platform — the DevOps Engineer's primary design input.

## 2. Deployment Topology

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        Users["Public Users"]
        AdminUsers["Admin Users"]
    end
    subgraph Edge["Edge / CDN Layer"]
        CDN["CDN (e.g., Cloudflare)\nTLS Termination · DDoS Protection · Static Asset Cache"]
    end
    subgraph VPS["Application Server (VPS, Dockerized)"]
        LB["Reverse Proxy / Load Balancer\n(Nginx)"]
        Web1["Next.js App Container\n(instance 1)"]
        Web2["Next.js App Container\n(instance 2 - scale-out)"]
        API1["Node.js API Container\n(instance 1)"]
        API2["Node.js API Container\n(instance 2 - scale-out)"]
    end
    subgraph DataLayer["Managed Data Services"]
        PG[("PostgreSQL\nManaged / Self-hosted with automated backups")]
        Redis[("Redis - optional cache layer")]
    end
    subgraph ObjectStore["Object Storage"]
        Cloudinary["Cloudinary / AWS S3\n(media + documents)"]
    end
    subgraph ExternalSvc["External Services"]
        Razorpay["Razorpay"]
        Email["Email Provider (SES/SendGrid)"]
        Analytics["Analytics (GA4/Plausible)"]
        Sentry["Error Tracking (Sentry)"]
        Uptime["Uptime Monitor"]
    end

    Users --> CDN
    AdminUsers --> CDN
    CDN --> LB
    LB --> Web1
    LB --> Web2
    Web1 --> API1
    Web2 --> API2
    API1 --> PG
    API2 --> PG
    API1 --> Redis
    API2 --> Redis
    API1 --> Cloudinary
    API1 --> Razorpay
    API1 --> Email
    Web1 --> Analytics
    API1 -.-> Sentry
    Uptime -.-> LB
```

## 3. Environment Strategy

| Environment | Purpose | Infrastructure | Data |
|---|---|---|---|
| **Local Development** | Individual developer work | Docker Compose (Postgres + Redis + API + Web containers) | Seed/fixture data only |
| **Staging** | Client UAT ([14-Project-Timeline.md](../documentation/14-Project-Timeline.md) Phase 8), QA testing | Mirrors production topology at smaller scale (single instance each) | Anonymized/sample data; Razorpay in **Test Mode** |
| **Production** | Live public platform | Full topology per §2, horizontally scaled as needed | Real data; Razorpay in **Live Mode**; full monitoring/backup active |

```mermaid
flowchart LR
    Dev["Local Dev\nDocker Compose"] -->|"git push → CI"| Staging["Staging\n(auto-deploy on merge to develop)"]
    Staging -->|"Client UAT sign-off"| Prod["Production\n(manual-gated deploy on merge to main)"]
```

## 4. CI/CD Pipeline

```mermaid
flowchart TD
    Push["Developer pushes commit / opens PR"] --> Lint["Lint + Type Check"]
    Lint --> UnitTest["Unit Tests"]
    UnitTest --> Build["Build (Next.js + API)"]
    Build --> IntegrationTest["Integration Tests\n(incl. donation flow with Razorpay test keys)"]
    IntegrationTest --> SecurityScan["Dependency Vulnerability Scan\n(npm audit / Snyk / Dependabot)"]
    SecurityScan --> A11yScan["Automated Accessibility Scan\n(axe-core)"]
    A11yScan --> Gate{"All checks pass?"}
    Gate -- No --> Fail["PR blocked — feedback to developer"]
    Gate -- Yes --> Merge["Merge allowed"]
    Merge --> BranchCheck{"Branch?"}
    BranchCheck -- "develop" --> DeployStaging["Auto-deploy to Staging"]
    BranchCheck -- "main" --> ManualGate["Manual approval gate\n(Project Manager / Super Admin)"]
    ManualGate --> DeployProd["Deploy to Production\n(rolling/zero-downtime)"]
    DeployProd --> SmokeTest["Automated smoke test\n(homepage, donation-init, admin login)"]
    SmokeTest --> Monitor["Post-deploy monitoring window"]
```

**Pipeline tooling**: GitHub Actions (per [11-Technology-Stack.md](../documentation/11-Technology-Stack.md)), Docker image build/push to a container registry, deployment via SSH/Docker Compose redeploy on the VPS (or a managed container platform if the client later migrates toward the AWS scale-up path already anticipated in Phase 1).

## 5. Containerization Strategy

| Container | Base Image Family | Notes |
|---|---|---|
| `web` (Next.js) | Node LTS Alpine | Multi-stage build (build stage discarded, only production artifact + `node_modules` in final image) |
| `api` (Express) | Node LTS Alpine | Same multi-stage pattern |
| `nginx` (reverse proxy) | Nginx Alpine | TLS termination (or delegated to CDN), routes `/api/*` → API container, everything else → Web container |
| `postgres` (local dev only) | Postgres Alpine | Production uses a managed Postgres service where possible, not a self-managed container, to offload backup/patching burden appropriate for a small non-profit ops team |

## 6. Scaling Strategy

Directly implements NFR-SCALE-01…04 from [04-Non-Functional-Requirements.md](../documentation/04-Non-Functional-Requirements.md):

```mermaid
flowchart LR
    Normal["Normal Traffic\n1 Web + 1 API instance"] -->|"Festival/appeal\ncampaign spike detected"| ScaleOut["Scale-Out\n2-4 Web + 2-4 API instances\n(manual or autoscale trigger)"]
    ScaleOut --> LoadBalanced["Nginx load-balances\nacross instances"]
    LoadBalanced -->|"Traffic normalizes"| ScaleIn["Scale back to baseline"]
```

- **Stateless application tier**: no session state stored in-process (JWT-based auth + Redis for any shared cache) — any instance can serve any request, enabling horizontal scaling without sticky sessions.
- **Database scaling path**: start single-instance Postgres; add a read replica for reporting/analytics queries once donation volume justifies it (keeps write-path — donations — on the primary for strict consistency).

## 7. Backup & Disaster Recovery

| Item | Strategy | Target (from [04-Non-Functional-Requirements.md](../documentation/04-Non-Functional-Requirements.md)) |
|---|---|---|
| Database | Automated daily full backup + continuous WAL archiving (point-in-time recovery) | RPO ≤ 24h (NFR-AVAIL-04) |
| Backup retention | 30 days rolling | NFR-AVAIL-03 |
| Backup encryption | At-rest encryption on backup storage | SEC-DATA-02 |
| Restore drill | Quarterly test restore to a scratch environment | Verifies RTO ≤ 8h (NFR-AVAIL-05) is actually achievable, not just theoretical |
| Object storage (Cloudinary/S3) | Provider-native redundancy (multi-AZ) | Inherent to managed service |

## 8. Monitoring & Observability

```mermaid
flowchart TB
    App["Application (Web + API)"] --> Logs["Structured Logs"]
    App --> Errors["Error Tracking (Sentry)"]
    App --> Metrics["Performance Metrics\n(response times, DB query times)"]
    Uptime["External Uptime Monitor\n(UptimeRobot/Pingdom)"] --> Alert1["Alert: Site Down"]
    Errors --> Alert2["Alert: Error Spike"]
    Metrics --> Alert3["Alert: Performance Degradation"]
    Alert1 --> OnCall["Notify DevOps Engineer\n(email/SMS/Slack)"]
    Alert2 --> OnCall
    Alert3 --> OnCall
```

## 9. Domain & DNS Architecture

```mermaid
flowchart LR
    Domain["sysaindia.org\n(pending client DNS access\nper 16-Assumptions-and-Dependencies.md D-02)"] --> DNSProvider["DNS Provider"]
    DNSProvider -->|"A/CNAME"| CDN["CDN Edge"]
    DNSProvider -->|"MX"| EmailDNS["Email Provider\n(if Ashram email hosted separately)"]
    DNSProvider -->|"TXT"| SPFDKIM["SPF/DKIM records\nfor transactional email deliverability\n(SEC/NFR-COMP consideration)"]
    CDN --> VPS["Application Server"]
```

Until domain/DNS access is confirmed (open dependency), deployment proceeds against a staging subdomain (e.g., a provisioned `*.vercel.app`/`*.your-vps-provider.com` placeholder) so development is never blocked by this pending item — cutover to `sysaindia.org` happens only at Phase 9 Go-Live per [14-Project-Timeline.md](../documentation/14-Project-Timeline.md).

## 10. Deployment Readiness Checklist (maps to Phase 9 in the Timeline)

- [ ] Production environment provisioned and hardened (SEC-INFRA-01…03)
- [ ] Razorpay switched to Live Mode with verified webhook URL
- [ ] DNS cutover plan confirmed with client
- [ ] SSL certificate provisioned and auto-renewal configured
- [ ] Backup + restore drill completed successfully
- [ ] Monitoring/alerting active and tested (a deliberate test alert fired and received)
- [ ] Rollback procedure documented and rehearsed

---
**Related Documents:** [../documentation/11-Technology-Stack.md](../documentation/11-Technology-Stack.md) · [14-Folder-Structure.md](14-Folder-Structure.md) · [13-API-Architecture.md](13-API-Architecture.md) · [../documentation/12-Security-Requirements.md](../documentation/12-Security-Requirements.md) · [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
