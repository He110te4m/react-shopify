/**
 * @file SSR HTML post-processing utilities.
 *
 * React's `renderToStaticMarkup` emits HTML that needs minor normalization
 * before it can be embedded in Liquid templates:
 *  - Void elements must not be self-closing (otherwise Liquid's parser may
 *    misinterpret `/>` inside expressions).
 *  - Style attribute spacing is normalized for consistency.
 *  - Registered Liquid tokens are restored after React serialization.
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

export function restoreLiquidTokens(html: string, tokens: Map<string, string>): string {
  let result = html;
  for (const [token, liquid] of tokens) {
    result = result.replaceAll(token, liquid);
  }
  return result;
}
