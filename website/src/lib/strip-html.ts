const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Decodes HTML entities (`&amp;` -> `&`, `&#8217;` -> `’`, etc.) in a plain
 * string. Needed anywhere admin-authored rich text is shown as plain text
 * (card previews, meta descriptions, search snippets) rather than through
 * RichContent's dangerouslySetInnerHTML — the browser's HTML parser is what
 * normally decodes entities, and it never runs on a plain JSX text string,
 * so a literal "&amp;" in the source would otherwise render as visible text
 * "&amp;" instead of "&". Pure string logic — works identically at
 * static-export build time and in server-rendered dynamic requests.
 */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const codePoint =
        code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Strips HTML tags and decodes the entities that remain — see decodeHtmlEntities. */
export function stripHtml(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ''));
}
