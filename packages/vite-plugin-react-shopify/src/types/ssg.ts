/**
 * @file SSG entry type representing a discovered React component target.
 *
 * Each entry maps to one Liquid output file (section, block, snippet, or
 * template). The {@link SSGEntry.meta} field carries {@link ShopifyMeta}
 * merged with auto-derived defaults.
 */

import type { ShopifyEntryRuntime, ShopifyEntryType, ShopifyMeta } from "./shopify";

export interface SSGEntry {
  /** Unique compiler identity, including entry type and relative source path. */
  id: string;
  filePath: string;
  relativePath: string;
  componentName: string;
  kebabName: string;
  targetType: ShopifyEntryType;
  runtime: ShopifyEntryRuntime;
  snippetProps: readonly string[];
  meta: Required<Pick<ShopifyMeta, "name">> & ShopifyMeta;
}
