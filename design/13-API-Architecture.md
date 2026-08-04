# API Architecture
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Phase** | 2 — Enterprise System Design & UI/UX |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Builds On** | [13-API-Requirements.md](../documentation/13-API-Requirements.md) (Phase 1, unmodified) — this document adds the layered architecture, request lifecycle, and auth-flow diagrams behind that endpoint catalogue |

> **Update (2026-08-04):** by explicit client decision, the implemented platform's database is **MySQL 8.0+**, not the PostgreSQL shown in this document's diagrams below. See [MYSQL_MIGRATION_REPORT.md](../MYSQL_MIGRATION_REPORT.md). The layering/request-lifecycle/auth-flow architecture itself is database-engine-agnostic and unaffected.

---

## 1. Purpose
Phase 1 defined *what* the API exposes (resources, endpoints, permissions). This document defines *how* the API is architected internally — layering, middleware pipeline, authentication flows, and the payment-webhook processing architecture — as direct input to the Backend Architect.

## 2. Layered Architecture

```mermaid
flowchart TB
    subgraph L1["Presentation Layer"]
        Routes["Route Handlers\n(REST endpoints per 13-API-Requirements.md)"]
    end
    subgraph L2["Middleware Pipeline"]
        MW1["Rate Limiter"]
        MW2["Auth Middleware\n(JWT verify)"]
        MW3["RBAC Middleware\n(permission check)"]
        MW4["Request Validator\n(schema validation)"]
        MW5["Audit Logger\n(sensitive actions)"]
    end
    subgraph L3["Service Layer"]
        SVC1["Donation Service"]
        SVC2["Content Service"]
        SVC3["Volunteer Service"]
        SVC4["Notification Service"]
        SVC5["Report Service"]
        SVC6["User/Auth Service"]
    end
    subgraph L4["Data Access Layer"]
        Repo["Repository/ORM Layer"]
    end
    subgraph L5["Data Store"]
        DB[("PostgreSQL")]
        Cache[("Redis - optional")]
    end
    subgraph External["External Integrations"]
        Razorpay["Razorpay"]
        Storage["Cloudinary/S3"]
        Email["Email Provider"]
    end

    Routes --> MW1 --> MW2 --> MW3 --> MW4 --> L3
    L3 --> MW5
    SVC1 --> Repo
    SVC2 --> Repo
    SVC3 --> Repo
    SVC5 --> Repo
    SVC6 --> Repo
    Repo --> DB
    Repo --> Cache
    SVC1 --> Razorpay
    SVC2 --> Storage
    SVC3 --> Storage
    SVC4 --> Email
```

