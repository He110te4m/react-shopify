/**
 * @file Debug helper for runtime code generation.
 *
 * Generated hydration entry modules should only emit `console.debug`
 * calls when the plugin is configured with `debug: true`.
 *
 * Returns a function that, when debug is enabled, wraps the supplied
 * code in an array (for spread into code-line arrays).  When debug is
 * disabled the helper returns an empty array so no debug lines are
 * emitted at all.
 *
 * @example
 * ```ts
 * const dbg = debugLines(debug);
 * lines.push(
 *   `function hydrate(el) {`,
 *   ...dbg(`  console.debug('hydrate start')`),
 *   `  captureIslands(el)`,
 *   `}`,
 * );
 * ```
 */
export function debugLines(debug: boolean): (code: string) => string[] {
  if (!debug) return () => [];
  return (code: string) => [code];
}
