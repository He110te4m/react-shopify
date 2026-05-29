const VOID_ELEMENTS = /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)([^>]*)\/>/g;

export function normalizeVoidElements(html: string): string {
  return html.replace(VOID_ELEMENTS, "<$1$2>");
}

export function normalizeStyleAttributes(html: string): string {
  return html.replace(/ style="([^"]+)"/g, (_match, content) => {
    const normalized = content
      .replace(/:(\S)/g, ": $1")
      .replace(/;\s*$/, "");
    return ` style="${normalized};"`;
  });
}

export function unwrapHtmlEntities(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}
