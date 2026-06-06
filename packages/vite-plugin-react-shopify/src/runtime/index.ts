/**
 * Runtime exports for vite-plugin-react-shopify.
 *
 * v2.6 — unified architecture:
 *   - ShopifyContext: single communication hub for React↔Liquid
 *   - Island: unified hydration boundary for Liquid-owned DOM
 *   - useLiquid: unified hook for Liquid values as React state
 *   - ShopifyImage / ShopifyVideo: specialized components using primitives above
 */

// ── Unified Primitives (v2.6) ──────────────────────────────────────────────
export { useShopifyContext, buildLiquidBridge } from "./ShopifyContext";
export type { ShopifyContext, TrackOptions } from "./ShopifyContext";

export { Island } from "./Island";
export type { IslandProps } from "./Island";

export { useLiquid, useLiquidCode } from "./useLiquid";
export type { UseLiquidOptions } from "./useLiquid";

// ── Specialized Components ─────────────────────────────────────────────────
export { ShopifyImage } from "./ShopifyImage";
export type {
  ShopifyImageProps,
  ImageLoading,
  ImageFetchPriority,
  ImageDecoding,
  ImageCrop,
} from "./ShopifyImage";

export { ShopifyVideo } from "./ShopifyVideo";
export type { ShopifyVideoProps } from "./ShopifyVideo";

// ── Legacy Provider (used by entry-template for CSR hydration) ─────────────
export { LiquidDataProvider, LiquidDataContext } from "./provider";

// ── Legacy Hooks (deprecated, use useLiquid instead) ───────────────────────
export {
  useLiquidValue,
  useLiquidValues,
  useSectionSettings,
  useBlockSettings,
  useSnippetParams,
  useBlockParams,
  useLiquidBlock,
} from "./hooks";
export { useLiquid as useLiquidV2 } from "./hooks-v2.5";
