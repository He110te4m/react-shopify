import { Plugin } from "vite";
import { resolveOptions } from "./plugin/options";
import type { Options } from "./types";
import { enableDebug } from "./plugin/logger";
import shopifyConfig from "./plugin/config";
import shopifyEntries from "./plugin/entries";
import shopifySSG from "./plugin/ssg";

const vitePluginShopify = (options: Options = {}): Plugin[] => {
  const resolvedOptions = resolveOptions(options);

  if (resolvedOptions.debug || process.env.DEBUG?.includes("vite-plugin-shopify")) {
    enableDebug();
  }

  return [
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
