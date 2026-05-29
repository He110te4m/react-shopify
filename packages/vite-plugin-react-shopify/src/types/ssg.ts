import type { ShopifyBlockType, ShopifyMeta } from "./shopify";

export interface SSGEntry {
  filePath: string;
  componentName: string;
  kebabName: string;
  targetType: ShopifyBlockType;
  meta: Required<Pick<ShopifyMeta, "name">> & ShopifyMeta;
}
