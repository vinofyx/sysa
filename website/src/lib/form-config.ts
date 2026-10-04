/**
 * Single source of truth for where the static-export Volunteer and Contact
 * forms submit to. The static build has no reachable SYSA backend (see
 * `isStaticExport`/`static-mode.ts`).
 *
 * Both are the client's own Google Apps Script Web Apps (deployed as
 * /exec), each appending rows to its own Google Sheet and emailing a
 * notification. These are public POST endpoints by design — like the
 * Razorpay Payment Button ID elsewhere in this codebase, they're meant to
 * be called directly from client-side JS and aren't secrets. Both are
 * still routed through an env var (with this URL as the fallback) so they
 * can be swapped without a code change if either Apps Script is ever
 * redeployed at a different URL.
 *
 * IMPORTANT: both Apps Scripts' /exec responses have no CORS headers
 * (Google Apps Script doesn't expose a way to set them), so `fetch()`
 * cannot read either response — confirmed directly against the live
 * volunteer endpoint. Because of that, neither `static-volunteer-form.tsx`
 * nor `static-contact-form.tsx` uses fetch() for these endpoints; both POST
 * via a real HTML <form> targeting a hidden <iframe>, which never needs to
 * read the cross-origin response at all. See those files for the
 * submission logic — nothing about that mechanism depends on this constant
 * being fetch-compatible.
 */
export const VOLUNTEER_FORM_ENDPOINT: string | null =
  process.env.NEXT_PUBLIC_VOLUNTEER_FORM_ENDPOINT?.trim() ||
  'https://script.google.com/macros/s/AKfycbx_4fqODxMExqscRtzDMamcDICBS-Fk5iXXo-JrAa1xeEi38IVSn4obKX3q9hlGdGsl/exec';

export const CONTACT_FORM_ENDPOINT: string | null =
  process.env.NEXT_PUBLIC_CONTACT_FORM_ENDPOINT?.trim() ||
  'https://script.google.com/macros/s/AKfycbytj4A6q5v2MXC93J9W98DL2ERSjyXsL699NKLUHxJy0jk_f1RUhN9cvX0zRksqfO47/exec';
