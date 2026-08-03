# User Flows
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Phase** | 2 — Enterprise System Design & UI/UX |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Traceability** | Elaborates [06-Use-Cases.md](../documentation/06-Use-Cases.md) into concrete UI-level flows |

---

## 1. Purpose
Maps every primary public user journey through actual screens/states, for use by the UI/UX Designer and Frontend Architect. Complements the actor/system-level Use Cases in Phase 1 with screen-by-screen UX detail.

## 2. Flow Index

| Flow | Priority |
|---|---|
| F-01 Homepage → Donation Success | Critical |
| F-02 Program Discovery → Category-Specific Donation | Critical |
| F-03 Bank Transfer / UPI Manual Donation | High |
| F-04 Volunteer Registration | High |
| F-05 Internship Application | Medium |
| F-06 Returning Donor — View History & Re-download Receipt | Medium |
| F-07 Contact Us | Medium |
| F-08 Language Switch (cross-cutting) | Critical |
| F-09 Failed Payment Recovery | Critical |

---

## 3. F-01: Homepage → Donation Success (Golden Path)

This is the single most important flow on the platform — the complete journey requested explicitly by the client ("Complete user journey from homepage to donation success").

```mermaid
flowchart TD
    Start(["Visitor lands on Homepage"]) --> Hero["Views Hero Banner\n+ Motto + Donate CTA"]
    Hero --> Decision{"Donate now,\nor learn more first?"}
    Decision -- "Donate Now (Hero/Header CTA)" --> QuickDonate["Quick-Donate Widget\n(select category + amount inline)"]
    Decision -- "Learn more" --> Explore["Browses About Us / Activities"]
    Explore --> ProgramPage["Views a specific program\n(e.g., Annaprasadam)"]
    ProgramPage --> SupportCTA["Clicks 'Support this Program'"]
    QuickDonate --> Checkout
    SupportCTA --> Checkout["Checkout Page\n(category pre-filled)"]

    Checkout --> AmountStep["Step 1: Confirm/select amount\n(preset tiers or custom)"]
    AmountStep --> DetailsStep["Step 2: Donor details\n(name, email, phone, optional PAN)"]
    DetailsStep --> PaymentStep["Step 3: Choose payment method\n(UPI / Card / Net Banking / Wallet)"]
    PaymentStep --> RazorpayWidget["Razorpay Checkout Widget Opens"]
    RazorpayWidget --> PayAction["Donor completes payment"]
    PayAction --> Processing["Processing / Verifying\n(loading state, <5s expected)"]
    Processing --> Success{"Payment Result"}
    Success -- "Success" --> ThankYou["Thank-You / Confirmation Page\n+ Donation Summary + Receipt Notice"]
    ThankYou --> ReceiptEmail["Receipt emailed within 60s\n(FR-DON-05)"]
    ThankYou --> ShareImpact["Optional: Share on social /\nSee more ways to help"]
    Success -- "Failure" --> F09["→ See F-09 Failed Payment Recovery"]
```

### Screen-by-screen breakdown

| Step | Screen | Key UI Elements | Exit Criteria |
|---|---|---|---|
| 1 | Homepage | Hero, Quick-Donate widget, Impact stats, Testimonials, Upcoming events | Donor clicks any Donate CTA |
| 2 | Donation Categories (`/donate`) | Category cards (Annaprasadam, Goshala, Old Age Home, Building Fund, General) each with description + preset tiers | Donor selects a category |
| 3 | Checkout — Amount (`/donate/checkout`) | Preset amount chips (₹3,000/₹5,000/₹51,000 for Annaprasadam etc., per verified pricing in [PROJECT_CONTEXT.md §5](../docs/PROJECT_CONTEXT.md)) + custom amount field | Amount selected/entered, "Continue" enabled |
| 4 | Checkout — Donor Details | Name*, Email*, Phone*, PAN (optional, tooltip explains 80G use once available) | All required fields valid |
| 5 | Checkout — Payment | Razorpay Checkout (UPI/Card/NetBanking/Wallet tabs) | Payment attempted |
| 6a | Success — Thank You (`/donate/thank-you`) | Confirmation message, donation ID, amount, category, "Receipt sent to your email", social share, related programs | Donor may exit or explore further |
| 6b | Failure | See F-09 | — |

**Design mandate:** this entire flow (Step 2 → Step 6) must complete in **≤ 4 user-initiated steps** per NFR-USE-03 in [04-Non-Functional-Requirements.md](../documentation/04-Non-Functional-Requirements.md).

---

## 4. F-02: Program Discovery → Category-Specific Donation

```mermaid
flowchart LR
    A["Activities Index Page"] --> B{"Which program?"}
    B -- Annaprasadam --> C1["Annaprasadam Detail\nPricing shown: Lunch ₹3,000 /\nFull Day ₹5,000 / Life ₹51,000"]
    B -- Goshala --> C2["Goshala Detail\nPricing shown: Daily ₹516 /\nMonthly ₹5,116 / ₹11,116"]
    B -- Old Age Home --> C3["Old Age Home Detail\n(general donation, no preset)"]
    C1 --> D["Support this Program CTA"]
    C2 --> D
    C3 --> D
    D --> E["Checkout — category + tier pre-filled"]
```

This flow guarantees a donor who arrives via a specific program page never has to re-select the category — directly implementing FR-ACT-08 from [03-Functional-Requirements.md](../documentation/03-Functional-Requirements.md).

---

## 5. F-03: Bank Transfer / UPI Manual Donation

