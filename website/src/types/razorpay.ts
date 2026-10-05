export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/** Returned to `handler` instead of `RazorpayPaymentResponse` when Checkout
 * was opened with `subscription_id` (automatic-monthly) rather than
 * `order_id` (one-time) — Razorpay's subscription Checkout flow. */
export interface RazorpaySubscriptionPaymentResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount?: number;
  currency?: string;
  name: string;
  description?: string;
  /** Exactly one of `order_id` (one-time) or `subscription_id`
   * (automatic-monthly) is set per checkout — never both. */
  order_id?: string;
  subscription_id?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayPaymentResponse | RazorpaySubscriptionPaymentResponse) => void;
  modal?: { ondismiss?: () => void };
}

export interface RazorpayCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}
