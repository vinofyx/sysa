# Wireframes
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Phase** | 2 — Enterprise System Design & UI/UX |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Format** | Text-based, section-by-section wireframe breakdown (mobile-first). Visual/pixel mockups are a downstream design-tool deliverable (Figma) produced from this spec, not part of this documentation package. |

---

## 1. Purpose & Conventions

Each page below is broken into ordered sections, mobile-first (the layout described is the 375px-wide baseline; desktop adaptation rules are in [08-Responsive-Design.md](08-Responsive-Design.md)). Every section states: **Content**, **Components used** (traced to [07-Component-Library.md](07-Component-Library.md)), and **Behavior**.

Layout legend: `[Header]` `[Section]` `[CTA]` `[Grid]` `[Card]` `[Form]` `[Footer]`.

---

## 2. Home (`/en/`, `/te/`)

```
[Sticky Header: Logo | ☰ Menu | Language Toggle | Donate Button]
[Hero Section]
   - Background image (Ashram building), overlay
   - H1: "Sai Yadadri Seva Ashram"
   - Subtext: Motto "Service to Human is Service to God"
   - Primary CTA Button: "Donate Now"
   - Secondary CTA: "Learn Our Story"
[Impact Stats Strip]
   - 3-4 stat cards (e.g., "Years of Service", "Residents Supported")
   - ⚠️ Figures pending client supply (FR-HOME-06) — placeholder state defined
[Quick Donate Widget - Card]
   - Category selector (chips: Annaprasadam / Goshala / Old Age Home / Building Fund / General)
   - Amount chips (preset per category) + custom input
   - "Donate Now" button → routes to Checkout
[About Snapshot Section]
   - Short welcome message (2-3 lines)
   - "Read Our Story" link → About Us
[Activities Preview Grid]
   - 3-column (desktop) / 1-column (mobile) card grid
   - Cards: Annaprasadam, Goshala, Old Age Home (top 3 by priority)
   - Each card: icon, title, 1-line description, "Support" link
[Current Appeal Banner]
   - Building Fund progress bar (target ₹2.25 Cr)
   - "Contribute to the New Building" CTA
[Upcoming Events Strip]
   - Horizontal scroll cards (mobile) / 3-col grid (desktop)
   - Up to 3 events, "View All" link
[Testimonials Carousel]
   - Auto-rotating quote cards; hidden entirely if zero testimonials (FR-HOME-05)
[Committee Trust Strip]
   - "Led by a dedicated committee of 27 members" + link to About > Committee
[WhatsApp Floating Action Button] (persistent, all pages)
[Footer]
```

**Components used:** StickyHeader, HeroBanner, StatCard, QuickDonateWidget, ActivityCard, ProgressBar, EventCard, TestimonialCarousel, Footer, WhatsAppFAB.

---

## 3. About Us (`/en/about`)

```
[Header] [Breadcrumb: Home > About Us]
[Page Title Banner: "About Sai Yadadri Seva Ashram"]
[History Section]
   - Rich text block (from brochure narrative)
[Vision & Mission Section]
   - Two-column (desktop) / stacked (mobile): Vision card | Mission card
   - ⚠️ "Coming Soon" state if content not yet published (FR-ABOUT-02)
[Founder Section]
   - Photo + narrative
   - ⚠️ "Coming Soon" state pending client content (FR-ABOUT-03)
[Registration & Trust Block]
   - Regd. No. 423/2019 | PAN ABKAS9261K | 12A/80G badge (hidden until verified)
[Committee Grid Section]
   - H2: "Our Governing Committee (2025–2028)"
   - Responsive grid: 2-col mobile / 4-col desktop
   - Card: photo, name, designation (all 27 members, sourced from Committee Management)
[Treasurer's Message Section]
   - Quote-style block with photo
   - ⚠️ "Coming Soon" state pending client content (FR-ABOUT-05)
[Donate CTA Band]
   - "Support Our Mission" + Donate button
[Footer]
```

---

## 4. Activities Index (`/en/activities`)

```
[Header] [Breadcrumb]
[Page Title Banner: "Our Activities"]
[Intro paragraph]
[Program Grid — 7 cards]
   Vanaprasthasramam | Wellness Centre | Annaprasadam | Goshala |
   Daily Sevas | Medical Camps | Education
   Each card: icon/photo, title, 2-line summary, "Learn More" link
[Footer]
```

### 4.1 Activity Detail — Annaprasadam (`/en/activities/annaprasadam`)
```
[Header] [Breadcrumb: Home > Activities > Annaprasadam]
[Hero image + title]
[Description Section] (rich text)
[Pricing Tiers — Card Row]
   Card 1: "Lunch" — ₹3,000 — [Donate]
   Card 2: "Full Day" — ₹5,000 — [Donate]
   Card 3: "Life Membership" — ₹51,000 (2 days/year for life) — [Donate]
[Related Gallery Strip] (photos tagged "Annaprasadam")
[Other Programs You Might Support] (3-card cross-link)
[Footer]
```

