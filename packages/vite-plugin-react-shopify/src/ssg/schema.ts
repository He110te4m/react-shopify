/**
 * @file Serializes {@link ShopifyMeta} into the JSON `{% schema %}` block
 * required by Shopify theme sections and blocks.
 *
 * Translates settings array, presets, blocks configuration, and other metadata
 * fields into the exact JSON structure the Shopify theme editor expects.
 */

import type { ShopifyMeta, PresetDefinition, BlockDefinition, PresetBlock } from "../types/shopify";

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
  };
}

/**
 * Serialize a block definition from a section's `blocks` attribute.
 *
 * Per {@link BlockDefinition}, there are two valid shapes:
 *
 * - **Theme/App block reference** (`{ type: "@theme" | "@app" | <filename> }`):
 *   only `type` is emitted. Shopify does not allow `name`, `limit`, or
 *   `settings` for these entries.
 * - **Section block** (`{ type: string, name?, limit?, settings? }`): all
 *   provided fields are forwarded verbatim. `name` is never auto-derived —
 *   the merchant-visible block name must be supplied by the developer.
 */
function serializeBlockDefinition(
  block: BlockDefinition,
): Record<string, unknown> {
  const { type, name, limit, settings } = block;
  const result: Record<string, unknown> = { type };
  if (name !== undefined) result.name = name;
  if (limit != null) result.limit = limit;
  if (settings) result.settings = settings;
  return result;
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
