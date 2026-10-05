/**
 * Razorpay-hosted Payment Links for the static Hostinger deployment, where
 * there is no reachable backend to create orders/verify signatures via the
 * normal Checkout flow (see donation-checkout-form.tsx, gated on
 * isStaticExport). Standalone/VPS mode never reads this file — it uses the
 * full order-creation + signature-verification flow against the live API.
 *
 * Razorpay Payment Links require a fixed amount per link (no "any amount"
 * option without their separate Payment Pages product), so both lists below
 * mirror the site's existing PRESET_AMOUNTS.
 *
 * TEST and LIVE links are deliberately kept as two separate arrays rather
 * than one list with a mode flag on each entry — donation-checkout-form.tsx
 * only ever reads LIVE_PAYMENT_LINKS in a real build (see isShowingTestLinks
 * there), so there is no per-item flag that could be flipped or missed.
 */
export interface DonationPaymentLink {
  amount: number;
  url: string;
}

/**
 * Real donations go here. Empty until the site owner supplies actual LIVE
 * Payment Links (created the same way as the TEST ones below, but with the
 * live RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET from api/.env instead of
 * test credentials). Never invent/guess a value here — until it's filled in,
 * the donation page shows an honest "available shortly" message instead of
 * silently falling back to the test links.
 */
export const LIVE_PAYMENT_LINKS: DonationPaymentLink[] = [];

/**
 * Created for real via the Razorpay API using the TEST-mode credentials
 * already configured in api/.env — these are live, working *test*
 * links (completing one only finishes a Razorpay test payment, no real
 * money moves), not placeholders. Kept here for internal QA only.
 *
 * IMPORTANT: this array is only ever non-empty in the source tree during a
 * deliberate QA build. `scripts/build-static.mjs` blanks it to `[]` at the
 * source level for every normal `npm run build:static` run (the one used for
 * the real Hostinger upload) UNLESS NEXT_PUBLIC_SHOW_TEST_PAYMENT_LINKS=true
 * is set — this is a build-time text swap, not a runtime/minifier trick, so
 * the URL strings below are guaranteed absent from the compiled output
 * rather than merely unreachable at runtime (confirmed: SWC's minifier does
 * not eliminate the equivalent `process.env.X === 'true' ? [...] : []`
 * ternary, so relying on dead-code elimination here was not reliable).
 */
export const TEST_PAYMENT_LINKS: DonationPaymentLink[] = [
  { amount: 500, url: 'https://rzp.io/rzp/I7zw79s' },
  { amount: 1000, url: 'https://rzp.io/rzp/LCVQcfk' },
  { amount: 2500, url: 'https://rzp.io/rzp/oxh147K' },
  { amount: 5000, url: 'https://rzp.io/rzp/3lGrsbGv' },
];