```mermaid
flowchart TD
    A["Donation Categories Page"] --> B["Selects 'Pay via Bank Transfer / UPI' tab\n(alternative to gateway checkout)"]
    B --> C["Displays: A/C Name, A/C No. 40304687251,\nIFSC SBIN0006557, Branch, UPI ID 9490118877@sbi,\nScannable QR code"]
    C --> D["Donor completes transfer\nin their own banking app"]
    D --> E["Optional: 'I've made this transfer' form\n(name, amount, reference/UTR, email)"]
    E --> F["Submission stored as a\npending-verification manual donation"]
    F --> G["Finance Admin verifies against\nbank statement and marks completed\n(UC-05 in Use Cases)"]
    G --> H["Receipt emailed to donor"]
```

This flow exists because bank-transfer/UPI-QR is a currently-trusted, already-used donation method for this Ashram (printed on the brochure) — the platform must not force gateway usage (FR-DON-04).

---

## 6. F-04: Volunteer Registration

```mermaid
flowchart TD
    A["Get Involved > Volunteer Registration"] --> B["Choose type: Volunteer or Internship"]
    B -- Volunteer --> C1["Form: Name, Contact, Availability,\nArea of Interest, Skills"]
    B -- Internship --> C2["Form: Name, Contact, Academic/Professional\nBackground, Desired Focus, Résumé Upload"]
    C1 --> D["Submit"]
    C2 --> D
    D --> E["Validation"]
    E -- Invalid --> F["Inline bilingual error messages\n(field-level)"]
    F --> C1
    E -- Valid --> G["Confirmation Screen:\n'Thank you, we'll be in touch'"]
    G --> H["Confirmation email/WhatsApp sent\n(within 5 min, FR-VOL-03)"]
    G --> I["Volunteer Coordinator notified\n(FR-VOL-04)"]
```

---

## 7. F-05: Internship Application
Shares the same flow shape as F-04 (see C2 branch above), differentiated by academic-background fields and résumé upload (PDF/DOC/DOCX, size-limited per SEC-DATA-04 in [12-Security-Requirements.md](../documentation/12-Security-Requirements.md)).

---

## 8. F-06: Returning Donor — View History & Re-download Receipt

```mermaid
flowchart TD
    A["Donor clicks 'My Donations'\n(header or footer link)"] --> B{"Authenticated?"}
    B -- No --> C["Lightweight login:\nenter email → receive OTP"]
    C --> D["Enter OTP"]
    D --> E["Session established"]
    B -- Yes --> E
    E --> F["Donation History List\n(date, category, amount, status)"]
    F --> G["Click a past donation"]
    G --> H["Download Receipt PDF\n(re-generated from stored record)"]
```

---

## 9. F-07: Contact Us

```mermaid
flowchart LR
    A["Contact Us Page"] --> B["Form: Name, Email, Phone (optional), Message"]
    A --> C["Static info: Address, Phone, Email, Hours"]
    A --> D["Google Map embed"]
    A --> E["WhatsApp click-to-chat button"]
    B --> F["CAPTCHA/honeypot check"]
    F --> G["Submit"]
    G --> H["Acknowledgment message shown"]
    G --> I["Admin alert email sent"]
```

---

## 10. F-08: Language Switch (Cross-Cutting)

```mermaid
flowchart TD
    A["Any Page — EN"] --> B["Visitor clicks language switcher (TE)"]
    B --> C["Same route re-rendered at /te/{same-path}"]
    C --> D{"Are all fields translated\nfor this content?"}
    D -- "Yes" --> E["Full Telugu content shown"]
    D -- "No (missing translation)" --> F["Available Telugu fields shown +\nEnglish fallback for missing fields only\n(never a blank section)"]
```

This flow directly implements the fallback-with-warning behavior specified in FR-HOME-02/FR-LANG-02 of [03-Functional-Requirements.md](../documentation/03-Functional-Requirements.md) — the admin sees a warning when saving, the **public visitor never sees a broken/empty page**.

---

## 11. F-09: Failed Payment Recovery

```mermaid
flowchart TD
    A["Razorpay returns failure\n(insufficient funds, timeout, cancelled)"] --> B["Donation record marked 'failed'\n(no charge applied)"]
    B --> C["Failure screen shown:\nplain-language bilingual message"]
    C --> D{"Donor choice"}
    D -- "Try Again" --> E["Returns to Payment step\nwith category/amount/details retained"]
    D -- "Try Bank Transfer Instead" --> F["→ F-03 Bank Transfer flow"]
    D -- "Abandon" --> G["Donor leaves —\nrecord remains 'failed', no follow-up spam"]
    E --> H["Retry payment attempt"]
```

**Design mandate:** no donor ever loses their entered details (amount, category, personal info) due to a failed payment — this is a hard UX requirement tied to NFR-USE-04 and FR-DON-10.

---

## 12. Flow-to-Requirement Traceability

| Flow | Use Cases | Functional Requirements |
|---|---|---|
| F-01, F-02 | UC-01 | FR-DON-01…03, FR-DON-09, FR-ACT-08 |
| F-03 | UC-01 (Alt), UC-05 | FR-DON-04 |
| F-04, F-05 | UC-02 | FR-VOL-01…04 |
| F-06 | UC-01 (related) | FR-DON-07 |
| F-07 | UC-07 | FR-CON-01 |
| F-08 | — | FR-LANG-01…03 |
| F-09 | UC-01 (Alt Flow 8a/9a) | FR-DON-10 |

---
**Related Documents:** [01-Information-Architecture.md](01-Information-Architecture.md) · [05-Wireframes.md](05-Wireframes.md) · [../documentation/06-Use-Cases.md](../documentation/06-Use-Cases.md) · [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
