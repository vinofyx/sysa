# Admin Flows
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Phase** | 2 — Enterprise System Design & UI/UX |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Traceability** | Elaborates [09-Admin-Modules.md](../documentation/09-Admin-Modules.md) and [06-Use-Cases.md](../documentation/06-Use-Cases.md) into screen-level admin flows |

---

## 1. Purpose
Details the operational workflows non-technical Ashram staff will follow inside the Admin Dashboard. Designed around the constraint that primary admins are **retired professionals with low-to-medium technical proficiency** ([02-SRS.md §2.3](../documentation/02-SRS.md)) — every flow favors clarity and confirmation steps over speed/power-user shortcuts.

## 2. Flow Index

| Flow | Primary Role |
|---|---|
| AF-01 Admin Login & Session | All admin roles |
| AF-02 Publish a Content Update | Content Admin |
| AF-03 Create & Publish an Event | Content Admin |
| AF-04 Reconcile Donations | Finance Admin |
| AF-05 Record a Manual/Offline Donation | Finance Admin |
| AF-06 Generate a Financial Report | Finance Admin |
| AF-07 Review a Volunteer Application | Volunteer Coordinator |
| AF-08 Manage Committee Roster | Content Admin |
| AF-09 Create/Edit an Admin User | Super Admin |
| AF-10 Upload a Compliance Document | Finance Admin / Super Admin |

---

## 3. AF-01: Admin Login & Session

```mermaid
flowchart TD
    A["Navigate to /admin/login"] --> B["Enter email + password"]
    B --> C{"Valid credentials?"}
    C -- No --> D["Error shown\n(generic — no user-enumeration hint)"]
    D --> B
    C -- Yes --> E["Session (JWT) issued"]
    E --> F["Redirect to Dashboard Home,\nscoped to role's permitted modules"]
    F --> G{"Idle 30 min?"}
    G -- Yes --> H["Auto logout, redirect to Login"]
```

Forgot-password sub-flow: Login screen → "Forgot Password" → enter email → reset link emailed → set new password (token expires in 30 min, per SEC-AUTH-05).

---

## 4. AF-02: Publish a Content Update (e.g., editing the Vision & Mission section)

```mermaid
flowchart TD
    A["Dashboard → Content → About Editor"] --> B["Select section\n(e.g., Vision & Mission)"]
    B --> C["Edit rich-text field — English"]
    C --> D["Switch tab → edit Telugu field"]
    D --> E{"Telugu field complete?"}
    E -- No --> F["'Save as Draft' allowed;\n'Publish' button shows warning badge"]
    E -- Yes --> G["Both 'Save as Draft' and 'Publish' available"]
    F --> H["Admin saves Draft, continues later"]
    G --> I["Admin clicks Publish"]
    I --> J["Confirmation dialog:\n'This will go live immediately. Continue?'"]
    J --> K["Change is live on public site"]
    K --> L["Audit log entry recorded"]
```

This flow is the concrete UI implementation of UC-03 in [06-Use-Cases.md](../documentation/06-Use-Cases.md) and the missing-translation gate in FR-LANG-02.

---

## 5. AF-03: Create & Publish an Event

```mermaid
flowchart TD
    A["Dashboard → Engagement → Events/News"] --> B["Click 'New Event'"]
    B --> C["Fill: Title (EN/TE), Date, Body (EN/TE),\nFeatured Image, SEO meta"]
    C --> D["Upload featured image\n(drag-and-drop)"]
    D --> E["Preview (mobile + desktop view toggle)"]
    E --> F{"Ready to publish?"}
    F -- "Not yet" --> G["Save as Draft"]
    F -- "Yes" --> H["Publish"]
    H --> I["Event appears on:\nHome (if upcoming), Events & News index,\npublic XML sitemap"]
```

---

## 6. AF-04: Reconcile Donations (Finance Admin)

```mermaid
flowchart TD
    A["Dashboard → Finance → Donations"] --> B["Filter by date range\n(e.g., this month)"]
    B --> C["View list + running total"]
    C --> D["Cross-check against SBI\nbank statement / Razorpay settlement report"]
    D --> E{"All amounts match?"}
    E -- Yes --> F["Mark period as reconciled\n(internal note)"]
    E -- No --> G["Identify discrepancy"]
    G --> H{"Missing system record\nfor a bank-side entry?"}
    H -- Yes --> I["→ AF-05 Record Manual Donation"]
    H -- No --> J["Flag donation record\nfor investigation (internal note field)"]
```

This is the UI-level detail behind UC-04 in [06-Use-Cases.md](../documentation/06-Use-Cases.md).

---

## 7. AF-05: Record a Manual/Offline Donation

```mermaid
flowchart TD
    A["Dashboard → Finance → Donations"] --> B["Click 'Add Manual Donation'"]
    B --> C["Enter: Donor Name, Email (optional),\nPhone, Amount, Category, Payment Method\n(Cash/Cheque/Bank Transfer), Date Received"]
    C --> D["Save"]
    D --> E["Record created:\nsource=Manual, status=Completed"]
    E --> F{"Donor email provided?"}
    F -- Yes --> G["Receipt emailed"]
    F -- No --> H["No email sent —\nrecord still appears in all reports"]
```

