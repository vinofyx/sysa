# API Requirements
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Style** | RESTful JSON API, versioned (`/api/v1/...`) |

---

## 1. Purpose
Defines the API surface the Backend Architect will implement to serve both the public website and the Admin Dashboard, and to integrate external services. This is a requirements-level contract (resources, endpoints, purpose, auth) — not a full OpenAPI/Swagger spec, which is a downstream engineering deliverable.

## 2. API Design Principles

- RESTful resource-oriented URLs; JSON request/response bodies.
- Versioned base path (`/api/v1/`) to allow non-breaking evolution.
- Consistent envelope for errors: `{ "error": { "code": "...", "message": "...", "fields": {...} } }`.
- Bilingual content fields returned as `{ en: "...", te: "..." }` objects where applicable, rather than separate endpoints per locale.
- All admin endpoints require a valid session (JWT) and are authorized per [10-Roles-and-Permissions.md](10-Roles-and-Permissions.md).
- All public endpoints are rate-limited (see [12-Security-Requirements.md](12-Security-Requirements.md) SEC-INFRA-04).

## 3. Public API Resources

### 3.1 Content
| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/pages/home` | Home page content bundle | Public |
| GET | `/api/v1/pages/about` | About Us content bundle | Public |
| GET | `/api/v1/activities` | List activity/program sections | Public |
| GET | `/api/v1/committee` | List active committee members | Public |
| GET | `/api/v1/events` | List published events/news (paginated, filterable by type) | Public |
| GET | `/api/v1/events/{slug}` | Single event/news detail | Public |
| GET | `/api/v1/gallery/albums` | List gallery albums | Public |
| GET | `/api/v1/gallery/albums/{id}/items` | List items within an album | Public |
| GET | `/api/v1/appeals` | List active fundraising appeals with progress | Public |
| GET | `/api/v1/documents` | List publicly-visible compliance/transparency documents | Public |

### 3.2 Donations
| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/api/v1/donation-categories` | List donation categories with pricing tiers | Public |
| POST | `/api/v1/donations/initiate` | Create a pending donation + Razorpay order | Public |
| POST | `/api/v1/webhooks/razorpay` | Razorpay payment webhook receiver | Signature-verified (not user-authenticated) |
| GET | `/api/v1/donations/{id}/status` | Poll donation status (fallback reconciliation, see UC-01 Alt Flow 10a) | Public (scoped to donation ID + token) |
| GET | `/api/v1/donors/me/donations` | Donor's own donation history | Donor-authenticated |
| GET | `/api/v1/donations/{id}/receipt` | Download receipt PDF | Donor-authenticated (own record) or admin |
| GET | `/api/v1/donors/public` | Public donor recognition list (Major/Monthly/CSR — opt-in only) | Public |

### 3.3 Volunteers
| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/volunteers/register` | Submit volunteer registration | Public |
| POST | `/api/v1/volunteers/apply-internship` | Submit internship application (with résumé upload) | Public |

### 3.4 Contact
| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/contact` | Submit contact form | Public (CAPTCHA-protected) |

### 3.5 Donor Auth (if FR-DON-07 donor accounts implemented)
| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/api/v1/donor-auth/request-otp` | Request email/phone OTP for lightweight donor login | Public |
| POST | `/api/v1/donor-auth/verify-otp` | Verify OTP and issue donor session token | Public |

## 4. Admin API Resources

### 4.1 Auth
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/admin/auth/login` | Admin login |
| POST | `/api/v1/admin/auth/logout` | Invalidate session |
| POST | `/api/v1/admin/auth/forgot-password` | Trigger reset email |
| POST | `/api/v1/admin/auth/reset-password` | Complete reset with token |

### 4.2 Content Management
| Method | Endpoint | Purpose | Required Permission |
|---|---|---|---|
| PUT | `/api/v1/admin/pages/home` | Update Home content | `content:edit` |
| PUT | `/api/v1/admin/pages/about` | Update About Us content | `content:edit` |
| POST/PUT/DELETE | `/api/v1/admin/activities/{id}` | Manage activity sections | `content:edit` |
| POST/PUT/DELETE | `/api/v1/admin/appeals/{id}` | Manage appeals | `content:edit` |
| POST | `/api/v1/admin/pages/{id}/publish` | Publish a draft | `content:publish` |

### 4.3 Committee
| Method | Endpoint | Purpose | Required Permission |
|---|---|---|---|
| GET | `/api/v1/admin/committee` | List all (incl. inactive) | `committee:manage` |
| POST/PUT/DELETE | `/api/v1/admin/committee/{id}` | CRUD committee member | `committee:manage` |
| PATCH | `/api/v1/admin/committee/reorder` | Update display order | `committee:manage` |

### 4.4 Events & Gallery
| Method | Endpoint | Purpose | Required Permission |
|---|---|---|---|
| POST/PUT/DELETE | `/api/v1/admin/events/{id}` | CRUD event/news post | `events:manage` |
| POST/PUT/DELETE | `/api/v1/admin/gallery/albums/{id}` | CRUD album | `gallery:manage` |
| POST | `/api/v1/admin/gallery/albums/{id}/items` | Upload media | `gallery:manage` |
| DELETE | `/api/v1/admin/gallery/items/{id}` | Delete media item | `gallery:manage` |