### 4.2 Activity Detail — Goshala (`/en/activities/goshala`)
```
[Header] [Breadcrumb]
[Hero image + title]
[Description] (10 cows, 10 calves, 2 acres fodder land)
[Pricing Tiers — Card Row]
   "Daily" ₹516 | "Monthly" ₹5,116 | "Monthly" ₹11,116 — each [Donate]
[Gallery Strip]
[Footer]
```

*(Remaining activity detail pages — Old Age Home, Wellness Centre, Daily Sevas, Medical Camps, Education — follow the identical section pattern: Hero → Description → [Pricing tiers if applicable] → Gallery Strip → Cross-links → Footer, per FR-ACT-01…08.)*

---

## 5. Donation Categories (`/en/donate`)

```
[Header] [Breadcrumb]
[Page Title: "Ways to Give"]
[Trust reassurance strip: "Secure payments via Razorpay | Bank-registered NGO"]
[Category Selector — Tabs or Card Grid]
   Annaprasadam | Goshala | Old Age Home | Building Fund | General Donation
[Selected Category Detail Panel]
   - Description
   - Preset amount chips (where defined) or custom-only input (Old Age Home/General)
   - "Continue to Donate" CTA
[Alternative Payment Tab: "Bank Transfer / UPI"]
   - A/C Name, A/C No., IFSC, Branch, UPI ID, QR code image
   - "I've made a transfer" link → manual confirmation form (F-03)
[FAQ Accordion: "Is my donation tax-deductible?", "Is this secure?", etc.]
[Footer]
```

## 5.1 Checkout (`/en/donate/checkout`) — 3-step form (single scrolling page on mobile, stepper on desktop)
```
[Header — simplified, no main nav, "Secure Checkout" trust badge]
[Step Indicator: 1 Amount — 2 Details — 3 Payment]
[Step 1: Amount]
   - Category shown (locked if arrived via program link)
   - Preset chips + custom field
[Step 2: Donor Details]
   - Name* | Email* | Phone* | PAN (optional, tooltip)
[Step 3: Payment Method]
   - Razorpay embedded checkout (UPI/Card/NetBanking/Wallet)
[Order Summary Sidebar (desktop) / Sticky Bottom Bar (mobile)]
   - Category, Amount, "Proceed to Pay" button
[Footer — minimal]
```

## 5.2 Donation Confirmation (`/en/donate/thank-you`)
```
[Header]
[Success Icon + "Thank You for Your Generosity!"]
[Donation Summary Card: ID, Category, Amount, Date]
[Message: "A receipt has been sent to your email"]
[Secondary Actions]
   - "Download Receipt" | "Share on Social" | "Explore More Ways to Help"
[Footer]
```

## 5.3 Failed Payment State (within Checkout flow)
```
[Error Icon + "Payment Could Not Be Completed"]
[Plain-language reason if available]
[Buttons: "Try Again" (primary) | "Try Bank Transfer Instead" (secondary)]
[Entered details retained — form pre-filled on retry]
```

---

## 6. Donor Corner (`/en/donors`)

```
[Header] [Breadcrumb]
[Page Title: "Our Donor Corner"]
[Intro: gratitude message]
[Tabs: Major Donors | Monthly Donors | CSR Partners]
   - Each tab: name list/grid (opt-in only, per SEC-DATA-05)
   - CSR Partners tab: empty state "To be announced" until FR-DONOR-03 content resolved
[Donate CTA Band]
[Footer]
```

---

## 7. Gallery (`/en/gallery`)

```
[Header] [Breadcrumb]
[Page Title: "Gallery"]
[Filter Tabs: All | Annaprasadam | Goshala | Events | Infrastructure | Videos]
[Masonry/Grid of thumbnails] (lazy-loaded)
[Lightbox on click] (full image, caption, next/prev arrows)
[Video section: embedded players, click-to-play, no autoplay]
[Footer]
```

---

## 8. Events & News (`/en/news`)

```
[Header] [Breadcrumb]
[Page Title: "Events & News"]
[Tabs: Upcoming Events | Past Events | News]
[Card List — reverse-chronological]
   Card: image, title, date, excerpt, "Read More"
[Pagination or "Load More"]
[Footer]
```

### 8.1 Event/News Detail (`/en/news/{slug}`)
```
[Header] [Breadcrumb]
[Featured Image]
[Title + Date]
[Body — rich text]
[Social Share Buttons]
[Related Events/News — 3-card strip]
[Footer]
```

---

## 9. Volunteer Registration (`/en/volunteer`)