**Rationale for this layering:** strict separation between route handlers (HTTP concerns only), services (business logic — e.g., "what does it mean to complete a donation"), and the repository layer (data access only) means the business rules from [08-Database-Requirements.md §4](../documentation/08-Database-Requirements.md#4-data-integrity--business-rules) (e.g., "a receipt is only created when a donation is completed") live in exactly one place (Donation Service), not scattered across route handlers.

## 3. Request Lifecycle (Standard Authenticated Admin Request)

```mermaid
sequenceDiagram
    actor Admin
    participant FE as Admin Dashboard
    participant RL as Rate Limiter
    participant Auth as Auth Middleware
    participant RBAC as RBAC Middleware
    participant Val as Validator
    participant Svc as Service Layer
    participant Repo as Repository
    participant DB as PostgreSQL
    participant Audit as Audit Logger

    Admin->>FE: Triggers action (e.g., Publish content)
    FE->>RL: HTTPS request + JWT
    RL->>RL: Check rate limit
    RL->>Auth: Forward
    Auth->>Auth: Verify JWT signature/expiry
    alt Invalid/expired token
        Auth-->>FE: 401 Unauthorized
    else Valid token
        Auth->>RBAC: Forward with decoded user/role
        RBAC->>RBAC: Check required permission\n(per 10-Roles-and-Permissions.md)
        alt Permission denied
            RBAC-->>Audit: Log denied attempt
            RBAC-->>FE: 403 Forbidden
        else Permission granted
            RBAC->>Val: Forward
            Val->>Val: Validate request schema
            alt Invalid payload
                Val-->>FE: 400 Bad Request + field errors
            else Valid payload
                Val->>Svc: Execute business logic
                Svc->>Repo: Read/write data
                Repo->>DB: SQL query
                DB-->>Repo: Result
                Repo-->>Svc: Domain object
                Svc-->>Audit: Log sensitive action (if applicable)
                Svc-->>FE: 200/201 + response body
            end
        end
    end
```

## 4. Authentication Architecture

### 4.1 Admin Authentication (JWT-based session)

```mermaid
flowchart LR
    Login["POST /admin/auth/login\n(email + password)"] --> Verify["Verify bcrypt hash"]
    Verify -- Fail --> Fail401["401 + backoff counter incremented\n(SEC-AUTH-04)"]
    Verify -- Success --> IssueTokens["Issue Access Token (short-lived, ~15min)\n+ Refresh Token (longer-lived, httpOnly cookie)"]
    IssueTokens --> Client["Admin Dashboard stores\naccess token in memory"]
    Client --> APICall["Subsequent API calls carry\nAccess Token in Authorization header"]
    APICall --> Expiry{"Access token expired?"}
    Expiry -- Yes --> Refresh["POST /admin/auth/refresh\nusing httpOnly Refresh Token"]
    Refresh --> NewToken["New Access Token issued"]
    Expiry -- No --> Proceed["Request proceeds"]
```

**Design rationale:** short-lived access tokens minimize the blast radius of a leaked token; the refresh token in an `httpOnly` cookie is inaccessible to XSS-injected JavaScript, directly supporting SEC-AUTH-03 in [12-Security-Requirements.md](../documentation/12-Security-Requirements.md).

### 4.2 Donor Authentication (lightweight, optional — for FR-DON-07 donation history)

```mermaid
flowchart LR
    Request["POST /donor-auth/request-otp\n(email)"] --> Gen["Generate 6-digit OTP,\nstore hashed with 5-min expiry"]
    Gen --> Send["Email OTP to donor"]
    Send --> Verify["POST /donor-auth/verify-otp"]
    Verify -- Correct --> Session["Issue Donor Session Token\n(scoped only to donor:self)"]
    Verify -- Incorrect/Expired --> Retry["Error + retry/resend option"]
```

Deliberately lighter-weight than admin auth (no password to manage) — appropriate for an optional, low-friction donor convenience feature rather than a security-critical account system.

## 5. Payment Webhook Processing Architecture

This is the most security- and reliability-critical part of the API, elaborating SEC-PAY-02 and the idempotency requirement from [13-API-Requirements.md §7](../documentation/13-API-Requirements.md#7-idempotency--reliability):

```mermaid
flowchart TD
    RZP["Razorpay sends webhook\n(payment.captured / payment.failed)"] --> Endpoint["POST /webhooks/razorpay"]
    Endpoint --> SigCheck{"HMAC signature valid?"}
    SigCheck -- No --> Reject["401 — reject, log security event"]
    SigCheck -- Yes --> Idempotent{"Event ID already processed?\n(idempotency_key table check)"}
    Idempotent -- Yes --> Ack["200 OK — no reprocessing\n(prevents duplicate receipts)"]
    Idempotent -- No --> Lock["Acquire row lock on donation record"]
    Lock --> UpdateStatus["Update donation.status\nbased on event type"]
    UpdateStatus --> RecordEvent["Record event ID as processed"]
    RecordEvent --> Trigger{"status == completed?"}
    Trigger -- Yes --> ReceiptGen["Generate Receipt +\nQueue notification email"]
    Trigger -- No --> NoOp["No further action\n(failed/refunded path)"]
    ReceiptGen --> Ack
    NoOp --> Ack
```

**Fallback reconciliation job** (addresses UC-01 Alt Flow 10a from [06-Use-Cases.md](../documentation/06-Use-Cases.md)): a scheduled job runs every 15 minutes, queries Razorpay's payment-status API for any `donation` still `pending` for > 20 minutes, and reconciles status directly — ensuring no donation is ever permanently stuck due to a missed webhook.

## 6. API Versioning & Deprecation Strategy

- All routes prefixed `/api/v1/`. A breaking change (removed field, changed response shape) requires a new `/api/v2/` namespace rather than mutating `v1` behavior — protects the Admin Dashboard and any future integrations from silent breakage.
- Non-breaking additions (new optional fields, new endpoints) ship directly into the current version.

## 7. Error Handling Architecture

Consistent with the envelope defined in [13-API-Requirements.md §2](../documentation/13-API-Requirements.md#2-api-design-principles):

```mermaid
flowchart LR
    Error["Exception thrown in Service Layer"] --> Handler["Global Error Handler Middleware"]
    Handler --> Classify{"Error type?"}
    Classify -- "Validation" --> E400["400 + field-level errors"]
    Classify -- "Auth" --> E401["401"]
    Classify -- "Authorization" --> E403["403 + audit log entry"]
    Classify -- "Not Found" --> E404["404"]
    Classify -- "Conflict/Idempotency" --> E409["409"]
    Classify -- "Rate Limit" --> E429["429"]
    Classify -- "Unhandled" --> E500["500 + Sentry capture\n+ generic message to client"]
```

## 8. Caching Strategy

| Data | Cache? | TTL / Invalidation |
|---|---|---|
| Public content (Home, About, Activities) | Yes (Redis or CDN edge cache) | Invalidated immediately on admin Publish action (event-driven, not TTL-only) |
| Donation categories/pricing | Yes | Invalidated on admin content update |
| Donation records, donor data | No | Always fresh — financial data integrity requires no stale reads |
| Analytics/report aggregates | Yes, short TTL (5 min) | Reduces DB load for repeated dashboard views |

## 9. Rate Limiting Architecture

| Endpoint Group | Limit (per IP) | Rationale |
|---|---|---|
| `POST /donations/initiate` | 10/minute | Prevents donation-order-creation abuse without blocking legitimate rapid retries |
| `POST /contact`, `POST /volunteers/*` | 5/minute | Anti-spam, per SEC-INFRA-04 |
| `POST /admin/auth/login` | 5/minute, exponential backoff after failures | Anti-brute-force, per SEC-AUTH-04 |
| General public GET endpoints | 60/minute | Generous — protects against scraping/abuse without affecting normal browsing |

---
**Related Documents:** [../documentation/13-API-Requirements.md](../documentation/13-API-Requirements.md) · [12-Database-ERD.md](12-Database-ERD.md) · [../documentation/12-Security-Requirements.md](../documentation/12-Security-Requirements.md) · [15-Deployment-Architecture.md](15-Deployment-Architecture.md) · [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
