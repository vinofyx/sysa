# Functional Requirements Document
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Traceability** | Elaborates [02-SRS.md §4](02-SRS.md#4-functional-requirements-summary) |

---

## 1. Conventions

- **ID format**: `FR-<Module>-<Number>` (e.g., `FR-DON-01`).
- **Priority**: `Must Have` (MVP-blocking), `Should Have` (high value, can slip one sprint), `Could Have` (nice-to-have / later phase).
- **Status**: All requirements below are `Proposed`, pending client sign-off per [01-BRD.md §11](01-BRD.md#11-approval).

---

## 2. Home Module (FR-HOME)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-HOME-01 | The system shall display a hero banner with rotating/static imagery, the Ashram name, motto ("Service to Human is Service to God"), and a primary "Donate Now" call-to-action. | Must Have | Hero renders on load in < 2.5s LCP; CTA links to Donation module; content editable via Admin CMS. |
| FR-HOME-02 | The system shall display a welcome message summarizing the Ashram's mission, sourced from admin-managed content. | Must Have | Text block is admin-editable in both EN and TE; falls back to EN if TE translation missing, with an admin-visible warning. |
| FR-HOME-03 | The system shall display a "Quick Donate" widget allowing selection of a donation category and preset/custom amount directly from the homepage. | Must Have | Selecting a category + amount and clicking "Donate" routes to the donation checkout flow (FR-DON-02) with the selection pre-filled. |
| FR-HOME-04 | The system shall display upcoming/recent Events pulled from the Events & News module. | Should Have | Shows up to 3 upcoming events sorted by date ascending; "View All" links to Events & News page. |
| FR-HOME-05 | The system shall display a testimonials carousel. | Should Have | Renders admin-managed testimonial entries; gracefully hides the section if zero testimonials exist (no empty placeholder shown to public). |
| FR-HOME-06 | The system shall display key impact statistics (e.g., residents supported, meals served, years of service). | Could Have | Numbers sourced from an admin-editable "Impact Stats" content block; flagged as pending client-supplied figures — see [16-Assumptions-and-Dependencies.md](16-Assumptions-and-Dependencies.md). |
| FR-HOME-07 | The homepage shall be fully available in English and Telugu via the language switcher. | Must Have | All text elements on the homepage have EN and TE variants; switching language does not require a full page reload of unrelated state (e.g., cart/donation selection persists). |

## 3. About Us Module (FR-ABOUT)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ABOUT-01 | The system shall display the Ashram's History narrative. | Must Have | Sourced from brochure narrative content, admin-editable rich text. |
| FR-ABOUT-02 | The system shall display a formal Vision & Mission statement. | Must Have | **Content pending from client** — page section shall render a clearly marked "Coming Soon" state (not a fabricated statement) until supplied; admin can publish once text is provided. |
| FR-ABOUT-03 | The system shall display Founder details. | Must Have | **Content pending from client** for the Ashram's own founder narrative (brochure covers Old Age Home founders only); render "Coming Soon" until supplied. |
| FR-ABOUT-04 | The system shall display the full governing Committee (2025–2028) with photo, name, and designation for all 27 members. | Must Have | Data sourced from the Committee data table (FR-ADM-CMT-01); renders responsively as a grid; matches the authoritative committee roster, not the incomplete 25-member brochure subset. |
| FR-ABOUT-05 | The system shall display a Treasurer's Message. | Should Have | **Content pending from client**; render "Coming Soon" until supplied. |
| FR-ABOUT-06 | The system shall display the Society Registration Number, PAN, and (once available) 12A/80G status. | Must Have | Values sourced from verified organizational data (Regd. No. 423/2019, PAN ABKAS9261K); 12A/80G section hidden until certificates are supplied and verified. |

## 4. Activities Module (FR-ACT)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ACT-01 | The system shall present a dedicated page/section for "Vanaprasthasramam" (Old Age Home) describing location, capacity, founders, and services. | Must Have | Includes Peddakonduru Village location, 40 current residents, expansion plan summary, Indian Red Cross Society association. |
| FR-ACT-02 | The system shall present a dedicated section for the Wellness Centre / Infrastructure (CCTV, solar power, medical facility, fitness center, meditation space). | Should Have | Infrastructure list rendered as an icon-grid, admin-editable. |
| FR-ACT-03 | The system shall present a dedicated section for the Annaprasadam program, including pricing tiers. | Must Have | Displays Lunch ₹3,000 / Full Day ₹5,000 / Life Membership ₹51,000, each linking directly to the corresponding donation flow. |
| FR-ACT-04 | The system shall present a dedicated section for Goshala/Goseva, including pricing tiers. | Must Have | Displays Daily ₹516 / Monthly ₹5,116 / Monthly ₹11,116, each linking to donation flow; describes the 10 cows/10 calves and 2-acre fodder land. |
| FR-ACT-05 | The system shall present a dedicated section for Daily Sevas (prayer, meditation, yoga, bhajans, games, walking). | Should Have | Simple content block, admin-editable schedule/description. |
| FR-ACT-06 | The system shall present a dedicated section for Medical Camps and Medical Support activities. | Must Have | Describes medical/financial support, eye camps, cataract surgeries, animal husbandry camps. |
| FR-ACT-07 | The system shall present a dedicated section for Education / Vidya Daanam initiatives. | Must Have | Describes school adoption, tuition support, Vidya Volunteers funding. |
| FR-ACT-08 | Each Activity section shall include a direct "Support this Program" donation link. | Must Have | Link pre-selects the matching donation category in the checkout flow. |

## 5. Donations Module (FR-DON)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-DON-01 | The system shall display all Donation Categories (Annaprasadam, Goshala, Old Age Home, Building Fund, General Donation) with descriptions and, where defined, preset amounts. | Must Have | Matches pricing in [PROJECT_CONTEXT.md §5](../docs/PROJECT_CONTEXT.md); categories without preset pricing (Old Age Home general, General Donation) allow free-text amount entry. |
| FR-DON-02 | The system shall provide a donation checkout flow capturing: category, amount, donor name, email, phone, PAN (optional, for 80G receipt once available), and payment method. | Must Have | Form validates required fields; supports guest checkout (no mandatory account creation). |
| FR-DON-03 | The system shall integrate with Razorpay to process UPI, credit/debit card, net banking, and wallet payments. | Must Have | Payment order created server-side; client uses Razorpay Checkout; no card data touches Ashram servers (see [12-Security-Requirements.md](12-Security-Requirements.md)). |
| FR-DON-04 | The system shall display Bank Transfer details (A/C Name, A/C No., IFSC, Branch) and UPI ID/QR as an alternative to gateway payment. | Must Have | Displays: A/C Name "Sai Yadadri Seva Ashram", A/C No. 40304687251, IFSC SBIN0006557, Branch Prasanth Nagar Uppal, UPI ID 9490118877@sbi, matching verified bank details. |
| FR-DON-05 | Upon successful payment, the system shall generate and email an automated donation receipt (PDF or HTML). | Must Have | Receipt includes donation ID, date, amount, category, donor details, and Ashram registration number; sent within 60 seconds of payment confirmation. |
| FR-DON-06 | The system shall record every donation attempt with status (`pending`, `completed`, `failed`, `refunded`). | Must Have | Status transitions logged with timestamp; visible in Admin Donation Management (FR-ADM-DON). |
| FR-DON-07 | Registered/returning donors shall be able to view their own donation history. | Should Have | Requires optional donor account (email OTP or simple login); history lists date, category, amount, receipt download link. |
| FR-DON-08 | The system shall support recurring/monthly donation setup for the Goseva monthly tiers and general monthly giving. | Could Have | Uses Razorpay Subscriptions or equivalent recurring-payment mechanism; flagged as Phase 2 unless client prioritizes it earlier. |
| FR-DON-09 | The donation flow shall be fully available in English and Telugu. | Must Have | All labels, category names, and confirmation messages localized. |
| FR-DON-10 | The system shall handle payment failure gracefully with a retry option and no ambiguous donation state. | Must Have | Failed payments marked `failed`; donor shown a clear retry CTA; no partial/duplicate donation records created. |

## 6. Donor Corner Module (FR-DONOR)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-DONOR-01 | The system shall display a "Major Donors" recognition list. | Should Have | Admin-curated list (opt-in recognition only — donor consent required before public listing, see [12-Security-Requirements.md](12-Security-Requirements.md)). |
| FR-DONOR-02 | The system shall display a "Monthly Donors" recognition list. | Should Have | Same consent rule as FR-DONOR-01; reflects active recurring donors if FR-DON-08 is implemented. |
| FR-DONOR-03 | The system shall display a "CSR Partners" recognition section. | Should Have | **Content pending** — no verified CSR partner data exists yet for this entity; section remains empty/hidden until the CSR entity conflict (see [DOCUMENT_ANALYSIS.md](../docs/DOCUMENT_ANALYSIS.md) §5) is resolved and partners are confirmed. |

## 7. Events & News Module (FR-EVT)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-EVT-01 | The system shall list published events with title, date, description, and image. | Must Have | Sorted by date; past events visually distinguished from upcoming. |
| FR-EVT-02 | The system shall list published news/blog posts. | Must Have | Supports rich text, featured image, publish date, admin author attribution. |
| FR-EVT-03 | Each event/news item shall have a dedicated detail page with a shareable URL. | Should Have | URL is SEO-friendly slug; includes Open Graph tags for social sharing. |
| FR-EVT-04 | Events and news shall be filterable/searchable by keyword and date. | Could Have | Client-side or server-side search; not required for MVP launch. |

## 8. Gallery Module (FR-GAL)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-GAL-01 | The system shall display a photo gallery organized by category/album (e.g., Annaprasadam, Goshala, Events, Infrastructure). | Must Have | Lazy-loaded, responsive grid; images optimized/served via CDN (Cloudinary/S3 + CDN). |
| FR-GAL-02 | The system shall support a video gallery (embedded YouTube/Vimeo or hosted video). | Should Have | Responsive embed; does not autoplay by default (performance + accessibility). |
| FR-GAL-03 | Admin shall be able to upload, tag, reorder, and delete gallery media. | Must Have | See FR-ADM-GAL in [09-Admin-Modules.md](09-Admin-Modules.md). |

## 9. Volunteer Registration & Internship Module (FR-VOL)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-VOL-01 | The system shall provide a Volunteer Registration form capturing name, contact details, availability, area of interest, and skills. | Must Have | Form validation on required fields; confirmation shown on submit. |
| FR-VOL-02 | The system shall provide an Internship Application form capturing academic/professional background and desired internship focus area. | Should Have | Separate form or a toggled mode on the same page; supports résumé/CV file upload. |
| FR-VOL-03 | Upon submission, the system shall send a confirmation email/WhatsApp message to the applicant. | Must Have | Confirmation sent within 5 minutes of submission. |
| FR-VOL-04 | Admin shall be notified of new volunteer/internship submissions. | Must Have | Email notification to designated Volunteer Coordinator role; also visible in Admin Volunteer Management module. |
| FR-VOL-05 | Applicants shall be able to check their application status via a reference ID (optional enhancement). | Could Have | Status values: Submitted, Under Review, Accepted, Not Selected. |

## 10. Reports & Transparency Module (FR-RPT)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-RPT-01 | The system shall provide a Reports & Transparency page listing downloadable Annual Reports, Audit Reports, and Financial Statements. | Must Have | **Content pending from client** — page structure and admin upload capability delivered in Phase 1; documents populate as they are supplied (see [01-BRD.md §7](01-BRD.md#7-information-gaps-requiring-client-input)). |
| FR-RPT-02 | The system shall display the Society Registration Certificate, 12AB Certificate, and 80G Certificate as downloadable documents once supplied. | Must Have | Hidden/labeled "Not yet published" until admin uploads verified documents. |
| FR-RPT-03 | The system shall optionally display high-level aggregate donation statistics (e.g., total raised per category, current year) for public transparency. | Should Have | Aggregate figures only — no individual donor amounts disclosed without consent (privacy — see [12-Security-Requirements.md](12-Security-Requirements.md)). |

## 11. Appeals & Current Needs Module (FR-APL)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-APL-01 | The system shall display active fundraising appeals (e.g., Building Fund progress toward ₹2.25 Crore target). | Must Have | Shows target amount, amount raised (if tracked), and a direct donate CTA. |
| FR-APL-02 | Admin shall be able to create, edit, and archive appeals. | Must Have | See [09-Admin-Modules.md](09-Admin-Modules.md). |
| FR-APL-03 | The system shall display a progress bar for goal-based appeals. | Should Have | Progress = sum of completed donations tagged to that appeal ÷ target amount. |

## 12. Contact Us & Social Media Module (FR-CON)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-CON-01 | The system shall provide a Contact Us form (name, email, phone, message). | Must Have | Submissions stored and emailed to designated admin address; spam-protected (CAPTCHA/honeypot). |
| FR-CON-02 | The system shall display office address, phone, email, and office timings. | Must Have | **Some fields pending from client** (general office phone/email/timings not yet supplied — see [01-BRD.md §7](01-BRD.md#7-information-gaps-requiring-client-input)); committee contact numbers used as interim fallback where appropriate. |
| FR-CON-03 | The system shall embed a Google Map showing the Ashram's location. | Should Have | **Pending exact map pin/coordinates from client.** |
| FR-CON-04 | The system shall display WhatsApp click-to-chat and social media profile links. | Should Have | **Pending social media handles from client**; WhatsApp uses a committee-confirmed number once conflicts (see [DOCUMENT_ANALYSIS.md](../docs/DOCUMENT_ANALYSIS.md)) are resolved. |

## 13. Search Engine Optimization (FR-SEO)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-SEO-01 | The system shall generate unique, admin-editable meta titles/descriptions per page. | Must Have | Verified via page source inspection; no duplicate meta titles across indexed pages. |
| FR-SEO-02 | The system shall generate an XML sitemap and `robots.txt`. | Must Have | Auto-updated when pages/posts are published. |
| FR-SEO-03 | The system shall implement structured data (schema.org `NGO`/`NonProfit`) markup. | Should Have | Validated via Google Rich Results Test. |
| FR-SEO-04 | The system shall support canonical URLs and hreflang tags for EN/TE content parity. | Must Have | `hreflang="en"` / `hreflang="te"` correctly linked between translated page pairs. |

See also [SEO strategy detail — a dedicated SEO Specialist workstream referenced in [MASTER_PROJECT_PLAN.md](MASTER_PROJECT_PLAN.md)].

## 14. Multi-language Content (FR-LANG)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-LANG-01 | The system shall support a persistent language switcher (EN ⇄ TE) on every public page. | Must Have | Selection persists across navigation via cookie/localStorage. |
| FR-LANG-02 | All admin-managed content types shall support parallel EN/TE fields. | Must Have | CMS forms present both language fields; publishing does not require both to be complete but flags missing translations to admin. |
| FR-LANG-03 | The system shall render Telugu script correctly across all supported browsers/devices. | Must Have | Verified with Noto Sans Telugu (or equivalent) web font; no tofu/box-glyph rendering. |

## 15. Notifications Module (FR-NOTIF)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-NOTIF-01 | The system shall send automated email notifications for: donation receipt, volunteer application confirmation, contact form submission acknowledgment. | Must Have | Delivered via transactional email provider; failure logged and retried (see [12-Security-Requirements.md](12-Security-Requirements.md) for anti-spoofing/SPF/DKIM). |
| FR-NOTIF-02 | The system shall provide a WhatsApp click-to-chat entry point site-wide. | Must Have | Floating action button or header link opens `wa.me` deep link with a pre-filled greeting message. |
| FR-NOTIF-03 | Admin shall receive email alerts for new donations, volunteer applications, and contact submissions. | Should Have | Configurable recipient list per notification type in Admin Settings. |

## 16. Analytics Module (FR-ANL)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-ANL-01 | The system shall integrate web analytics tracking (page views, traffic sources, device breakdown). | Must Have | Consent-aware (cookie consent banner where legally required). |
| FR-ANL-02 | The Admin Dashboard shall display a summary analytics widget (visits, top pages, donation trend). | Should Have | See [09-Admin-Modules.md](09-Admin-Modules.md) Analytics Dashboard section. |

## 17. Admin Authentication & Access Control (FR-AUTH)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-AUTH-01 | The system shall require authenticated login for all Admin Dashboard access. | Must Have | No admin route accessible without a valid session/JWT. |
| FR-AUTH-02 | The system shall enforce role-based access control across all admin modules. | Must Have | Full matrix in [10-Roles-and-Permissions.md](10-Roles-and-Permissions.md); unauthorized actions return 403 and are audit-logged. |
| FR-AUTH-03 | The system shall support secure password reset via email. | Must Have | Time-limited, single-use reset tokens. |
| FR-AUTH-04 | The system shall log all admin authentication events and sensitive actions (donation edits, user role changes, content publish/unpublish) to an audit log. | Must Have | Audit log viewable by Super Admin only; immutable (append-only). |

---

## 18. Functional Requirements Coverage Matrix

| Module | Requirements Count | Documented In |
|---|---|---|
| Home | 7 | §2 |
| About Us | 6 | §3 |
| Activities | 8 | §4 |
| Donations | 10 | §5 |
| Donor Corner | 3 | §6 |
| Events & News | 4 | §7 |
| Gallery | 3 | §8 |
| Volunteer/Internship | 5 | §9 |
| Reports & Transparency | 3 | §10 |
| Appeals & Current Needs | 3 | §11 |
| Contact Us | 4 | §12 |
| SEO | 4 | §13 |
| Multi-language | 3 | §14 |
| Notifications | 3 | §15 |
| Analytics | 2 | §16 |
| Auth & Access Control | 4 | §17 |
| Admin-specific modules | See [09-Admin-Modules.md](09-Admin-Modules.md) for the complete admin-side functional breakdown | — |

**Total public/shared functional requirements: 72**, plus the full admin-module set detailed separately in document 09.

---
**Related Documents:** [02-SRS.md](02-SRS.md) · [04-Non-Functional-Requirements.md](04-Non-Functional-Requirements.md) · [07-System-Modules.md](07-System-Modules.md) · [09-Admin-Modules.md](09-Admin-Modules.md) · [MASTER_PROJECT_PLAN.md](MASTER_PROJECT_PLAN.md)
