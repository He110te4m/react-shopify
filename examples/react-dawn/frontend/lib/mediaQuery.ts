export function mediaQuery(query: string): MediaQueryList {
  return window.matchMedia(query);
}

export function onMediaChange(
  query: string,
  callback: (matches: boolean) => void
): () => void {
  const mql = mediaQuery(query);
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mql.addEventListener("change", handler);
  callback(mql.matches);
  return () => mql.removeEventListener("change", handler);
}