### 4.5 Donations & Donors
| Method | Endpoint | Purpose | Required Permission |
|---|---|---|---|
| GET | `/api/v1/admin/donations` | List/filter donations | `donations:view` |
| POST | `/api/v1/admin/donations/manual` | Record offline donation | `donations:create_manual` |
| PATCH | `/api/v1/admin/donations/{id}/refund` | Flag refund | `donations:flag_refund` |
| GET | `/api/v1/admin/donations/export` | Export CSV/Excel | `donations:export` |
| GET | `/api/v1/admin/donors` | List/search donors | `donors:view` |
| PATCH | `/api/v1/admin/donors/{id}/recognition` | Toggle recognition opt-in listing | `donors:manage_recognition` |

### 4.6 Volunteers
| Method | Endpoint | Purpose | Required Permission |
|---|---|---|---|
| GET | `/api/v1/admin/volunteer-applications` | List/filter applications | `volunteers:view` |
| PATCH | `/api/v1/admin/volunteer-applications/{id}/status` | Update status | `volunteers:manage_status` |

### 4.7 Documents & Reports
| Method | Endpoint | Purpose | Required Permission |
|---|---|---|---|
| POST | `/api/v1/admin/documents` | Upload document | `documents:upload` |
| PATCH | `/api/v1/admin/documents/{id}/visibility` | Toggle public visibility | `documents:publish` |
| GET | `/api/v1/admin/reports/donations` | Generate donation summary report | `reports:generate` |
| GET | `/api/v1/admin/reports/donors` | Generate donor report | `reports:generate` |
| GET | `/api/v1/admin/reports/volunteers` | Generate volunteer report | `reports:generate` |

### 4.8 Users, Roles, Audit, Settings
| Method | Endpoint | Purpose | Required Permission |
|---|---|---|---|
| GET/POST/PUT | `/api/v1/admin/users` | Manage admin accounts | `users:manage` |
| PATCH | `/api/v1/admin/users/{id}/deactivate` | Deactivate account | `users:manage` |
| GET | `/api/v1/admin/audit-log` | View audit log (filterable) | `audit:view` |
| GET/PUT | `/api/v1/admin/settings` | View/update system settings | `settings:manage` |

## 5. External Integration Contracts

### 5.1 Razorpay
- **Outbound**: Create Order API call on donation initiation (server-to-server).
- **Inbound**: Webhook (`/api/v1/webhooks/razorpay`) for `payment.captured`, `payment.failed`, `refund.processed` events — HMAC-SHA256 signature verified against the configured webhook secret before processing.

### 5.2 Email Provider (SES/SendGrid)
- Outbound transactional sends: donation receipt, volunteer confirmation, contact acknowledgment, admin alerts. Templated, bilingual where the recipient's language preference is known.

### 5.3 WhatsApp
- Phase 1: static `wa.me` deep link (no API integration required).
- Phase 2 (optional, if approved): WhatsApp Cloud API for automated confirmation messages — requires a Meta Business verification process, flagged as a future enhancement in [16-Assumptions-and-Dependencies.md](16-Assumptions-and-Dependencies.md).

### 5.4 Google Maps
- Client-side Embed API call using the confirmed office coordinates (pending — see [01-BRD.md §7](01-BRD.md#7-information-gaps-requiring-client-input)).

## 6. Error Handling Convention

| HTTP Status | Meaning |
|---|---|
| 200/201 | Success |
| 400 | Validation error (field-level detail in response body) |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized (RBAC denial) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate donation webhook already processed — idempotency) |
| 429 | Rate limit exceeded |
| 500 | Unhandled server error (logged to error tracking, generic message returned to client) |

## 7. Idempotency & Reliability

- Razorpay webhook handler is idempotent: replayed webhook deliveries for an already-`completed` donation return 200 without reprocessing (prevents duplicate receipt emails).
- Donation-initiation endpoint is safe to retry client-side on network failure without creating duplicate `pending` records (client sends an idempotency key per checkout attempt).

## 8. API Documentation Deliverable

A full OpenAPI 3.0 specification (machine-readable, with request/response schemas) is a **build-phase engineering deliverable**, produced by the Backend Architect from this requirements document during the Design & Architecture phase (see [14-Project-Timeline.md](14-Project-Timeline.md)) — not part of this documentation package, which defines requirements, not implementation.

---
**Related Documents:** [08-Database-Requirements.md](08-Database-Requirements.md) · [10-Roles-and-Permissions.md](10-Roles-and-Permissions.md) · [12-Security-Requirements.md](12-Security-Requirements.md) · [11-Technology-Stack.md](11-Technology-Stack.md) · [MASTER_PROJECT_PLAN.md](MASTER_PROJECT_PLAN.md)
