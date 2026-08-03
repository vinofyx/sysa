# User Stories
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Format** | "As a [persona], I want to [goal], so that [benefit]." Each story includes Acceptance Criteria and traces to Functional Requirements in [03-Functional-Requirements.md](03-Functional-Requirements.md). |

---

## Personas

| Persona | Description |
|---|---|
| **Visitor** | Unauthenticated member of the public browsing the site |
| **Donor** | A visitor making or having made a monetary contribution |
| **Volunteer Applicant** | A visitor applying to volunteer or intern |
| **Content Admin** | Organizing Secretary / staff managing pages, events, gallery |
| **Finance Admin** | Treasurer / Asst. Treasurer managing donation records and reports |
| **Volunteer Coordinator** | Staff member managing volunteer applications |
| **Super Admin** | General Secretary / technical delegate with full system control |

---

## Epic 1: Public Information & Trust Building

**US-01** — As a **Visitor**, I want to read the Ashram's history and mission, so that I understand its purpose before deciding to engage or donate.
- *Acceptance Criteria:* History renders on About Us page; Vision/Mission shown once supplied, otherwise a "Coming Soon" placeholder is displayed — never fabricated text.
- *Traces to:* FR-ABOUT-01, FR-ABOUT-02

**US-02** — As a **Visitor**, I want to see the full governing committee with photos and roles, so that I can verify the organization is run by real, accountable people.
- *Acceptance Criteria:* All 27 committee members render correctly with designation; data sourced from the authoritative committee table, not the incomplete 25-person brochure grid.
- *Traces to:* FR-ABOUT-04

**US-03** — As a **Visitor**, I want to see the Ashram's registration number and PAN, so that I can trust it is a legitimate, registered entity.
- *Acceptance Criteria:* Regd. No. 423/2019 and PAN ABKAS9261K visible on About/Footer; 12A/80G status shown only once verified certificates are supplied.
- *Traces to:* FR-ABOUT-06

**US-04** — As a **Visitor**, I want to browse photos and videos of the Ashram's activities, so that I can see the real impact of donations.
- *Acceptance Criteria:* Gallery loads responsively, organized by category, with lazy-loaded images.
- *Traces to:* FR-GAL-01, FR-GAL-02

**US-05** — As a **Visitor**, I want to read published reports and audited financial statements, so that I can verify the Ashram is financially transparent.
- *Acceptance Criteria:* Reports & Transparency page lists downloadable documents once supplied by the Ashram; shows a clear "not yet published" state otherwise (no broken links).
- *Traces to:* FR-RPT-01, FR-RPT-02

---

## Epic 2: Donations

**US-06** — As a **Donor**, I want to choose a specific program (Annaprasadam, Goseva, Building Fund, etc.) to donate to, so that my contribution supports the cause I care about.
- *Acceptance Criteria:* Donation Categories page lists all 5 categories with descriptions and, where defined, preset pricing tiers.
- *Traces to:* FR-DON-01

**US-07** — As a **Donor**, I want to pay via UPI, card, or net banking, so that I can use whichever payment method is most convenient for me.
- *Acceptance Criteria:* Razorpay Checkout offers UPI, card, net banking, and wallet options; payment completes and confirms within the flow without leaving a broken state.
- *Traces to:* FR-DON-03

**US-08** — As a **Donor**, I want to receive an emailed receipt immediately after donating, so that I have proof of my contribution for my records/tax purposes.
- *Acceptance Criteria:* Receipt email arrives within 60 seconds, includes donation ID, amount, category, date, and Ashram registration details.
- *Traces to:* FR-DON-05

**US-09** — As a **Donor**, I want to transfer funds directly via bank transfer or UPI QR if I prefer not to use a card, so that I have a low-friction alternative payment path.
- *Acceptance Criteria:* Bank details and UPI QR are always visible on the Donations page, independent of gateway availability.
- *Traces to:* FR-DON-04

**US-10** — As a **Returning Donor**, I want to view my past donation history, so that I can track my giving over time and re-download receipts.
- *Acceptance Criteria:* Donor can access a donation history list tied to their email/account; receipts re-downloadable as PDF.
- *Traces to:* FR-DON-07

**US-11** — As a **Monthly Donor**, I want to set up a recurring donation to Goseva, so that I don't need to manually donate every month.
- *Acceptance Criteria:* Recurring setup available for defined monthly tiers (₹5,116 / ₹11,116); donor can cancel/manage the subscription.
- *Traces to:* FR-DON-08 *(Phase 2 — see [14-Project-Timeline.md](14-Project-Timeline.md))*

**US-12** — As a **Donor**, I want to see clearly if my payment failed and be able to retry, so that I don't lose track of whether my donation went through.
- *Acceptance Criteria:* Failed payments show a distinct, non-ambiguous error state with a retry CTA; no duplicate/ghost donation records.
- *Traces to:* FR-DON-10

---

## Epic 3: Volunteering

**US-13** — As a **Volunteer Applicant**, I want to submit my details and areas of interest online, so that I can offer my time without needing to visit or call the Ashram first.
- *Acceptance Criteria:* Form submits successfully with validation; confirmation message and email/WhatsApp sent.
- *Traces to:* FR-VOL-01, FR-VOL-03

