export function parseMultiline(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();
}

export function parseMediaSize(val: string): { width: number; height: number } {
  const [w, h] = val.split("x").map(Number);
  return { width: w || 0, height: h || 0 };
}

export function parseColorScheme(val: string): string {
  return val.replace(/^scheme-/, "color-");
}
