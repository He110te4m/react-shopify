/**
 * @file SSR HTML post-processing utilities.
 *
 * React's `renderToStaticMarkup` emits HTML that needs minor normalization
 * before it can be embedded in Liquid templates:
 *  - Void elements must not be self-closing (otherwise Liquid's parser may
 *    misinterpret `/>` inside expressions).
 *  - Style attribute spacing is normalized for consistency.
 *  - HTML entities are unwrapped so Liquid `{{ }}` expressions (which React
 *    may encode as `&amp;`) remain parseable.
 */

/** Matches self-closing void elements like `<img/>`, `<br/>`, etc. */
const VOID_ELEMENTS = /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)([^>]*)\/>/g;

/** Remove self-closing slashes from void elements. */
export function normalizeVoidElements(html: string): string {
  return html.replace(VOID_ELEMENTS, "<$1$2>");
}

/** Normalize spacing inside style attributes: `foo:bar` → `foo: bar`. */
export function normalizeStyleAttributes(html: string): string {
  return html.replace(/ style="([^"]+)"/g, (_match, content) => {
    const normalized = content
      .replace(/:(\S)/g, ": $1")
      .replace(/;\s*$/, "");
    return ` style="${normalized};"`;
  });
}

/**
 * Decode common HTML entities back to raw characters.
 *
 * Critical for preserving Liquid `{{ }}` expressions that React may encode
 * as `&amp;` during SSR.
 */
export function unwrapHtmlEntities(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}
