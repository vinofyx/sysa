import type { Testimonial } from '@/types/public';

/**
 * `Testimonial.authorName`/`authorRole` (types/public.ts) are single
 * free-text fields with no Telugu counterpart in the schema. `authorName`
 * here is a privacy-preserving role label already ("Regular Donor",
 * "Volunteer"), not a real person's name, so translating it isn't
 * fabricating anyone's identity — it's the same class of fix as the
 * committee designation labels. Keyed by id (not by matching the English
 * text) so a future testimonial with unrecognized text safely falls back to
 * its own English content instead of silently mismatching.
 */
const LABELS_TE: Record<string, { authorName: string; authorRole?: string }> = {
  'bc6761d2-f706-4272-be9d-739b44efd797': {
    authorName: 'నెలవారీ దాత',
    authorRole: 'నెలవారీ అన్నప్రసాదం స్పాన్సర్',
  },
  'd6efbf9b-2353-4287-8078-126cbaf2a052': {
    authorName: 'వాలంటీర్',
    authorRole: 'వారాంతపు వాలంటీర్, వృద్ధాశ్రమం',
  },
  'd21e7062-9944-468d-93cd-83765e87f243': {
    authorName: 'కుటుంబ సభ్యురాలు',
    authorRole: 'వృద్ధాశ్రమ నివాసి బంధువు',
  },
};

export function translateTestimonialAuthor(testimonial: Testimonial, locale: string) {
  if (locale !== 'te') {
    return { authorName: testimonial.authorName, authorRole: testimonial.authorRole };
  }
  const te = LABELS_TE[testimonial.id];
  return {
    authorName: te?.authorName ?? testimonial.authorName,
    authorRole: te?.authorRole ?? testimonial.authorRole,
  };
}
