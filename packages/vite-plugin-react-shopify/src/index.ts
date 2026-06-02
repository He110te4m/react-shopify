/**
 * @file Main entry point for the `vite-plugin-react-shopify` package.
 *
 * Composes four Vite plugins (hydration-fix, config, entries, SSG) into
 * a single array returned to the user's `vite.config.ts`. Also re-exports
 * all public types for consumers.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import vitePluginShopify from 'vite-plugin-react-shopify'
 * export default {
 *   plugins: [vitePluginShopify({ themeRoot: '.', sourceCodeDir: 'frontend' })],
 * }
 * ```
 */

import { Plugin } from "vite";
import { resolveOptions } from "./core/options";
import type { Options } from "./types";
import { enableDebug } from "./core/logger";
import shopifyConfig from "./core/config";
import shopifyEntries from "./core/entries";
import shopifySSG from "./ssg";
import hydrationFix from "./hydration-fix/vite-plugin";

/**
 * Create the complete set of Vite plugins for React Shopify theme development.
 *
 * @param options User configuration (all fields optional).
 * @returns An array of Vite plugin instances.
 */
const vitePluginShopify = (options: Options = {}): Plugin[] => {
  const resolvedOptions = resolveOptions(options);

  if (resolvedOptions.debug || process.env.DEBUG?.includes("vite-plugin-shopify")) {
    enableDebug();
  }

  return [
    hydrationFix(resolvedOptions),
    shopifyConfig(resolvedOptions),
    shopifyEntries(resolvedOptions),
    shopifySSG(resolvedOptions),
  ];
};

export default vitePluginShopify;

export type {
  Options,
  SSGOptions,
  ShopifyMeta,
  SchemaSetting,
  SettingSchema,
  InputSettingSchema,
  SidebarSetting,
  InputSettings,
  SettingValue,
  SettingType,
  PresetDefinition,
  PresetBlock,
  ShopifyBlockType,
  SSGEntry,
  ImportMapOptions,
  ColorSchemeRole,
  ColorSchemeGroupSetting,
  InferSettings,
  AssertNoEmptyDefaults,
  BlockDefinition,
} from "./types";

export type {
  CheckboxSetting,
  NumberSetting,
  RadioSetting,
  RangeSetting,
  SelectSetting,
  TextSetting,
  TextareaSetting,
  ArticleSetting,
  ArticleListSetting,
  BlogSetting,
  CollectionSetting,
  CollectionListSetting,
  ColorSetting,
  ColorBackgroundSetting,
  ColorSchemeSetting,
  FontPickerSetting,
  HtmlSetting,
  ImagePickerSetting,
  InlineRichtextSetting,
  LinkListSetting,
  LiquidSetting,
  MetaobjectSetting,
  MetaobjectListSetting,
  PageSetting,
  ProductSetting,
  ProductListSetting,
  RichtextSetting,
  TextAlignmentSetting,
  UrlSetting,
  VideoSetting,
  VideoUrlSetting,
  HeaderSetting,
  ParagraphSetting,
  LineBreakSetting,
} from "./types";
