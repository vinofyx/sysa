/** The stable code of the selected category, sent with its id at checkout so
 * the API can resolve a stale snapshot id (static export / API-down fallback). */
export function categoryCodeFor(
  categories: ReadonlyArray<{ id: string; code: string }>,
  categoryId: string,
): string | undefined {
  return categories.find((c) => c.id === categoryId)?.code || undefined;
}
