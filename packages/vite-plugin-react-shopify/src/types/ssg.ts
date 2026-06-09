/**
 * @file SSG entry type representing a discovered React component target.
 *
 * Each entry maps to one Liquid output file (section, block, snippet, or
 * template). The {@link SSGEntry.meta} field carries {@link ShopifyMeta}
 * merged with auto-derived defaults.
 */

import type { ShopifyEntryType, ShopifyMeta } from "./shopify";

export interface SSGEntry {
  filePath: string;
  componentName: string;
  kebabName: string;
  targetType: ShopifyEntryType;
  meta: Required<Pick<ShopifyMeta, "name">> & ShopifyMeta;
}
