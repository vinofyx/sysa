/**
 * `PublicEvent.location` (types/public.ts) is a single free-text field with
 * no Telugu counterpart in the schema — same class of gap as committee
 * designations and free-text categories. Only the small, fixed set of
 * location strings actually seen in the current dataset is translated here;
 * the organization's own name is left as-is (a proper noun), only the
 * locality/city is rendered in Telugu. Any value outside this set (a future
 * admin-typed one) is shown as-is rather than guessed at.
 */
const KNOWN_TE: Record<string, string> = {
  'Sai Yadadri Seva Ashram, Uppal, Hyderabad': 'సాయి యాదాద్రి సేవా ఆశ్రమం, ఉప్పల్, హైదరాబాద్',
};

export function translateEventLocation(location: string, locale: string): string {
  if (locale !== 'te') return location;
  return KNOWN_TE[location] ?? location;
}
