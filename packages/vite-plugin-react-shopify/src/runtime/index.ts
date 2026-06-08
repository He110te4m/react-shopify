/**
 * Runtime exports for vite-plugin-react-shopify.
 *
 * v3.0 — breaking change: unified hydration with pre-capture + memo lock.
 * Legacy hooks (useLiquidValue, useLiquidValues, useSectionSettings, etc.)
 * are removed.  Use `useLiquid` for all Liquid value reads.
 *
 *   - useLiquid: unified hook for Liquid values as React state
 *   - useLiquidCode: inject raw Liquid code blocks
 *   - Island: hydration boundary for Liquid-owned DOM (images, videos)
 *   - BlockSlot: declare where child blocks insert in a Section
 *   - ShopifyImage / ShopifyVideo: specialized Island wrappers
 *   - LiquidDataProvider: context provider (used by entry-template)
 */

// ── Core Hooks ─────────────────────────────────────────────────────────────
export { useLiquid, useLiquidCode } from "./useLiquid";
export type { UseLiquidOptions } from "./useLiquid";

// ── Hydration Boundaries ───────────────────────────────────────────────────
export { Island } from "./Island";
export type { IslandProps } from "./Island";

export { BlockSlot } from "./BlockSlot";
export type { BlockSlotProps } from "./BlockSlot";

export { StaticBlock } from "./StaticBlock";
export type {
  StaticBlockProps,
  StaticBlockDataValue,
  StaticBlockLiquidValue,
} from "./StaticBlock";

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

// ── Context (used by entry-template for CSR hydration) ─────────────────────
export { LiquidDataProvider, LiquidDataContext } from "./provider";

// ── Internal (used by SSG assembler) ───────────────────────────────────────
export { buildLiquidBridge } from "./ShopifyContext";
export type { TrackOptions } from "./ShopifyContext";
