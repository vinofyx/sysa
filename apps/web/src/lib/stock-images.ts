/**
 * A small, curated set of free-license Unsplash photographs (verified public
 * `images.unsplash.com` CDN URLs, not Unsplash+ premium), used ONLY for
 * decorative section imagery that has no CMS-backed data source (e.g. the
 * About page's split-layout portrait, a hero fallback shown when the admin
 * hasn't published any Hero Banners yet).
 *
 * Deliberately NOT used for anything CMS-driven (Activities, Events, News,
 * Testimonials, Gallery) — those continue to render the admin's real
 * uploaded image or their existing icon fallback, exactly as before. Mixing
 * stock photos into admin-controlled data would misrepresent real content.
 */
export const STOCK_IMAGES = {
  /** Golden hindu deity / temple statue — spiritual, warm, golden-hour toned. */
  templeDeity:
    'https://images.unsplash.com/photo-1621787084849-ed98731b3071?auto=format&fit=crop&w=1920&q=80',
  /** Elderly care — a health visitor caring for a senior citizen at home. */
  elderlyCare:
    'https://images.unsplash.com/photo-1543333995-a78aea2eee50?auto=format&fit=crop&w=1600&q=80',
  /** Volunteers / community — hands joined together, unity and service. */
  volunteersUnity:
    'https://images.unsplash.com/photo-1542323228-002ac256e7b8?auto=format&fit=crop&w=1600&q=80',
  /** Children studying in a classroom — education support. */
  studentsClassroom:
    'https://images.unsplash.com/photo-1692269725836-fbd72e98883f?auto=format&fit=crop&w=1600&q=80',
} as const;
