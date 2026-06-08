/**
 * @file Unified ShopifyContext — the single communication hub between
 * React and Liquid across the SSG → hydrating → mounted lifecycle.
 *
 * `phase` semantics:
 *   - 'ssg'       : Node-side SSG render. Hooks emit Liquid placeholders and
 *                   register tracked expressions in globalThis registries.
 *   - 'hydrating' : First client render. Hooks read resolved values from the
 *                   bridge; Island components reuse pre-captured Liquid DOM
 *                   so React vdom matches DOM exactly during hydration.
 *   - 'mounted'   : All subsequent client renders. Same data sources as
 *                   `hydrating` — Island content stays frozen via React.memo.
 *
 * Why three phases instead of just `isSSR`? Because `typeof document` is
 * `'object'` on the client even during the hydration commit, so we cannot
 * branch on it. We must always render the same output as the SSR HTML on
 * the first client pass to avoid hydration mismatches.
 */
import { useContext } from "react";
import { LiquidDataContext } from "./provider";
import {
  GW_TRACK,
  GW_BLOCKS,
  GW_TRACK_MAP,
} from "../constants/attributes";
import type { TrackOptions } from "./bridge";
export type { TrackOptions } from "./bridge";

export type ShopifyPhase = "ssg" | "hydrating" | "mounted";

export interface ShopifyContext {
  phase: ShopifyPhase;
  /** Read a Liquid value. SSG: returns `{{ path }}` placeholder. Client: bridge value. */
  read(path: string): unknown;
  /** Register an expression for inclusion in the JSON bridge. SSG-only; no-op on client. */
  track(path: string, opts?: TrackOptions): void;
  /** Push raw Liquid code into the assembler. SSG-only; no-op on client. */
  inject(code: string): void;
}

/** True when running in the Node SSG render pass (no `document` global). */
function isSSGEnvironment(): boolean {
  return typeof (globalThis as any).document === "undefined";
}

function createSSGContext(): ShopifyContext {
  return {
    phase: "ssg",
    read(path: string) {
      const tracker = (globalThis as any)[GW_TRACK] as Set<string> | undefined;
      if (tracker) tracker.add(path);
      const map = (globalThis as any)[GW_TRACK_MAP] as Map<string, TrackOptions> | undefined;
      if (map && !map.has(path)) map.set(path, {});
      return `{{ ${path} }}`;
    },
    track(path: string, opts?: TrackOptions) {
      const map = (globalThis as any)[GW_TRACK_MAP] as Map<string, TrackOptions> | undefined;
      if (map) map.set(path, opts ?? {});
      const tracker = (globalThis as any)[GW_TRACK] as Set<string> | undefined;
      if (tracker) tracker.add(path);
    },
    inject(code: string) {
      const blocks = (globalThis as any)[GW_BLOCKS] as string[] | undefined;
      if (blocks) blocks.push(code);
    },
  };
}

function createClientContext(
  bridgeData: Record<string, any>,
): ShopifyContext {
  return {
    // Client phase is always 'hydrating' (initial render) or 'mounted'
    // (subsequent). We don't distinguish them because useLiquid uses the
    // same bridge data in both, and Island uses memo(() => true) to lock
    // its content — there's no behavioral difference between the two.
    phase: "hydrating",
    read(path: string) {
      return bridgeData[path];
    },
    track() {
      /* no-op */
    },
    inject() {
      /* no-op */
    },
  };
}

/**
 * Returns the unified ShopifyContext for the current render environment.
 *
 * SSG: returns a fresh SSG context bound to globalThis registries.
 * Client: returns a context backed by the LiquidDataContext provider value.
 */
export function useShopifyContext(): ShopifyContext {
  // Hook order must be stable, so call useContext unconditionally.
  const bridgeData = useContext(LiquidDataContext);
  if (isSSGEnvironment()) {
    return createSSGContext();
  }
  return createClientContext(bridgeData);
}

// Re-exported for the SSG assembler.
export { buildLiquidBridge } from "./bridge";
