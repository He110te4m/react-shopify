/**
 * @file Shopify block/section metadata types.
 *
 * Defines {@link ShopifyMeta} — the shape of the `shopifyMeta` export from
 * React components — along with supporting types for presets and block
 * definitions. This metadata drives schema generation and Liquid output.
 */

import type { SettingSchema, InputSettings } from "./settings";

/** The four Shopify theme component categories. */
export type ShopifyBlockType = "template" | "section" | "block" | "snippet";

/**
 * Metadata for a Shopify section, block, snippet, or template.
 *
 * Exported as `shopifyMeta` from the React component file. Drives the
 * generated {% schema %} block and influences Liquid wrapper output.
 */
export interface ShopifyMeta {
  type?: ShopifyBlockType;
  name?: string;
  tag?: string;
  class?: string;
  limit?: number;
  params?: string[];
  settings?: SettingSchema[];
  blocks?: { type: string; name?: string; settings?: SettingSchema[] }[];
  max_blocks?: number;
  presets?: PresetDefinition[];
  enabled_on?: Record<string, string>[];
  disabled_on?: Record<string, string>[];
  templates?: string[];
}

/** A theme editor preset definition within the schema. */
export interface PresetDefinition {
  name: string;
  category?: string;
  settings?: InputSettings;
  blocks?: PresetBlock[];
}

/** A nested block preset inside a parent preset. */
export interface PresetBlock {
  type: string;
  id?: string;
  static?: boolean;
  settings?: InputSettings;
  blocks?: PresetBlock[];
}
