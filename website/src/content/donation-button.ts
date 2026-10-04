/**
 * Legacy Razorpay Payment Button config — no longer used for production
 * donations. Online giving goes through backend Checkout:
 * POST /api/v1/donations/initiate → Razorpay Checkout → POST /api/v1/donations/verify.
 *
 * Kept so an old static Hostinger build that still embeds the button can be
 * identified. Do not wire this ID back into donation-checkout-form.tsx.
 */
export const RAZORPAY_DONATION_BUTTON_ID: string | null = null;

export const RAZORPAY_DONATION_BUTTON_MODE: 'test' | 'live' = 'live';