```
[Header] [Breadcrumb]
[Page Title: "Get Involved"]
[Intro: why volunteer]
[Toggle: Volunteer | Internship]
[Form — Volunteer]
   Name* | Email* | Phone* | Availability | Area of Interest | Skills (textarea)
[Form — Internship]
   Name* | Email* | Phone* | Academic/Professional Background | Desired Focus | Résumé Upload*
[Submit Button]
[Confirmation state — replaces form on success]
[Footer]
```

---

## 10. Reports & Transparency (`/en/transparency`)

```
[Header] [Breadcrumb]
[Page Title: "Transparency & Reports"]
[Trust intro paragraph]
[Document Category Sections]
   - Registration & Legal (Society Cert, 12AB, 80G) — each "Not yet published" or downloadable card
   - Annual Reports (by year)
   - Audit Reports (by year)
   - Financial Statements (by year)
[Optional: Aggregate Donation Stats Widget] (category totals, current year — FR-RPT-03)
[Footer]
```

---

## 11. Appeals & Current Needs (`/en/appeals`)

```
[Header] [Breadcrumb]
[Page Title: "Current Appeals"]
[Featured Appeal — Building Fund]
   - Large progress bar: raised / ₹2.25 Cr target
   - Description of expansion plan (G+2, 50 more residents)
   - "Contribute to This Appeal" CTA
[Other Active Appeals — Card Grid]
[Closed/Completed Appeals — collapsed accordion]
[Footer]
```

---

## 12. Contact Us (`/en/contact`)

```
[Header] [Breadcrumb]
[Page Title: "Contact Us"]
[Two-column layout (desktop) / stacked (mobile)]
   Left: Contact Form (Name*, Email*, Phone, Message*, CAPTCHA)
   Right: Office Address, Phone, Email, Hours (⚠️ pending client data),
          Google Map embed (⚠️ pending coordinates),
          WhatsApp button, Social icons (⚠️ pending handles)
[Footer]
```

---

## 13. Admin Dashboard — Key Screens

### 13.1 Dashboard Home (`/admin/dashboard`)
```
[Admin Header: Logo | Role badge | User menu | Logout]
[Left Sidebar Nav: Content | Finance | Engagement | System] (grouped per IA §6)
[KPI Tile Row]
   Total Donations (MTD) | Donation Count | New Volunteer Apps | Unread Contact Msgs
[Analytics Widget]
   Visits trend chart | Top 5 pages | Donation trend chart
[Recent Activity Feed] (from Audit Log, last 10 actions)
[Quick Links] (role-dependent shortcuts)
```

### 13.2 Donation Management List (`/admin/donations`)
```
[Page Title + "Add Manual Donation" button]
[Filter Bar: Date Range | Category | Status | Payment Method | Source]
[Running Total Display]
[Data Table: Date | Donor | Category | Amount | Method | Status | Actions]
[Export Button (CSV/Excel)]
[Pagination]
```

### 13.3 Content Editor — Generic Pattern (used by Home/About/Activities/Appeals/Contact editors)
```
[Page Title: "Edit {Section}"]
[Language Tabs: English | Telugu]
[Rich Text / Field Form]
[Missing-translation warning badge, if applicable]
[Image Upload Zone]
[Action Bar: Save as Draft | Preview | Publish]
```

### 13.4 Committee Management (`/admin/committee`)
```
[Page Title + "Add Member" button]
[Sortable/Drag List: Photo thumb | Name | Designation | Active toggle | Edit/Delete]
[Member Editor Modal: Name, Designation, Photo Upload, Bio (EN/TE), Display Order]
```

### 13.5 Volunteer Applications (`/admin/volunteers`)
```
[Filter Tabs: All | Submitted | Under Review | Accepted | Not Selected]
[Data Table: Date | Name | Type | Contact | Status | Actions]
[Detail Drawer/Modal: full submission + résumé link + status changer + internal notes]
```

---

## 14. Wireframe Coverage Checklist

| Page Group | Covered |
|---|---|
| Home | ✅ §2 |
| About Us | ✅ §3 |
| Activities (index + 2 detailed exemplars + pattern for remaining 5) | ✅ §4 |
| Donations (categories, checkout, confirmation, failure) | ✅ §5 |
| Donor Corner | ✅ §6 |
| Gallery | ✅ §7 |
| Events & News (index + detail) | ✅ §8 |
| Volunteer/Internship | ✅ §9 |
| Reports & Transparency | ✅ §10 |
| Appeals | ✅ §11 |
| Contact Us | ✅ §12 |
| Admin — Dashboard, Donations, Content Editor pattern, Committee, Volunteers | ✅ §13 (representative set; remaining admin screens in [09-Admin-Modules.md](../documentation/09-Admin-Modules.md) follow the same editor/list/detail patterns established here) |

---
**Related Documents:** [01-Information-Architecture.md](01-Information-Architecture.md) · [03-User-Flows.md](03-User-Flows.md) · [06-Design-System.md](06-Design-System.md) · [07-Component-Library.md](07-Component-Library.md) · [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
