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
 * A block definition within a section's `blocks` attribute.
 *
 * Per the Shopify section schema, each block entry supports the following:
 *
 * | Attribute  | Required | Description                                                          |
 * | ---------- | -------- | -------------------------------------------------------------------- |
 * | `type`     | Yes      | Free-form block type identifier.                                    |
 * | `name`     | No       | Block name shown as the block title in the theme editor. Auto-derived from `type` (e.g. `text-block` → `Text Block`) if omitted. |
 * | `limit`    | No       | Max number of blocks of this type that can be used.                 |
 * | `settings` | No       | Input or sidebar settings exposed to the merchant for this block.    |
 */
export interface BlockDefinition {
  type: string;
  name?: string;
  limit?: number;
  settings?: SettingSchema[];
}

/**
 * Template/group scope filter used by `enabled_on` / `disabled_on`.
 *
 * Per the Shopify section schema, at least one of `templates` or `groups`
 * must be provided. `enabled_on` and `disabled_on` are mutually exclusive —
 * a section may declare one but not both.
 *
 * | Attribute   | Description                                                                              |
 * | ----------- | ---------------------------------------------------------------------------------------- |
 * | `templates` | Page types the section is restricted to (or excluded from). Use `["*"]` for all.        |
 * | `groups`    | Section group types: `header`, `footer`, `aside`, or `custom.<NAME>`. Use `["*"]` for all. |
 */
export interface TemplateScope {
  templates?: string[];
  groups?: string[];
}

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
  blocks?: BlockDefinition[];
  max_blocks?: number;
  presets?: PresetDefinition[];
  enabled_on?: TemplateScope;
  disabled_on?: TemplateScope;
}

/** A theme editor preset definition within the schema. */
export interface PresetDefinition {
  name: string;
  category?: string;
  settings?: InputSettings;
  blocks?: PresetBlock[];
}

interface CommonBlockPreset {
  type: string;
  name?: string;
  settings?: InputSettings;
  blocks?: PresetBlock[];
}

export interface ShopifyNormalBlockPreset extends CommonBlockPreset {
  id?: never;
  static?: never;
}

export interface ShopifyStaticBlockPreset extends CommonBlockPreset {
  id: string;
  static: true;
}

/** A nested block preset inside a parent preset. */
export type PresetBlock = ShopifyNormalBlockPreset | ShopifyStaticBlockPreset;
