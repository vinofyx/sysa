import { redirect } from '@/i18n/navigation';

/**
 * "Services" and "Activities" are modeled as one `Activity` entity on the
 * backend — no separate Services concept exists in the source-of-truth
 * documents (see DEVELOPMENT_PROGRESS.md, Phase 5 §9.1). Rather than
 * duplicating the listing under a second URL with the exact same data, this
 * route redirects to the canonical `/activities` page.
 */
export default async function ServicesRedirect() {
  redirect('/activities');
}
