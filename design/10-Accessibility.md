# Accessibility Specification
## Sai Yadadri Seva Ashram — Website & Donation Platform

| | |
|---|---|
| **Document Version** | 1.0 |
| **Phase** | 2 — Enterprise System Design & UI/UX |
| **Status** | Draft for Client Approval |
| **Date** | 2026-08-03 |
| **Standard** | WCAG 2.1 Level AA (per NFR-ACC-01 in [04-Non-Functional-Requirements.md](../documentation/04-Non-Functional-Requirements.md)) |

---

## 1. Why Accessibility Matters Especially Here
This platform's core beneficiary population is elderly residents and their families; its donor base skews toward older, potentially less digitally fluent users; and it must serve two languages/scripts. Accessibility here is not a checkbox — it is core to the mission (an organization dedicated to caring for the elderly must not build a website the elderly can't use).

## 2. Perceivable

| ID | Requirement | Implementation |
|---|---|---|
| A11Y-PER-01 | Text alternatives for all non-text content | Every image has bilingual `alt` text where content-bearing; decorative images use `alt=""` (per [03-Functional-Requirements.md](../documentation/03-Functional-Requirements.md) NFR-ACC-02) |
| A11Y-PER-02 | Color contrast ≥ 4.5:1 body text, ≥ 3:1 large text/UI components | All token pairs pre-verified in [06-Design-System.md §2.4](06-Design-System.md#24-accessibility-verification) |
| A11Y-PER-03 | Color is never the sole means of conveying information | StatusPill components (§5 in [07-Component-Library.md](07-Component-Library.md)) pair color with text label + icon, not color alone (e.g., "Failed" pill = red + ✕ icon + text, not red alone) |
| A11Y-PER-04 | Content is resizable to 200% without loss of function | Relative units (rem/em) throughout; no fixed-height text containers that clip at zoom |
| A11Y-PER-05 | Video content (Gallery) has captions where speech is present | Client-supplied video content reviewed for caption availability during Content Population phase (Phase 6, [14-Project-Timeline.md](../documentation/14-Project-Timeline.md)) |

## 3. Operable

| ID | Requirement | Implementation |
|---|---|---|
| A11Y-OPR-01 | All functionality available via keyboard alone | Full tab-order audit across donation checkout flow specifically (highest-stakes flow) |
| A11Y-OPR-02 | Visible focus indicator on all interactive elements | 2px `color-accent-gold-500` focus ring (never `outline: none` without a replacement, per [06-Design-System.md](06-Design-System.md)) |
| A11Y-OPR-03 | No keyboard traps | Modal/dialog focus is trapped *within* the modal while open (expected pattern) but always escapable via `Esc` and returns focus to the triggering element on close |
| A11Y-OPR-04 | Sufficient time / no unexpected timing | Donor OTP login (F-06) timeout is generous (≥5 minutes) with a visible "resend" option; auto-advancing TestimonialCarousel pauses on focus (per [09-Animation-Specifications.md §4.6](09-Animation-Specifications.md#46-testimonialcarousel)) |
| A11Y-OPR-05 | Skip-to-content link | First focusable element on every page, visually hidden until focused |
| A11Y-OPR-06 | Touch target size ≥ 44×44px | Enforced sitewide per [08-Responsive-Design.md §5](08-Responsive-Design.md#5-touch--input-considerations) |

## 4. Understandable

| ID | Requirement | Implementation |
|---|---|---|
| A11Y-UND-01 | Page language is programmatically set | `<html lang="en">` / `<html lang="te">` set per active locale, updated on language switch |
| A11Y-UND-02 | Consistent navigation and identification | Header/footer/nav structure identical across all pages (per [01-Information-Architecture.md](01-Information-Architecture.md)) — no per-page nav reordering |
| A11Y-UND-03 | Input assistance / error identification | Form errors identified in text (not color alone), programmatically associated with their field via `aria-describedby`, and written in plain bilingual language (per NFR-USE-04) |
| A11Y-UND-04 | Labels for all form fields | Every TextInput/Select/Checkbox has a visible, programmatically-associated `<label>` — no placeholder-as-label anti-pattern |
| A11Y-UND-05 | Confirmation before irreversible actions | Donation submission, admin Publish, admin Deactivate User all require an explicit confirm step (per [04-Admin-Flows.md §13](04-Admin-Flows.md#13-cross-cutting-admin-ux-rules)) |

## 5. Robust

| ID | Requirement | Implementation |
|---|---|---|
| A11Y-ROB-01 | Valid, semantic HTML | Landmark regions (`<header>`, `<nav>`, `<main>`, `<footer>`) on every page; heading hierarchy (h1→h2→h3) never skips a level |
| A11Y-ROB-02 | ARIA used correctly, only where native semantics are insufficient | E.g., `ProgressBar` uses `role="progressbar"` + `aria-valuenow/min/max` (per [07-Component-Library.md §3.10](07-Component-Library.md#310-progressbar)); custom components (chip selectors, tabs) follow WAI-ARIA Authoring Practices patterns |
| A11Y-ROB-03 | Compatible with assistive technology | Manual screen-reader spot check (NVDA/VoiceOver) on: Homepage, Donation Checkout flow, Volunteer form, Admin Login — the four highest-stakes flows — before launch |

## 6. Bilingual Accessibility Considerations

| Concern | Handling |
|---|---|
| Screen reader pronunciation switching | `lang` attribute correctly scoped down to the paragraph/span level for any mixed-language content (e.g., an English page mentioning "Vanaprasthasramam" in Telugu-adjacent proper-noun form should carry appropriate `lang` hints) |
| Telugu font legibility for low-vision users | Noto Sans Telugu tested at 200% zoom for glyph clarity (conjunct consonants can visually degrade in poorly-hinted fonts — Noto Sans Telugu is chosen specifically for its accessibility-grade hinting) |
| Language switcher discoverability | Always visible in the header (not buried in a settings menu), keyboard-reachable as an early tab-stop |

## 7. Donation Flow Accessibility — Special Focus

Given this is the platform's most critical and highest-stakes interaction:

- Every step of Checkout is independently reachable and announced via a live region (`aria-live="polite"`) when the step changes (e.g., "Step 2 of 3: Your Details").
- Payment failure/success states are announced via `aria-live="assertive"` (interrupts screen reader immediately) — a donor must never be left unsure whether their payment succeeded.
- The Razorpay-hosted checkout widget itself is a third-party component; the surrounding PaymentMethodTabs container (per [07-Component-Library.md §3.9](07-Component-Library.md#39-paymentmethodtabs)) is tested to confirm keyboard focus correctly enters and exits the embedded widget without becoming trapped.

## 8. Accessibility Testing Plan

| Method | When | Tool/Approach |
|---|---|---|
| Automated scanning | Every CI build | axe-core integrated into the build pipeline |
| Automated contrast check | Design token changes | Contrast-checking linter against [06-Design-System.md](06-Design-System.md) tokens |
| Manual keyboard-only pass | Pre-launch (Phase 7 QA) | Full click-through of all flows in [03-User-Flows.md](03-User-Flows.md) and [04-Admin-Flows.md](04-Admin-Flows.md) using keyboard only |
| Manual screen-reader spot check | Pre-launch (Phase 7 QA) | NVDA (Windows) + VoiceOver (iOS/macOS) on the 4 critical flows listed in §5 |
| Reduced-motion verification | Pre-launch | OS-level `prefers-reduced-motion` toggle tested against [09-Animation-Specifications.md §3](09-Animation-Specifications.md#3-global-rule-reduced-motion) |

## 9. Accessibility Governance

Accessibility is a **release-blocking QA gate**, not a post-launch nice-to-have — reflected in the Pre-Launch Security & QA checklist referenced in [12-Security-Requirements.md §10](../documentation/12-Security-Requirements.md#10-pre-launch-security-checklist) and [14-Project-Timeline.md](../documentation/14-Project-Timeline.md) Phase 7.

---
**Related Documents:** [06-Design-System.md](06-Design-System.md) · [07-Component-Library.md](07-Component-Library.md) · [09-Animation-Specifications.md](09-Animation-Specifications.md) · [../documentation/04-Non-Functional-Requirements.md](../documentation/04-Non-Functional-Requirements.md) · [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)