**US-14** — As a **Volunteer Applicant** (student/professional), I want to apply for an internship with details of my background, so that I can gain hands-on experience with the Ashram's programs.
- *Acceptance Criteria:* Internship form supports résumé upload; submission routes to Volunteer Coordinator review queue.
- *Traces to:* FR-VOL-02, FR-VOL-04

**US-15** — As a **Volunteer Coordinator**, I want to be notified immediately when a new application arrives, so that I can respond promptly and not lose engaged volunteers.
- *Acceptance Criteria:* Email alert sent to the coordinator role within minutes of submission.
- *Traces to:* FR-VOL-04

---

## Epic 4: Engagement & Communication

**US-16** — As a **Visitor**, I want to contact the Ashram easily via a form, phone, or WhatsApp, so that I can ask questions before donating or visiting.
- *Acceptance Criteria:* Contact form, phone number, and WhatsApp click-to-chat all functional; **office phone/email/timings content pending from client**.
- *Traces to:* FR-CON-01, FR-CON-02, FR-NOTIF-02

**US-17** — As a **Visitor**, I want to find the Ashram's location on a map, so that I can plan an in-person visit.
- *Acceptance Criteria:* Google Map embed shows correct pin. **Pending exact coordinates from client.**
- *Traces to:* FR-CON-03

**US-18** — As a **Visitor**, I want to switch between English and Telugu, so that I can read the content in my preferred language.
- *Acceptance Criteria:* Language toggle available on every page; selection persists during the session.
- *Traces to:* FR-LANG-01

---

## Epic 5: Content Administration

**US-19** — As a **Content Admin**, I want to edit page text, upload images, and publish events without involving a developer, so that I can keep the site current on my own schedule.
- *Acceptance Criteria:* CMS forms are simple (WYSIWYG rich text, drag-and-drop image upload); non-technical usability validated pre-launch.
- *Traces to:* FR-ADM-CMS (see [09-Admin-Modules.md](09-Admin-Modules.md))

**US-20** — As a **Content Admin**, I want to manage the Committee roster (add/edit/remove members, update photos), so that the public page always reflects the current 2025–2028 committee accurately.
- *Acceptance Criteria:* CRUD interface for committee members; changes reflect on the public About Us page immediately on publish.
- *Traces to:* FR-ADM-CMT (see [09-Admin-Modules.md](09-Admin-Modules.md))

**US-21** — As a **Content Admin**, I want to upload and organize gallery photos/videos into albums, so that the public gallery stays organized and current.
- *Acceptance Criteria:* Bulk upload supported; drag-to-reorder; category/album tagging.
- *Traces to:* FR-GAL-03

---

## Epic 6: Financial Administration

**US-22** — As a **Finance Admin**, I want to view all donation transactions with filters (date range, category, status), so that I can reconcile donations against bank statements.
- *Acceptance Criteria:* Filterable/sortable donation table; export to CSV/Excel.
- *Traces to:* [09-Admin-Modules.md](09-Admin-Modules.md) Donation Management

**US-23** — As a **Finance Admin**, I want to generate a donation summary report for a given period, so that I can prepare financial statements and reports for the committee.
- *Acceptance Criteria:* Report generated by date range, category, and payment method; downloadable as PDF/Excel.
- *Traces to:* [09-Admin-Modules.md](09-Admin-Modules.md) Reports

**US-24** — As a **Finance Admin**, I want to manually record an offline (cash/cheque/bank transfer) donation, so that all contributions — not just online ones — are tracked in one system.
- *Acceptance Criteria:* Manual donation entry form with the same data fields as online donations, flagged with source = "Manual/Offline".
- *Traces to:* [09-Admin-Modules.md](09-Admin-Modules.md) Donation Management

---

## Epic 7: System Administration & Governance

**US-25** — As a **Super Admin**, I want to create admin accounts and assign roles, so that each committee member only has access appropriate to their responsibility.
- *Acceptance Criteria:* User management CRUD with role assignment per [10-Roles-and-Permissions.md](10-Roles-and-Permissions.md); enforced server-side.
- *Traces to:* FR-AUTH-01, FR-AUTH-02

**US-26** — As a **Super Admin**, I want to view an audit log of sensitive admin actions, so that I can maintain accountability and detect misuse.
- *Acceptance Criteria:* Audit log records actor, action, timestamp, affected record; read-only, append-only.
- *Traces to:* FR-AUTH-04

**US-27** — As a **Super Admin**, I want to see analytics on site traffic and donation trends, so that I can report performance to the committee and plan campaigns.
- *Acceptance Criteria:* Analytics dashboard widget shows visits, top pages, and donation trend chart.
- *Traces to:* FR-ANL-02

---

## User Story Summary

| Epic | Story Count |
|---|---|
| Public Information & Trust Building | 5 |
| Donations | 7 |
| Volunteering | 3 |
| Engagement & Communication | 3 |
| Content Administration | 3 |
| Financial Administration | 3 |
| System Administration & Governance | 3 |
| **Total** | **27** |

---
**Related Documents:** [03-Functional-Requirements.md](03-Functional-Requirements.md) · [06-Use-Cases.md](06-Use-Cases.md) · [10-Roles-and-Permissions.md](10-Roles-and-Permissions.md) · [MASTER_PROJECT_PLAN.md](MASTER_PROJECT_PLAN.md)
