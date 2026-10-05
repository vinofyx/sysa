'use client';

import * as React from 'react';

import '@/types/razorpay';

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** Loads Razorpay Checkout's script once per page and reports readiness —
 * shared by the checkout form and the "Retry Payment" button. */
export function useRazorpayScript(): boolean {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (window.Razorpay) {
      setReady(true);
      return;
    }
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => setReady(true));
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, []);

  return ready;
}
