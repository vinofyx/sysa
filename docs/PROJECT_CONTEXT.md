# Project Context — Sai Yadadri Seva Ashram Website & Donation Platform

Single source of truth for development, extracted from the documents in `D:\sysa\docs`. See `DOCUMENT_ANALYSIS.md` for per-file breakdown and flagged conflicts.

---

## 1. Organization Identity

| Field | Value | Source |
|---|---|---|
| Registered Name | Sai Yadadri Seva Ashram (Telugu/logo form: "Sai Yadadri Seva Ashramam") | PAN card, Brochure, Logo |
| Society Registration No. | 423/2019 | Brochure, Logo |
| PAN | ABKAS9261K | PAN card |
| Date of Incorporation/Formation | 14/05/2019 | PAN card |
| Registered Address | H.No.17-25/5/1/A, Sai Ram Nagar, Uppal, Hyderabad – 39, Telangana | Brochure |
| Motto (English) | "Service to Human is Service to God" | Brochure, Logo |
| Motto (Telugu variants, used contextually) | "మానవ సేవయే మాధవ సేవ" / "జనుల సేవయే జనార్దని సేవ" / "పరుల సేవయే పరమాత్ముని సేవ" | Brochure |
| Founding President | Sri Debbadi Ashok (D. Ashok) | Brochure |
| Founded in association with | Group of BSNL employees (working & retired) and like-minded citizens | Brochure |
| **Existing live website** | **https://sysaindia.org** | Brochure page 4 — ⚠️ confirm with stakeholder whether this project is a rebuild/migration of that site or a parallel new build |

## 2. Bank & Payment Details (verified — brochure and bank-detail image match exactly)

- A/C Name: Sai Yadadri Seva Ashram
- Bank: State Bank of India, Branch: Prasanth Nagar, Uppal
- A/C No.: 40304687251
- IFSC: SBIN0006557
- UPI ID: 9490118877@sbi
- Supports: PhonePe, Google Pay, SBI QR scan-and-pay

## 3. CSR Registration Status ⚠️

A CSR-1 registration letter was supplied, but it is issued to a **different entity** ("Sri Shiridi Sai Seva Society", Adilabad, PAN AAHTS2350L; CSR Reg. No. CSR00103975) — not to Sai Yadadri Seva Ashram. **Do not represent this CSR registration number as belonging to Sai Yadadri Seva Ashram on the website** until you confirm the relationship between the two entities (e.g., sister organization, holding trust, or a mistakenly attached document).

## 4. Facilities & Programs (for Activities / Donation Category pages)

### Vanaprasthasramam (Old Age Home)
- Location: Peddakonduru Village, Choutuppal Mandal, Yadadri Bhuvanagiri District, Telangana
- Run in association with Indian Red Cross Society, Yadadri Bhuvanagiri District
- Founded 2000 by Sri Mayreddi Satyanarayana Reddy & Smt. Janakamma Garlu
- Current occupancy: 40 members (old building)
- Expansion: new G+2 building, 5,000 sq.ft/floor, adds capacity for 50 more members; 12 rooms (2-occupancy, attached bath), 2 dormitories (24-member capacity)
- Estimated new-building cost: ₹2.25 Crore
- Infrastructure: CCTV coverage, solar power, pure drinking water, hot water, physical fitness center, meditation space, TV on each floor, full medical facility
- Daily routine: prayer, meditation, yoga, bhajans, games, morning/evening walks

### Goshala (Goseva)
- 10 cows + 10 calves maintained at the Old Age Home
- 2 acres of land dedicated to Gograsam (fodder) cultivation
- Public can visit and perform Goseva / offer Gograsam

### Education (Vidya Daanam)
- Adopts primary schools; supplies books, school bags, stationery
- Retired-professional members give special tuition (Maths, Science, etc.) to senior students
- Pays tuition fees for poor students pursuing higher education
- Funds "Vidya Volunteers" at under-staffed schools

### Medical Support
- Financial/medical support for chronic-illness patients; supplies medicines & medical infrastructure
- Conducts medical camps, eye-testing camps, animal husbandry camps
- Funds cataract surgeries where needed

## 5. Donation Categories & Pricing (source data for the Donations module — use these figures verbatim, do not estimate)

