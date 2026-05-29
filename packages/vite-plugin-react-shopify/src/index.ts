import { Plugin } from "vite";
import { resolveOptions } from "./core/options";
import type { Options } from "./types";
import { enableDebug } from "./core/logger";
import shopifyConfig from "./core/config";
import shopifyEntries from "./core/entries";
import shopifySSG from "./ssg";
import hydrationFix from "./hydration-fix/vite-plugin";

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
