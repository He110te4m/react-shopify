/**
 * @file Runtime barrel export — public API for React components.
 *
 * Re-exports all hooks and the Liquid data provider so components can
 * `import { useLiquidValue, ... } from 'vite-plugin-react-shopify/runtime'`.
 */

export {
  useLiquidValue,
  useLiquidValues,
  useLiquidBlock,
  useSectionSettings,
  useBlockSettings,
  useSnippetParams,
  useBlockParams,
  parseLiquidBoolean,
  parseLiquidNumber,
} from "./hooks";

export type { LiquidTypeMode } from "./hooks";

export { LiquidDataContext, LiquidDataProvider } from "./provider";

export { ShopifyImage } from "./ShopifyImage";
export { ShopifyVideo } from "./ShopifyVideo";
export type { ShopifyVideoProps } from "./ShopifyVideo";

export type {
  ShopifyImageProps,
  ImageLoading,
  ImageFetchPriority,
  ImageDecoding,
  ImageCrop,
} from "./ShopifyImage";