| Program | Option | Amount |
|---|---|---|
| Annaprasadam | Lunch only | ₹3,000 |
| Annaprasadam | Full day (breakfast+lunch+dinner) | ₹5,000 |
| Life Long Annaprasadam | Life membership — 2 occasions/year for life | ₹51,000 |
| Goseva | Green Grass/Dana — per day | ₹516 |
| Goseva | Green Grass/Dana — per month | ₹5,116 or ₹11,116 (two tiers) |
| Building Fund | New G+2 building construction | Target ₹2.25 Crore (general fund, no fixed unit) |

Other donation categories named in the Requirements doc but with **no pricing supplied yet**: Old Age Home (general), General Donation. Flag to Ashram for pricing/suggested-amount input if the UI needs preset amount buttons.

## 6. Governing Committee (2025–2028) — 27 members

Full roster (Name — Designation — Age — Background — Mobile) is in `COMMITTEE MEMBERS LIST.docx` and cross-rendered in brochure page 4. Key contacts:

| Role | Name | Mobile (docx) | Mobile (brochure) |
|---|---|---|---|
| President | D. Ashok (Debbadi Ashok) | 9014826354 | 9490675675 ⚠️ conflict |
| General Secretary | J. Yanadi Setty | 9440440213 | 9440440213 ✅ match |
| Organizing Secretary | S. Mahesh | 9440000694 | 9440000694 ✅ match |
| Treasurer | K. Vidyasagar Reddy | 9494941636 | 9490600600 ⚠️ conflict |

Full 27-member table with designations, ages, and professional backgrounds should be pulled directly from `COMMITTEE MEMBERS LIST.docx` for the "Committee" / "About Us" page — do not retype from memory, source the docx at build time.

## 7. Website Sitemap / Modules (from Requirements doc — the closest artifact to a formal sitemap)

**Public site:**
- Home (hero banner, welcome message, quick donate, events, testimonials)
- About Us (History, Vision, Mission, Founder, Committee, Treasurer Message)
- Activities (Vanaprastha Ashram, Wellness Centre, Annaprasadam, Goshala, Daily Sevas, Medical Camps)
- Donations (UPI, Razorpay, Bank Transfer)
- Donation Categories (Annaprasadam, Goshala, Old Age Home, Building Fund, General Donation)
- Donor Corner (Major donors, Monthly donors, CSR partners)
- Events & News
- Gallery (Photo & Video)
- Volunteer Registration & Internship
- Reports & Transparency
- Appeals & Current Needs
- Contact Us & Social Media

**Admin Dashboard** (separate module — see Functional Requirements)

## 8. Functional Requirements (as specified by the client-side requirements doc)

- Donor registration/login (optional)
- Online donations with payment receipt, donation history & acknowledgement
- Event management, volunteer application management, gallery management, news/blog management
- Document management (80G, 12AB, audit reports, etc.)
- Multi-language content (English/Telugu)
- SEO, WhatsApp integration, email notifications
- Role-based admin access, analytics dashboard

## 9. Non-Functional Requirements

Mobile responsive, fast loading, SSL security, SEO-optimized, backup & recovery, scalable architecture, accessibility, cross-browser compatibility.

## 10. Admin Features

Manage pages, manage donations, manage donors, generate reports, manage volunteers, upload gallery, manage events/news, export data.

## 11. Information Still Required From the Ashram (per Requirements doc checklist — not yet supplied)

- 12AB Certificate, 80G Certificate, Society Registration Certificate (copy)
- Vision & Mission statement (formal text — brochure has narrative history but no distinct Vision/Mission split)
- Founder Details (formal bio — brochure names founders of the Old Age Home specifically, not the Ashram itself)
- Treasurer Message (text)
- Testimonials, Latest News & Events content, Gallery images/videos
- Annual Reports, Audit Reports, Financial Statements
- Confirmed CSR Partner Details (see conflict in §3)
- Contact Numbers (general/office line), Official Email, WhatsApp Number
- Google Map Location, Office Timings, Social Media Links
- Domain Name & Hosting Access (note: sysaindia.org already exists — check current registrar/hosting access)
- Razorpay account (if online gateway beyond UPI/bank transfer is desired)

## 12. Technology Stack (recommended in the Requirements doc — carried forward as a starting proposal, not yet re-validated by the Solution Architect)

- Frontend: Next.js / React
- Backend: Node.js (Express)
- Database: PostgreSQL or MongoDB
- Payments: Razorpay
- Cloud: Hostinger VPS / AWS
- Storage: Cloudinary / AWS S3

---

*This file is the working source of truth. Update it if the Ashram supplies the missing items in §11 or resolves the conflicts in §3/§6 of this doc (and §"Open Conflicts" of DOCUMENT_ANALYSIS.md).*
