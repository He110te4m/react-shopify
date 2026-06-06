import { useContext, useMemo } from "react";
import { LiquidDataContext } from "./provider";
import { GW_TRACK, GW_BLOCKS, GW_TRACK_MAP } from "../constants/attributes";
import type { TrackOptions } from "./bridge";
export type { TrackOptions } from "./bridge";
export { buildLiquidBridge } from "./bridge";

export interface ShopifyContext {
  isSSR: boolean;
  read(path: string): unknown;
  track(path: string, opts?: TrackOptions): void;
  inject(code: string): void;
}

function createSSRContext(): ShopifyContext {
  return {
    isSSR: true,
    read(path: string) {
      const tracker = (globalThis as any)[GW_TRACK] as Set<string> | undefined;
      if (tracker) tracker.add(path);
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

function createCSRContext(data: Record<string, any>): ShopifyContext {
  return {
    isSSR: false,
    read(path: string) {
      return data[path];
    },
    track() {},
    inject() {},
  };
}

/**
 * Returns the unified ShopifyContext — the single communication hub
 * between React and Liquid.
 *
 * SSR: reads/writes globalThis registries (__shopify_ssg_track, etc.)
 * CSR: reads from LiquidDataContext (populated from JSON bridge)
 */
export function useShopifyContext(): ShopifyContext {
  const isSSR = typeof (globalThis as any).document === "undefined";
  const bridgeData = useContext(LiquidDataContext);

  return useMemo(() => {
    if (isSSR) return createSSRContext();
    return createCSRContext(bridgeData ?? {});
  }, [isSSR, bridgeData]);
}
