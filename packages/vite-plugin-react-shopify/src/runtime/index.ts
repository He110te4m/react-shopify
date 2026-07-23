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
export {
  useLiquid,
  useLiquidState,
  useLiquidExpression,
  useLiquidCode,
  useShopifyValue,
} from "./useLiquid";
export type { UseLiquidOptions } from "./useLiquid";

export { defineSettings, liquidExpression } from "./defineSettings";
export type {
  LiquidExpression,
  SettingsContract,
  SettingsProps,
  SettingsRefs,
} from "./defineSettings";

// ── Hydration Boundaries ───────────────────────────────────────────────────
export { Island } from "./Island";
export type { IslandProps } from "./Island";

export { LiquidHtml } from "./LiquidHtml";
export type { LiquidHtmlProps } from "./LiquidHtml";

export { BlockSlot } from "./BlockSlot";
export type { BlockSlotProps } from "./BlockSlot";

export { LiquidIf, unless, when } from "./LiquidIf";
export type { LiquidIfProps } from "./LiquidIf";

export { each } from "./LiquidEach";
export type { LiquidEachProps, ShopifyLoopValue } from "./LiquidEach";

export {
  liquid,
  liquidChoice,
  liquidIf,
  useLiquidClass,
  useLiquidCssVars,
  useLiquidDynamicClass,
} from "./LiquidValue";
export type {
  LiquidCssVarSpec,
  LiquidResolvedValue,
  LiquidValue,
  LiquidValueInput,
} from "./LiquidValue";

export { StaticBlock } from "./StaticBlock";
export type { StaticBlockProps, StaticBlockDataValue, StaticBlockLiquidValue } from "./StaticBlock";

export { ClientOnly, clientOnly } from "./ClientOnly";
export type {
  ClientOnlyProps,
  ClientOnlyOptions,
  ClientOnlyFallback,
  ClientOnlyModule,
} from "./ClientOnly";

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

export { ShopifyOutput } from "./ShopifyOutput";
export type { ShopifyOutputProps } from "./ShopifyOutput";

// ── Context (used by entry-template for CSR hydration) ─────────────────────
export { LiquidDataProvider, LiquidDataContext } from "./provider";

// ── Internal (used by SSG assembler) ───────────────────────────────────────
export { buildLiquidBridge, useShopifyContext } from "./ShopifyContext";
export type { TrackOptions } from "./ShopifyContext";

export { createSnippetProxy } from "./Snippet";

export {
  assertValidSettingSchemas,
  createCheckboxSetting,
  createColorSchemeSetting,
  createHeaderSetting,
  createImageSetting,
  createInlineRichTextSetting,
  createNumberSetting,
  createParagraphSetting,
  createRangeSetting,
  createSelectSetting,
  createSettingsSchema,
  createTextSetting,
  createUrlSetting,
  SettingSchemaValidationError,
  validateSettingSchemas,
} from "../contract";

export type {
  SettingDescriptor,
  SettingDescriptorMap,
  SettingSchemaFromMap,
  SettingValidationCode,
  SettingValidationError,
} from "../contract";

export {
  and,
  append,
  createSettingExpression,
  dividedBy,
  eq,
  escape,
  filter,
  gt,
  gte,
  isBlank,
  isPresent,
  isTruthy,
  literal,
  lt,
  lte,
  multiply,
  neq,
  not,
  or,
  path,
  placeholderSvg,
  property,
  round,
  sectionValue,
  themeSetting,
} from "../contract/expression";

export type {
  ShopifyCondition,
  ShopifyContentKind,
  ShopifyExpressionNode,
  ShopifyLiteral,
  ShopifyOperand,
  ShopifyReference,
} from "../contract/expression";
