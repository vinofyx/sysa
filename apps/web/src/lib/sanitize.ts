import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'img',
];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt'];

/** Rich-text CMS fields (page content, news bodies, event/activity
 * descriptions) are sanitized once on save in the admin editor, but public
 * pages sanitize again on render — defense in depth
 * (documentation/12-Security-Requirements.md XSS requirement) and the only
 * way to safely render HTML from a Server Component, where the admin's
 * client-only DOMPurify import can't run. */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
