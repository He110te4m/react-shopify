/**
 * @file Bridge types and builder — React-free.
 *
 * These are used by both the runtime (ShopifyContext) and the SSG pipeline
 * (liquid-assembler). No React imports here so the assembler can statically
 * import without pulling in the React runtime.
 */
import { GW_TRACK_MAP, ATTR_LIQUID_BRIDGE } from "../constants/attributes";

export interface TrackOptions {
  expression?: string;
  bridge?: string;
  type?: "string" | "number" | "boolean" | "json" | "html";
}

export function bridgeId(expression: string, opts?: TrackOptions): string {
  if (!opts?.bridge && !opts?.type) return expression;

  const signature = JSON.stringify({ expression, bridge: opts.bridge ?? null, type: opts.type ?? null });
  let hash = 2166136261;
  for (let i = 0; i < signature.length; i += 1) {
    hash ^= signature.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `vrs:${(hash >>> 0).toString(36)}:${expression}`;
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
  for (const [id, opts] of trackMap) {
    const expression = opts.expression ?? id;
    const bridge = opts.bridge ?? `{{ ${expression} | json }}`;
    entries.push(`    ${JSON.stringify(id)}: ${bridge}`);
  }

  return [
    `  <script type="application/json" ${ATTR_LIQUID_BRIDGE}>`,
    `  {`,
    entries.join(",\n"),
    `  }`,
    `  </script>`,
  ].join("\n");
}
