/**
 * @file Bridge types and builder — React-free.
 *
 * These are used by both the runtime (ShopifyContext) and the SSG pipeline
 * (liquid-assembler). No React imports here so the assembler can statically
 * import without pulling in the React runtime.
 */
import { GW_TRACK_MAP, ATTR_LIQUID_BRIDGE } from "../constants/attributes";

export interface TrackOptions {
  bridge?: string;
  type?: "string" | "number" | "boolean" | "json" | "html";
}

/**
 * Builds the JSON bridge HTML from tracked expressions.
 * Called by the Liquid assembler after SSR rendering.
 *
 * @param map - Tracked expression map. If omitted, reads from globalThis.
 */
export function buildLiquidBridge(
  map?: Map<string, TrackOptions>,
): string {
  const trackMap =
    map ?? (globalThis as any)[GW_TRACK_MAP] as
      | Map<string, TrackOptions>
      | undefined;
  if (!trackMap || trackMap.size === 0) return "";

  const entries: string[] = [];
  for (const [path, opts] of trackMap) {
    const bridge = opts.bridge ?? `{{ ${path} | json }}`;
    entries.push(`    "${path}": ${bridge}`);
  }

  return [
    `  <script type="application/json" ${ATTR_LIQUID_BRIDGE}>`,
    `  {`,
    entries.join(",\n"),
    `  }`,
    `  </script>`,
  ].join("\n");
}
