const REACT_LIQUID_REGEX = /<\/?react-liquid>/g;

export function stripReactLiquidTags(html: string): string {
  return html.replace(REACT_LIQUID_REGEX, "");
}

export function unwrapHtmlEntities(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}
