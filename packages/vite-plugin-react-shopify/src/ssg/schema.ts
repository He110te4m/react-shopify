/**
 * @file Serializes {@link ShopifyMeta} into the JSON `{% schema %}` block
 * required by Shopify theme sections and blocks.
 *
 * Translates settings array, presets, blocks configuration, and other metadata
 * fields into the exact JSON structure the Shopify theme editor expects.
 */

import type { ShopifyMeta, PresetDefinition, BlockDefinition, PresetBlock } from "../types/shopify";
import { MAX_NAME_LENGTH } from "../validate/rules";

/**
 * Convert a flat `ShopifyMeta` object into the `{% schema %}...{% endschema %}`
 * Liquid block string.
 */
export function generateSchema(meta: ShopifyMeta): string {
  const schema = buildSchema(meta);
  const json = JSON.stringify(schema, null, 2);
  return `\n{% schema %}\n${json}\n{% endschema %}`;
}

/** Build the plain JSON object from metadata. */
function buildSchema(meta: ShopifyMeta): Record<string, unknown> {
  return {
    name: meta.name ?? "",
    ...(meta.tag !== undefined ? { tag: meta.tag } : {}),
    class: meta.class ?? "",
    limit: meta.limit,
    ...(meta.max_blocks != null ? { max_blocks: meta.max_blocks } : {}),
    settings: meta.settings || [],
    blocks: meta.blocks
      ? meta.blocks.map((b) => serializeBlockDefinition(b))
      : undefined,
    presets: meta.presets
      ? meta.presets.map((p) => serializePreset(p))
      : undefined,
    ...(meta.default ? { default: serializePreset(meta.default) } : {}),
    ...(meta.locales ? { locales: meta.locales } : {}),
    ...(meta.enabled_on ? { enabled_on: meta.enabled_on } : {}),
    ...(meta.disabled_on ? { disabled_on: meta.disabled_on } : {}),
    ...(meta.templates ? { templates: meta.templates } : {}),
  };
}

/**
 * Derive a human-readable block name from its `type` when the user didn't
 * supply one. Mirrors the `deriveName` logic used for section-level names
 * but stripped of the PascalCase splitter (block `type` is always kebab/
 * snake-case per Shopify convention).
 *
 * @example
 * defaultBlockName("slide")              // "Slide"
 * defaultBlockName("text-block")         // "Text Block"
 * defaultBlockName("image_with_caption") // "Image With Caption"
 * defaultBlockName("@app")               // "App"
 */
function defaultBlockName(type: string): string {
  const name = type
    .replace(/^@/, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return name.length > MAX_NAME_LENGTH ? name.slice(0, MAX_NAME_LENGTH) : name;
}

/** Serialize a block definition, auto-deriving `name` from `type` if missing. */
function serializeBlockDefinition(
  block: BlockDefinition,
): Record<string, unknown> {
  const { type, name, limit, settings } = block;
  return {
    type,
    name: name ?? defaultBlockName(type),
    ...(limit != null ? { limit } : {}),
    ...(settings ? { settings } : {}),
  };
}

/** Convert an `InputSettings` map to a JSON-safe object, dropping empty strings. */
function serializeInputSettings(
  settings: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!settings) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    out[key] = value === "" ? undefined : value;
  }
  return out;
}

/** Recursively serialize a preset block (normal or static). */
function serializePresetBlock(block: PresetBlock): Record<string, unknown> {
  const p: Record<string, unknown> = { type: block.type };

  if (block.name) p.name = block.name;

  if (block.static) {
    p.static = true;
    if (block.id) p.id = block.id;
  }

  const settings = serializeInputSettings(
    "settings" in block ? block.settings : undefined,
  );
  if (settings) p.settings = settings;

  if (!block.static && block.blocks?.length) {
    p.blocks = block.blocks.map(serializePresetBlock);
  }

  return p;
}

/** Recursively serialize a preset, normalizing its settings/blocks. */
function serializePreset(preset: PresetDefinition): Record<string, unknown> {
  const obj: Record<string, unknown> = { name: preset.name };

  if (preset.category) obj.category = preset.category;

  const settings = serializeInputSettings(preset.settings);
  if (settings) obj.settings = settings;

  if (preset.blocks?.length) {
    obj.blocks = preset.blocks.map(serializePresetBlock);
  }

  return obj;
}