---

## 8. AF-06: Generate a Financial Report

```mermaid
flowchart TD
    A["Dashboard → Finance → Reports"] --> B["Select report type:\nDonation Summary / Donor List / Appeal Progress"]
    B --> C["Select date range + filters\n(category, payment method)"]
    C --> D["Click 'Generate'"]
    D --> E["Preview report in-browser"]
    E --> F["Download as PDF or Excel"]
    F --> G["Used for committee meeting /\naudit preparation"]
```

---

## 9. AF-07: Review a Volunteer Application

```mermaid
flowchart TD
    A["Dashboard → Engagement → Volunteers\n(new-application badge visible)"] --> B["Open application list,\nfilter: Submitted"]
    B --> C["Open an application"]
    C --> D["Review details\n(+ résumé download if internship)"]
    D --> E{"Decision"}
    E -- "Accept" --> F["Set status = Accepted"]
    E -- "Not a fit" --> G["Set status = Not Selected"]
    E -- "Need more info" --> H["Set status = Under Review,\nadd internal note"]
    F --> I{"Notify applicant?"}
    G --> I
    I -- Yes --> J["Status-update email sent"]
```

---

## 10. AF-08: Manage Committee Roster

```mermaid
flowchart TD
    A["Dashboard → Engagement → Committee"] --> B["View current roster\n(27 members, ordered)"]
    B --> C{"Action?"}
    C -- "Add member" --> D["New Member form:\nName, Designation, Photo, Bio (optional)"]
    C -- "Edit member" --> E["Edit existing fields"]
    C -- "Reorder" --> F["Drag-and-drop to new position"]
    C -- "Term ends" --> G["Toggle Inactive\n(preserved in records, hidden from public page)"]
    D --> H["Save"]
    E --> H
    F --> H
    G --> H
    H --> I["Public About Us Committee grid\nupdates immediately"]
```

**Data note:** initial roster load populates from the verified 27-member table (`COMMITTEE MEMBERS LIST.docx`) rather than the incomplete 25-member brochure subset, per [DOCUMENT_ANALYSIS.md](../docs/DOCUMENT_ANALYSIS.md).

---

## 11. AF-09: Create/Edit an Admin User (Super Admin only)

```mermaid
flowchart TD
    A["Dashboard → System → Users & Roles"] --> B["Click 'Add User'"]
    B --> C["Enter Name, Email,\nAssign Role (Content Admin / Finance Admin /\nVolunteer Coordinator / Super Admin)"]
    C --> D["Save"]
    D --> E["Invitation email sent\nwith password-setup link"]
    E --> F["New admin sets password,\nlogs in with role-scoped access"]

    G["Existing user departs committee"] --> H["Super Admin opens their record"]
    H --> I["Click 'Deactivate'"]
    I --> J["Access revoked immediately;\naudit history retained"]
```

---

## 12. AF-10: Upload a Compliance Document

```mermaid
flowchart TD
    A["Dashboard → Finance → Documents\n(or System, for legal/registration docs)"] --> B["Click 'Upload Document'"]
    B --> C["Select category:\nRegistration Cert / 12AB / 80G /\nAnnual Report / Audit Report / Financial Statement"]
    C --> D["Upload PDF file"]
    D --> E["Enter Title (EN/TE), Publish Date"]
    E --> F{"Publish now or stage as draft?"}
    F -- "Stage" --> G["public_visible = false\n(saved for later review)"]
    F -- "Publish" --> H["public_visible = true"]
    H --> I["Appears on Reports & Transparency page"]
```

This flow supports the phased arrival of compliance documents from the client (see [16-Assumptions-and-Dependencies.md](../documentation/16-Assumptions-and-Dependencies.md)) without blocking launch.

---

## 13. Cross-Cutting Admin UX Rules

1. **Every destructive or "goes live publicly" action requires an explicit confirmation dialog** (Publish, Deactivate User, Delete Gallery Item) — never a silent one-click action.
2. **Every sensitive action is audit-logged transparently** — Super Admin can always answer "who changed this and when" without needing developer help (AF-11 implied: Dashboard → System → Audit Log, simple read-only filtered table).
3. **No admin screen requires understanding of underlying technical terms** (no "slug," "webhook," or "API" language exposed in the UI — these are developer-facing concepts confined to [13-API-Requirements.md](../documentation/13-API-Requirements.md) and never surfaced to committee users).
4. **Mobile/tablet usability for admin is a Should Have, not dismissed** — committee members may only have a tablet at home; critical flows (AF-04 Reconcile, AF-07 Review Volunteer) must remain usable at ≥768px width even though the primary admin design target is desktop (see [08-Responsive-Design.md](08-Responsive-Design.md)).

---
**Related Documents:** [09-Admin-Modules.md](../documentation/09-Admin-Modules.md) · [10-Roles-and-Permissions.md](../documentation/10-Roles-and-Permissions.md) · [05-Wireframes.md](05-Wireframes.md) · [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
