/** Renders a JSON-LD `<script>` tag for structured data (design/11-SEO-Structure.md).
 * `data` should come from the helper builders in `lib/seo.ts`. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
