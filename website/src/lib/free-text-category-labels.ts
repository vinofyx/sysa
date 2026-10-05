/**
 * News-post and gallery-album `category` (types/public.ts) are open-ended
 * free-text fields an admin can type anything into — no `categoryTe`
 * counterpart exists, and unlike committee designations there's no fixed,
 * closed vocabulary to translate exhaustively. This only translates the
 * exact category values actually seen in the current dataset, as a display
 * label — filtering logic elsewhere keeps comparing the real, untranslated
 * value. Any category outside this set (a future admin-typed one) is shown
 * as-is rather than guessed at.
 */
const KNOWN_TE: Record<string, string> = {
  Announcements: 'ప్రకటనలు',
  General: 'సాధారణం',
  Events: 'ఈవెంట్‌లు',
};

export function translateFreeTextCategory(category: string, locale: string): string {
  if (locale !== 'te') return category;
  return KNOWN_TE[category] ?? category;
}
