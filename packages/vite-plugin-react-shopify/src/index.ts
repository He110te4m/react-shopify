import { Plugin } from "vite";
import { resolveOptions } from "./options";
import type { Options } from "./types";
import shopifyConfig from "./config";
import shopifyEntries from "./entries";
import shopifySSG from "./ssg";

const vitePluginShopify = (options: Options = {}): Plugin[] => {
  const resolvedOptions = resolveOptions(options);

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
  PresetDefinition,
  PresetBlock,
  ShopifyBlockType,
  SSGEntry,
  ImportMapOptions,
} from "./types";
