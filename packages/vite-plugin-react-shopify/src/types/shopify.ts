/**
 * @file Shopify block/section metadata types.
 *
 * Defines {@link ShopifyMeta} — the shape of the `shopifyMeta` export from
 * React components — along with supporting types for presets and block
 * definitions. This metadata drives schema generation and Liquid output.
 */

import type { SettingSchema, InputSettings } from "./settings";

/** The four generated Shopify entry categories inferred from source directories. */
export type ShopifyEntryType = "template" | "section" | "block" | "snippet";

/** @deprecated Use {@link ShopifyEntryType}. This is not a Shopify block schema `type`. */
export type ShopifyBlockType = ShopifyEntryType;

interface ThemeBlockOrAppBlockDefinition {
  type: "@theme" | "@app" | string;
  name?: never;
  limit?: never;
  settings?: never;
  blocks?: never;
}

interface SectionBlockDefinition {
  type: string;
  name?: string;
  limit?: number;
  settings?: SettingSchema[];
}

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
export type BlockDefinition = ThemeBlockOrAppBlockDefinition | SectionBlockDefinition;

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
 * Section-level translation overrides for the schema.
 *
 * Each entry maps a language code (e.g. `"en"`, `"fr"`) to a flat key/value
 * translation map. When emitted, translations are accessed in Liquid via
 * the `t` filter using the key `sections.<section-name>.<key>`.
 */
export type SectionLocales = Record<string, Record<string, string>>;

/**
 * Metadata for a Shopify section, block, snippet, or template.
 *
 * Exported as `shopifyMeta` from the React component file. Drives the
 * generated {% schema %} block and influences Liquid wrapper output.
 */
export interface ShopifyMeta {
  /**
   * @deprecated Entry kind is inferred from the source directory
   * (`frontend/sections`, `frontend/blocks`, etc.). Do not use this to define
   * a Theme Block's Shopify block type; that type is the generated block
   * filename referenced from parent `blocks[].type` entries.
   */
  type?: ShopifyEntryType;
  name?: string;
  /**
   * HTML wrapper tag. Use `null` to render without a wrapper (blocks only).
   *
   * For sections Shopify only accepts a fixed set of tags (`article`,
   * `aside`, `div`, `footer`, `header`, `section`); for blocks any string
   * up to 50 chars is accepted.
   */
  tag?: string | null;
  class?: string;
  limit?: number;
  settings?: SettingSchema[];
  blocks?: BlockDefinition[];
  max_blocks?: number;
  presets?: PresetDefinition[];
  /**
   * Default configuration used when a section is statically rendered. Has
   * the same shape as a {@link PresetDefinition}.
   */
  default?: PresetDefinition;
  /**
   * Inline translation overrides for the section, scoped to the
   * theme editor's **Sections** tab.
   */
  locales?: SectionLocales;
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
